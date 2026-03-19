from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Query, Request
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import calendar
import jwt
from passlib.hash import bcrypt
from enum import Enum
import base64
import pandas as pd
import mercadopago
import httpx
import asyncio
import random
import resend
from afip import AfipService, encrypt_private_key, decrypt_private_key, extract_p12

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT settings
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-here')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 horas — duración de un turno de trabajo

# MercadoPago settings
MP_ACCESS_TOKEN = os.environ.get('MP_ACCESS_TOKEN', '')
APP_URL = os.environ.get('APP_URL', 'http://localhost:8000')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
SUSCRIPCION_PRECIO = float(os.environ.get('SUSCRIPCION_PRECIO', '50000'))
SUSCRIPCION_PLAN_NOMBRE = os.environ.get('SUSCRIPCION_PLAN_NOMBRE', 'Plan Mensual')

# Resend settings
resend.api_key = os.environ.get('APIRESEND_API_KEY', '')
EMAIL_FROM = os.environ.get('EMAIL_FROM', 'PULS <onboarding@resend.dev>')

async def get_precio_suscripcion() -> float:
    doc = await db.system_config.find_one({"key": "suscripcion_precio"})
    return float(doc["value"]) if doc else SUSCRIPCION_PRECIO

async def get_plan_nombre_suscripcion() -> str:
    doc = await db.system_config.find_one({"key": "suscripcion_plan_nombre"})
    return doc["value"] if doc else SUSCRIPCION_PLAN_NOMBRE

async def get_whatsapp_numero() -> str:
    doc = await db.system_config.find_one({"key": "whatsapp_numero"})
    return doc["value"] if doc else "+5493815156095"

async def get_trial_dias() -> int:
    doc = await db.system_config.find_one({"key": "trial_dias"})
    return int(doc["value"]) if doc else 15

def calcular_siguiente_vencimiento(dia_facturacion: int, meses: int, desde: datetime) -> datetime:
    """Mismo día del mes, n meses hacia adelante. Clamped al último día del mes si es necesario."""
    mes = desde.month + meses
    anio = desde.year + (mes - 1) // 12
    mes = ((mes - 1) % 12) + 1
    ultimo_dia = calendar.monthrange(anio, mes)[1]
    dia = min(dia_facturacion, ultimo_dia)
    tz = desde.tzinfo or timezone.utc
    return datetime(anio, mes, dia, 0, 0, 0, tzinfo=tz)

def _aplicar_renovacion(suscripcion: dict, meses: int, now: datetime):
    """Calcula (base, nueva_fecha) respetando día de facturación fijo. No acumulativo.
    Durante el periodo de gracia (suscripción paga vencida hace <= GRACE_DAYS días),
    usa la fecha de vencimiento como base para respetar el ciclo de facturación.
    Ej: venció el 1, paga el día 10 (gracia) → renueva hasta el 1 del mes siguiente."""
    vencimiento = suscripcion["fecha_vencimiento"]
    if isinstance(vencimiento, str):
        vencimiento = datetime.fromisoformat(vencimiento)
    if not vencimiento.tzinfo:
        vencimiento = vencimiento.replace(tzinfo=timezone.utc)
    fue_pagada = suscripcion.get("fue_pagada", False)
    # Si fue paga y venció dentro del periodo de gracia, respetar el ciclo de facturación
    if fue_pagada and vencimiento < now and (now - vencimiento).days <= GRACE_DAYS:
        base = vencimiento
    else:
        base = vencimiento if vencimiento > now else now
    dia = suscripcion.get("dia_facturacion") or min(base.day, 28)
    nueva_fecha = calcular_siguiente_vencimiento(dia, meses, base)
    return base, nueva_fecha

DIAS_ALERTA = [10, 5]
GRACE_DAYS = 15  # Días de gracia para suscripciones pagas vencidas

async def generar_alertas_vencimiento() -> int:
    """Genera notificaciones para suscripciones próximas a vencer. Retorna cantidad generadas."""
    now = datetime.now(timezone.utc)
    suscripciones = await db.suscripciones.find(
        {"status": {"$in": [SuscripcionStatus.TRIAL, SuscripcionStatus.ACTIVA]}}
    ).to_list(None)
    generadas = 0
    for sus in suscripciones:
        vencimiento = sus.get("fecha_vencimiento")
        if isinstance(vencimiento, str):
            vencimiento = datetime.fromisoformat(vencimiento)
        if vencimiento and not vencimiento.tzinfo:
            vencimiento = vencimiento.replace(tzinfo=timezone.utc)
        if not vencimiento:
            continue
        dias_restantes = (vencimiento - now).days
        empresa_id = sus["empresa_id"]
        periodo_ref = vencimiento.date().isoformat()
        plan_nombre = sus.get("plan_nombre", "Plan")
        status_label = "trial" if sus.get("status") == SuscripcionStatus.TRIAL else "suscripción"
        # Usar solo el threshold más urgente que aplique
        applicable = sorted([t for t in DIAS_ALERTA if dias_restantes <= t])
        if not applicable:
            continue
        threshold = applicable[0]  # el más chico = más urgente
        tipo = f"plan_por_vencer_{threshold}"
        existing = await db.notificaciones.find_one({
            "empresa_id": empresa_id,
            "tipo": tipo,
            "periodo_ref": periodo_ref,
        })
        if not existing:
            dias_str = f"Quedan {max(0, dias_restantes)} días" if dias_restantes >= 0 else "Ya venció"
            notif = Notificacion(
                empresa_id=empresa_id,
                tipo=tipo,
                titulo=f"Tu {status_label} vence pronto",
                mensaje=(
                    f"Tu {plan_nombre} vence el {vencimiento.strftime('%d/%m/%Y')}. "
                    f"{dias_str}. Renovalo para continuar usando el sistema."
                ),
                dias_restantes=max(0, dias_restantes),
                periodo_ref=periodo_ref,
            )
            await db.notificaciones.insert_one(notif.dict())
            generadas += 1
    return generadas

# Owner (system admin) credentials
OWNER_USERNAME = os.environ.get('OWNER_USERNAME', 'owner')
OWNER_PASSWORD = os.environ.get('OWNER_PASSWORD', 'owner1234')

# Security
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    CAJERO = "cajero"
    SUPERVISOR = "supervisor"

class PaymentMethod(str, Enum):
    EFECTIVO = "efectivo"
    TARJETA = "tarjeta"
    TRANSFERENCIA = "transferencia"

class ProductType(str, Enum):
    CODIGO_BARRAS = "codigo_barras"
    POR_PESO = "por_peso"

class ProductKind(str, Enum):
    NORMAL = "normal"
    COMBO = "combo"

class CashSessionStatus(str, Enum):
    ABIERTA = "abierta"
    CERRADA = "cerrada"

class MovementType(str, Enum):
    APERTURA = "apertura"
    VENTA = "venta"
    RETIRO = "retiro"
    CIERRE = "cierre"
    DEVOLUCION = "devolucion"

class SuscripcionStatus(str, Enum):
    TRIAL = "trial"
    ACTIVA = "activa"
    VENCIDA = "vencida"
    SUSPENDIDA = "suspendida"

# --- Email helpers ---
TD_DIGITO = (
    '<td width="10"></td>'
    '<td style="width:56px;height:64px;background:#ecfdf5;border:2px solid #10b981;'
    'border-radius:12px;text-align:center;vertical-align:middle;'
    'font-size:32px;font-weight:800;color:#065f46;">{d}</td>'
)

def _digitos_html(codigo: str) -> str:
    partes = []
    for d in codigo:
        partes.append(TD_DIGITO.format(d=d))
    return "".join(partes)

def _anio() -> str:
    return str(datetime.now().year)

def _build_email_html(titulo: str, subtitulo: str, codigo: str, nota_pie: str) -> str:
    return (
        '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"></head>'
        '<body style="margin:0;padding:0;background:#f3f4f6;font-family:\'Segoe UI\',Arial,sans-serif;">'
        '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">'
        '<tr><td align="center">'
        '<table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;'
        'overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">'
        # Header
        '<tr><td style="background:linear-gradient(135deg,#059669,#10b981);padding:36px 40px;text-align:center;">'
        '<div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">PULS</div>'
        '<div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">Sistema de gesti\u00f3n para comercios</div>'
        '</td></tr>'
        # Cuerpo
        '<tr><td style="padding:40px 40px 32px;">'
        '<p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">' + titulo + '</p>'
        '<p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">' + subtitulo + '</p>'
        '<table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;"><tr>'
        + _digitos_html(codigo) +
        '</tr></table>'
        '<p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">' + nota_pie + '</p>'
        '</td></tr>'
        # Footer
        '<tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">'
        '<p style="margin:0;font-size:12px;color:#9ca3af;">'
        '\u00a9 ' + _anio() + ' PULS \u00b7 Sistema de gesti\u00f3n para comercios'
        '</p></td></tr>'
        '</table></td></tr></table></body></html>'
    )

def _resend_send(destinatario: str, subject: str, html: str):
    resend.Emails.send({
        "from": EMAIL_FROM,
        "to": [destinatario],
        "subject": subject,
        "html": html,
    })

def _send_email_otp_sync(destinatario: str, codigo: str):
    html = _build_email_html(
        titulo="Verific\u00e1 tu correo",
        subtitulo="Us\u00e1 el siguiente c\u00f3digo para completar el registro de tu empresa en PULS.<br>"
                  "V\u00e1lido por <strong style=\"color:#111827;\">10 minutos</strong>.",
        codigo=codigo,
        nota_pie="Si no solicitaste este c\u00f3digo, pod\u00e9s ignorar este mensaje.",
    )
    _resend_send(destinatario, "Tu código de verificación PULS: {}".format(codigo), html)

def _send_password_reset_sync(destinatario: str, codigo: str):
    html = _build_email_html(
        titulo="Recuperar contrase\u00f1a",
        subtitulo="Recibimos una solicitud para restablecer la contrase\u00f1a de tu cuenta.<br>"
                  "Us\u00e1 este c\u00f3digo. V\u00e1lido por <strong style=\"color:#111827;\">15 minutos</strong>.",
        codigo=codigo,
        nota_pie="Si no solicitaste este cambio, pod\u00e9s ignorar este mensaje. Tu contrase\u00f1a no se modificar\u00e1.",
    )
    _resend_send(destinatario, "Recuperar contraseña PULS: {}".format(codigo), html)

async def send_email_otp(destinatario: str, codigo: str):
    await asyncio.to_thread(_send_email_otp_sync, destinatario, codigo)

async def send_password_reset_email(destinatario: str, codigo: str):
    await asyncio.to_thread(_send_password_reset_sync, destinatario, codigo)


class OTPEnviar(BaseModel):
    email: str

class OTPVerificar(BaseModel):
    email: str
    codigo: str

