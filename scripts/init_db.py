#!/usr/bin/env python3
"""
Script para inicializar la base de datos con usuarios y datos de prueba
"""
import asyncio
import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.hash import bcrypt
from dotenv import load_dotenv
import uuid
from datetime import datetime, timezone

# Load environment variables
load_dotenv(backend_path / '.env')

async def init_database():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"Connecting to database: {db_name}")
    
    # Create users
    print("Creating users...")
    
    # Check if admin user already exists
    admin_exists = await db.users.find_one({"email": "admin@supermarket.com"})
    if not admin_exists:
        users = [
            {
                "id": str(uuid.uuid4()),
                "nombre": "Admin SuperMarket",
                "email": "admin@supermarket.com",
                "password": bcrypt.hash("admin123"),
                "rol": "admin",
                "activo": True,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "nombre": "Carlos Cajero",
                "email": "cajero@supermarket.com",
                "password": bcrypt.hash("cajero123"),
                "rol": "cajero",
                "activo": True,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "nombre": "Sara Supervisora",
                "email": "supervisor@supermarket.com",
                "password": bcrypt.hash("super123"),
                "rol": "supervisor",
                "activo": True,
                "created_at": datetime.now(timezone.utc)
            }
        ]
        
        await db.users.insert_many(users)
        print("✅ Users created successfully")
    else:
        print("ℹ️ Users already exist")
    
    # Create categories
    print("Creating categories...")
    categories_exist = await db.categories.find_one()
    if not categories_exist:
        categories = [
            {
                "id": str(uuid.uuid4()),
                "nombre": "Frutas y Verduras",
                "descripcion": "Productos frescos",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "nombre": "Lácteos",
                "descripcion": "Leche, quesos, yogurt",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "nombre": "Panadería",
                "descripcion": "Pan y productos de panadería",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "nombre": "Bebidas",
                "descripcion": "Refrescos, jugos, agua",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "nombre": "Enlatados",
                "descripcion": "Conservas y enlatados",
                "created_at": datetime.now(timezone.utc)
            }
        ]
        
        await db.categories.insert_many(categories)
        print("✅ Categories created successfully")
        
        # Get category IDs for products
        cat_docs = await db.categories.find().to_list(None)
        cat_map = {cat['nombre']: cat['id'] for cat in cat_docs}
        
        # Create sample products
        print("Creating products...")
        products = [
            {
                "id": str(uuid.uuid4()),
                "nombre": "Manzana Red Delicious",
                "codigo_barras": "7501234567891",
                "tipo": "por_peso",
                "precio": 2.50,
                "precio_por_peso": 2.50,
                "categoria_id": cat_map["Frutas y Verduras"],
                "stock": 100,
                "stock_minimo": 20,
                "activo": True,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "nombre": "Leche Entera 1L",
                "codigo_barras": "7501234567892",
                "tipo": "codigo_barras",
                "precio": 1.25,
                "precio_por_peso": None,
                "categoria_id": cat_map["Lácteos"],
                "stock": 50,
                "stock_minimo": 10,
                "activo": True,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "nombre": "Pan Integral",
                "codigo_barras": "7501234567893",
                "tipo": "codigo_barras",
                "precio": 0.75,
                "precio_por_peso": None,
                "categoria_id": cat_map["Panadería"],
                "stock": 30,
                "stock_minimo": 5,
                "activo": True,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "nombre": "Coca Cola 500ml",
                "codigo_barras": "7501234567894",
                "tipo": "codigo_barras",
                "precio": 1.50,
                "precio_por_peso": None,
                "categoria_id": cat_map["Bebidas"],
                "stock": 80,
                "stock_minimo": 15,
                "activo": True,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "nombre": "Atún en Lata",
                "codigo_barras": "7501234567895",
                "tipo": "codigo_barras",
                "precio": 2.25,
                "precio_por_peso": None,
                "categoria_id": cat_map["Enlatados"],
                "stock": 40,
                "stock_minimo": 8,
                "activo": True,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "nombre": "Plátano",
                "codigo_barras": "7501234567896",
                "tipo": "por_peso",
                "precio": 1.80,
                "precio_por_peso": 1.80,
                "categoria_id": cat_map["Frutas y Verduras"],
                "stock": 60,
                "stock_minimo": 12,
                "activo": True,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "nombre": "Queso Manchego",
                "codigo_barras": "7501234567897",
                "tipo": "codigo_barras",
                "precio": 4.50,
                "precio_por_peso": None,
                "categoria_id": cat_map["Lácteos"],
                "stock": 25,
                "stock_minimo": 5,
                "activo": True,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "nombre": "Agua Mineral 1L",
                "codigo_barras": "7501234567898",
                "tipo": "codigo_barras",
                "precio": 0.85,
                "precio_por_peso": None,
                "categoria_id": cat_map["Bebidas"],
                "stock": 120,
                "stock_minimo": 25,
                "activo": True,
                "created_at": datetime.now(timezone.utc)
            }
        ]
        
        await db.products.insert_many(products)
        print("✅ Products created successfully")
    else:
        print("ℹ️ Categories and products already exist")
    
    client.close()
    print("🎉 Database initialization completed!")

if __name__ == "__main__":
    asyncio.run(init_database())