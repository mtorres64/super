#!/usr/bin/env python3
import requests
import sys
import json
from datetime import datetime

class SuperMarketAPITester:
    def __init__(self, base_url="https://minimarket-snowy.vercel.app"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tokens = {}
        self.users = {
            'admin': {'email': 'admin@supermarket.com', 'password': 'admin123'},
            'cajero': {'email': 'cajero@supermarket.com', 'password': 'cajero123'},
            'supervisor': {'email': 'supervisor@supermarket.com', 'password': 'super123'}
        }
        self.tests_run = 0
        self.tests_passed = 0
        self.created_items = {'categories': [], 'products': []}

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")

    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make HTTP request with error handling"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            return success, response.status_code, response.json() if response.content else {}

        except requests.exceptions.RequestException as e:
            return False, 0, {'error': str(e)}

    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n🔐 TESTING AUTHENTICATION")
        
        # Test login for each user type
        for role, credentials in self.users.items():
            success, status, response = self.make_request(
                'POST', 'auth/login', credentials, expected_status=200
            )
            
            if success and 'access_token' in response:
                self.tokens[role] = response['access_token']
                user_data = response.get('user', {})
                self.log_test(f"Login {role}", True, f"Role: {user_data.get('rol')}")
            else:
                self.log_test(f"Login {role}", False, f"Status: {status}, Response: {response}")

        # Test invalid login
        success, status, response = self.make_request(
            'POST', 'auth/login', 
            {'email': 'invalid@test.com', 'password': 'wrong'}, 
            expected_status=400
        )
        self.log_test("Invalid login rejection", success)

    def test_categories(self):
        """Test category management"""
        print("\n📂 TESTING CATEGORIES")
        
        admin_token = self.tokens.get('admin')
        if not admin_token:
            print("❌ No admin token available for category tests")
            return

        # Test create category (admin only)
        category_data = {
            'nombre': f'Test Category {datetime.now().strftime("%H%M%S")}',
            'descripcion': 'Test category description'
        }
        
        success, status, response = self.make_request(
            'POST', 'categories', category_data, admin_token, expected_status=200
        )
        
        if success and 'id' in response:
            category_id = response['id']
            self.created_items['categories'].append(category_id)
            self.log_test("Create category (admin)", True)
        else:
            self.log_test("Create category (admin)", False, f"Status: {status}")

        # Test get categories (all users)
        for role, token in self.tokens.items():
            success, status, response = self.make_request(
                'GET', 'categories', token=token
            )
            self.log_test(f"Get categories ({role})", success and isinstance(response, list))

        # Test create category with non-admin user
        cajero_token = self.tokens.get('cajero')
        if cajero_token:
            success, status, response = self.make_request(
                'POST', 'categories', category_data, cajero_token, expected_status=403
            )
            self.log_test("Create category (cajero - should fail)", success)

    def test_products(self):
        """Test product management"""
        print("\n📦 TESTING PRODUCTS")
        
        admin_token = self.tokens.get('admin')
        if not admin_token:
            print("❌ No admin token available for product tests")
            return

        # Get categories first
        success, status, categories = self.make_request('GET', 'categories', token=admin_token)
        if not success or not categories:
            print("❌ No categories available for product tests")
            return

        category_id = categories[0]['id']

        # Test create product
        product_data = {
            'nombre': f'Test Product {datetime.now().strftime("%H%M%S")}',
            'codigo_barras': f'TEST{datetime.now().strftime("%H%M%S")}',
            'tipo': 'codigo_barras',
            'precio': 10.50,
            'categoria_id': category_id,
            'stock': 100,
            'stock_minimo': 10
        }

        success, status, response = self.make_request(
            'POST', 'products', product_data, admin_token, expected_status=200
        )

        if success and 'id' in response:
            product_id = response['id']
            self.created_items['products'].append(product_id)
            self.log_test("Create product (admin)", True)

            # Test get product by ID
            success, status, response = self.make_request(
                'GET', f'products/{product_id}', token=admin_token
            )
            self.log_test("Get product by ID", success)

            # Test get product by barcode
            success, status, response = self.make_request(
                'GET', f'products/barcode/{product_data["codigo_barras"]}', token=admin_token
            )
            self.log_test("Get product by barcode", success)

            # Test update product
            update_data = {'precio': 15.75, 'stock': 150}
            success, status, response = self.make_request(
                'PUT', f'products/{product_id}', update_data, admin_token
            )
            self.log_test("Update product (admin)", success)

        else:
            self.log_test("Create product (admin)", False, f"Status: {status}")

        # Test get all products
        for role, token in self.tokens.items():
            success, status, response = self.make_request(
                'GET', 'products', token=token
            )
            self.log_test(f"Get products ({role})", success and isinstance(response, list))

    def test_sales(self):
        """Test sales functionality"""
        print("\n💰 TESTING SALES")
        
        # Test with cajero token
        cajero_token = self.tokens.get('cajero')
        if not cajero_token:
            print("❌ No cajero token available for sales tests")
            return

        # Get products first
        success, status, products = self.make_request('GET', 'products', token=cajero_token)
        if not success or not products:
            print("❌ No products available for sales tests")
            return

        product = products[0]
        
        # Test create sale
        sale_data = {
            'items': [
                {
                    'producto_id': product['id'],
                    'cantidad': 2,
                    'precio_unitario': product['precio'],
                    'subtotal': 2 * product['precio']
                }
            ],
            'metodo_pago': 'efectivo'
        }

        success, status, response = self.make_request(
            'POST', 'sales', sale_data, cajero_token, expected_status=200
        )
        
        if success and 'numero_factura' in response:
            self.log_test("Create sale (cajero)", True, f"Invoice: {response['numero_factura']}")
        else:
            self.log_test("Create sale (cajero)", False, f"Status: {status}")

        # Test get sales for different roles
        for role, token in self.tokens.items():
            success, status, response = self.make_request(
                'GET', 'sales', token=token
            )
            self.log_test(f"Get sales ({role})", success and isinstance(response, list))

    def test_dashboard(self):
        """Test dashboard statistics"""
        print("\n📊 TESTING DASHBOARD")
        
        # Test dashboard access for admin and supervisor
        for role in ['admin', 'supervisor']:
            token = self.tokens.get(role)
            if token:
                success, status, response = self.make_request(
                    'GET', 'dashboard/stats', token=token
                )
                
                if success and 'ventas_hoy' in response and 'productos' in response:
                    self.log_test(f"Dashboard stats ({role})", True)
                else:
                    self.log_test(f"Dashboard stats ({role})", False, f"Status: {status}")

        # Test dashboard access denied for cajero
        cajero_token = self.tokens.get('cajero')
        if cajero_token:
            success, status, response = self.make_request(
                'GET', 'dashboard/stats', cajero_token, expected_status=403
            )
            self.log_test("Dashboard stats (cajero - should fail)", success)

    def test_error_handling(self):
        """Test error handling"""
        print("\n🚫 TESTING ERROR HANDLING")
        
        admin_token = self.tokens.get('admin')
        if not admin_token:
            return

        # Test non-existent product
        success, status, response = self.make_request(
            'GET', 'products/non-existent-id', token=admin_token, expected_status=404
        )
        self.log_test("Non-existent product (404)", success)

        # Test invalid barcode
        success, status, response = self.make_request(
            'GET', 'products/barcode/INVALID-BARCODE', token=admin_token, expected_status=404
        )
        self.log_test("Invalid barcode (404)", success)

        # Test unauthorized access
        success, status, response = self.make_request(
            'GET', 'products', expected_status=401
        )
        self.log_test("Unauthorized access (401)", success)

    def run_all_tests(self):
        """Run all tests"""
        print("🧪 STARTING SUPERMARKET POS API TESTS")
        print(f"🌐 Testing against: {self.base_url}")
        
        try:
            self.test_authentication()
            self.test_categories()
            self.test_products()
            self.test_sales()
            self.test_dashboard()
            self.test_error_handling()
            
        except Exception as e:
            print(f"❌ Unexpected error during testing: {str(e)}")
        
        # Print summary
        print(f"\n📋 TEST SUMMARY")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = SuperMarketAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())