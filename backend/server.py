from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Query
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
import jwt
from passlib.hash import bcrypt
from enum import Enum
import base64
import pandas as pd

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT settings
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-here')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

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

class CashSessionStatus(str, Enum):
    ABIERTA = "abierta"
    CERRADA = "cerrada"

class MovementType(str, Enum):
    APERTURA = "apertura"
    VENTA = "venta"
    RETIRO = "retiro"
    CIERRE = "cierre"

# --- Empresa models ---
class Empresa(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nombre: str
    activo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmpresaRegister(BaseModel):
    empresa_nombre: str
    admin_nombre: str
    admin_email: str
    admin_password: str

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
    activo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BranchProductCreate(BaseModel):
    product_id: str
    branch_id: Optional[str] = None
    precio: float
    precio_por_peso: Optional[float] = None
    stock: int = 0
    stock_minimo: int = 10

class BranchProductUpdate(BaseModel):
    precio: Optional[float] = None
    precio_por_peso: Optional[float] = None
    stock: Optional[int] = None
    stock_minimo: Optional[int] = None
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
    receipt_width: int = 80  # characters

    # Pagination Settings
    items_per_page: int = 10

    # Company Branding
    company_logo: Optional[str] = None  # URL or base64 of logo

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
    receipt_width: Optional[int] = None
    items_per_page: Optional[int] = None
    company_logo: Optional[str] = None

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

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nombre: str
    codigo_barras: Optional[str] = None
    tipo: ProductType
    precio: float
    precio_por_peso: Optional[float] = None
    categoria_id: str
    stock: int = 0
    stock_minimo: int = 10
    activo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    nombre: str
    codigo_barras: Optional[str] = None
    tipo: ProductType
    precio: float
    precio_por_peso: Optional[float] = None
    categoria_id: str
    stock: int = 0
    stock_minimo: int = 10

class ProductUpdate(BaseModel):
    nombre: Optional[str] = None
    codigo_barras: Optional[str] = None
    precio: Optional[float] = None
    precio_por_peso: Optional[float] = None
    categoria_id: Optional[str] = None
    stock: Optional[int] = None
    stock_minimo: Optional[int] = None
    activo: Optional[bool] = None

class SaleItem(BaseModel):
    producto_id: str
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

class SaleCreate(BaseModel):
    items: List[SaleItem]
    metodo_pago: PaymentMethod

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
    if user.rol not in [UserRole.ADMIN]:
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
@api_router.post("/auth/empresa/register", response_model=Token)
async def register_empresa(data: EmpresaRegister):
    # Check if admin email already exists
    existing_user = await db.users.find_one({"email": data.admin_email})
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    # Create empresa
    empresa = Empresa(nombre=data.empresa_nombre)
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

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"email": user_data.email})
    if not user_doc or not bcrypt.verify(user_data.password, user_doc['password']):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    if not user_doc.get('activo', True):
        raise HTTPException(status_code=400, detail="User account is disabled")

    # Create access token with empresa_id
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_doc['id'], "empresa_id": user_doc['empresa_id']},
        expires_delta=access_token_expires
    )

    user = User(**user_doc)
    return Token(access_token=access_token, token_type="bearer", user=user)

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

    product = Product(**product_data.dict(), empresa_id=user.empresa_id)
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

    # Update fields
    update_data = {k: v for k, v in product_data.dict().items() if v is not None}

    if update_data:
        await db.products.update_one({"id": product_id, "empresa_id": user.empresa_id}, {"$set": update_data})

    updated_product = await db.products.find_one({"id": product_id, "empresa_id": user.empresa_id})
    return Product(**updated_product)

# User management routes
@api_router.get("/users", response_model=List[User])
async def get_users(user: User = Depends(require_role([UserRole.ADMIN]))):
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
        # Try branch-specific product first (if user has branch assigned)
        precio_unitario = None
        if user.branch_id:
            branch_product = await db.branch_products.find_one({
                "product_id": item.producto_id,
                "branch_id": user.branch_id,
                "empresa_id": user.empresa_id,
                "activo": True
            })
            if branch_product:
                if branch_product['stock'] < item.cantidad:
                    product = await db.products.find_one({"id": item.producto_id, "empresa_id": user.empresa_id})
                    raise HTTPException(status_code=400, detail=f"Stock insuficiente para {product['nombre']}")
                precio_unitario = branch_product['precio']
                if branch_product.get('precio_por_peso') and item.cantidad != int(item.cantidad):
                    precio_unitario = branch_product['precio_por_peso']
                await db.branch_products.update_one(
                    {"product_id": item.producto_id, "branch_id": user.branch_id, "empresa_id": user.empresa_id},
                    {"$inc": {"stock": -int(item.cantidad)}}
                )

        # Fall back to global product
        if precio_unitario is None:
            product = await db.products.find_one({"id": item.producto_id, "empresa_id": user.empresa_id, "activo": True})
            if not product:
                raise HTTPException(status_code=400, detail=f"Producto no encontrado")
            if product['stock'] < item.cantidad:
                raise HTTPException(status_code=400, detail=f"Stock insuficiente para {product['nombre']}")
            precio_unitario = product['precio']
            if product.get('precio_por_peso') and item.cantidad != int(item.cantidad):
                precio_unitario = product['precio_por_peso']
            await db.products.update_one(
                {"id": item.producto_id, "empresa_id": user.empresa_id},
                {"$inc": {"stock": -int(item.cantidad)}}
            )

        # Calculate subtotal
        subtotal = item.cantidad * precio_unitario
        validated_items.append(SaleItem(
            producto_id=item.producto_id,
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
    total = total_amount * (1 + tax_rate)

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

    return sale

@api_router.get("/sales", response_model=List[Sale])
async def get_sales(user: User = Depends(get_current_user)):
    if user.rol == UserRole.CAJERO:
        sales = await db.sales.find({"cajero_id": user.id, "empresa_id": user.empresa_id}).sort("fecha", -1).to_list(100)
    else:
        sales = await db.sales.find({"empresa_id": user.empresa_id}).sort("fecha", -1).to_list(1000)

    return [Sale(**sale) for sale in sales]

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
async def get_dashboard_stats(user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPERVISOR]))):
    # Today's sales
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)

    today_sales = await db.sales.find({
        "empresa_id": user.empresa_id,
        "fecha": {"$gte": today, "$lt": tomorrow}
    }).to_list(1000)

    total_ventas_hoy = sum(sale['total'] for sale in today_sales)
    numero_ventas_hoy = len(today_sales)

    # Total products
    total_productos = await db.products.count_documents({"empresa_id": user.empresa_id, "activo": True})

    # Low stock products
    productos_bajo_stock = await db.products.find({
        "empresa_id": user.empresa_id,
        "activo": True,
        "$expr": {"$lte": ["$stock", "$stock_minimo"]}
    }).to_list(1000)

    return {
        "ventas_hoy": {
            "total": total_ventas_hoy,
            "cantidad": numero_ventas_hoy
        },
        "productos": {
            "total": total_productos,
            "bajo_stock": len(productos_bajo_stock)
        },
        "productos_bajo_stock": [Product(**prod) for prod in productos_bajo_stock]
    }

# Include the router in the main app
app.include_router(api_router)

origins = os.environ.get("CORS_ORIGINS", "")
allow_origins = [o.strip() for o in origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
