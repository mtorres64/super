from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nombre: str
    email: str
    rol: UserRole
    activo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    nombre: str
    email: str
    password: str
    rol: UserRole

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

# Sales routes
@api_router.post("/sales", response_model=Sale)
async def create_sale(sale_data: SaleCreate, user: User = Depends(get_current_user)):
    # Verify products and calculate totals
    total_amount = 0
    validated_items = []
    
    for item in sale_data.items:
        product = await db.products.find_one({"id": item.producto_id, "activo": True})
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item.producto_id} not found")
        
        # Check stock
        if product['stock'] < item.cantidad:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product['nombre']}")
        
        # Calculate subtotal
        subtotal = item.cantidad * item.precio_unitario
        validated_items.append(SaleItem(
            producto_id=item.producto_id,
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
            subtotal=subtotal
        ))
        total_amount += subtotal
        
        # Update stock
        await db.products.update_one(
            {"id": item.producto_id},
            {"$inc": {"stock": -item.cantidad}}
        )
    
    # Generate invoice number
    last_sale = await db.sales.find_one(sort=[("fecha", -1)])
    if last_sale and last_sale.get('numero_factura'):
        last_number = int(last_sale['numero_factura'].split('-')[-1])
        numero_factura = f"FAC-{last_number + 1:06d}"
    else:
        numero_factura = "FAC-000001"
    
    # Create sale
    sale = Sale(
        cajero_id=user.id,
        items=validated_items,
        subtotal=total_amount,
        impuestos=total_amount * 0.12,  # 12% tax
        total=total_amount * 1.12,
        metodo_pago=sale_data.metodo_pago,
        numero_factura=numero_factura
    )
    
    await db.sales.insert_one(sale.dict())
    return sale

@api_router.get("/sales", response_model=List[Sale])
async def get_sales(user: User = Depends(get_current_user)):
    if user.rol == UserRole.CAJERO:
        sales = await db.sales.find({"cajero_id": user.id}).sort("fecha", -1).to_list(100)
    else:
        sales = await db.sales.find().sort("fecha", -1).to_list(1000)
    
    return [Sale(**sale) for sale in sales]

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