# --- Empresa models ---
class Empresa(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nombre: str
    email_verificado: bool = False
    activo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmpresaRegister(BaseModel):
    empresa_nombre: str
    admin_nombre: str
    admin_email: str
    admin_password: str
    otp_token: str

# --- Subscription models ---
class Suscripcion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    plan_nombre: str = "Plan Mensual"
    precio: float = 0.0
    moneda: str = "ARS"
    status: SuscripcionStatus = SuscripcionStatus.TRIAL
    fecha_inicio: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    fecha_vencimiento: datetime
    dia_facturacion: Optional[int] = None
    plan_tipo: str = "mensual"
    fue_pagada: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PagoSuscripcion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    monto: float
    moneda: str = "ARS"
    estado: str  # pending, approved, rejected, cancelled
    concepto: str
    mp_payment_id: Optional[str] = None
    mp_preference_id: Optional[str] = None
    plan_tipo: str = "mensual"
    fecha: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    periodo_inicio: Optional[datetime] = None
    periodo_fin: Optional[datetime] = None

class Notificacion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    tipo: str  # "plan_por_vencer_10", "plan_por_vencer_5"
    titulo: str
    mensaje: str
    leida: bool = False
    dias_restantes: Optional[int] = None
    periodo_ref: str = ""  # fecha_vencimiento ISO date para deduplicación
    fecha: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Models
class Branch(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nombre: str
    direccion: str
    telefono: Optional[str] = None
    activo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BranchCreate(BaseModel):
    nombre: str
    direccion: str
    telefono: Optional[str] = None

class BranchUpdate(BaseModel):
    nombre: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    activo: Optional[bool] = None

class CashSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    branch_id: str
    user_id: str
    monto_inicial: float
    monto_ventas: float = 0.0
    monto_retiros: float = 0.0
    monto_final: Optional[float] = None
    monto_esperado: Optional[float] = None
    diferencia: Optional[float] = None
    status: CashSessionStatus = CashSessionStatus.ABIERTA
    fecha_apertura: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    fecha_cierre: Optional[datetime] = None
    observaciones: Optional[str] = None

class CashSessionCreate(BaseModel):
    monto_inicial: float
    observaciones: Optional[str] = None

class CashSessionClose(BaseModel):
    monto_final: float
    observaciones: Optional[str] = None

class CashMovement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    session_id: str
    tipo: MovementType
    monto: float
    descripcion: str
    venta_id: Optional[str] = None
    fecha: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BranchProduct(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    product_id: str
    branch_id: str
    precio: float
    precio_por_peso: Optional[float] = None
    stock: int = 0
    stock_minimo: int = 10
    margen: Optional[float] = None
    costo: Optional[float] = None
    activo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BranchProductCreate(BaseModel):
    product_id: str
    branch_id: Optional[str] = None
    precio: float
    precio_por_peso: Optional[float] = None
    stock: int = 0
    stock_minimo: int = 10
    margen: Optional[float] = None

class BranchProductUpdate(BaseModel):
    precio: Optional[float] = None
    precio_por_peso: Optional[float] = None
    stock: Optional[int] = None
    stock_minimo: Optional[int] = None
    margen: Optional[float] = None
    costo: Optional[float] = None
    activo: Optional[bool] = None

class Configuration(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    # Company Information
    company_name: str = "SuperMarket POS"
    company_address: str = ""
    company_phone: str = ""
    company_email: str = ""
    company_tax_id: str = ""

    # Tax & Financial Settings
    tax_rate: float = 0.12  # 12% default
    currency_symbol: str = "$"
    currency_code: str = "USD"

    # POS Settings
    sounds_enabled: bool = True
    auto_focus_barcode: bool = True
    barcode_scan_timeout: int = 100  # milliseconds
    receipt_footer_text: str = "¡Gracias por su compra!"

    # Inventory Settings
    default_minimum_stock: int = 10
    low_stock_alert_enabled: bool = True
    auto_update_inventory: bool = True

    # System Settings
    date_format: str = "DD/MM/YYYY"
    time_format: str = "24h"
    language: str = "es"

    # Receipt Settings
    print_receipt_auto: bool = False
    show_receipt_after_sale: bool = True
    receipt_width: int = 80  # characters

    # Pagination Settings
    items_per_page: int = 10

    # Company Branding
    company_logo: Optional[str] = None  # URL or base64 of logo

    # Color Theme
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    tertiary_color: Optional[str] = None

    # Payment Method Adjustments (percentage: -5 = 5% discount, +3 = 3% surcharge)
    payment_method_adjustments: dict = Field(default_factory=lambda: {
        "efectivo": 0.0,
        "tarjeta": 0.0,
        "transferencia": 0.0
    })

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ConfigurationUpdate(BaseModel):
    company_name: Optional[str] = None
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    company_email: Optional[str] = None
    company_tax_id: Optional[str] = None
    tax_rate: Optional[float] = None
    currency_symbol: Optional[str] = None
    currency_code: Optional[str] = None
    sounds_enabled: Optional[bool] = None
    auto_focus_barcode: Optional[bool] = None
    barcode_scan_timeout: Optional[int] = None
    receipt_footer_text: Optional[str] = None
    default_minimum_stock: Optional[int] = None
    low_stock_alert_enabled: Optional[bool] = None
    auto_update_inventory: Optional[bool] = None
    date_format: Optional[str] = None
    time_format: Optional[str] = None
    language: Optional[str] = None
    print_receipt_auto: Optional[bool] = None
    show_receipt_after_sale: Optional[bool] = None
    receipt_width: Optional[int] = None
    items_per_page: Optional[int] = None
    company_logo: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    tertiary_color: Optional[str] = None
    payment_method_adjustments: Optional[dict] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nombre: str
    email: str
    rol: UserRole
    branch_id: Optional[str] = None
    activo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    nombre: str
    email: str
    password: str
    rol: UserRole
    branch_id: Optional[str] = None

class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    rol: Optional[UserRole] = None
    branch_id: Optional[str] = None
    activo: Optional[bool] = None

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nombre: str
    descripcion: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class ComboItem(BaseModel):
    product_id: str
    cantidad: float = 1.0

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nombre: str
    codigo_barras: Optional[str] = None
    tipo: ProductType
    kind: ProductKind = ProductKind.NORMAL
    precio: float
    precio_por_peso: Optional[float] = None
    categoria_id: str
    stock: int = 0
    stock_minimo: int = 10
    control_stock: bool = True
    combo_items: List[ComboItem] = []
    activo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    nombre: str
    codigo_barras: Optional[str] = None
    tipo: ProductType
    kind: ProductKind = ProductKind.NORMAL
    precio: float
    precio_por_peso: Optional[float] = None
    categoria_id: str
    stock: int = 0
    stock_minimo: int = 10
    control_stock: bool = True
    combo_items: List[ComboItem] = []

class ProductUpdate(BaseModel):
    nombre: Optional[str] = None
    codigo_barras: Optional[str] = None
    tipo: Optional[ProductType] = None
    kind: Optional[ProductKind] = None
    precio: Optional[float] = None
    precio_por_peso: Optional[float] = None
    categoria_id: Optional[str] = None
    stock: Optional[int] = None
    stock_minimo: Optional[int] = None
    control_stock: Optional[bool] = None
    combo_items: Optional[List[ComboItem]] = None
    activo: Optional[bool] = None

class SaleItem(BaseModel):
    producto_id: str
    nombre: Optional[str] = None
    cantidad: float
    precio_unitario: float
    subtotal: float

class Sale(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    cajero_id: str
    branch_id: str
    session_id: str
    items: List[SaleItem]
    subtotal: float
    impuestos: float = 0.0
    total: float
    metodo_pago: PaymentMethod
    fecha: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    numero_factura: str
    estado: str = "activo"
    # Campos AFIP/ARCA
    cae: Optional[str] = None
    cae_vencimiento: Optional[str] = None       # formato "AAAAMMDD"
    afip_estado: str = "no_configurado"          # no_configurado | autorizado | contingencia | error
    afip_error: Optional[str] = None
    tipo_comprobante: int = 6                    # 1=Factura A, 6=Factura B, 11=Factura C
    nro_comprobante_afip: Optional[int] = None
    cuit_receptor: Optional[str] = None

class SaleCreate(BaseModel):
    items: List[SaleItem]
    metodo_pago: PaymentMethod
    tipo_comprobante: Optional[int] = None      # si None → usa default de AfipConfig
    cuit_receptor: Optional[str] = None         # requerido si tipo_comprobante = 1

# ─── Modelos AFIP/ARCA ────────────────────────────────────────────────────────

class AfipConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    cuit: str
    punto_venta: int = 1
    ambiente: str = "homologacion"              # "homologacion" | "produccion"
    tipo_comprobante_default: int = 6           # 1=A, 6=B, 11=C
    razon_social: str = ""
    cert_pem: Optional[str] = None              # Certificado X.509 en PEM codificado en base64
    key_pem_encrypted: Optional[str] = None     # Private key cifrada con Fernet
    activo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AfipConfigCreate(BaseModel):
    cuit: str
    punto_venta: int = 1
    ambiente: str = "homologacion"
    tipo_comprobante_default: int = 6
    razon_social: Optional[str] = ""

class AfipConfigUpdate(BaseModel):
    cuit: Optional[str] = None
    punto_venta: Optional[int] = None
    ambiente: Optional[str] = None
    tipo_comprobante_default: Optional[int] = None
    razon_social: Optional[str] = None

class ReturnItemCreate(BaseModel):
    producto_id: str
    cantidad: float

class ReturnCreate(BaseModel):
    items: List[ReturnItemCreate]
    motivo: Optional[str] = None

class SaleReturn(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    sale_id: str
    cajero_id: str
    items: List[SaleItem]
    total: float
    motivo: Optional[str] = None
    fecha: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    numero_devolucion: str

# --- Proveedor models ---
class Proveedor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nombre: str
    ruc_cuit: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    activo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProveedorCreate(BaseModel):
    nombre: str
    ruc_cuit: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None

class ProveedorUpdate(BaseModel):
    nombre: Optional[str] = None
    ruc_cuit: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    activo: Optional[bool] = None

# --- Compra models ---
class CompraItem(BaseModel):
    descripcion: str
    cantidad: float
    precio_unitario: float
    subtotal: float
    product_id: Optional[str] = None
    actualizar_precio: bool = False

class Compra(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    sucursal_id: Optional[str] = None
    proveedor_id: Optional[str] = None
    proveedor_nombre: Optional[str] = None
    numero_factura: str
    fecha: datetime
    items: List[CompraItem] = []
    subtotal: float
    impuestos: float = 0.0
    total: float
    notas: Optional[str] = None
    registrado_por: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompraCreate(BaseModel):
    sucursal_id: Optional[str] = None
    proveedor_id: Optional[str] = None
    numero_factura: str
    fecha: datetime
    items: List[CompraItem] = []
    subtotal: float
    impuestos: float = 0.0
    total: float
    notas: Optional[str] = None

class CompraUpdate(BaseModel):
    sucursal_id: Optional[str] = None
    proveedor_id: Optional[str] = None
    numero_factura: Optional[str] = None
    fecha: Optional[datetime] = None
    items: Optional[List[CompraItem]] = None
    subtotal: Optional[float] = None
    impuestos: Optional[float] = None
    total: Optional[float] = None
    notas: Optional[str] = None

# Utility functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        empresa_id: str = payload.get("empresa_id")
        if user_id is None or empresa_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")

        user = await db.users.find_one({"id": user_id, "empresa_id": empresa_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")

        return User(**user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

def require_role(required_roles: List[UserRole]):
    def role_checker(user: User = Depends(get_current_user)):
        if user.rol not in required_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

# Branch routes
@api_router.post("/branches", response_model=Branch)
async def create_branch(branch_data: BranchCreate, user: User = Depends(require_role([UserRole.ADMIN]))):
    branch = Branch(**branch_data.dict(), empresa_id=user.empresa_id)
    await db.branches.insert_one(branch.dict())
    # Auto-sync: create branch_products for all existing active products of this empresa
    products = await db.products.find({"empresa_id": user.empresa_id, "activo": True}).to_list(10000)
    for product in products:
        existing = await db.branch_products.find_one({
            "product_id": product["id"],
            "branch_id": branch.id,
            "empresa_id": user.empresa_id
        })
        if not existing:
            bp = BranchProduct(
                empresa_id=user.empresa_id,
                product_id=product["id"],
                branch_id=branch.id,
                precio=product["precio"],
                precio_por_peso=product.get("precio_por_peso"),
                stock=product.get("stock", 0),
                stock_minimo=product.get("stock_minimo", 10)
            )
            await db.branch_products.insert_one(bp.dict())
    return branch

@api_router.get("/branches", response_model=List[Branch])
async def get_branches(user: User = Depends(get_current_user)):
    branches = await db.branches.find({"empresa_id": user.empresa_id}).to_list(1000)
    return [Branch(**branch) for branch in branches]

@api_router.get("/branches/{branch_id}/products/export")
async def export_branch_products(
    branch_id: str,
    format: str = Query("csv"),
    user: User = Depends(require_role([UserRole.ADMIN]))
):
    if format not in ("csv", "xlsx"):
        format = "csv"
    branch = await db.branches.find_one({"id": branch_id, "empresa_id": user.empresa_id})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    products = await db.products.find({"empresa_id": user.empresa_id, "activo": True}).to_list(10000)
    categories = await db.categories.find({"empresa_id": user.empresa_id}).to_list(1000)
    cat_map = {c["id"]: c["nombre"] for c in categories}

    rows = []
    for product in products:
        bp = await db.branch_products.find_one({
            "product_id": product.get("id"),
            "branch_id": branch_id,
            "empresa_id": user.empresa_id
        })
        rows.append({
            "nombre": product.get("nombre"),
            "codigo_barras": product.get("codigo_barras", ""),
            "tipo": product.get("tipo"),
            "categoria": cat_map.get(product.get("categoria_id"), ""),
            "precio_global": product.get("precio"),
            "stock_global": product.get("stock", 0),
            "precio_sucursal": bp.get("precio") if bp else "",
            "precio_por_peso_sucursal": bp.get("precio_por_peso") if bp else "",
            "stock_sucursal": bp.get("stock") if bp else "",
            "stock_minimo_sucursal": bp.get("stock_minimo") if bp else "",
        })

    df = pd.DataFrame(rows)
    branch_nombre = branch.get("nombre", branch_id).replace(" ", "_")

    if format == "xlsx":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Productos")
        output.seek(0)
        filename = f"productos_{branch_nombre}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    else:
        csv_bytes = df.to_csv(index=False).encode("utf-8-sig")
        filename = f"productos_{branch_nombre}.csv"
        return StreamingResponse(
            io.BytesIO(csv_bytes),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

@api_router.get("/branches/{branch_id}/products")
async def get_branch_products_admin(branch_id: str, user: User = Depends(get_current_user)):
    if user.rol not in [UserRole.ADMIN, UserRole.SUPERVISOR]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    branch = await db.branches.find_one({"id": branch_id, "empresa_id": user.empresa_id})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    # Get all active global products for this empresa
    products = await db.products.find({"empresa_id": user.empresa_id, "activo": True}).to_list(10000)
    result = []
    for product in products:
        bp = await db.branch_products.find_one({
            "product_id": product.get("id"),
            "branch_id": branch_id,
            "empresa_id": user.empresa_id
        })
        result.append({
            "product_id": product.get("id"),
            "nombre": product.get("nombre"),
            "codigo_barras": product.get("codigo_barras"),
            "tipo": product.get("tipo"),
            "categoria_id": product.get("categoria_id"),
            "precio_global": product.get("precio"),
            "stock_global": product.get("stock", 0),
            "branch_product_id": bp.get("id") if bp else None,
            "precio_sucursal": bp.get("precio") if bp else None,
            "precio_por_peso_sucursal": bp.get("precio_por_peso") if bp else None,
            "stock_sucursal": bp.get("stock") if bp else None,
            "stock_minimo_sucursal": bp.get("stock_minimo") if bp else None,
            "margen_sucursal": bp.get("margen") if bp else None,
            "costo_sucursal": bp.get("costo") if bp else None,
            "activo_sucursal": bp.get("activo", True) if bp else True,
        })
    return result

@api_router.get("/branches/{branch_id}", response_model=Branch)
async def get_branch(branch_id: str, user: User = Depends(get_current_user)):
    branch = await db.branches.find_one({"id": branch_id, "empresa_id": user.empresa_id})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return Branch(**branch)

@api_router.put("/branches/{branch_id}", response_model=Branch)
async def update_branch(branch_id: str, branch_data: BranchUpdate, user: User = Depends(require_role([UserRole.ADMIN]))):
    branch = await db.branches.find_one({"id": branch_id, "empresa_id": user.empresa_id})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    update_data = {k: v for k, v in branch_data.dict().items() if v is not None}
    if update_data:
        await db.branches.update_one({"id": branch_id, "empresa_id": user.empresa_id}, {"$set": update_data})
    updated = await db.branches.find_one({"id": branch_id, "empresa_id": user.empresa_id})
    return Branch(**updated)

# Cash Session routes
@api_router.post("/cash-sessions", response_model=CashSession)
async def open_cash_session(session_data: CashSessionCreate, user: User = Depends(get_current_user)):
    if not user.branch_id:
        raise HTTPException(status_code=400, detail="User must be assigned to a branch")

    # Check if there's already an open session for this user
    existing_session = await db.cash_sessions.find_one({
        "user_id": user.id,
        "empresa_id": user.empresa_id,
        "status": CashSessionStatus.ABIERTA
    })
    if existing_session:
        raise HTTPException(status_code=400, detail="Ya tienes una sesión de caja abierta")

    # Create new session
    session = CashSession(
        empresa_id=user.empresa_id,
        branch_id=user.branch_id,
        user_id=user.id,
        monto_inicial=session_data.monto_inicial,
        observaciones=session_data.observaciones
    )

    await db.cash_sessions.insert_one(session.dict())

    # Create opening movement
    movement = CashMovement(
        empresa_id=user.empresa_id,
        session_id=session.id,
        tipo=MovementType.APERTURA,
        monto=session_data.monto_inicial,
        descripcion=f"Apertura de caja - {session_data.observaciones or ''}"
    )
    await db.cash_movements.insert_one(movement.dict())

    return session

@api_router.put("/cash-sessions/{session_id}/close", response_model=CashSession)
async def close_cash_session(session_id: str, close_data: CashSessionClose, user: User = Depends(get_current_user)):
    session = await db.cash_sessions.find_one({"id": session_id, "user_id": user.id, "empresa_id": user.empresa_id})
    if not session:
        raise HTTPException(status_code=404, detail="Sesión de caja no encontrada")

    if session["status"] == CashSessionStatus.CERRADA:
        raise HTTPException(status_code=400, detail="La sesión ya está cerrada")

    # Calculate expected amount
    monto_esperado = session["monto_inicial"] + session["monto_ventas"] - session["monto_retiros"]
    diferencia = close_data.monto_final - monto_esperado

    # Update session
    update_data = {
        "monto_final": close_data.monto_final,
        "monto_esperado": monto_esperado,
        "diferencia": diferencia,
        "status": CashSessionStatus.CERRADA,
        "fecha_cierre": datetime.now(timezone.utc),
        "observaciones": close_data.observaciones
    }

    await db.cash_sessions.update_one({"id": session_id, "empresa_id": user.empresa_id}, {"$set": update_data})

    # Create closing movement
    movement = CashMovement(
        empresa_id=user.empresa_id,
        session_id=session_id,
        tipo=MovementType.CIERRE,
        monto=close_data.monto_final,
        descripcion=f"Cierre de caja - {close_data.observaciones or ''}"
    )
    await db.cash_movements.insert_one(movement.dict())

    updated_session = await db.cash_sessions.find_one({"id": session_id, "empresa_id": user.empresa_id})
    return CashSession(**updated_session)

@api_router.get("/cash-sessions/current", response_model=Optional[CashSession])
async def get_current_cash_session(user: User = Depends(get_current_user)):
    session = await db.cash_sessions.find_one({
        "user_id": user.id,
        "empresa_id": user.empresa_id,
        "status": CashSessionStatus.ABIERTA
    })
    return CashSession(**session) if session else None

@api_router.get("/cash-sessions", response_model=List[CashSession])
async def get_cash_sessions(user: User = Depends(get_current_user)):
    if user.rol == UserRole.CAJERO:
        sessions = await db.cash_sessions.find({"user_id": user.id, "empresa_id": user.empresa_id}).sort("fecha_apertura", -1).to_list(100)
    else:
        query = {"empresa_id": user.empresa_id}
        if user.branch_id and user.rol != UserRole.ADMIN:
            query["branch_id"] = user.branch_id
        sessions = await db.cash_sessions.find(query).sort("fecha_apertura", -1).to_list(1000)

    return [CashSession(**session) for session in sessions]

# Auth routes
@api_router.post("/auth/otp/enviar")
async def otp_enviar(data: OTPEnviar):
    email = data.email.strip().lower()

    # Rate limiting: máx 3 códigos activos por email
    recientes = await db.email_otps.count_documents({
        "email": email,
        "expires_at": {"$gt": datetime.now(timezone.utc)},
        "usado": False,
    })
    if recientes >= 3:
        raise HTTPException(status_code=429, detail="Demasiados intentos. Esperá unos minutos.")

    codigo = str(random.randint(1000, 9999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    await db.email_otps.insert_one({
        "email": email,
        "codigo": codigo,
        "expires_at": expires_at,
        "usado": False,
    })

    try:
        await send_email_otp(email, codigo)
    except Exception as e:
        logging.exception("Error enviando email OTP")
        raise HTTPException(status_code=500, detail="No se pudo enviar el código. Verificá el correo e intentá de nuevo.")

    return {"ok": True, "mensaje": "Código enviado al correo"}


@api_router.post("/auth/otp/verificar")
async def otp_verificar(data: OTPVerificar):
    email = data.email.strip().lower()
    otp_doc = await db.email_otps.find_one({
        "email": email,
        "codigo": data.codigo,
        "usado": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)},
    })
    if not otp_doc:
        raise HTTPException(status_code=400, detail="Código inválido o expirado")

    await db.email_otps.update_one({"_id": otp_doc["_id"]}, {"$set": {"usado": True}})

    token = jwt.encode(
        {"type": "email_otp", "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=15)},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return {"ok": True, "verificacion_token": token}


@api_router.post("/auth/empresa/register", response_model=Token)
async def register_empresa(data: EmpresaRegister):
    # Validar token OTP
    try:
        payload = jwt.decode(data.otp_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "email_otp" or payload.get("email") != data.admin_email.strip().lower():
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=400, detail="Token de verificación de correo inválido o expirado")

    # Check if admin email already exists
    existing_user = await db.users.find_one({"email": data.admin_email})
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    # Create empresa
    empresa = Empresa(nombre=data.empresa_nombre, email_verificado=True)
    await db.empresas.insert_one(empresa.dict())

    # Create admin user
    hashed_password = bcrypt.hash(data.admin_password)
    user = User(
        empresa_id=empresa.id,
        nombre=data.admin_nombre,
        email=data.admin_email,
        rol=UserRole.ADMIN
    )
    user_doc = user.dict()
    user_doc['password'] = hashed_password
    await db.users.insert_one(user_doc)

    # Create default configuration for this empresa
    config = Configuration(empresa_id=empresa.id, company_name=data.empresa_nombre)
    await db.configuration.insert_one(config.dict())

    # Create trial subscription
    trial_inicio = datetime.now(timezone.utc)
    dia_facturacion = min(trial_inicio.day, 28)
    trial_fin = trial_inicio + timedelta(days=await get_trial_dias())
    suscripcion = Suscripcion(
        empresa_id=empresa.id,
        plan_nombre=await get_plan_nombre_suscripcion(),
        precio=await get_precio_suscripcion(),
        status=SuscripcionStatus.TRIAL,
        fecha_inicio=trial_inicio,
        fecha_vencimiento=trial_fin,
        dia_facturacion=dia_facturacion,
        plan_tipo="mensual",
    )
    await db.suscripciones.insert_one(suscripcion.dict())

    # Return token (auto-login)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id, "empresa_id": empresa.id},
        expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate, current_user: User = Depends(require_role([UserRole.ADMIN]))):
    # Check if email already exists within this empresa
    existing_user = await db.users.find_one({"email": user_data.email, "empresa_id": current_user.empresa_id})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash password
    hashed_password = bcrypt.hash(user_data.password)

    # Create user — empresa_id inherited from the admin creating it
    user_dict = user_data.dict()
    user_dict.pop('password')
    user = User(**user_dict, empresa_id=current_user.empresa_id)

    # Store in database
    user_doc = user.dict()
    user_doc['password'] = hashed_password
    await db.users.insert_one(user_doc)

    return user

class PasswordResetEnviar(BaseModel):
    email: str

class PasswordResetVerificar(BaseModel):
    email: str
    codigo: str

class PasswordResetCambiar(BaseModel):
    reset_token: str
    nueva_password: str

@api_router.post("/auth/password-reset/enviar")
async def password_reset_enviar(data: PasswordResetEnviar):
    email_input = data.email.strip()
    # Búsqueda case-insensitive para no depender de cómo se guardó el email
    user_doc = await db.users.find_one({"email": {"$regex": f"^{email_input}$", "$options": "i"}})
    # Siempre responder OK para no revelar si el email existe
    if not user_doc:
        return {"ok": True, "mensaje": "Si el correo está registrado, recibirás un código"}

    # Usar el email exactamente como está guardado en la DB
    email = user_doc["email"]

    recientes = await db.password_resets.count_documents({
        "email": email,
        "expires_at": {"$gt": datetime.now(timezone.utc)},
        "usado": False,
    })
    if recientes >= 3:
        raise HTTPException(status_code=429, detail="Demasiados intentos. Esperá unos minutos.")

    codigo = str(random.randint(1000, 9999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    await db.password_resets.insert_one({
        "email": email,
        "codigo": codigo,
        "expires_at": expires_at,
        "usado": False,
    })

    try:
        await send_password_reset_email(email, codigo)
    except Exception as e:
        logging.exception("Error enviando email de recuperación")
        raise HTTPException(status_code=500, detail="No se pudo enviar el correo. Intentá de nuevo.")

    return {"ok": True, "mensaje": "Si el correo está registrado, recibirás un código"}


@api_router.post("/auth/password-reset/verificar")
async def password_reset_verificar(data: PasswordResetVerificar):
    email_input = data.email.strip()
    doc = await db.password_resets.find_one({
        "email": {"$regex": f"^{email_input}$", "$options": "i"},
        "codigo": data.codigo,
        "usado": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)},
    })
    if not doc:
        raise HTTPException(status_code=400, detail="Código inválido o expirado")

    await db.password_resets.update_one({"_id": doc["_id"]}, {"$set": {"usado": True}})

    # Usar el email exactamente como está en el registro guardado
    email = doc["email"]
    token = jwt.encode(
        {"type": "password_reset", "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=15)},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return {"ok": True, "reset_token": token}


@api_router.post("/auth/password-reset/cambiar")
async def password_reset_cambiar(data: PasswordResetCambiar):
    try:
        payload = jwt.decode(data.reset_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "password_reset":
            raise ValueError()
        email = payload["email"]
    except Exception:
        raise HTTPException(status_code=400, detail="Token de recuperación inválido o expirado")

    if len(data.nueva_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")

    hashed = bcrypt.hash(data.nueva_password)
    result = await db.users.update_one({"email": email}, {"$set": {"password": hashed}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return {"ok": True, "mensaje": "Contraseña actualizada correctamente"}


@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"email": user_data.email})
    if not user_doc or not bcrypt.verify(user_data.password, user_doc['password']):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    if not user_doc.get('activo', True):
        raise HTTPException(status_code=400, detail="User account is disabled")

    # Verificar que el correo de la empresa esté verificado
    empresa_doc = await db.empresas.find_one({"id": user_doc['empresa_id']})
    if empresa_doc and not empresa_doc.get('email_verificado', True):
        raise HTTPException(status_code=403, detail="Correo no verificado. Completá el registro de tu empresa.")

    # Create access token with empresa_id
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_doc['id'], "empresa_id": user_doc['empresa_id']},
        expires_delta=access_token_expires
    )

    user = User(**user_doc)
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(user: User = Depends(get_current_user)):
    return user

# Category routes
@api_router.post("/categories", response_model=Category)
async def create_category(category_data: CategoryCreate, user: User = Depends(require_role([UserRole.ADMIN]))):
    category = Category(**category_data.dict(), empresa_id=user.empresa_id)
    await db.categories.insert_one(category.dict())
    return category

@api_router.get("/categories", response_model=List[Category])
async def get_categories(user: User = Depends(get_current_user)):
    categories = await db.categories.find({"empresa_id": user.empresa_id}).to_list(1000)
    return [Category(**cat) for cat in categories]

# Branch Product routes
@api_router.post("/branch-products", response_model=BranchProduct)
async def create_branch_product(product_data: BranchProductCreate, user: User = Depends(require_role([UserRole.ADMIN]))):
    target_branch_id = product_data.branch_id or user.branch_id
    if not target_branch_id:
        raise HTTPException(status_code=400, detail="branch_id requerido")
    # Verify product exists for this empresa
    product = await db.products.find_one({"id": product_data.product_id, "empresa_id": user.empresa_id})
    if not product:
        raise HTTPException(status_code=400, detail="Product not found")
    # Check if product already exists in branch
    existing = await db.branch_products.find_one({
        "product_id": product_data.product_id,
        "branch_id": target_branch_id,
        "empresa_id": user.empresa_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Product already exists in this branch")
    data = {k: v for k, v in product_data.dict().items() if k != "branch_id"}
    branch_product = BranchProduct(**data, branch_id=target_branch_id, empresa_id=user.empresa_id)
    await db.branch_products.insert_one(branch_product.dict())
    return branch_product

@api_router.put("/branch-products/{branch_product_id}", response_model=BranchProduct)
async def update_branch_product(branch_product_id: str, product_data: BranchProductUpdate, user: User = Depends(require_role([UserRole.ADMIN]))):
    bp = await db.branch_products.find_one({"id": branch_product_id, "empresa_id": user.empresa_id})
    if not bp:
        raise HTTPException(status_code=404, detail="Branch product not found")
    update_data = {k: v for k, v in product_data.dict().items() if v is not None}
    if update_data:
        await db.branch_products.update_one({"id": branch_product_id, "empresa_id": user.empresa_id}, {"$set": update_data})
    updated = await db.branch_products.find_one({"id": branch_product_id, "empresa_id": user.empresa_id})
    return BranchProduct(**updated)

@api_router.delete("/branch-products/{branch_product_id}")
async def delete_branch_product(branch_product_id: str, user: User = Depends(require_role([UserRole.ADMIN]))):
    bp = await db.branch_products.find_one({"id": branch_product_id, "empresa_id": user.empresa_id})
    if not bp:
        raise HTTPException(status_code=404, detail="Branch product not found")
    await db.branch_products.delete_one({"id": branch_product_id, "empresa_id": user.empresa_id})
    return {"message": "Producto eliminado de la sucursal"}

@api_router.get("/branch-products", response_model=List[dict])
async def get_branch_products(user: User = Depends(get_current_user)):
    if not user.branch_id:
        raise HTTPException(status_code=400, detail="User must be assigned to a branch")

    # Get products with branch-specific data
    pipeline = [
        {
            "$match": {
                "branch_id": user.branch_id,
                "empresa_id": user.empresa_id,
                "activo": True
            }
        },
        {
            "$lookup": {
                "from": "products",
                "localField": "product_id",
                "foreignField": "id",
                "as": "product"
            }
        },
        {
            "$unwind": "$product"
        },
        {
            "$project": {
                "_id": 0,
                "id": 1,
                "product_id": 1,
                "branch_id": 1,
                "empresa_id": 1,
                "precio": 1,
                "precio_por_peso": 1,
                "stock": 1,
                "stock_minimo": 1,
                "activo": 1,
                "nombre": "$product.nombre",
                "codigo_barras": "$product.codigo_barras",
                "tipo": "$product.tipo",
                "categoria_id": "$product.categoria_id"
            }
        }
    ]

    branch_products = await db.branch_products.aggregate(pipeline).to_list(1000)
    return branch_products

# Product routes
@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, user: User = Depends(require_role([UserRole.ADMIN]))):
    # Verify category exists for this empresa
    category = await db.categories.find_one({"id": product_data.categoria_id, "empresa_id": user.empresa_id})
    if not category:
        raise HTTPException(status_code=400, detail="Category not found")

    # Check if barcode already exists for this empresa
    if product_data.codigo_barras:
        existing_product = await db.products.find_one({"codigo_barras": product_data.codigo_barras, "empresa_id": user.empresa_id})
        if existing_product:
            raise HTTPException(status_code=400, detail="Barcode already exists")

    product_dict = product_data.dict()
    # Combos never control their own stock
    if product_dict.get("kind") == ProductKind.COMBO:
        product_dict["control_stock"] = False
    product = Product(**product_dict, empresa_id=user.empresa_id)
    await db.products.insert_one(product.dict())
    # Auto-sync: create branch_products for all active branches of this empresa
    branches = await db.branches.find({"activo": True, "empresa_id": user.empresa_id}).to_list(1000)
    for branch in branches:
        existing = await db.branch_products.find_one({
            "product_id": product.id,
            "branch_id": branch["id"],
            "empresa_id": user.empresa_id
        })
        if not existing:
            bp = BranchProduct(
                empresa_id=user.empresa_id,
                product_id=product.id,
                branch_id=branch["id"],
                precio=product.precio,
                precio_por_peso=product.precio_por_peso,
                stock=product.stock,
                stock_minimo=product.stock_minimo
            )
            await db.branch_products.insert_one(bp.dict())
    return product

@api_router.get("/products", response_model=List[Product])
async def get_products(user: User = Depends(get_current_user)):
    products = await db.products.find({"empresa_id": user.empresa_id, "activo": True}).to_list(1000)
    for p in products:
        if p.get('kind') != 'combo' and p.get('control_stock') is None:
            p['control_stock'] = True
    return [Product(**prod) for prod in products]

@api_router.get("/products/export")
async def export_products(
    format: str = Query("csv"),
    user: User = Depends(require_role([UserRole.ADMIN]))
):
    if format not in ("csv", "xlsx"):
        format = "csv"
    products = await db.products.find({"empresa_id": user.empresa_id, "activo": True}).to_list(10000)
    categories = await db.categories.find({"empresa_id": user.empresa_id}).to_list(1000)
    cat_map = {c["id"]: c["nombre"] for c in categories}

    rows = []
    for p in products:
        rows.append({
            "nombre": p.get("nombre"),
            "codigo_barras": p.get("codigo_barras", ""),
            "tipo": p.get("tipo"),
            "precio": p.get("precio"),
            "precio_por_peso": p.get("precio_por_peso", ""),
            "categoria": cat_map.get(p.get("categoria_id"), ""),
            "stock": p.get("stock"),
            "stock_minimo": p.get("stock_minimo"),
            "activo": p.get("activo"),
        })

    df = pd.DataFrame(rows)

    if format == "xlsx":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Productos")
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=productos.xlsx"},
        )
    else:
        csv_bytes = df.to_csv(index=False).encode("utf-8-sig")
        return StreamingResponse(
            io.BytesIO(csv_bytes),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=productos.csv"},
        )

@api_router.post("/products/import")
async def import_products(
    file: UploadFile = File(...),
    user: User = Depends(require_role([UserRole.ADMIN]))
):
    content = await file.read()
    filename = file.filename or ""

    try:
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(content))
        elif filename.endswith(".csv"):
            df = pd.read_csv(io.StringIO(content.decode("utf-8-sig")))
        else:
            raise HTTPException(status_code=400, detail="Formato no soportado. Use CSV o XLSX.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer el archivo: {str(e)}")

    required_cols = {"nombre", "tipo", "precio", "categoria"}
    missing = required_cols - set(df.columns.str.strip().str.lower())
    if missing:
        raise HTTPException(status_code=400, detail=f"Columnas faltantes: {', '.join(missing)}")

    df.columns = df.columns.str.strip().str.lower()

    categories = await db.categories.find({"empresa_id": user.empresa_id}).to_list(1000)
    cat_map = {c["nombre"].strip().lower(): c["id"] for c in categories}
    branches = await db.branches.find({"activo": True, "empresa_id": user.empresa_id}).to_list(1000)

    created = 0
    updated = 0
    errors = []

    for idx, row in df.iterrows():
        try:
            cat_nombre = str(row.get("categoria", "")).strip().lower()
            categoria_id = cat_map.get(cat_nombre)
            if not categoria_id:
                errors.append(f"Fila {idx + 2}: Categoría '{row.get('categoria')}' no encontrada")
                continue

            raw_barcode = row.get("codigo_barras")
            codigo_barras = str(raw_barcode).strip() if pd.notna(raw_barcode) and str(raw_barcode).strip() not in ("", "nan") else None

            tipo = str(row.get("tipo", "codigo_barras")).strip()
            if tipo not in ("codigo_barras", "por_peso"):
                tipo = "codigo_barras"

            raw_ppp = row.get("precio_por_peso")
            precio_por_peso = float(raw_ppp) if pd.notna(raw_ppp) and str(raw_ppp).strip() not in ("", "nan") else None

            raw_stock = row.get("stock")
            stock = int(float(raw_stock)) if pd.notna(raw_stock) and str(raw_stock).strip() not in ("", "nan") else 0

            raw_stock_min = row.get("stock_minimo")
            stock_minimo = int(float(raw_stock_min)) if pd.notna(raw_stock_min) and str(raw_stock_min).strip() not in ("", "nan") else 10

            product_data = {
                "nombre": str(row["nombre"]).strip(),
                "codigo_barras": codigo_barras,
                "tipo": tipo,
                "precio": float(row["precio"]),
                "precio_por_peso": precio_por_peso,
                "categoria_id": categoria_id,
                "stock": stock,
                "stock_minimo": stock_minimo,
            }

            existing = None
            if codigo_barras:
                existing = await db.products.find_one({"codigo_barras": codigo_barras, "empresa_id": user.empresa_id})

            if existing:
                await db.products.update_one(
                    {"id": existing["id"], "empresa_id": user.empresa_id},
                    {"$set": product_data}
                )
                updated += 1
            else:
                product = Product(**product_data, empresa_id=user.empresa_id)
                await db.products.insert_one(product.dict())
                for branch in branches:
                    bp_exists = await db.branch_products.find_one({
                        "product_id": product.id,
                        "branch_id": branch["id"],
                        "empresa_id": user.empresa_id
                    })
                    if not bp_exists:
                        bp = BranchProduct(
                            empresa_id=user.empresa_id,
                            product_id=product.id,
                            branch_id=branch["id"],
                            precio=product.precio,
                            precio_por_peso=product.precio_por_peso,
                            stock=product.stock,
                            stock_minimo=product.stock_minimo,
                        )
                        await db.branch_products.insert_one(bp.dict())
                created += 1

        except Exception as e:
            errors.append(f"Fila {idx + 2}: {str(e)}")

    return {"created": created, "updated": updated, "errors": errors, "total_procesado": created + updated + len(errors)}

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str, user: User = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id, "empresa_id": user.empresa_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@api_router.get("/products/barcode/{barcode}", response_model=Product)
async def get_product_by_barcode(barcode: str, user: User = Depends(get_current_user)):
    product = await db.products.find_one({"codigo_barras": barcode, "empresa_id": user.empresa_id, "activo": True})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductUpdate, user: User = Depends(require_role([UserRole.ADMIN]))):
    # Check if product exists for this empresa
    existing_product = await db.products.find_one({"id": product_id, "empresa_id": user.empresa_id})
    if not existing_product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Update fields (handle None-exclusive fields carefully)
    update_data = {k: v for k, v in product_data.dict().items() if v is not None}
    # Explicitly include boolean and list fields even when falsy
    if product_data.control_stock is not None:
        update_data['control_stock'] = product_data.control_stock
    if product_data.activo is not None:
        update_data['activo'] = product_data.activo
    if product_data.combo_items is not None:
        update_data['combo_items'] = [ci.dict() for ci in product_data.combo_items]

    # Determine final kind (could be updated or existing)
    final_kind = update_data.get("kind") or existing_product.get("kind", "normal")
    if final_kind == ProductKind.COMBO:
        update_data["control_stock"] = False

    if update_data:
        await db.products.update_one({"id": product_id, "empresa_id": user.empresa_id}, {"$set": update_data})

    updated_product = await db.products.find_one({"id": product_id, "empresa_id": user.empresa_id})
    return Product(**updated_product)

# User management routes
@api_router.get("/users", response_model=List[User])
async def get_users(user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPERVISOR]))):
    users = await db.users.find({"empresa_id": user.empresa_id}).to_list(1000)
    return [User(**u) for u in users]

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_data: UserUpdate, current_user: User = Depends(require_role([UserRole.ADMIN]))):
    user = await db.users.find_one({"id": user_id, "empresa_id": current_user.empresa_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = {k: v for k, v in user_data.dict().items() if v is not None}
    # Allow explicitly setting branch_id to None (removing branch assignment)
    if "branch_id" in user_data.dict() and user_data.branch_id is None:
        update_data["branch_id"] = None
    if update_data:
        await db.users.update_one({"id": user_id, "empresa_id": current_user.empresa_id}, {"$set": update_data})
    updated = await db.users.find_one({"id": user_id, "empresa_id": current_user.empresa_id})
    return User(**updated)

# Configuration routes
@api_router.get("/config", response_model=Configuration)
async def get_configuration(user: User = Depends(get_current_user)):
    config = await db.configuration.find_one({"empresa_id": user.empresa_id})
    if not config:
        # Create default configuration if none exists for this empresa
        default_config = Configuration(empresa_id=user.empresa_id)
        await db.configuration.insert_one(default_config.dict())
        return default_config
    return Configuration(**config)

@api_router.put("/config", response_model=Configuration)
async def update_configuration(config_data: ConfigurationUpdate, user: User = Depends(require_role([UserRole.ADMIN]))):
    # Get current configuration for this empresa
    current_config = await db.configuration.find_one({"empresa_id": user.empresa_id})
    if not current_config:
        current_config = Configuration(empresa_id=user.empresa_id).dict()
        await db.configuration.insert_one(current_config)

    # Update fields
    update_data = {k: v for k, v in config_data.dict().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc)

    if update_data:
        await db.configuration.update_one({"empresa_id": user.empresa_id}, {"$set": update_data})

    updated_config = await db.configuration.find_one({"empresa_id": user.empresa_id})
    return Configuration(**updated_config)

@api_router.post("/config/upload-logo")
async def upload_logo(file: UploadFile = File(...), user: User = Depends(require_role([UserRole.ADMIN]))):
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Validate file size (max 2MB)
    content = await file.read()
    file_size = len(content)

    if file_size > 2 * 1024 * 1024:  # 2MB
        raise HTTPException(status_code=400, detail="File size must be less than 2MB")

    # Convert to base64
    base64_image = base64.b64encode(content).decode('utf-8')
    logo_data_url = f"data:{file.content_type};base64,{base64_image}"

    # Update configuration for this empresa
    await db.configuration.update_one({"empresa_id": user.empresa_id}, {"$set": {
        "company_logo": logo_data_url,
        "updated_at": datetime.now(timezone.utc)
    }})

    return {"message": "Logo uploaded successfully", "logo_url": logo_data_url}

# Sales routes
@api_router.post("/sales", response_model=Sale)
async def create_sale(sale_data: SaleCreate, user: User = Depends(get_current_user)):
    # Check if user has an open cash session
    current_session = await db.cash_sessions.find_one({
        "user_id": user.id,
        "empresa_id": user.empresa_id,
        "status": CashSessionStatus.ABIERTA
    })
    if not current_session:
        raise HTTPException(status_code=400, detail="Debe abrir una caja antes de realizar ventas")

    # Get current configuration for tax rate
    config = await db.configuration.find_one({"empresa_id": user.empresa_id})
    tax_rate = config['tax_rate'] if config else 0.12  # Default 12%

    # Verify products and calculate totals
    total_amount = 0
    validated_items = []

    for item in sale_data.items:
        precio_unitario = None
        product_nombre = None

        # Always fetch global product to know kind/control_stock
        global_product = await db.products.find_one({"id": item.producto_id, "empresa_id": user.empresa_id, "activo": True})
        if not global_product:
            raise HTTPException(status_code=400, detail="Producto no encontrado")

        product_kind = global_product.get('kind', 'normal')
        control_stock = global_product.get('control_stock', True)

        if product_kind == 'combo':
            # Resolve price from branch or global
            if user.branch_id:
                branch_product = await db.branch_products.find_one({
                    "product_id": item.producto_id,
                    "branch_id": user.branch_id,
                    "empresa_id": user.empresa_id,
                    "activo": True
                })
                if branch_product:
                    precio_unitario = branch_product.get('precio_por_peso') or branch_product['precio']
            if precio_unitario is None:
                precio_unitario = global_product.get('precio_por_peso') or global_product['precio']
            product_nombre = global_product['nombre']

            # Deduct stock from each combo component
            combo_items = global_product.get('combo_items', [])
            for ci in combo_items:
                comp = await db.products.find_one({"id": ci['product_id'], "empresa_id": user.empresa_id})
                if not comp or not comp.get('control_stock', True):
                    continue
                comp_cantidad = ci['cantidad'] * item.cantidad
                deducted = False
                if user.branch_id:
                    comp_bp = await db.branch_products.find_one({
                        "product_id": ci['product_id'],
                        "branch_id": user.branch_id,
                        "empresa_id": user.empresa_id,
                        "activo": True
                    })
                    if comp_bp:
                        if comp_bp['stock'] < comp_cantidad:
                            raise HTTPException(status_code=400, detail=f"Stock insuficiente para {comp['nombre']} (componente del combo)")
                        await db.branch_products.update_one(
                            {"product_id": ci['product_id'], "branch_id": user.branch_id, "empresa_id": user.empresa_id},
                            {"$inc": {"stock": -int(comp_cantidad)}}
                        )
                        deducted = True
                if not deducted:
                    if comp['stock'] < comp_cantidad:
                        raise HTTPException(status_code=400, detail=f"Stock insuficiente para {comp['nombre']} (componente del combo)")
                    await db.products.update_one(
                        {"id": ci['product_id'], "empresa_id": user.empresa_id},
                        {"$inc": {"stock": -int(comp_cantidad)}}
                    )

        else:
            # Normal product: try branch first
            if user.branch_id:
                branch_product = await db.branch_products.find_one({
                    "product_id": item.producto_id,
                    "branch_id": user.branch_id,
                    "empresa_id": user.empresa_id,
                    "activo": True
                })
                if branch_product:
                    if control_stock and branch_product['stock'] < item.cantidad:
                        raise HTTPException(status_code=400, detail=f"Stock insuficiente para {global_product['nombre']}")
                    precio_unitario = branch_product.get('precio_por_peso') or branch_product['precio']
                    if control_stock:
                        await db.branch_products.update_one(
                            {"product_id": item.producto_id, "branch_id": user.branch_id, "empresa_id": user.empresa_id},
                            {"$inc": {"stock": -int(item.cantidad)}}
                        )
                    product_nombre = global_product['nombre']

            # Fall back to global product
            if precio_unitario is None:
                if control_stock and global_product['stock'] < item.cantidad:
                    raise HTTPException(status_code=400, detail=f"Stock insuficiente para {global_product['nombre']}")
                precio_unitario = global_product.get('precio_por_peso') or global_product['precio']
                product_nombre = global_product['nombre']
                if control_stock:
                    await db.products.update_one(
                        {"id": item.producto_id, "empresa_id": user.empresa_id},
                        {"$inc": {"stock": -int(item.cantidad)}}
                    )

        # Calculate subtotal
        subtotal = item.cantidad * precio_unitario
        validated_items.append(SaleItem(
            producto_id=item.producto_id,
            nombre=product_nombre,
            cantidad=item.cantidad,
            precio_unitario=precio_unitario,
            subtotal=subtotal
        ))
        total_amount += subtotal

    # Generate invoice number
    branch_id_for_sale = user.branch_id or "global"
    last_sale = await db.sales.find_one(
        {"branch_id": branch_id_for_sale, "empresa_id": user.empresa_id},
        sort=[("fecha", -1)]
    )
    if last_sale and last_sale.get('numero_factura'):
        last_number = int(last_sale['numero_factura'].split('-')[-1])
        numero_factura = f"FAC-{last_number + 1:06d}"
    else:
        numero_factura = "FAC-000001"

    # Calculate totals
    subtotal = total_amount
    impuestos = total_amount * tax_rate
    base_total = total_amount * (1 + tax_rate)
    # Apply payment method adjustment
    adjustments = (config.get('payment_method_adjustments') or {}) if config else {}
    adjustment_pct = adjustments.get(sale_data.metodo_pago.value, 0.0)
    adjustment_amount = base_total * (adjustment_pct / 100.0)
    total = base_total + adjustment_amount

    # Create sale
    sale = Sale(
        empresa_id=user.empresa_id,
        cajero_id=user.id,
        branch_id=branch_id_for_sale,
        session_id=current_session['id'],
        items=validated_items,
        subtotal=subtotal,
        impuestos=impuestos,
        total=total,
        metodo_pago=sale_data.metodo_pago,
        numero_factura=numero_factura
    )

    await db.sales.insert_one(sale.dict())

    # Update cash session
    await db.cash_sessions.update_one(
        {"id": current_session['id'], "empresa_id": user.empresa_id},
        {"$inc": {"monto_ventas": total}}
    )

    # Create cash movement
    movement = CashMovement(
        empresa_id=user.empresa_id,
        session_id=current_session['id'],
        tipo=MovementType.VENTA,
        monto=total,
        descripcion=f"Venta {numero_factura} - {sale_data.metodo_pago}",
        venta_id=sale.id
    )
    await db.cash_movements.insert_one(movement.dict())

    # ── Solicitar CAE a ARCA/AFIP (modo contingencia si falla) ────────────────
    afip_cfg = await db.afip_config.find_one({"empresa_id": user.empresa_id, "activo": True})
    if afip_cfg and afip_cfg.get("cert_pem") and afip_cfg.get("key_pem_encrypted"):
        try:
            tipo_cbte = sale_data.tipo_comprobante or afip_cfg.get("tipo_comprobante_default", 6)
            token, sign = await _afip_service.get_token_sign(afip_cfg, db, SECRET_KEY)
            cae_result = await _afip_service.solicitar_cae(
                sale.dict(), afip_cfg, token, sign, tipo_cbte,
                cuit_receptor=sale_data.cuit_receptor
            )
            afip_update = {
                "cae": cae_result["cae"],
                "cae_vencimiento": cae_result["cae_vencimiento"],
                "afip_estado": "autorizado",
                "tipo_comprobante": tipo_cbte,
                "nro_comprobante_afip": cae_result["nro_comprobante"],
            }
            await db.sales.update_one({"id": sale.id}, {"$set": afip_update})
            sale.cae = cae_result["cae"]
            sale.cae_vencimiento = cae_result["cae_vencimiento"]
            sale.afip_estado = "autorizado"
            sale.tipo_comprobante = tipo_cbte
            sale.nro_comprobante_afip = cae_result["nro_comprobante"]
        except Exception as afip_err:
            logger.warning(f"AFIP contingencia para venta {sale.id}: {afip_err}")
            await db.sales.update_one(
                {"id": sale.id},
                {"$set": {"afip_estado": "contingencia", "afip_error": str(afip_err)}}
            )
            sale.afip_estado = "contingencia"
            sale.afip_error = str(afip_err)

    return sale

@api_router.get("/sales", response_model=List[Sale])
async def get_sales(user: User = Depends(get_current_user)):
    if user.rol == UserRole.CAJERO:
        sales = await db.sales.find({"cajero_id": user.id, "empresa_id": user.empresa_id}).sort("fecha", -1).to_list(100)
    else:
        sales = await db.sales.find({"empresa_id": user.empresa_id}).sort("fecha", -1).to_list(1000)

    return [Sale(**sale) for sale in sales]

@api_router.get("/sales/{sale_id}/returns", response_model=List[SaleReturn])
async def get_sale_returns(sale_id: str, user: User = Depends(get_current_user)):
    returns = await db.sale_returns.find({"sale_id": sale_id, "empresa_id": user.empresa_id}).sort("fecha", -1).to_list(100)
    return [SaleReturn(**r) for r in returns]

@api_router.post("/sales/{sale_id}/return")
async def create_sale_return(sale_id: str, return_data: ReturnCreate, user: User = Depends(get_current_user)):
    sale = await db.sales.find_one({"id": sale_id, "empresa_id": user.empresa_id})
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    sale_obj = Sale(**sale)

    if sale_obj.estado == "cancelado":
        raise HTTPException(status_code=400, detail="Esta venta ya fue cancelada completamente")

    # Quantities already returned for this sale
    existing_returns = await db.sale_returns.find({"sale_id": sale_id}).to_list(100)
    returned_qty = {}
    for ret in existing_returns:
        for item in ret["items"]:
            pid = item["producto_id"]
            returned_qty[pid] = returned_qty.get(pid, 0) + item["cantidad"]

    sale_items_map = {item.producto_id: item for item in sale_obj.items}
    return_items = []
    total_return = 0.0

    for ri in return_data.items:
        if ri.cantidad <= 0:
            continue
        original = sale_items_map.get(ri.producto_id)
        if not original:
            raise HTTPException(status_code=400, detail=f"Producto no encontrado en la venta")
        available = original.cantidad - returned_qty.get(ri.producto_id, 0)
        if ri.cantidad > available:
            prod = await db.products.find_one({"id": ri.producto_id})
            name = prod["nombre"] if prod else ri.producto_id
            raise HTTPException(status_code=400, detail=f"Solo quedan {available} unidades disponibles para devolver de '{name}'")
        subtotal = ri.cantidad * original.precio_unitario
        total_return += subtotal
        return_items.append(SaleItem(
            producto_id=ri.producto_id,
            nombre=original.nombre,
            cantidad=ri.cantidad,
            precio_unitario=original.precio_unitario,
            subtotal=subtotal
        ))

    if not return_items:
        raise HTTPException(status_code=400, detail="Debe seleccionar al menos un producto para devolver")

    # Restore stock
    for item in return_items:
        await db.products.update_one(
            {"id": item.producto_id, "empresa_id": user.empresa_id},
            {"$inc": {"stock": int(item.cantidad)}}
        )
        if sale_obj.branch_id and sale_obj.branch_id != "global":
            await db.branch_products.update_one(
                {"product_id": item.producto_id, "branch_id": sale_obj.branch_id, "empresa_id": user.empresa_id},
                {"$inc": {"stock": int(item.cantidad)}}
            )

    # Generate return number
    count = await db.sale_returns.count_documents({"empresa_id": user.empresa_id})
    numero_devolucion = f"DEV-{str(count + 1).zfill(6)}"

    sale_return = SaleReturn(
        empresa_id=user.empresa_id,
        sale_id=sale_id,
        cajero_id=user.id,
        items=return_items,
        total=total_return,
        motivo=return_data.motivo,
        numero_devolucion=numero_devolucion
    )
    await db.sale_returns.insert_one(sale_return.dict())

    # Update sale estado
    new_returned = dict(returned_qty)
    for item in return_items:
        new_returned[item.producto_id] = new_returned.get(item.producto_id, 0) + item.cantidad
    fully_returned = all(new_returned.get(si.producto_id, 0) >= si.cantidad for si in sale_obj.items)
    new_estado = "cancelado" if fully_returned else "devolucion_parcial"
    await db.sales.update_one({"id": sale_id}, {"$set": {"estado": new_estado}})

    # Reduce cash session monto_ventas
    await db.cash_sessions.update_one(
        {"id": sale_obj.session_id},
        {"$inc": {"monto_ventas": -total_return}}
    )

    # Cash movement
    movement = CashMovement(
        empresa_id=user.empresa_id,
        session_id=sale_obj.session_id,
        tipo=MovementType.DEVOLUCION,
        monto=-total_return,
        descripcion=f"Devolución {numero_devolucion} - Factura {sale_obj.numero_factura}",
        venta_id=sale_id
    )
    await db.cash_movements.insert_one(movement.dict())

    return {"message": "Devolución procesada exitosamente", "numero_devolucion": numero_devolucion, "total": total_return}

# Cash Reports routes
@api_router.get("/cash-sessions/{session_id}/movements", response_model=List[CashMovement])
async def get_session_movements(session_id: str, user: User = Depends(get_current_user)):
    movements = await db.cash_movements.find({"session_id": session_id, "empresa_id": user.empresa_id}).sort("fecha", 1).to_list(1000)
    return [CashMovement(**movement) for movement in movements]

@api_router.get("/cash-sessions/{session_id}/report")
async def get_cash_session_report(session_id: str, user: User = Depends(get_current_user)):
    session = await db.cash_sessions.find_one({"id": session_id, "empresa_id": user.empresa_id})
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    # Get movements
    movements_docs = await db.cash_movements.find({"session_id": session_id, "empresa_id": user.empresa_id}).sort("fecha", 1).to_list(1000)
    movements = [CashMovement(**movement) for movement in movements_docs]

    # Get sales details
    sales_docs = await db.sales.find({"session_id": session_id, "empresa_id": user.empresa_id}).to_list(1000)
    sales = [Sale(**sale) for sale in sales_docs]

    # Get user info
    user_doc = await db.users.find_one({"id": session["user_id"], "empresa_id": user.empresa_id})
    user_info = User(**user_doc) if user_doc else None

    # Get branch info
    branch_doc = await db.branches.find_one({"id": session["branch_id"], "empresa_id": user.empresa_id})
    branch_info = Branch(**branch_doc) if branch_doc else None

    return {
        "session": CashSession(**session),
        "movements": movements,
        "sales": sales,
        "user": user_info,
        "branch": branch_info,
        "resumen": {
            "total_ventas": len(sales),
            "ingresos_efectivo": sum(sale.total for sale in sales if sale.metodo_pago == 'efectivo'),
            "ingresos_tarjeta": sum(sale.total for sale in sales if sale.metodo_pago == 'tarjeta'),
            "ingresos_transferencia": sum(sale.total for sale in sales if sale.metodo_pago == 'transferencia'),
        }
    }

# Dashboard routes
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: User = Depends(get_current_user)):
    is_admin_or_supervisor = user.rol in [UserRole.ADMIN, UserRole.SUPERVISOR]

    # Today's sales
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)

    sales_filter = {"empresa_id": user.empresa_id, "fecha": {"$gte": today, "$lt": tomorrow}}
    if not is_admin_or_supervisor and user.branch_id:
        sales_filter["branch_id"] = user.branch_id

    today_sales = await db.sales.find(sales_filter).to_list(1000)
    total_ventas_hoy = sum(sale['total'] for sale in today_sales)
    numero_ventas_hoy = len(today_sales)

    # Total products
    total_productos = await db.products.count_documents({"empresa_id": user.empresa_id, "activo": True})

    # Low stock from branch_products (real per-branch stock)
    # Exclude combo products and products with control_stock=False
    excluded_dash = await db.products.find(
        {"empresa_id": user.empresa_id, "$or": [{"kind": "combo"}, {"control_stock": False}]},
        {"id": 1}
    ).to_list(100000)
    excluded_ids_dash = [p["id"] for p in excluded_dash]

    bp_filter = {
        "empresa_id": user.empresa_id,
        "activo": True,
        "$expr": {"$lte": ["$stock", "$stock_minimo"]}
    }
    if excluded_ids_dash:
        bp_filter["product_id"] = {"$nin": excluded_ids_dash}
    if not is_admin_or_supervisor and user.branch_id:
        bp_filter["branch_id"] = user.branch_id
    elif is_admin_or_supervisor and user.rol == UserRole.SUPERVISOR and user.branch_id:
        bp_filter["branch_id"] = user.branch_id

    bajo_stock_bps = await db.branch_products.find(bp_filter).to_list(1000)
    bajo_stock_count = len(bajo_stock_bps)

    # Build preview list (up to 5) with product names
    preview = []
    for bp in bajo_stock_bps[:5]:
        prod = await db.products.find_one({"id": bp["product_id"], "empresa_id": user.empresa_id})
        branch = await db.branches.find_one({"id": bp["branch_id"], "empresa_id": user.empresa_id})
        if prod:
            preview.append({
                "id": bp["id"],
                "nombre": prod.get("nombre", ""),
                "sucursal": branch.get("nombre", "") if branch else "",
                "stock": bp.get("stock", 0),
                "stock_minimo": bp.get("stock_minimo", 0)
            })

    return {
        "ventas_hoy": {
            "total": total_ventas_hoy,
            "cantidad": numero_ventas_hoy
        },
        "productos": {
            "total": total_productos,
            "bajo_stock": bajo_stock_count
        },
        "productos_bajo_stock": preview
    }

@api_router.get("/dashboard/stock-alerts")
async def get_stock_alerts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=10000),
    user: User = Depends(get_current_user)
):
    is_admin = user.rol == UserRole.ADMIN

    # Exclude combo products and products with control_stock=False
    excluded_prods = await db.products.find(
        {"empresa_id": user.empresa_id, "$or": [{"kind": "combo"}, {"control_stock": False}]},
        {"id": 1}
    ).to_list(100000)
    excluded_ids = [p["id"] for p in excluded_prods]

    bp_filter = {
        "empresa_id": user.empresa_id,
        "activo": True,
        "$expr": {"$lte": ["$stock", "$stock_minimo"]}
    }
    if excluded_ids:
        bp_filter["product_id"] = {"$nin": excluded_ids}
    # Supervisor and cajero: filter to their branch
    if user.rol != UserRole.ADMIN and user.branch_id:
        bp_filter["branch_id"] = user.branch_id

    total = await db.branch_products.count_documents(bp_filter)
    skip = (page - 1) * per_page
    bajo_stock_bps = await db.branch_products.find(bp_filter).skip(skip).limit(per_page).to_list(per_page)

    # Fetch product and branch info
    items = []
    for bp in bajo_stock_bps:
        prod = await db.products.find_one({"id": bp["product_id"], "empresa_id": user.empresa_id})
        branch = await db.branches.find_one({"id": bp["branch_id"], "empresa_id": user.empresa_id})
        items.append({
            "branch_product_id": bp["id"],
            "product_id": bp["product_id"],
            "branch_id": bp["branch_id"],
            "nombre": prod.get("nombre", "") if prod else "",
            "codigo_barras": prod.get("codigo_barras", "") if prod else "",
            "sucursal": branch.get("nombre", "") if branch else "",
            "stock": bp.get("stock", 0),
            "stock_minimo": bp.get("stock_minimo", 0),
            "diferencia": bp.get("stock", 0) - bp.get("stock_minimo", 0)
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, -(-total // per_page))
    }

@api_router.get("/dashboard/stock-alerts/export")
async def export_stock_alerts(
    format: str = Query("xlsx"),
    user: User = Depends(get_current_user)
):
    excluded_prods_exp = await db.products.find(
        {"empresa_id": user.empresa_id, "$or": [{"kind": "combo"}, {"control_stock": False}]},
        {"id": 1}
    ).to_list(100000)
    excluded_ids_exp = [p["id"] for p in excluded_prods_exp]

    bp_filter = {
        "empresa_id": user.empresa_id,
        "activo": True,
        "$expr": {"$lte": ["$stock", "$stock_minimo"]}
    }
    if excluded_ids_exp:
        bp_filter["product_id"] = {"$nin": excluded_ids_exp}
    if user.rol != UserRole.ADMIN and user.branch_id:
        bp_filter["branch_id"] = user.branch_id

    bajo_stock_bps = await db.branch_products.find(bp_filter).to_list(10000)

    rows = []
    for bp in bajo_stock_bps:
        prod = await db.products.find_one({"id": bp["product_id"], "empresa_id": user.empresa_id})
        branch = await db.branches.find_one({"id": bp["branch_id"], "empresa_id": user.empresa_id})
        rows.append({
            "Producto": prod.get("nombre", "") if prod else "",
            "Código de Barras": prod.get("codigo_barras", "") if prod else "",
            "Sucursal": branch.get("nombre", "") if branch else "",
            "Stock Actual": bp.get("stock", 0),
            "Stock Mínimo": bp.get("stock_minimo", 0),
            "Diferencia": bp.get("stock", 0) - bp.get("stock_minimo", 0)
        })

    df = pd.DataFrame(rows)
    output = io.BytesIO()

    if format == "xlsx":
        df.to_excel(output, index=False)
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=stock_bajo.xlsx"}
        )
    else:
        df.to_csv(output, index=False)
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=stock_bajo.csv"}
        )

# Proveedores routes
@api_router.post("/proveedores", response_model=Proveedor)
async def create_proveedor(
    proveedor_data: ProveedorCreate,
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPERVISOR]))
):
    proveedor = Proveedor(**proveedor_data.dict(), empresa_id=user.empresa_id)
    await db.proveedores.insert_one(proveedor.dict())
    return proveedor

@api_router.get("/proveedores", response_model=List[Proveedor])
async def get_proveedores(
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPERVISOR]))
):
    proveedores = await db.proveedores.find(
        {"empresa_id": user.empresa_id}
    ).sort("nombre", 1).to_list(1000)
    return [Proveedor(**p) for p in proveedores]

