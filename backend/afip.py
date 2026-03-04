"""
Servicio de integración con ARCA/AFIP — Factura Electrónica
Implementa WSAA (autenticación) y WSFE (facturación electrónica v1)
"""
import base64
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from xml.etree import ElementTree as ET

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.serialization import pkcs7, pkcs12
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

# ─── Constantes ────────────────────────────────────────────────────────────────

WSAA_WSDL_HOMO = "https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL"
WSAA_WSDL_PROD = "https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL"
WSFE_WSDL_HOMO = "https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL"
WSFE_WSDL_PROD = "https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL"

TIPO_COMPROBANTE_NOMBRES = {1: "Factura A", 6: "Factura B", 11: "Factura C"}
DOC_TIPO_CONSUMIDOR_FINAL = 99
DOC_TIPO_CUIT = 80


# ─── Helpers de cifrado para almacenamiento seguro de la clave privada ─────────

def _make_fernet(secret_key: str) -> Fernet:
    """Deriva una clave Fernet de 32 bytes a partir del JWT_SECRET."""
    key_bytes = hashlib.sha256(secret_key.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key_bytes))


def encrypt_private_key(pem_bytes: bytes, secret_key: str) -> str:
    """Cifra la clave privada PEM con Fernet y retorna base64."""
    f = _make_fernet(secret_key)
    return f.encrypt(pem_bytes).decode()


def decrypt_private_key(encrypted_b64: str, secret_key: str) -> bytes:
    """Descifra la clave privada almacenada."""
    f = _make_fernet(secret_key)
    return f.decrypt(encrypted_b64.encode())


def extract_p12(p12_bytes: bytes, password: Optional[bytes] = None) -> Tuple[bytes, bytes]:
    """
    Extrae cert PEM y key PEM de un archivo .p12 (PKCS12).
    Retorna (cert_pem, key_pem).
    """
    privkey, cert, _ = pkcs12.load_key_and_certificates(p12_bytes, password)
    cert_pem = cert.public_bytes(serialization.Encoding.PEM)
    key_pem = privkey.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption()
    )
    return cert_pem, key_pem


# ─── Servicio principal ─────────────────────────────────────────────────────────

