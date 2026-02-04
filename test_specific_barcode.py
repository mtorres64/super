#!/usr/bin/env python3
import requests
import json

def test_specific_barcode():
    # Test the specific barcode mentioned in the request
    base_url = 'https://super-admin.preview.emergentagent.com'
    api_url = f'{base_url}/api'

    # Login first
    login_data = {'email': 'admin@supermarket.com', 'password': 'admin123'}
    response = requests.post(f'{api_url}/auth/login', json=login_data)
    
    if response.status_code == 200:
        token = response.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        
        # Test the specific barcode
        barcode = '7501234567892'
        response = requests.get(f'{api_url}/products/barcode/{barcode}', headers=headers)
        
        print(f'Testing barcode: {barcode}')
        print(f'Status code: {response.status_code}')
        
        if response.status_code == 200:
            product = response.json()
            print(f'Product found: {product["nombre"]}')
            print(f'Price: ${product["precio"]}')
            print(f'Stock: {product["stock"]}')
            print('✅ Barcode endpoint working correctly')
            return True
        elif response.status_code == 404:
            print('❌ Product with barcode 7501234567892 not found')
            print('Need to create test product with this barcode')
            
            # Let's create the test product
            print('\n🔧 Creating test product with barcode 7501234567892...')
            
            # First get categories
            cat_response = requests.get(f'{api_url}/categories', headers=headers)
            if cat_response.status_code == 200:
                categories = cat_response.json()
                if categories:
                    category_id = categories[0]['id']
                    
                    # Create the test product
                    product_data = {
                        'nombre': 'Leche Entera 1L',
                        'codigo_barras': '7501234567892',
                        'tipo': 'codigo_barras',
                        'precio': 25.50,
                        'categoria_id': category_id,
                        'stock': 100,
                        'stock_minimo': 10
                    }
                    
                    create_response = requests.post(f'{api_url}/products', json=product_data, headers=headers)
                    if create_response.status_code == 200:
                        print('✅ Test product created successfully')
                        
                        # Test the barcode again
                        test_response = requests.get(f'{api_url}/products/barcode/{barcode}', headers=headers)
                        if test_response.status_code == 200:
                            product = test_response.json()
                            print(f'✅ Barcode test successful: {product["nombre"]}')
                            return True
                        else:
                            print('❌ Still cannot find product after creation')
                            return False
                    else:
                        print(f'❌ Failed to create test product: {create_response.text}')
                        return False
                else:
                    print('❌ No categories found')
                    return False
            else:
                print('❌ Failed to get categories')
                return False
        else:
            print(f'❌ Unexpected response: {response.text}')
            return False
    else:
        print('❌ Login failed')
        return False

if __name__ == "__main__":
    test_specific_barcode()