@api_router.put("/proveedores/{proveedor_id}", response_model=Proveedor)
async def update_proveedor(
    proveedor_id: str,
    proveedor_data: ProveedorUpdate,
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPERVISOR]))
):
    proveedor = await db.proveedores.find_one({"id": proveedor_id, "empresa_id": user.empresa_id})
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor not found")
    update_data = {k: v for k, v in proveedor_data.dict().items() if v is not None}
    if update_data:
        await db.proveedores.update_one({"id": proveedor_id}, {"$set": update_data})
    updated = await db.proveedores.find_one({"id": proveedor_id})
    return Proveedor(**updated)

@api_router.delete("/proveedores/{proveedor_id}")
async def delete_proveedor(
    proveedor_id: str,
    user: User = Depends(require_role([UserRole.ADMIN]))
):
    proveedor = await db.proveedores.find_one({"id": proveedor_id, "empresa_id": user.empresa_id})
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor not found")
    await db.proveedores.update_one({"id": proveedor_id}, {"$set": {"activo": False}})
    return {"message": "Proveedor deactivated"}

# Compras routes
@api_router.post("/compras", response_model=Compra)
async def create_compra(
    compra_data: CompraCreate,
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPERVISOR]))
):
    proveedor_nombre = None
    if compra_data.proveedor_id:
        prov = await db.proveedores.find_one({"id": compra_data.proveedor_id, "empresa_id": user.empresa_id})
        if prov:
            proveedor_nombre = prov["nombre"]
    compra = Compra(
        **compra_data.dict(),
        empresa_id=user.empresa_id,
        proveedor_nombre=proveedor_nombre,
        registrado_por=user.id
    )
    await db.compras.insert_one(compra.dict())

    # Update product costs (and optionally sale prices) and stock for linked items
    if compra_data.sucursal_id:
        for item in compra_data.items:
            if item.product_id:
                bp = await db.branch_products.find_one({
                    "product_id": item.product_id,
                    "branch_id": compra_data.sucursal_id,
                    "empresa_id": user.empresa_id
                })
                if bp:
                    bp_update: dict = {"costo": item.precio_unitario}
                    if item.actualizar_precio:
                        margen = bp.get("margen") or 0
                        bp_update["precio"] = round(item.precio_unitario * (1 + margen / 100), 2)
                    await db.branch_products.update_one(
                        {"id": bp["id"]},
                        {"$set": bp_update, "$inc": {"stock": int(item.cantidad)}}
                    )
                else:
                    # No branch_product exists yet — create one with purchase stock
                    global_product = await db.products.find_one({"id": item.product_id, "empresa_id": user.empresa_id})
                    if global_product:
                        new_bp = BranchProduct(
                            empresa_id=user.empresa_id,
                            product_id=item.product_id,
                            branch_id=compra_data.sucursal_id,
                            precio=global_product.get("precio", 0),
                            stock=int(item.cantidad),
                            stock_minimo=global_product.get("stock_minimo", 10),
                            costo=item.precio_unitario,
                        )
                        await db.branch_products.insert_one(new_bp.dict())
                # Also increment global product stock
                await db.products.update_one(
                    {"id": item.product_id, "empresa_id": user.empresa_id},
                    {"$inc": {"stock": int(item.cantidad)}}
                )

    return compra

