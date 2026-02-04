from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
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

# Models
class Branch(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nombre: str
    direccion: str
    telefono: Optional[str] = None
    activo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BranchCreate(BaseModel):
    nombre: str
    direccion: str
    telefono: Optional[str] = None

class CashSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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
    session_id: str
    tipo: MovementType
    monto: float
    descripcion: str
    venta_id: Optional[str] = None
    fecha: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BranchProduct(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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

# Models
class Configuration(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nombre: str
    descripcion: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = await db.users.find_one({"id": user_id})
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
@api_router.post("/branches", response_model=Branch, dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def create_branch(branch_data: BranchCreate):
    branch = Branch(**branch_data.dict())
    await db.branches.insert_one(branch.dict())
    return branch

@api_router.get("/branches", response_model=List[Branch])
async def get_branches(user: User = Depends(get_current_user)):
    branches = await db.branches.find({"activo": True}).to_list(1000)
    return [Branch(**branch) for branch in branches]

@api_router.get("/branches/{branch_id}", response_model=Branch)
async def get_branch(branch_id: str, user: User = Depends(get_current_user)):
    branch = await db.branches.find_one({"id": branch_id})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return Branch(**branch)

# Cash Session routes
@api_router.post("/cash-sessions", response_model=CashSession)
async def open_cash_session(session_data: CashSessionCreate, user: User = Depends(get_current_user)):
    if not user.branch_id:
        raise HTTPException(status_code=400, detail="User must be assigned to a branch")
    
    # Check if there's already an open session for this user
    existing_session = await db.cash_sessions.find_one({
        "user_id": user.id,
        "status": CashSessionStatus.ABIERTA
    })
    if existing_session:
        raise HTTPException(status_code=400, detail="Ya tienes una sesión de caja abierta")
    
    # Create new session
    session = CashSession(
        branch_id=user.branch_id,
        user_id=user.id,
        monto_inicial=session_data.monto_inicial,
        observaciones=session_data.observaciones
    )
    
    await db.cash_sessions.insert_one(session.dict())
    
    # Create opening movement
    movement = CashMovement(
        session_id=session.id,
        tipo=MovementType.APERTURA,
        monto=session_data.monto_inicial,
        descripcion=f"Apertura de caja - {session_data.observaciones or ''}"
    )
    await db.cash_movements.insert_one(movement.dict())
    
    return session

@api_router.put("/cash-sessions/{session_id}/close", response_model=CashSession)
async def close_cash_session(session_id: str, close_data: CashSessionClose, user: User = Depends(get_current_user)):
    session = await db.cash_sessions.find_one({"id": session_id, "user_id": user.id})
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
    
    await db.cash_sessions.update_one({"id": session_id}, {"$set": update_data})
    
    # Create closing movement
    movement = CashMovement(
        session_id=session_id,
        tipo=MovementType.CIERRE,
        monto=close_data.monto_final,
        descripcion=f"Cierre de caja - {close_data.observaciones or ''}"
    )
    await db.cash_movements.insert_one(movement.dict())
    
    updated_session = await db.cash_sessions.find_one({"id": session_id})
    return CashSession(**updated_session)

@api_router.get("/cash-sessions/current", response_model=Optional[CashSession])
async def get_current_cash_session(user: User = Depends(get_current_user)):
    session = await db.cash_sessions.find_one({
        "user_id": user.id,
        "status": CashSessionStatus.ABIERTA
    })
    return CashSession(**session) if session else None

@api_router.get("/cash-sessions", response_model=List[CashSession])
async def get_cash_sessions(user: User = Depends(get_current_user)):
    if user.rol == UserRole.CAJERO:
        sessions = await db.cash_sessions.find({"user_id": user.id}).sort("fecha_apertura", -1).to_list(100)
    else:
        query = {}
        if user.branch_id and user.rol != UserRole.ADMIN:
            query["branch_id"] = user.branch_id
        sessions = await db.cash_sessions.find(query).sort("fecha_apertura", -1).to_list(1000)
    
    return [CashSession(**session) for session in sessions]

# Auth routes
@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = bcrypt.hash(user_data.password)
    
    # Create user
    user_dict = user_data.dict()
    user_dict.pop('password')
    user = User(**user_dict)
    
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
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_doc['id']}, expires_delta=access_token_expires
    )
    
    user = User(**user_doc)
    return Token(access_token=access_token, token_type="bearer", user=user)

# Category routes
@api_router.post("/categories", response_model=Category, dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def create_category(category_data: CategoryCreate):
    category = Category(**category_data.dict())
    await db.categories.insert_one(category.dict())
    return category

@api_router.get("/categories", response_model=List[Category])
async def get_categories(user: User = Depends(get_current_user)):
    categories = await db.categories.find().to_list(1000)
    return [Category(**cat) for cat in categories]

# Branch Product routes
@api_router.post("/branch-products", response_model=BranchProduct, dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def create_branch_product(product_data: BranchProductCreate, user: User = Depends(get_current_user)):
    # Verify product exists
    product = await db.products.find_one({"id": product_data.product_id})
    if not product:
        raise HTTPException(status_code=400, detail="Product not found")
    
    # Check if product already exists in branch
    existing = await db.branch_products.find_one({
        "product_id": product_data.product_id,
        "branch_id": user.branch_id or product_data.dict().get('branch_id')
    })
    if existing:
        raise HTTPException(status_code=400, detail="Product already exists in this branch")
    
    branch_product = BranchProduct(**product_data.dict(), branch_id=user.branch_id)
    await db.branch_products.insert_one(branch_product.dict())
    return branch_product

@api_router.get("/branch-products", response_model=List[dict])
async def get_branch_products(user: User = Depends(get_current_user)):
    if not user.branch_id:
        raise HTTPException(status_code=400, detail="User must be assigned to a branch")
    
    # Get products with branch-specific data
    pipeline = [
        {
            "$match": {
                "branch_id": user.branch_id,
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
                "id": 1,
                "product_id": 1,
                "branch_id": 1,
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
@api_router.post("/products", response_model=Product, dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def create_product(product_data: ProductCreate):
    # Verify category exists
    category = await db.categories.find_one({"id": product_data.categoria_id})
    if not category:
        raise HTTPException(status_code=400, detail="Category not found")
    
    # Check if barcode already exists
    if product_data.codigo_barras:
        existing_product = await db.products.find_one({"codigo_barras": product_data.codigo_barras})
        if existing_product:
            raise HTTPException(status_code=400, detail="Barcode already exists")
    
    product = Product(**product_data.dict())
    await db.products.insert_one(product.dict())
    return product

@api_router.get("/products", response_model=List[Product])
async def get_products(user: User = Depends(get_current_user)):
    products = await db.products.find({"activo": True}).to_list(1000)
    return [Product(**prod) for prod in products]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str, user: User = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@api_router.get("/products/barcode/{barcode}", response_model=Product)
async def get_product_by_barcode(barcode: str, user: User = Depends(get_current_user)):
    product = await db.products.find_one({"codigo_barras": barcode, "activo": True})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@api_router.put("/products/{product_id}", response_model=Product, dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def update_product(product_id: str, product_data: ProductUpdate):
    # Check if product exists
    existing_product = await db.products.find_one({"id": product_id})
    if not existing_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Update fields
    update_data = {k: v for k, v in product_data.dict().items() if v is not None}
    
    if update_data:
        await db.products.update_one({"id": product_id}, {"$set": update_data})
    
    updated_product = await db.products.find_one({"id": product_id})
    return Product(**updated_product)

# Configuration routes
@api_router.get("/config", response_model=Configuration)
async def get_configuration(user: User = Depends(get_current_user)):
    config = await db.configuration.find_one()
    if not config:
        # Create default configuration if none exists
        default_config = Configuration()
        await db.configuration.insert_one(default_config.dict())
        return default_config
    return Configuration(**config)

@api_router.put("/config", response_model=Configuration, dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def update_configuration(config_data: ConfigurationUpdate):
    # Get current configuration
    current_config = await db.configuration.find_one()
    if not current_config:
        # Create default if none exists
        current_config = Configuration().dict()
        await db.configuration.insert_one(current_config)
    
    # Update fields
    update_data = {k: v for k, v in config_data.dict().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc)
    
    if update_data:
        await db.configuration.update_one({}, {"$set": update_data})
    
    updated_config = await db.configuration.find_one()
    return Configuration(**updated_config)

@api_router.post("/config/upload-logo", dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def upload_logo(file: UploadFile = File(...)):
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Validate file size (max 2MB)
    file_size = 0
    content = await file.read()
    file_size = len(content)
    
    if file_size > 2 * 1024 * 1024:  # 2MB
        raise HTTPException(status_code=400, detail="File size must be less than 2MB")
    
    # Convert to base64
    base64_image = base64.b64encode(content).decode('utf-8')
    logo_data_url = f"data:{file.content_type};base64,{base64_image}"
    
    # Update configuration
    await db.configuration.update_one({}, {"$set": {
        "company_logo": logo_data_url,
        "updated_at": datetime.now(timezone.utc)
    }})
    
    return {"message": "Logo uploaded successfully", "logo_url": logo_data_url}

# Sales routes
@api_router.post("/sales", response_model=Sale)
async def create_sale(sale_data: SaleCreate, user: User = Depends(get_current_user)):
    # Validate user has branch assigned
    if not user.branch_id:
        raise HTTPException(status_code=400, detail="Usuario debe estar asignado a una sucursal")
    
    # Check if user has an open cash session
    current_session = await db.cash_sessions.find_one({
        "user_id": user.id,
        "status": CashSessionStatus.ABIERTA
    })
    if not current_session:
        raise HTTPException(status_code=400, detail="Debe abrir una caja antes de realizar ventas")
    
    # Get current configuration for tax rate
    config = await db.configuration.find_one()
    tax_rate = config['tax_rate'] if config else 0.12  # Default 12%
    
    # Verify products and calculate totals
    total_amount = 0
    validated_items = []
    
    for item in sale_data.items:
        # Get product from branch inventory
        branch_product = await db.branch_products.find_one({
            "product_id": item.producto_id,
            "branch_id": user.branch_id,
            "activo": True
        })
        if not branch_product:
            product = await db.products.find_one({"id": item.producto_id})
            product_name = product['nombre'] if product else item.producto_id
            raise HTTPException(status_code=400, detail=f"Producto {product_name} no disponible en esta sucursal")
        
        # Check stock
        if branch_product['stock'] < item.cantidad:
            product = await db.products.find_one({"id": item.producto_id})
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para {product['nombre']}")
        
        # Use branch-specific price
        precio_unitario = branch_product['precio']
        if branch_product.get('precio_por_peso') and item.cantidad != int(item.cantidad):
            precio_unitario = branch_product['precio_por_peso']
        
        # Calculate subtotal
        subtotal = item.cantidad * precio_unitario
        validated_items.append(SaleItem(
            producto_id=item.producto_id,
            cantidad=item.cantidad,
            precio_unitario=precio_unitario,
            subtotal=subtotal
        ))
        total_amount += subtotal
        
        # Update branch stock
        await db.branch_products.update_one(
            {"product_id": item.producto_id, "branch_id": user.branch_id},
            {"$inc": {"stock": -item.cantidad}}
        )
    
    # Generate invoice number per branch
    last_sale = await db.sales.find_one(
        {"branch_id": user.branch_id}, 
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
        cajero_id=user.id,
        branch_id=user.branch_id,
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
        {"id": current_session['id']},
        {"$inc": {"monto_ventas": total}}
    )
    
    # Create cash movement
    movement = CashMovement(
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
        sales = await db.sales.find({"cajero_id": user.id}).sort("fecha", -1).to_list(100)
    else:
        sales = await db.sales.find().sort("fecha", -1).to_list(1000)
    
    return [Sale(**sale) for sale in sales]

# Cash Reports routes
@api_router.get("/cash-sessions/{session_id}/movements", response_model=List[CashMovement])
async def get_session_movements(session_id: str, user: User = Depends(get_current_user)):
    movements = await db.cash_movements.find({"session_id": session_id}).sort("fecha", 1).to_list(1000)
    return [CashMovement(**movement) for movement in movements]

@api_router.get("/cash-sessions/{session_id}/report")
async def get_cash_session_report(session_id: str, user: User = Depends(get_current_user)):
    session = await db.cash_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    # Get movements
    movements_docs = await db.cash_movements.find({"session_id": session_id}).sort("fecha", 1).to_list(1000)
    movements = [CashMovement(**movement) for movement in movements_docs]
    
    # Get sales details
    sales_docs = await db.sales.find({"session_id": session_id}).to_list(1000)
    sales = [Sale(**sale) for sale in sales_docs]
    
    # Get user info
    user_doc = await db.users.find_one({"id": session["user_id"]})
    user_info = User(**user_doc) if user_doc else None
    
    # Get branch info
    branch_doc = await db.branches.find_one({"id": session["branch_id"]})
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
        "fecha": {"$gte": today, "$lt": tomorrow}
    }).to_list(1000)
    
    total_ventas_hoy = sum(sale['total'] for sale in today_sales)
    numero_ventas_hoy = len(today_sales)
    
    # Total products
    total_productos = await db.products.count_documents({"activo": True})
    
    # Low stock products
    productos_bajo_stock = await db.products.find({
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://super-lake-theta.vercel.app"
    ],
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
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