class AfipService:
    """
    Encapsula la comunicación con WSAA y WSFE de ARCA/AFIP.
    Uso:
        service = AfipService()
        token, sign = await service.get_token_sign(afip_cfg, db, jwt_secret)
        resultado = await service.solicitar_cae(sale, afip_cfg, token, sign, tipo_cbte)
    """

    def _get_urls(self, ambiente: str) -> Tuple[str, str]:
        if ambiente == "produccion":
            return WSAA_WSDL_PROD, WSFE_WSDL_PROD
        return WSAA_WSDL_HOMO, WSFE_WSDL_HOMO

    # ── WSAA ──────────────────────────────────────────────────────────────────

    def _build_tra(self, service_name: str = "wsfe") -> str:
        """Construye el Ticket de Requerimiento de Acceso (TRA) en XML."""
        now = datetime.now(timezone.utc)
        gen_time = (now - timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%S")
        exp_time = (now + timedelta(hours=12)).strftime("%Y-%m-%dT%H:%M:%S")
        unique_id = str(int(now.timestamp()))
        return (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<loginTicketRequest version="1.0">'
            f'<header><uniqueId>{unique_id}</uniqueId>'
            f'<generationTime>{gen_time}</generationTime>'
            f'<expirationTime>{exp_time}</expirationTime></header>'
            f'<service>{service_name}</service>'
            '</loginTicketRequest>'
        )

    def _sign_tra(self, tra_xml: str, cert_pem: bytes, key_pem: bytes) -> str:
        """
        Firma el TRA usando PKCS7 (CMS) con SHA-256.
        Retorna el CMS firmado en base64 (lo que WSAA espera en loginCms).
        """
        cert = x509.load_pem_x509_certificate(cert_pem)
        privkey = serialization.load_pem_private_key(key_pem, password=None)

        signed = (
            pkcs7.PKCS7SignatureBuilder()
            .set_data(tra_xml.encode())
            .add_signer(cert, privkey, hashes.SHA256())
            .sign(serialization.Encoding.DER, [pkcs7.PKCS7Options.DetachedSignature])
        )
        return base64.b64encode(signed).decode()

    def _parse_ta(self, ta_xml: str) -> Tuple[str, str, datetime]:
        """Parsea el Ticket de Acceso (TA) XML y retorna (token, sign, expiration)."""
        root = ET.fromstring(ta_xml)
        ns = ""
        token = root.findtext(f"{ns}credentials/token") or root.findtext("credentials/token")
        sign = root.findtext(f"{ns}credentials/sign") or root.findtext("credentials/sign")
        exp_str = root.findtext(f"{ns}header/expirationTime") or root.findtext("header/expirationTime")
        if not token or not sign:
            raise ValueError(f"No se pudo parsear el Ticket de Acceso. XML: {ta_xml[:300]}")
        # Parsear expiración
        try:
            exp = datetime.fromisoformat(exp_str.replace("Z", "+00:00")) if exp_str else datetime.now(timezone.utc) + timedelta(hours=11)
        except Exception:
            exp = datetime.now(timezone.utc) + timedelta(hours=11)
        return token, sign, exp

    async def _authenticate(self, afip_cfg: dict, jwt_secret: str) -> Tuple[str, str, datetime]:
        """Autentica contra WSAA y retorna (token, sign, expiration)."""
        try:
            import zeep
        except ImportError:
            raise RuntimeError("La librería 'zeep' no está instalada. Ejecutar: pip install zeep lxml")

        wsaa_url, _ = self._get_urls(afip_cfg["ambiente"])
        cert_pem = base64.b64decode(afip_cfg["cert_pem"])
        key_pem = decrypt_private_key(afip_cfg["key_pem_encrypted"], jwt_secret)

        tra_xml = self._build_tra("wsfe")
        cms_b64 = self._sign_tra(tra_xml, cert_pem, key_pem)

        try:
            client = zeep.Client(wsaa_url)
            response = client.service.loginCms(in0=cms_b64)
        except Exception as e:
            raise RuntimeError(f"Error comunicando con WSAA: {e}")

        token, sign, exp = self._parse_ta(response)
        return token, sign, exp

    async def get_token_sign(self, afip_cfg: dict, db, jwt_secret: str) -> Tuple[str, str]:
        """
        Retorna (token, sign) vigentes. Usa caché en db.afip_tokens.
        Si el token está por vencer (< 10 min) o no existe, re-autentica.
        """
        now = datetime.now(timezone.utc)
        cached = await db.afip_tokens.find_one({"empresa_id": afip_cfg["empresa_id"]})

        if cached:
            exp = cached["expiration"]
            if not exp.tzinfo:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp > now + timedelta(minutes=10):
                return cached["token"], cached["sign"]

        # Re-autenticar
        token, sign, exp = await self._authenticate(afip_cfg, jwt_secret)

        await db.afip_tokens.update_one(
            {"empresa_id": afip_cfg["empresa_id"]},
            {"$set": {"token": token, "sign": sign, "expiration": exp}},
            upsert=True
        )
        return token, sign

    # ── WSFE ──────────────────────────────────────────────────────────────────

    async def test_conexion(self, afip_cfg: dict, jwt_secret: str, db) -> dict:
        """Llama FEDummy para verificar que los servicios de AFIP responden."""
        try:
            import zeep
        except ImportError:
            raise RuntimeError("La librería 'zeep' no está instalada.")

        _, wsfe_url = self._get_urls(afip_cfg["ambiente"])
        try:
            client = zeep.Client(wsfe_url)
            result = client.service.FEDummy()
            return {
                "ok": True,
                "AppServer": result.AppServer,
                "DbServer": result.DbServer,
                "AuthServer": result.AuthServer
            }
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def get_ultimo_cbte(self, afip_cfg: dict, token: str, sign: str, tipo_cbte: int) -> int:
        """Retorna el último número de comprobante autorizado para el punto de venta."""
        try:
            import zeep
        except ImportError:
            raise RuntimeError("La librería 'zeep' no está instalada.")

        _, wsfe_url = self._get_urls(afip_cfg["ambiente"])
        client = zeep.Client(wsfe_url)

        auth = {
            "Token": token,
            "Sign": sign,
            "Cuit": int(afip_cfg["cuit"].replace("-", ""))
        }
        result = client.service.FECompUltimoAutorizado(
            Auth=auth,
            PtoVta=afip_cfg["punto_venta"],
            CbteTipo=tipo_cbte
        )
        if result.Errors:
            errs = result.Errors.Err
            msgs = [f"{e.Code}: {e.Msg}" for e in errs]
            raise RuntimeError(f"WSFE FECompUltimoAutorizado error: {'; '.join(msgs)}")

        return result.CbteNro  # Puede ser 0 si nunca se emitió

    async def solicitar_cae(
        self,
        sale: dict,
        afip_cfg: dict,
        token: str,
        sign: str,
        tipo_cbte: int,
        cuit_receptor: Optional[str] = None
    ) -> dict:
        """
        Solicita CAE para una venta. Retorna dict con cae, cae_vencimiento, nro_comprobante.
        tipo_cbte: 1=Factura A, 6=Factura B, 11=Factura C
        """
        try:
            import zeep
        except ImportError:
            raise RuntimeError("La librería 'zeep' no está instalada.")

        _, wsfe_url = self._get_urls(afip_cfg["ambiente"])
        client = zeep.Client(wsfe_url)

        cuit_emisor = int(afip_cfg["cuit"].replace("-", ""))
        auth = {"Token": token, "Sign": sign, "Cuit": cuit_emisor}

        # Obtener próximo número
        ultimo_nro = await self.get_ultimo_cbte(afip_cfg, token, sign, tipo_cbte)
        nro_cbte = ultimo_nro + 1

        # Receptor: Factura A requiere CUIT, B y C van como consumidor final
        if tipo_cbte == 1 and cuit_receptor:
            doc_tipo = DOC_TIPO_CUIT
            doc_nro = int(cuit_receptor.replace("-", ""))
        else:
            doc_tipo = DOC_TIPO_CONSUMIDOR_FINAL
            doc_nro = 0

        fecha_cbte = datetime.now(timezone.utc).strftime("%Y%m%d")

        # Importes — WSFE requiere 2 decimales, sin IVA discriminado para monotributo
        imp_total = round(sale["total"], 2)
        imp_neto = round(sale["subtotal"], 2)
        imp_iva = round(sale["impuestos"], 2)

        # Para Factura C (monotributista) ImpIVA siempre 0
        if tipo_cbte == 11:
            imp_iva = 0.0
            imp_neto = imp_total

        # Alícuota de IVA (21% = código 5, 10.5% = código 4, 0% = código 3)
        # Usamos la tasa configurada
        tax_rate = afip_cfg.get("tax_rate", 0.21)
        if abs(tax_rate - 0.21) < 0.01:
            alicuota_id = 5   # 21%
        elif abs(tax_rate - 0.105) < 0.01:
            alicuota_id = 4   # 10.5%
        else:
            alicuota_id = 3   # 0%

        iva_array = None
        if tipo_cbte != 11 and imp_iva > 0:
            iva_array = {"AlicIva": [{"Id": alicuota_id, "BaseImp": imp_neto, "Importe": imp_iva}]}

        fe_cab_req = {
            "CantReg": 1,
            "PtoVta": afip_cfg["punto_venta"],
            "CbteTipo": tipo_cbte
        }

        fe_det_req = {
            "Concepto": 1,          # 1=Productos, 2=Servicios, 3=Productos y Servicios
            "DocTipo": doc_tipo,
            "DocNro": doc_nro,
            "CbteDesde": nro_cbte,
            "CbteHasta": nro_cbte,
            "CbteFch": fecha_cbte,
            "ImpTotal": imp_total,
            "ImpTotConc": 0.0,
            "ImpNeto": imp_neto,
            "ImpOpEx": 0.0,
            "ImpIVA": imp_iva,
            "ImpTrib": 0.0,
            "MonId": "PES",
            "MonCotiz": 1.0,
        }
        if iva_array:
            fe_det_req["Iva"] = iva_array

        fe_cae_req = {
            "FeCabReq": fe_cab_req,
            "FeDetReq": {"FECAEDetRequest": [fe_det_req]}
        }

        try:
            result = client.service.FECAESolicitar(Auth=auth, FeCAEReq=fe_cae_req)
        except Exception as e:
            raise RuntimeError(f"Error en FECAESolicitar: {e}")

        # Verificar errores generales
        if result.Errors:
            errs = result.Errors.Err
            msgs = [f"{e.Code}: {e.Msg}" for e in errs]
            raise RuntimeError(f"WSFE error: {'; '.join(msgs)}")

        det = result.FeDetResp.FECAEDetResponse[0]

        # Verificar observaciones de AFIP
        if det.Resultado == "R":
            obs = []
            if det.Observaciones:
                obs = [f"{o.Code}: {o.Msg}" for o in det.Observaciones.Obs]
            raise RuntimeError(f"AFIP rechazó el comprobante: {'; '.join(obs)}")

        if not det.CAE:
            raise RuntimeError("AFIP no devolvió CAE. Resultado: " + str(det.Resultado))

        return {
            "cae": det.CAE,
            "cae_vencimiento": det.CAEFchVto,   # formato "AAAAMMDD"
            "nro_comprobante": nro_cbte,
            "tipo_comprobante": tipo_cbte
        }