@api_router.get("/compras", response_model=List[Compra])
async def get_compras(
    proveedor_id: Optional[str] = None,
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPERVISOR]))
):
    query = {"empresa_id": user.empresa_id}
    if proveedor_id:
        query["proveedor_id"] = proveedor_id
    if fecha_desde or fecha_hasta:
        query["fecha"] = {}
        if fecha_desde:
            query["fecha"]["$gte"] = fecha_desde
        if fecha_hasta:
            query["fecha"]["$lte"] = fecha_hasta
    compras = await db.compras.find(query).sort("fecha", -1).to_list(1000)
    return [Compra(**c) for c in compras]

@api_router.get("/compras/{compra_id}", response_model=Compra)
async def get_compra(
    compra_id: str,
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPERVISOR]))
):
    compra = await db.compras.find_one({"id": compra_id, "empresa_id": user.empresa_id})
    if not compra:
        raise HTTPException(status_code=404, detail="Compra not found")
    return Compra(**compra)

@api_router.put("/compras/{compra_id}", response_model=Compra)
async def update_compra(
    compra_id: str,
    compra_data: CompraUpdate,
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPERVISOR]))
):
    compra = await db.compras.find_one({"id": compra_id, "empresa_id": user.empresa_id})
    if not compra:
        raise HTTPException(status_code=404, detail="Compra not found")
    update_data = {k: v for k, v in compra_data.dict().items() if v is not None}
    if "proveedor_id" in update_data:
        prov = await db.proveedores.find_one({"id": update_data["proveedor_id"], "empresa_id": user.empresa_id})
        update_data["proveedor_nombre"] = prov["nombre"] if prov else None
    if update_data:
        await db.compras.update_one({"id": compra_id}, {"$set": update_data})
    updated = await db.compras.find_one({"id": compra_id})
    return Compra(**updated)

