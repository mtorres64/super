import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { toast } from 'sonner';
import BarcodeScanner from './BarcodeScanner';
import Pagination from './Pagination';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  DollarSign,
  Smartphone,
  ShoppingCart,
  Scan,
  Camera,
  Keyboard,
  Volume2
} from 'lucide-react';

const POS = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [config, setConfig] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [loading, setLoading] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState('manual'); // 'manual' or 'camera'
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const barcodeInputRef = useRef(null);
  const lastKeyTime = useRef(0);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchConfiguration();
    fetchCurrentSession();
    
    // Focus barcode input on component mount
    if (barcodeInputRef.current && config?.auto_focus_barcode !== false) {
      barcodeInputRef.current.focus();
    }
  }, []);

  const fetchCurrentSession = async () => {
    try {
      const response = await axios.get(`${API}/cash-sessions/current`);
      setCurrentSession(response.data);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error verificando sesión de caja');
      }
    } finally {
      setSessionLoading(false);
    }
  };

  const fetchConfiguration = async () => {
    try {
      const response = await axios.get(`${API}/config`);
      setConfig(response.data);
    } catch (error) {
      console.error('Error loading configuration');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/branch-products`);
      setProducts(response.data);
    } catch (error) {
      toast.error('Error al cargar productos de la sucursal');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories');
    }
  };

  const searchProductByBarcode = async (code = barcode) => {
    if (!code.trim()) return;

    try {
      // First try to find in branch products
      const branchProducts = products.filter(p => p.codigo_barras === code);
      if (branchProducts.length > 0) {
        addToCart(branchProducts[0]);
        setBarcode('');
        playSuccessSound();
        toast.success(`${branchProducts[0].nombre} agregado al carrito`);
      } else {
        // If not found, show error
        playErrorSound();
        toast.error('Producto no encontrado en esta sucursal');
        setBarcode('');
      }
      
      // Focus back to barcode input
      if (barcodeInputRef.current && config?.auto_focus_barcode !== false) {
        barcodeInputRef.current.focus();
      }
    } catch (error) {
      playErrorSound();
      toast.error('Error al buscar producto');
    }
  };

  const handleBarcodeInput = (e) => {
    const currentTime = Date.now();
    const value = e.target.value;
    
    setBarcode(value);
    
    // Detect rapid input (typical of barcode scanners) - use config timeout
    const scanTimeout = config?.barcode_scan_timeout || 100;
    if (currentTime - lastKeyTime.current < scanTimeout && value.length > 3) {
      setIsAutoScanning(true);
    }
    lastKeyTime.current = currentTime;
    
    // Auto-submit when barcode is complete (typical barcode length)
    if (value.length >= 8 && isAutoScanning) {
      setTimeout(() => {
        searchProductByBarcode(value);
        setIsAutoScanning(false);
      }, scanTimeout);
    }
  };

  const handleBarcodeKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchProductByBarcode();
      setIsAutoScanning(false);
    }
  };

  const handleCameraScan = (scannedCode) => {
    setBarcode(scannedCode);
    searchProductByBarcode(scannedCode);
    setShowBarcodeScanner(false);
  };

  const playSuccessSound = () => {
    if (config?.sounds_enabled === false) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log('Could not play sound:', error);
    }
  };

  const playErrorSound = () => {
    if (config?.sounds_enabled === false) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 400;
      oscillator.type = 'sawtooth';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Could not play sound:', error);
    }
  };

  const filteredProducts = products.filter(product =>
    product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.codigo_barras && product.codigo_barras.includes(searchTerm))
  );

  // Pagination logic for POS
  const itemsPerPage = config?.items_per_page || 10;
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const addToCart = (product, quantity = 1) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setCart([...cart, {
        ...product,
        quantity,
        precio_unitario: product.precio
      }]);
    }
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    // Focus back to barcode input if auto-focus is enabled
    if (barcodeInputRef.current && config?.auto_focus_barcode !== false) {
      barcodeInputRef.current.focus();
    }
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0);
  };

  const calculateTax = () => {
    const taxRate = config?.tax_rate || 0.12; // Use dynamic tax rate or default 12%
    return calculateSubtotal() * taxRate;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const processSale = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    setLoading(true);
    try {
      const saleData = {
        items: cart.map(item => ({
          producto_id: item.id,
          cantidad: item.quantity,
          precio_unitario: item.precio,
          subtotal: item.precio * item.quantity
        })),
        metodo_pago: paymentMethod
      };

      const response = await axios.post(`${API}/sales`, saleData);
      
      // Play success sound
      playSuccessSound();
      
      toast.success(`Venta procesada exitosamente. Factura: ${response.data.numero_factura}`);
      clearCart();
      fetchProducts(); // Refresh products to update stock
    } catch (error) {
      playErrorSound();
      toast.error(error.response?.data?.detail || 'Error al procesar la venta');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.nombre : 'Sin categoría';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Punto de Venta
        </h1>
        <p className="text-gray-600">
          Cajero: {user?.nombre}
        </p>
      </div>

      {/* Cash Session Alert */}
      {sessionLoading ? (
        <div className="mb-6 bg-gray-50 border border-gray-200 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="spinner w-5 h-5 mr-3"></div>
            <p className="text-gray-600">Verificando estado de caja...</p>
          </div>
        </div>
      ) : !currentSession ? (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-red-600 mr-3">⚠️</div>
              <div>
                <h3 className="font-medium text-red-800">Caja Cerrada</h3>
                <p className="text-red-700">Debe abrir una caja antes de realizar ventas</p>
              </div>
            </div>
            <Link
              to="/cash"
              className="btn btn-primary"
            >
              Ir a Gestión de Caja
            </Link>
          </div>
        </div>
      ) : (
        <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="text-green-600 mr-3">✅</div>
            <div>
              <h3 className="font-medium text-green-800">Caja Abierta</h3>
              <p className="text-green-700">
                Sesión activa - Monto inicial: ${currentSession.monto_inicial.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="pos-container"
        style={{ 
          opacity: !sessionLoading && !currentSession ? 0.5 : 1,
          pointerEvents: !sessionLoading && !currentSession ? 'none' : 'auto'
        }}
      >
        {/* Left Section - Products */}
        <div className="pos-left">
          {/* Search Section */}
          <div className="pos-search">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  className="form-input pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Scan className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="Código de barras o usar escáner"
                    className={`form-input pl-10 ${isAutoScanning ? 'bg-green-50 border-green-300' : ''}`}
                    value={barcode}
                    onChange={handleBarcodeInput}
                    onKeyPress={handleBarcodeKeyPress}
                    autoComplete="off"
                  />
                  {isAutoScanning && (
                    <div className="absolute right-3 top-3">
                      <Volume2 className="h-4 w-4 text-green-600 animate-pulse" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => searchProductByBarcode()}
                  className="btn btn-secondary"
                  disabled={!barcode.trim()}
                >
                  <Keyboard className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowBarcodeScanner(true)}
                  className="btn btn-primary"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Scanner Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center text-sm text-blue-800">
                <Scan className="w-4 h-4 mr-2" />
                <span className="font-medium">Modos de escaneado:</span>
              </div>
              <div className="mt-1 text-xs text-blue-700 space-y-1">
                <p>• <strong>Escáner USB/Bluetooth:</strong> Simplemente escanea, se detecta automáticamente</p>
                <p>• <strong>Cámara web:</strong> Usa el botón de cámara para escanear visualmente</p>
                <p>• <strong>Manual:</strong> Ingresa el código y presiona Enter</p>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="pos-products">
            <div className="products-grid">
              {paginatedProducts.map(product => (
                <div
                  key={product.id}
                  className="product-card"
                  onClick={() => addToCart(product)}
                >
                  <div className="product-name">{product.nombre}</div>
                  <div className="product-price">
                    {config?.currency_symbol || '$'}{product.precio.toFixed(2)}
                    {product.tipo === 'por_peso' && '/kg'}
                  </div>
                  <div className="product-stock">
                    Stock: {product.stock}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {getCategoryName(product.categoria_id)}
                  </div>
                  {product.codigo_barras && (
                    <div className="text-xs text-blue-600 mt-1">
                      Código: {product.codigo_barras}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Section - Cart */}
        <div className="pos-cart">
          <div className="cart-header">
            <div className="flex items-center justify-between">
              <h2 className="cart-title">
                <ShoppingCart className="w-5 h-5 inline mr-2" />
                Carrito ({cart.length})
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="btn btn-secondary btn-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>El carrito está vacío</p>
                <p className="text-sm">Escanea o selecciona productos</p>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">
                    <strong>Tip:</strong> El campo de código está siempre activo para escáneres USB/Bluetooth
                  </p>
                </div>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.nombre}</div>
                    <div className="cart-item-price">
                      {config?.currency_symbol || '$'}{item.precio.toFixed(2)} x {item.quantity} = 
                      {config?.currency_symbol || '$'}{(item.precio * item.quantity).toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="cart-item-controls">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="quantity-btn"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                      className="quantity-input"
                    />
                    
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="quantity-btn"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="quantity-btn text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="cart-footer">
              <div className="cart-total">
                <div className="total-row">
                  <span className="total-label">Subtotal:</span>
                  <span className="total-value">{config?.currency_symbol || '$'}{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="total-row">
                  <span className="total-label">Impuestos ({((config?.tax_rate || 0.12) * 100).toFixed(1)}%):</span>
                  <span className="total-value">{config?.currency_symbol || '$'}{calculateTax().toFixed(2)}</span>
                </div>
                <div className="total-row total-final">
                  <span>Total:</span>
                  <span>{config?.currency_symbol || '$'}{calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="payment-methods">
                <label className="form-label">Método de Pago</label>
                <div className="space-y-2">
                  <div className="payment-method">
                    <input
                      type="radio"
                      id="efectivo"
                      name="payment"
                      value="efectivo"
                      checked={paymentMethod === 'efectivo'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <label htmlFor="efectivo" className="ml-2 flex items-center cursor-pointer">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Efectivo
                    </label>
                  </div>
                  
                  <div className="payment-method">
                    <input
                      type="radio"
                      id="tarjeta"
                      name="payment"
                      value="tarjeta"
                      checked={paymentMethod === 'tarjeta'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <label htmlFor="tarjeta" className="ml-2 flex items-center cursor-pointer">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Tarjeta
                    </label>
                  </div>
                  
                  <div className="payment-method">
                    <input
                      type="radio"
                      id="transferencia"
                      name="payment"
                      value="transferencia"
                      checked={paymentMethod === 'transferencia'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <label htmlFor="transferencia" className="ml-2 flex items-center cursor-pointer">
                      <Smartphone className="w-4 h-4 mr-2" />
                      Transferencia
                    </label>
                  </div>
                </div>
              </div>

              <button
                onClick={processSale}
                disabled={loading || cart.length === 0}
                className="btn btn-primary btn-lg w-full"
              >
                {loading ? (
                  <>
                    <div className="spinner" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Procesar Venta ({config?.currency_symbol || '$'}{calculateTotal().toFixed(2)})
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onScan={handleCameraScan}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}
    </div>
  );
};

export default POS;