@api_router.delete("/compras/{compra_id}")
async def delete_compra(
    compra_id: str,
    user: User = Depends(require_role([UserRole.ADMIN]))
):
    compra = await db.compras.find_one({"id": compra_id, "empresa_id": user.empresa_id})
    if not compra:
        raise HTTPException(status_code=404, detail="Compra not found")
    await db.compras.delete_one({"id": compra_id})
    return {"message": "Compra deleted"}

# ─────────────────────────────────────────────
# CUENTA / SUSCRIPCIÓN routes
# ─────────────────────────────────────────────

async def _get_or_create_suscripcion(empresa_id: str) -> dict:
    """Devuelve la suscripción de la empresa; si no existe, crea una trial."""
    doc = await db.suscripciones.find_one({"empresa_id": empresa_id})
    if not doc:
        now = datetime.now(timezone.utc)
        dia_facturacion = min(now.day, 28)
        suscripcion = Suscripcion(
            empresa_id=empresa_id,
            plan_nombre=await get_plan_nombre_suscripcion(),
            precio=await get_precio_suscripcion(),
            status=SuscripcionStatus.TRIAL,
            fecha_inicio=now,
            fecha_vencimiento=now + timedelta(days=await get_trial_dias()),
            dia_facturacion=dia_facturacion,
            plan_tipo="mensual",
        )
        await db.suscripciones.insert_one(suscripcion.dict())
        doc = suscripcion.dict()
    # Normalizar vencimiento
    vencimiento = doc["fecha_vencimiento"]
    if isinstance(vencimiento, str):
        vencimiento = datetime.fromisoformat(vencimiento)
    if not vencimiento.tzinfo:
        vencimiento = vencimiento.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    # Auto-actualizar status si corresponde
    if vencimiento < now:
        if doc["status"] == SuscripcionStatus.TRIAL:
            # Trial vencido: sin periodo de gracia, bloqueo inmediato
            await db.suscripciones.update_one(
                {"empresa_id": empresa_id},
                {"$set": {"status": SuscripcionStatus.VENCIDA}}
            )
            doc["status"] = SuscripcionStatus.VENCIDA
        elif doc["status"] == SuscripcionStatus.ACTIVA:
            # Suscripción paga: periodo de gracia de GRACE_DAYS días
            gracia_fin = vencimiento + timedelta(days=GRACE_DAYS)
            if now > gracia_fin:
                # Gracia expirada → bloquear
                await db.suscripciones.update_one(
                    {"empresa_id": empresa_id},
                    {"$set": {"status": SuscripcionStatus.VENCIDA}}
                )
                doc["status"] = SuscripcionStatus.VENCIDA
            # else: dentro de gracia, mantener ACTIVA en DB
    return doc


def _calcular_estado_suscripcion(doc: dict) -> dict:
    """Calcula campos derivados de una suscripción: en_gracia, gracia_vencimiento, bloqueado, dias_restantes."""
    now = datetime.now(timezone.utc)
    vencimiento = doc["fecha_vencimiento"]
    if isinstance(vencimiento, str):
        vencimiento = datetime.fromisoformat(vencimiento)
    if not vencimiento.tzinfo:
        vencimiento = vencimiento.replace(tzinfo=timezone.utc)

    en_gracia = False
    gracia_vencimiento = None
    if doc["status"] == SuscripcionStatus.ACTIVA and vencimiento < now:
        gracia_vencimiento = vencimiento + timedelta(days=GRACE_DAYS)
        en_gracia = True

    if en_gracia:
        dias_restantes = max(0, (gracia_vencimiento - now).days)
    else:
        dias_restantes = max(0, (vencimiento - now).days)

    bloqueado = doc["status"] in (SuscripcionStatus.VENCIDA, SuscripcionStatus.SUSPENDIDA)
    return {
        "en_gracia": en_gracia,
        "gracia_vencimiento": gracia_vencimiento,
        "dias_restantes": dias_restantes,
        "bloqueado": bloqueado,
    }


@api_router.get("/cuenta/status")
async def get_cuenta_status(user: User = Depends(require_role([UserRole.ADMIN]))):
    doc = await _get_or_create_suscripcion(user.empresa_id)
    estado = _calcular_estado_suscripcion(doc)
    return {
        "id": doc["id"],
        "plan_nombre": doc["plan_nombre"],
        "precio": doc["precio"],
        "moneda": doc["moneda"],
        "status": doc["status"],
        "fecha_inicio": doc["fecha_inicio"],
        "fecha_vencimiento": doc["fecha_vencimiento"],
        "fue_pagada": doc.get("fue_pagada", False),
        **estado,
    }


@api_router.get("/auth/suscripcion")
async def get_suscripcion_check(user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.CAJERO]))):
    """Estado de suscripción para control de acceso. Accesible a todos los roles autenticados."""
    doc = await _get_or_create_suscripcion(user.empresa_id)
    estado = _calcular_estado_suscripcion(doc)
    return {
        "status": doc["status"],
        "fecha_vencimiento": doc["fecha_vencimiento"],
        "fue_pagada": doc.get("fue_pagada", False),
        **estado,
    }


@api_router.get("/cuenta/pagos")
async def get_cuenta_pagos(user: User = Depends(require_role([UserRole.ADMIN]))):
    pagos = await db.pagos_suscripcion.find(
        {"empresa_id": user.empresa_id}
    ).sort("fecha", -1).to_list(50)
    return [PagoSuscripcion(**p) for p in pagos]


@api_router.get("/cuenta/planes")
async def get_planes(user: User = Depends(require_role([UserRole.ADMIN]))):
    precio_mensual = await get_precio_suscripcion()
    nombre_base = await get_plan_nombre_suscripcion()
    whatsapp = await get_whatsapp_numero()
    return {
        "mensual": {"plan_tipo": "mensual", "nombre": nombre_base, "precio": precio_mensual, "meses": 1},
        "anual":   {"plan_tipo": "anual",   "nombre": f"{nombre_base} Anual", "precio": precio_mensual * 11, "meses": 12},
        "whatsapp_numero": whatsapp,
    }

@api_router.get("/public/planes")
async def get_planes_public():
    precio_mensual = await get_precio_suscripcion()
    nombre_base = await get_plan_nombre_suscripcion()
    return {
        "mensual": {"plan_tipo": "mensual", "nombre": nombre_base, "precio": precio_mensual, "meses": 1},
        "anual":   {"plan_tipo": "anual",   "nombre": f"{nombre_base} Anual", "precio": precio_mensual * 11, "meses": 12},
        "trial_dias": await get_trial_dias(),
    }


@api_router.get("/notificaciones")
async def get_notificaciones(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(require_role([UserRole.ADMIN]))
):
    skip = (page - 1) * per_page
    total = await db.notificaciones.count_documents({"empresa_id": user.empresa_id})
    items = await db.notificaciones.find(
        {"empresa_id": user.empresa_id}
    ).sort("fecha", -1).skip(skip).limit(per_page).to_list(per_page)
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [Notificacion(**n).dict() for n in items],
    }


@api_router.get("/notificaciones/count")
async def get_notificaciones_count(user: User = Depends(require_role([UserRole.ADMIN]))):
    count = await db.notificaciones.count_documents(
        {"empresa_id": user.empresa_id, "leida": False}
    )
    return {"no_leidas": count}


@api_router.put("/notificaciones/leer-todas")
async def marcar_todas_leidas(user: User = Depends(require_role([UserRole.ADMIN]))):
    await db.notificaciones.update_many(
        {"empresa_id": user.empresa_id, "leida": False},
        {"$set": {"leida": True}},
    )
    return {"ok": True}


@api_router.put("/notificaciones/{notif_id}/leer")
async def marcar_notificacion_leida(notif_id: str, user: User = Depends(require_role([UserRole.ADMIN]))):
    result = await db.notificaciones.update_one(
        {"id": notif_id, "empresa_id": user.empresa_id},
        {"$set": {"leida": True}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return {"ok": True}


class PagoCreate(BaseModel):
    plan_tipo: str = "mensual"  # "mensual" | "anual"


@api_router.post("/cuenta/pago/crear")
async def crear_pago_suscripcion(data: PagoCreate = PagoCreate(), user: User = Depends(require_role([UserRole.ADMIN]))):
    if not MP_ACCESS_TOKEN or MP_ACCESS_TOKEN.startswith("APP_USR-your"):
        raise HTTPException(status_code=503, detail="MercadoPago no configurado. Configure MP_ACCESS_TOKEN en .env")

    # Cancelar preferencias abandonadas (pending sin mp_payment_id = nunca se pagaron)
    await db.pagos_suscripcion.update_many(
        {"empresa_id": user.empresa_id, "estado": "pending", "mp_payment_id": {"$in": [None, ""]}},
        {"$set": {"estado": "cancelled"}},
    )

    # Bloquear solo si hay un pago pendiente con mp_payment_id (pagó con método lento, esperando acreditación)
    pago_pendiente = await db.pagos_suscripcion.find_one({
        "empresa_id": user.empresa_id,
        "estado": "pending",
        "mp_payment_id": {"$nin": [None, ""]},
    })
    if pago_pendiente:
        raise HTTPException(status_code=409, detail="Ya tenés un pago en proceso de acreditación. Puede tardar unas horas. Esperá la confirmación antes de iniciar uno nuevo.")

    # Plan tipo y precio
    plan_tipo = data.plan_tipo if data.plan_tipo in ("mensual", "anual") else "mensual"
    precio_mensual = await get_precio_suscripcion()
    nombre_base = await get_plan_nombre_suscripcion()
    if plan_tipo == "anual":
        precio = precio_mensual * 11
        plan_nombre = f"{nombre_base} Anual"
        ventana_dias = 60
        meses = 12
    else:
        precio = precio_mensual
        plan_nombre = nombre_base
        ventana_dias = 30
        meses = 1

    # Verificar que la suscripción esté próxima a vencer o ya vencida
    suscripcion = await db.suscripciones.find_one({"empresa_id": user.empresa_id})
    if suscripcion:
        vencimiento = suscripcion.get("fecha_vencimiento")
        if isinstance(vencimiento, str):
            vencimiento = datetime.fromisoformat(vencimiento)
        if vencimiento and not vencimiento.tzinfo:
            vencimiento = vencimiento.replace(tzinfo=timezone.utc)
        if vencimiento:
            dias_restantes = (vencimiento - datetime.now(timezone.utc)).days
            if dias_restantes > ventana_dias:
                raise HTTPException(
                    status_code=400,
                    detail=f"Tu suscripción vence en {dias_restantes} días. Podrás renovar cuando queden {ventana_dias} días o menos."
                )

    # Obtener empresa
    empresa = await db.empresas.find_one({"id": user.empresa_id})
    empresa_nombre = empresa["nombre"] if empresa else user.empresa_id
    sdk = mercadopago.SDK(MP_ACCESS_TOKEN)
    preference_data = {
        "items": [
            {
                "title": f"{plan_nombre} - {empresa_nombre}",
                "quantity": 1,
                "unit_price": precio,
                "currency_id": "ARS",
            }
        ],
        "back_urls": {
            "success": f"{FRONTEND_URL}/cuenta?pago=success",
            "failure": f"{FRONTEND_URL}/cuenta?pago=failure",
            "pending": f"{FRONTEND_URL}/cuenta?pago=pending",
        },
        **({"auto_return": "approved"} if not FRONTEND_URL.startswith("http://localhost") else {}),
        "notification_url": f"{APP_URL}/api/mercadopago/webhook",
        "external_reference": user.empresa_id,
        "statement_descriptor": "SuperMarket POS",
    }
    response = sdk.preference().create(preference_data)
    if response["status"] not in (200, 201):
        import logging
        logging.error(f"MercadoPago error: status={response['status']}, response={response.get('response')}")
        detail = response.get("response", {}).get("message", "Error al crear preferencia en MercadoPago")
        raise HTTPException(status_code=502, detail=f"Error MP ({response['status']}): {detail}")

    preference = response["response"]

    # Registrar pago pendiente
    pago = PagoSuscripcion(
        empresa_id=user.empresa_id,
        monto=precio,
        moneda="ARS",
        estado="pending",
        concepto=f"{plan_nombre} - {empresa_nombre}",
        mp_preference_id=preference["id"],
        plan_tipo=plan_tipo,
    )
    await db.pagos_suscripcion.insert_one(pago.dict())

    return {
        "init_point": preference["init_point"],
        "sandbox_init_point": preference.get("sandbox_init_point"),
        "preference_id": preference["id"],
    }


@api_router.post("/cuenta/pago/simular-aprobado")
async def simular_pago_aprobado(
    plan_tipo: str = "mensual",
    user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Solo para desarrollo/testing: simula un pago aprobado y renueva la suscripción."""
    if not APP_URL.startswith("http://localhost"):
        raise HTTPException(status_code=403, detail="Solo disponible en entorno de desarrollo")

    plan_tipo = plan_tipo if plan_tipo in ("mensual", "anual") else "mensual"
    meses = 1 if plan_tipo == "mensual" else 12

    now = datetime.now(timezone.utc)
    fake_payment_id = f"TEST-{int(now.timestamp())}"
    precio_mensual = await get_precio_suscripcion()
    nombre_base = await get_plan_nombre_suscripcion()
    precio = precio_mensual if plan_tipo == "mensual" else precio_mensual * 11
    plan_nombre = nombre_base if plan_tipo == "mensual" else f"{nombre_base} Anual"

    empresa = await db.empresas.find_one({"id": user.empresa_id})
    empresa_nombre = empresa["nombre"] if empresa else user.empresa_id

    # Cancelar pendientes abandonados
    await db.pagos_suscripcion.update_many(
        {"empresa_id": user.empresa_id, "estado": "pending", "mp_payment_id": {"$in": [None, ""]}},
        {"$set": {"estado": "cancelled"}},
    )

    suscripcion = await db.suscripciones.find_one({"empresa_id": user.empresa_id})
    if suscripcion:
        base, nueva_fecha = _aplicar_renovacion(suscripcion, meses, now)
        await db.suscripciones.update_one(
            {"empresa_id": user.empresa_id},
            {"$set": {
                "status": SuscripcionStatus.ACTIVA,
                "fecha_vencimiento": nueva_fecha,
                "plan_tipo": plan_tipo,
                "fue_pagada": True,
            }},
        )
    else:
        dia_facturacion = min(now.day, 28)
        base = now
        nueva_fecha = calcular_siguiente_vencimiento(dia_facturacion, meses, now)
        await db.suscripciones.insert_one(Suscripcion(
            empresa_id=user.empresa_id,
            plan_nombre=plan_nombre,
            precio=precio,
            status=SuscripcionStatus.ACTIVA,
            fecha_inicio=now,
            fecha_vencimiento=nueva_fecha,
            dia_facturacion=dia_facturacion,
            plan_tipo=plan_tipo,
            fue_pagada=True,
        ).dict())

    # Registrar el pago simulado
    pago = PagoSuscripcion(
        empresa_id=user.empresa_id,
        monto=precio,
        moneda="ARS",
        estado="approved",
        concepto=f"[TEST] {plan_nombre} - {empresa_nombre}",
        mp_payment_id=fake_payment_id,
        periodo_inicio=base,
        periodo_fin=nueva_fecha,
        plan_tipo=plan_tipo,
    )
    await db.pagos_suscripcion.insert_one(pago.dict())

    return {"ok": True, "nueva_fecha_vencimiento": nueva_fecha.isoformat()}


# Webhook de MercadoPago (sin autenticación JWT)
@app.post("/api/mercadopago/webhook")
async def mp_webhook(request: Request):
    try:
        body = await request.json()
    except Exception:
        return {"status": "ok"}

    # MP envía notificaciones de tipo "payment"
    if body.get("type") != "payment":
        return {"status": "ok"}

    payment_id = str(body.get("data", {}).get("id", ""))
    if not payment_id:
        return {"status": "ok"}

    if not MP_ACCESS_TOKEN or MP_ACCESS_TOKEN.startswith("APP_USR-your"):
        return {"status": "ok"}

    # Consultar detalle del pago a la API de MP
    try:
        async with httpx.AsyncClient() as client_http:
            resp = await client_http.get(
                f"https://api.mercadopago.com/v1/payments/{payment_id}",
                headers={"Authorization": f"Bearer {MP_ACCESS_TOKEN}"},
                timeout=10,
            )
        if resp.status_code != 200:
            return {"status": "ok"}
        payment_data = resp.json()
    except Exception:
        return {"status": "ok"}

    empresa_id = payment_data.get("external_reference")
    estado = payment_data.get("status")  # approved, rejected, cancelled, pending
    monto = float(payment_data.get("transaction_amount", 0))

    if not empresa_id:
        return {"status": "ok"}

    # Actualizar o crear registro de pago
    existing_pago = await db.pagos_suscripcion.find_one({
        "empresa_id": empresa_id,
        "mp_payment_id": payment_id,
    })
    if not existing_pago:
        # Buscar pago pendiente por preference_id
        pref_id = str(payment_data.get("order", {}).get("id", "") or
                      payment_data.get("preference_id", ""))
        pago_doc = await db.pagos_suscripcion.find_one({
            "empresa_id": empresa_id,
            "mp_preference_id": pref_id,
            "estado": "pending",
        })
        if pago_doc:
            await db.pagos_suscripcion.update_one(
                {"id": pago_doc["id"]},
                {"$set": {"estado": estado, "mp_payment_id": payment_id}}
            )
        else:
            empresa = await db.empresas.find_one({"id": empresa_id})
            empresa_nombre = empresa["nombre"] if empresa else empresa_id
            pago = PagoSuscripcion(
                empresa_id=empresa_id,
                monto=monto,
                moneda="ARS",
                estado=estado,
                concepto=f"{SUSCRIPCION_PLAN_NOMBRE} - {empresa_nombre}",
                mp_payment_id=payment_id,
            )
            await db.pagos_suscripcion.insert_one(pago.dict())
    else:
        await db.pagos_suscripcion.update_one(
            {"id": existing_pago["id"]},
            {"$set": {"estado": estado}}
        )

    # Si el pago fue aprobado → extender suscripción
    if estado == "approved":
        # Recuperar plan_tipo del pago registrado
        pago_reg = await db.pagos_suscripcion.find_one({"empresa_id": empresa_id, "mp_payment_id": payment_id})
        if not pago_reg:
            pago_reg = await db.pagos_suscripcion.find_one({"empresa_id": empresa_id, "mp_preference_id": {"$exists": True}, "estado": "approved"})
        plan_tipo_pago = (pago_reg or {}).get("plan_tipo", "mensual") if pago_reg else "mensual"
        meses = 1 if plan_tipo_pago == "mensual" else 12

        suscripcion = await db.suscripciones.find_one({"empresa_id": empresa_id})
        now = datetime.now(timezone.utc)
        if suscripcion:
            base, nueva_fecha = _aplicar_renovacion(suscripcion, meses, now)
            await db.suscripciones.update_one(
                {"empresa_id": empresa_id},
                {"$set": {
                    "status": SuscripcionStatus.ACTIVA,
                    "fecha_vencimiento": nueva_fecha,
                    "plan_tipo": plan_tipo_pago,
                    "fue_pagada": True,
                }}
            )
            # Actualizar periodo del pago registrado
            await db.pagos_suscripcion.update_one(
                {"empresa_id": empresa_id, "mp_payment_id": payment_id},
                {"$set": {"periodo_inicio": base, "periodo_fin": nueva_fecha}}
            )
        else:
            dia_facturacion = min(now.day, 28)
            nueva_fecha = calcular_siguiente_vencimiento(dia_facturacion, meses, now)
            suscripcion_nueva = Suscripcion(
                empresa_id=empresa_id,
                plan_nombre=SUSCRIPCION_PLAN_NOMBRE,
                precio=monto,
                status=SuscripcionStatus.ACTIVA,
                fecha_inicio=now,
                fecha_vencimiento=nueva_fecha,
                dia_facturacion=dia_facturacion,
                plan_tipo=plan_tipo_pago,
                fue_pagada=True,
            )
            await db.suscripciones.insert_one(suscripcion_nueva.dict())

    return {"status": "ok"}

# ─────────────────────────────────────────────
# OWNER (System Admin) routes
# ─────────────────────────────────────────────

class OwnerLoginData(BaseModel):
    username: str
    password: str

class SuscripcionUpdate(BaseModel):
    status: Optional[SuscripcionStatus] = None
    fecha_vencimiento: Optional[datetime] = None
    plan_nombre: Optional[str] = None
    precio: Optional[float] = None
    dias_extra: Optional[int] = None

class PagoManual(BaseModel):
    monto: float
    concepto: str
    plan_tipo: str = "mensual"  # "mensual" | "anual"

owner_router = APIRouter(prefix="/owner")

def create_owner_token():
    payload = {
        "sub": "owner",
        "role": "owner",
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_owner_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "owner":
            raise HTTPException(status_code=403, detail="Acceso denegado")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

@owner_router.post("/login")
async def owner_login(data: OwnerLoginData):
    if data.username != OWNER_USERNAME or data.password != OWNER_PASSWORD:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    token = create_owner_token()
    return {"access_token": token, "token_type": "bearer"}

@owner_router.get("/stats")
async def owner_stats(_=Depends(verify_owner_token)):
    total = await db.empresas.count_documents({})
    activas = await db.suscripciones.count_documents({"status": SuscripcionStatus.ACTIVA})
    trial = await db.suscripciones.count_documents({"status": SuscripcionStatus.TRIAL})
    vencidas = await db.suscripciones.count_documents({"status": SuscripcionStatus.VENCIDA})
    suspendidas = await db.suscripciones.count_documents({"status": SuscripcionStatus.SUSPENDIDA})
    pagos = await db.pagos_suscripcion.find({"estado": "approved"}).to_list(10000)
    total_recaudado = sum(p.get("monto", 0) for p in pagos)
    alertas_sin_leer = await db.notificaciones.count_documents({"leida": False})
    return {
        "total_clientes": total,
        "activas": activas,
        "trial": trial,
        "vencidas": vencidas,
        "suspendidas": suspendidas,
        "total_recaudado": total_recaudado,
        "alertas_sin_leer": alertas_sin_leer,
    }

def _calc_dias_restantes(suscripcion: dict) -> int:
    if not suscripcion:
        return 0
    vencimiento = suscripcion.get("fecha_vencimiento")
    if isinstance(vencimiento, str):
        vencimiento = datetime.fromisoformat(vencimiento)
    if vencimiento and not vencimiento.tzinfo:
        vencimiento = vencimiento.replace(tzinfo=timezone.utc)
    if not vencimiento:
        return 0
    return max(0, (vencimiento - datetime.now(timezone.utc)).days)

@owner_router.get("/clientes")
async def owner_get_clientes(_=Depends(verify_owner_token)):
    empresas = await db.empresas.find({}).sort("created_at", -1).to_list(1000)
    result = []
    for emp in empresas:
        suscripcion = await db.suscripciones.find_one({"empresa_id": emp["id"]})
        admin = await db.users.find_one({"empresa_id": emp["id"], "rol": "admin"})
        pagos_count = await db.pagos_suscripcion.count_documents(
            {"empresa_id": emp["id"], "estado": "approved"}
        )
        dias_restantes = _calc_dias_restantes(suscripcion)
        # Convert ObjectId and datetime for JSON serialization
        sus_data = None
        if suscripcion:
            sus_data = {k: v for k, v in suscripcion.items() if k != "_id"}
        result.append({
            "id": emp["id"],
            "nombre": emp["nombre"],
            "activo": emp.get("activo", True),
            "created_at": emp.get("created_at"),
            "admin_email": admin["email"] if admin else None,
            "admin_nombre": admin["nombre"] if admin else None,
            "suscripcion": sus_data,
            "dias_restantes": dias_restantes,
            "pagos_aprobados": pagos_count,
        })
    return result

@owner_router.get("/clientes/{empresa_id}")
async def owner_get_cliente(empresa_id: str, _=Depends(verify_owner_token)):
    emp = await db.empresas.find_one({"id": empresa_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    suscripcion = await db.suscripciones.find_one({"empresa_id": empresa_id})
    admin = await db.users.find_one({"empresa_id": empresa_id, "rol": "admin"})
    pagos = await db.pagos_suscripcion.find(
        {"empresa_id": empresa_id}
    ).sort("fecha", -1).to_list(100)
    dias_restantes = _calc_dias_restantes(suscripcion)
    sus_data = {k: v for k, v in suscripcion.items() if k != "_id"} if suscripcion else None
    pagos_data = [{k: v for k, v in p.items() if k != "_id"} for p in pagos]
    return {
        "id": emp["id"],
        "nombre": emp["nombre"],
        "activo": emp.get("activo", True),
        "created_at": emp.get("created_at"),
        "admin_email": admin["email"] if admin else None,
        "admin_nombre": admin["nombre"] if admin else None,
        "suscripcion": sus_data,
        "dias_restantes": dias_restantes,
        "pagos": pagos_data,
    }

@owner_router.put("/clientes/{empresa_id}/suscripcion")
async def owner_update_suscripcion(
    empresa_id: str, data: SuscripcionUpdate, _=Depends(verify_owner_token)
):
    emp = await db.empresas.find_one({"id": empresa_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    suscripcion = await db.suscripciones.find_one({"empresa_id": empresa_id})
    update = {}
    if data.status is not None:
        update["status"] = data.status
    if data.plan_nombre is not None:
        update["plan_nombre"] = data.plan_nombre
    if data.precio is not None:
        update["precio"] = data.precio
    if data.dias_extra and data.dias_extra > 0:
        if suscripcion:
            vencimiento = suscripcion.get("fecha_vencimiento")
            if isinstance(vencimiento, str):
                vencimiento = datetime.fromisoformat(vencimiento)
            if vencimiento and not vencimiento.tzinfo:
                vencimiento = vencimiento.replace(tzinfo=timezone.utc)
        else:
            vencimiento = None
        now = datetime.now(timezone.utc)
        base = vencimiento if vencimiento and vencimiento > now else now
        update["fecha_vencimiento"] = base + timedelta(days=data.dias_extra)
        if not data.status:
            update["status"] = SuscripcionStatus.ACTIVA
    elif data.fecha_vencimiento is not None:
        update["fecha_vencimiento"] = data.fecha_vencimiento
    if update:
        if suscripcion:
            await db.suscripciones.update_one({"empresa_id": empresa_id}, {"$set": update})
        else:
            now = datetime.now(timezone.utc)
            nueva = Suscripcion(
                empresa_id=empresa_id,
                plan_nombre=update.get("plan_nombre", SUSCRIPCION_PLAN_NOMBRE),
                precio=update.get("precio", SUSCRIPCION_PRECIO),
                status=update.get("status", SuscripcionStatus.ACTIVA),
                fecha_inicio=now,
                fecha_vencimiento=update.get("fecha_vencimiento", now + timedelta(days=await get_trial_dias())),
            )
            await db.suscripciones.insert_one(nueva.dict())
    return {"message": "Suscripción actualizada"}

@owner_router.post("/clientes/{empresa_id}/pago")
async def owner_registrar_pago(
    empresa_id: str, data: PagoManual, _=Depends(verify_owner_token)
):
    emp = await db.empresas.find_one({"id": empresa_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    plan_tipo = data.plan_tipo if data.plan_tipo in ("mensual", "anual") else "mensual"
    meses = 1 if plan_tipo == "mensual" else 12
    pago = PagoSuscripcion(
        empresa_id=empresa_id,
        monto=data.monto,
        moneda="ARS",
        estado="approved",
        concepto=data.concepto,
        plan_tipo=plan_tipo,
    )
    await db.pagos_suscripcion.insert_one(pago.dict())
    suscripcion = await db.suscripciones.find_one({"empresa_id": empresa_id})
    now = datetime.now(timezone.utc)
    if suscripcion:
        base, nueva_fecha = _aplicar_renovacion(suscripcion, meses, now)
        await db.suscripciones.update_one(
            {"empresa_id": empresa_id},
            {"$set": {
                "status": SuscripcionStatus.ACTIVA,
                "fecha_vencimiento": nueva_fecha,
                "plan_tipo": plan_tipo,
            }}
        )
        await db.pagos_suscripcion.update_one(
            {"id": pago.id},
            {"$set": {"periodo_inicio": base, "periodo_fin": nueva_fecha}}
        )
    else:
        dia_facturacion = min(now.day, 28)
        nueva_fecha = calcular_siguiente_vencimiento(dia_facturacion, meses, now)
        nueva_sus = Suscripcion(
            empresa_id=empresa_id,
            plan_nombre=await get_plan_nombre_suscripcion(),
            precio=data.monto,
            status=SuscripcionStatus.ACTIVA,
            fecha_inicio=now,
            fecha_vencimiento=nueva_fecha,
            dia_facturacion=dia_facturacion,
            plan_tipo=plan_tipo,
        )
        await db.suscripciones.insert_one(nueva_sus.dict())
    return {"message": "Pago registrado y suscripción renovada"}

@owner_router.put("/clientes/{empresa_id}/activo")
async def owner_toggle_empresa(empresa_id: str, _=Depends(verify_owner_token)):
    emp = await db.empresas.find_one({"id": empresa_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    new_status = not emp.get("activo", True)
    await db.empresas.update_one({"id": empresa_id}, {"$set": {"activo": new_status}})
    if not new_status:
        # Guardar el status actual antes de suspender para poder restaurarlo
        sus = await db.suscripciones.find_one({"empresa_id": empresa_id})
        prev_status = sus.get("status") if sus else None
        await db.suscripciones.update_one(
            {"empresa_id": empresa_id},
            {"$set": {"status": SuscripcionStatus.SUSPENDIDA, "status_antes_suspension": prev_status}}
        )
    else:
        # Al re-activar: restaurar el status anterior si no venció
        sus = await db.suscripciones.find_one({"empresa_id": empresa_id})
        if sus and sus.get("status") == SuscripcionStatus.SUSPENDIDA:
            vencimiento = sus.get("fecha_vencimiento")
            if isinstance(vencimiento, str):
                vencimiento = datetime.fromisoformat(vencimiento)
            if vencimiento and not vencimiento.tzinfo:
                vencimiento = vencimiento.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            if vencimiento and vencimiento > now:
                status_previo = sus.get("status_antes_suspension")
                nuevo_status = status_previo if status_previo in (SuscripcionStatus.TRIAL, SuscripcionStatus.ACTIVA) else SuscripcionStatus.ACTIVA
            else:
                nuevo_status = SuscripcionStatus.VENCIDA
            await db.suscripciones.update_one(
                {"empresa_id": empresa_id},
                {"$set": {"status": nuevo_status}}
            )
    return {"activo": new_status, "message": f"Empresa {'activada' if new_status else 'suspendida'}"}

@owner_router.get("/config")
async def owner_get_config(_=Depends(verify_owner_token)):
    return {
        "suscripcion_precio": await get_precio_suscripcion(),
        "suscripcion_plan_nombre": await get_plan_nombre_suscripcion(),
        "whatsapp_numero": await get_whatsapp_numero(),
        "trial_dias": await get_trial_dias(),
    }

class OwnerConfigUpdate(BaseModel):
    suscripcion_precio: Optional[float] = None
    suscripcion_plan_nombre: Optional[str] = None
    whatsapp_numero: Optional[str] = None
    trial_dias: Optional[int] = None

@owner_router.put("/config")
async def owner_update_config(data: OwnerConfigUpdate, _=Depends(verify_owner_token)):
    if data.suscripcion_precio is not None:
        await db.system_config.update_one(
            {"key": "suscripcion_precio"},
            {"$set": {"value": data.suscripcion_precio}},
            upsert=True,
        )
    if data.suscripcion_plan_nombre is not None:
        await db.system_config.update_one(
            {"key": "suscripcion_plan_nombre"},
            {"$set": {"value": data.suscripcion_plan_nombre}},
            upsert=True,
        )
    if data.whatsapp_numero is not None:
        await db.system_config.update_one(
            {"key": "whatsapp_numero"},
            {"$set": {"value": data.whatsapp_numero}},
            upsert=True,
        )
    if data.trial_dias is not None:
        await db.system_config.update_one(
            {"key": "trial_dias"},
            {"$set": {"value": data.trial_dias}},
            upsert=True,
        )
    return {"ok": True}

@owner_router.get("/alertas")
async def owner_get_alertas(_=Depends(verify_owner_token)):
    """Empresas con suscripciones próximas a vencer (≤ 10 días) y últimas alertas generadas."""
    now = datetime.now(timezone.utc)
    suscripciones = await db.suscripciones.find(
        {"status": {"$in": [SuscripcionStatus.TRIAL, SuscripcionStatus.ACTIVA]}}
    ).to_list(None)
    por_vencer = []
    for sus in suscripciones:
        vencimiento = sus.get("fecha_vencimiento")
        if isinstance(vencimiento, str):
            vencimiento = datetime.fromisoformat(vencimiento)
        if vencimiento and not vencimiento.tzinfo:
            vencimiento = vencimiento.replace(tzinfo=timezone.utc)
        if not vencimiento:
            continue
        dias_restantes = (vencimiento - now).days
        if dias_restantes <= 10:
            empresa = await db.empresas.find_one({"id": sus["empresa_id"]})
            por_vencer.append({
                "empresa_id": sus["empresa_id"],
                "empresa_nombre": empresa["nombre"] if empresa else sus["empresa_id"],
                "status": sus.get("status"),
                "plan_nombre": sus.get("plan_nombre"),
                "fecha_vencimiento": sus.get("fecha_vencimiento"),
                "dias_restantes": max(0, dias_restantes),
            })
    por_vencer.sort(key=lambda x: x["dias_restantes"])
    alertas_recientes = await db.notificaciones.find().sort("fecha", -1).limit(50).to_list(50)
    return {
        "por_vencer": por_vencer,
        "alertas_recientes": [Notificacion(**a).dict() for a in alertas_recientes],
    }

@owner_router.post("/alertas/generar")
async def owner_generar_alertas(_=Depends(verify_owner_token)):
    """Genera manualmente alertas para suscripciones próximas a vencer."""
    generadas = await generar_alertas_vencimiento()
    return {"ok": True, "generadas": generadas}

@owner_router.get("/pagos")
async def owner_get_pagos(_=Depends(verify_owner_token)):
    """Todos los pagos de suscripción ordenados por fecha descendente."""
    pagos = await db.pagos_suscripcion.find({}).sort("fecha", -1).to_list(1000)
    empresas_cache: dict = {}
    result = []
    for p in pagos:
        eid = p.get("empresa_id", "")
        if eid not in empresas_cache:
            emp = await db.empresas.find_one({"id": eid})
            empresas_cache[eid] = emp["nombre"] if emp else eid
        pago_dict = {k: v for k, v in p.items() if k != "_id"}
        pago_dict["empresa_nombre"] = empresas_cache[eid]
        result.append(pago_dict)
    return result

# ─── Router AFIP/ARCA ─────────────────────────────────────────────────────────

afip_router = APIRouter(prefix="/api/afip")
_afip_service = AfipService()

@afip_router.get("/config")
async def get_afip_config(user: User = Depends(require_role([UserRole.ADMIN]))):
    """Retorna la configuración AFIP de la empresa (sin exponer la clave privada)."""
    cfg = await db.afip_config.find_one({"empresa_id": user.empresa_id, "activo": True})
    if not cfg:
        return {"configurado": False}
    return {
        "configurado": True,
        "cuit": cfg.get("cuit"),
        "punto_venta": cfg.get("punto_venta"),
        "ambiente": cfg.get("ambiente"),
        "tipo_comprobante_default": cfg.get("tipo_comprobante_default"),
        "razon_social": cfg.get("razon_social"),
        "tiene_certificado": bool(cfg.get("cert_pem")),
        "tiene_clave": bool(cfg.get("key_pem_encrypted")),
    }

@afip_router.post("/config")
async def save_afip_config(data: AfipConfigCreate, user: User = Depends(require_role([UserRole.ADMIN]))):
    """Crea o actualiza la configuración AFIP (sin tocar cert/key)."""
    now = datetime.now(timezone.utc)
    existing = await db.afip_config.find_one({"empresa_id": user.empresa_id})
    if existing:
        await db.afip_config.update_one(
            {"empresa_id": user.empresa_id},
            {"$set": {
                "cuit": data.cuit,
                "punto_venta": data.punto_venta,
                "ambiente": data.ambiente,
                "tipo_comprobante_default": data.tipo_comprobante_default,
                "razon_social": data.razon_social or "",
                "activo": True,
                "updated_at": now,
            }}
        )
    else:
        cfg = AfipConfig(**data.dict(), empresa_id=user.empresa_id)
        await db.afip_config.insert_one(cfg.dict())
    return {"ok": True, "mensaje": "Configuración AFIP guardada"}

@afip_router.post("/config/upload-cert")
async def upload_afip_cert(
    cert_file: Optional[UploadFile] = File(None),
    key_file: Optional[UploadFile] = File(None),
    p12_file: Optional[UploadFile] = File(None),
    p12_password: Optional[str] = None,
    user: User = Depends(require_role([UserRole.ADMIN]))
):
    """
    Sube el certificado y/o clave privada de AFIP.
    Acepta:
      - p12_file: archivo .p12 (extrae cert + key automáticamente)
      - cert_file + key_file: archivos .pem separados
    """
    cfg = await db.afip_config.find_one({"empresa_id": user.empresa_id})
    if not cfg:
        raise HTTPException(status_code=400, detail="Primero configure los datos básicos de AFIP (CUIT, punto de venta).")

    update = {"updated_at": datetime.now(timezone.utc)}

    if p12_file:
        p12_bytes = await p12_file.read()
        pwd = p12_password.encode() if p12_password else None
        try:
            cert_pem, key_pem = extract_p12(p12_bytes, pwd)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error al leer el archivo .p12: {e}")
        update["cert_pem"] = base64.b64encode(cert_pem).decode()
        update["key_pem_encrypted"] = encrypt_private_key(key_pem, SECRET_KEY)

    if cert_file:
        cert_bytes = await cert_file.read()
        update["cert_pem"] = base64.b64encode(cert_bytes).decode()

    if key_file:
        key_bytes = await key_file.read()
        update["key_pem_encrypted"] = encrypt_private_key(key_bytes, SECRET_KEY)

    await db.afip_config.update_one({"empresa_id": user.empresa_id}, {"$set": update})
    return {"ok": True, "mensaje": "Certificado cargado correctamente"}

@afip_router.post("/test")
async def test_afip_conexion(user: User = Depends(require_role([UserRole.ADMIN]))):
    """Llama FEDummy para verificar conectividad con los servidores de ARCA."""
    cfg = await db.afip_config.find_one({"empresa_id": user.empresa_id, "activo": True})
    if not cfg:
        raise HTTPException(status_code=400, detail="AFIP no está configurado para esta empresa.")
    result = await _afip_service.test_conexion(cfg, SECRET_KEY, db)
    if not result["ok"]:
        raise HTTPException(status_code=503, detail=f"Error de conexión con ARCA: {result.get('error')}")
    return result

@afip_router.post("/reintentar/{sale_id}")
async def reintentar_cae(sale_id: str, user: User = Depends(require_role([UserRole.ADMIN]))):
    """Reintenta obtener el CAE para una venta en estado contingencia o error."""
    sale_doc = await db.sales.find_one({"id": sale_id, "empresa_id": user.empresa_id})
    if not sale_doc:
        raise HTTPException(status_code=404, detail="Venta no encontrada.")
    if sale_doc.get("afip_estado") == "autorizado":
        return {"ok": True, "mensaje": "La venta ya tiene CAE autorizado.", "cae": sale_doc.get("cae")}

    cfg = await db.afip_config.find_one({"empresa_id": user.empresa_id, "activo": True})
    if not cfg or not cfg.get("cert_pem") or not cfg.get("key_pem_encrypted"):
        raise HTTPException(status_code=400, detail="AFIP no está configurado o falta el certificado.")

    try:
        token, sign = await _afip_service.get_token_sign(cfg, db, SECRET_KEY)
        tipo_cbte = sale_doc.get("tipo_comprobante") or cfg.get("tipo_comprobante_default", 6)
        result = await _afip_service.solicitar_cae(
            sale_doc, cfg, token, sign, tipo_cbte,
            cuit_receptor=sale_doc.get("cuit_receptor")
        )
        await db.sales.update_one(
            {"id": sale_id},
            {"$set": {
                "cae": result["cae"],
                "cae_vencimiento": result["cae_vencimiento"],
                "afip_estado": "autorizado",
                "afip_error": None,
                "nro_comprobante_afip": result["nro_comprobante"],
            }}
        )
        return {"ok": True, "cae": result["cae"], "cae_vencimiento": result["cae_vencimiento"]}
    except Exception as e:
        await db.sales.update_one(
            {"id": sale_id},
            {"$set": {"afip_estado": "error", "afip_error": str(e)}}
        )
        raise HTTPException(status_code=503, detail=f"Error al obtener CAE: {e}")

@afip_router.get("/ventas-pendientes")
async def get_ventas_pendientes(user: User = Depends(require_role([UserRole.ADMIN]))):
    """Lista ventas con CAE pendiente (contingencia o error)."""
    ventas = await db.sales.find({
        "empresa_id": user.empresa_id,
        "afip_estado": {"$in": ["contingencia", "error"]}
    }).to_list(200)
    return [Sale(**v) for v in ventas]

# Include the router in the main app
app.include_router(api_router)
app.include_router(owner_router)
app.include_router(afip_router)

origins = os.environ.get("CORS_ORIGINS", "")
allow_origins = [o.strip() for o in origins.split(",") if o.strip()]
is_wildcard = allow_origins == ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=r".*" if is_wildcard else None,
    allow_credentials=not is_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_tasks():
    async def periodic_alerts():
        while True:
            try:
                await generar_alertas_vencimiento()
            except Exception as e:
                logger.error(f"Error generando alertas: {e}")
            await asyncio.sleep(24 * 60 * 60)  # cada 24 horas
    asyncio.create_task(periodic_alerts())

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
