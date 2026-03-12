import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { formatAmount } from '../lib/utils';
import { toast } from 'sonner';
import BarcodeScanner from './BarcodeScanner';
import ReturnModal from './ReturnModal';
import TicketModal from './TicketModal';
import useModalClose from '../useModalClose';
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
  Volume2,
  Printer,
  X,
  RotateCcw,
  Tag
} from 'lucide-react';

const normalize = (str) =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, '').toLowerCase();

const TAB_COLORS = [
  { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', activeBg: '#3b82f6' },
  { bg: '#fce7f3', border: '#f9a8d4', text: '#9d174d', activeBg: '#ec4899' },
  { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46', activeBg: '#10b981' },
  { bg: '#fef3c7', border: '#fcd34d', text: '#78350f', activeBg: '#f59e0b' },
  { bg: '#ede9fe', border: '#c4b5fd', text: '#5b21b6', activeBg: '#8b5cf6' },
  { bg: '#fee2e2', border: '#fca5a5', text: '#7f1d1d', activeBg: '#ef4444' },
  { bg: '#e0f2fe', border: '#7dd3fc', text: '#0c4a6e', activeBg: '#0ea5e9' },
  { bg: '#f0fdf4', border: '#86efac', text: '#14532d', activeBg: '#22c55e' },
];

const POS = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [config, setConfig] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcode, setBarcode] = useState('');
  const [tabs, setTabs] = useState([{ id: 1, cart: [], paymentMethod: 'efectivo', colorIndex: 0 }]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [nextTabId, setNextTabId] = useState(2);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState('manual'); // 'manual' or 'camera'
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [mobileTab, setMobileTab] = useState('products');
  const [saleReceipt, setSaleReceipt] = useState(null);
  const [receiptReturns, setReceiptReturns] = useState([]);
  const [afipConfig, setAfipConfig] = useState(null);
  const [returnModal, setReturnModal] = useState(null); // { sale, returnedQty }
  const [showPriceCheck, setShowPriceCheck] = useState(false);
  const [priceCheckQuery, setPriceCheckQuery] = useState('');
  const [priceCheckResult, setPriceCheckResult] = useState(null); // null | product | 'not_found'
  const [branchName, setBranchName] = useState(null);
  const [receiptClosing, setReceiptClosing] = useState(false);
  const { user } = useContext(AuthContext);

  const closeReceipt = () => {
    setReceiptClosing(true);
    setTimeout(() => {
      setSaleReceipt(null);
      setReceiptReturns([]);
      setReceiptClosing(false);
    }, 200);
  };

  // Derived from tabs
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const cart = activeTab.cart;
  const paymentMethod = activeTab.paymentMethod;
  const setCart = (newCart) =>
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, cart: newCart } : t));
  const setPaymentMethod = (pm) =>
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, paymentMethod: pm } : t));

  const barcodeInputRef = useRef(null);
  const isMobile = () => window.innerWidth < 768;
  const lastKeyTime = useRef(0);
  const cartItemsRef = useRef(null);

  useEffect(() => {
    if (user?.branch_id) {
      axios.get(`${API}/branches`)
        .then(res => {
          const branch = res.data.find(b => b.id === user.branch_id);
          if (branch) setBranchName(branch.nombre);
        })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchConfiguration();
    fetchAfipConfig();
    fetchCurrentSession();
    
    // Focus barcode input on component mount (not on mobile to avoid keyboard popup)
    if (barcodeInputRef.current && config?.auto_focus_barcode !== false && !isMobile()) {
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

  const fetchAfipConfig = async () => {
    try {
      const response = await axios.get(`${API}/afip/config`);
      setAfipConfig(response.data);
    } catch (error) {
      // AFIP not configured — not critical
    }
  };

  const TIPO_CBTE_NOMBRES = { 1: 'FACTURA A', 6: 'FACTURA B', 11: 'FACTURA C' };

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      // If user has a branch, use branch-specific prices
      if (user?.branch_id) {
        const response = await axios.get(`${API}/branch-products`);
        setProducts(response.data);
      } else {
        const response = await axios.get(`${API}/products`);
        setProducts(response.data);
      }
    } catch (error) {
      toast.error('Error al cargar productos');
    } finally {
      setProductsLoading(false);
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
      
      // Focus back to barcode input (not on mobile)
      if (barcodeInputRef.current && config?.auto_focus_barcode !== false && !isMobile()) {
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
    // No cerramos el scanner para permitir escaneo en lotes
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
    normalize(product.nombre).includes(normalize(searchTerm)) ||
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

  // Auto-scroll cart to bottom when items are added
  useEffect(() => {
    if (cartItemsRef.current) {
      cartItemsRef.current.scrollTop = cartItemsRef.current.scrollHeight;
    }
  }, [cart.length]);

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

  const getEffectivePrice = (item) => {
    if (item.tipo === 'por_peso' && item.precio_por_peso) {
      return item.precio_por_peso;
    }
    return item.precio;
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    // Focus back to barcode input if auto-focus is enabled (not on mobile)
    if (barcodeInputRef.current && config?.auto_focus_barcode !== false && !isMobile()) {
      barcodeInputRef.current.focus();
    }
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (getEffectivePrice(item) * item.quantity), 0);
  };

  const calculateTax = () => {
    const taxRate = config?.tax_rate ?? 0.12;
    return calculateSubtotal() * taxRate;
  };

  const calculatePaymentAdjustment = () => {
    const adjustments = config?.payment_method_adjustments || {};
    const pct = adjustments[paymentMethod] ?? 0;
    if (pct === 0) return 0;
    return (calculateSubtotal() + calculateTax()) * (pct / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() + calculatePaymentAdjustment();
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
          producto_id: item.product_id || item.id,
          cantidad: item.quantity,
          precio_unitario: getEffectivePrice(item),
          subtotal: getEffectivePrice(item) * item.quantity
        })),
        metodo_pago: paymentMethod
      };

      const response = await axios.post(`${API}/sales`, saleData);

      playSuccessSound();
      fetchProducts();
      const receiptData = response.data;
      if (config?.show_receipt_after_sale ?? true) {
        setSaleReceipt(receiptData);
      }
      if (tabs.length > 1) {
        closeSaleTab(activeTabId);
      } else {
        clearCart();
      }
      if (config?.print_receipt_auto) {
        setSaleReceipt(receiptData);
        setTimeout(() => window.print(), 300);
      }
    } catch (error) {
      playErrorSound();
      toast.error(error.response?.data?.detail || 'Error al procesar la venta');
    } finally {
      setLoading(false);
    }
  };

  const printTicket = () => {
    window.print();
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.nombre : 'Sin categoría';
  };

  const sessionDisabledStyle = {
    opacity: !sessionLoading && !currentSession ? 0.5 : 1,
    pointerEvents: !sessionLoading && !currentSession ? 'none' : 'auto',
  };

  const closePriceCheck = () => {
    setShowPriceCheck(false);
    setPriceCheckQuery('');
    setPriceCheckResult(null);
  };
  const [priceCheckClosing, closePriceCheckAnim] = useModalClose(closePriceCheck);

  const searchPriceCheck = (query = priceCheckQuery) => {
    const q = query.trim();
    if (!q) return;
    const byBarcode = products.find(p => p.codigo_barras === q);
    if (byBarcode) { setPriceCheckResult([byBarcode]); return; }
    const byName = products.filter(p => normalize(p.nombre).includes(normalize(q)));
    setPriceCheckResult(byName.length > 0 ? byName : 'not_found');
  };

  const addSaleTab = () => {
    const newId = nextTabId;
    setTabs(prev => [...prev, { id: newId, cart: [], paymentMethod: 'efectivo', colorIndex: prev.length % TAB_COLORS.length }]);
    setActiveTabId(newId);
    setNextTabId(prev => prev + 1);
    if (barcodeInputRef.current && !isMobile()) barcodeInputRef.current.focus();
  };

  const closeSaleTab = (tabId) => {
    if (tabs.length === 1) return;
    const idx = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[Math.min(idx, newTabs.length - 1)].id);
    }
  };

  const openReturnModal = async () => {
    try {
      const [salesResponse, productsResponse] = await Promise.all([
        axios.get(`${API}/sales`),
        axios.get(`${API}/products`)
      ]);
      const sales = salesResponse.data;
      if (!sales || sales.length === 0) {
        toast.error('No hay ventas registradas');
        return;
      }
      const sale = sales[0];

      const productNames = {};
      productsResponse.data.forEach(p => { productNames[p.id] = p.nombre; });

      const enrichedSale = {
        ...sale,
        items: sale.items.map(item => ({
          ...item,
          nombre: item.nombre || productNames[item.producto_id] || item.producto_id
        }))
      };

      const returnsResponse = await axios.get(`${API}/sales/${sale.id}/returns`);
      const returnedQty = {};
      returnsResponse.data.forEach(ret => {
        ret.items.forEach(item => {
          returnedQty[item.producto_id] = (returnedQty[item.producto_id] || 0) + item.cantidad;
        });
      });

      setReturnModal({ sale: enrichedSale, returnedQty });
    } catch (error) {
      toast.error('Error al obtener la última venta');
    }
  };

  const openLastTicket = async () => {
    try {
      const [salesResponse, productsResponse] = await Promise.all([
        axios.get(`${API}/sales`),
        axios.get(`${API}/products`)
      ]);
      const sales = salesResponse.data;
      if (!sales || sales.length === 0) {
        toast.error('No hay ventas registradas');
        return;
      }
      const sale = sales[0];
      const productNames = {};
      productsResponse.data.forEach(p => { productNames[p.id] = p.nombre; });
      const enrichedSale = {
        ...sale,
        items: sale.items.map(item => ({
          ...item,
          nombre: item.nombre || productNames[item.producto_id] || item.producto_id
        }))
      };
      setSaleReceipt(enrichedSale);
      if (sale.estado === 'devolucion_parcial') {
        try {
          const ret = await axios.get(`${API}/sales/${sale.id}/returns`);
          setReceiptReturns(ret.data);
        } catch { setReceiptReturns([]); }
      } else {
        setReceiptReturns([]);
      }
    } catch (error) {
      toast.error('Error al obtener el último ticket');
    }
  };

  return (
    <div className="pos-page">
      {/* Tabs móvil: Productos / Carrito */}
      <div className="pos-mobile-tabs">
        <button
          className={`pos-tab-btn ${mobileTab === 'products' ? 'active' : ''}`}
          onClick={() => setMobileTab('products')}
        >
          Productos
        </button>
        <button
          className={`pos-tab-btn ${mobileTab === 'cart' ? 'active' : ''}`}
          onClick={() => setMobileTab('cart')}
        >
          Carrito ({cart.length})
        </button>
      </div>

      {/* Left Section */}
      <div className={`pos-left ${mobileTab === 'products' ? 'pos-tab-active' : ''}`}>
        <div className="hidden md:block mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Punto de Venta
          </h1>
          <p className="text-gray-600">
            Cajero: {user?.nombre}
            {user?.branch_id && (
              <span className="ml-3 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                {branchName ? branchName : 'Sucursal asignada'} — precios diferenciados
              </span>
            )}
          </p>
        </div>

        {/* Cash Session Alert + Scanner Info */}
        <div className="hidden md:flex mb-6 flex-col md:flex-row gap-4">
        {sessionLoading ? (
          <div className="flex-1 bg-gray-50 border border-gray-200 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="spinner w-5 h-5 mr-3"></div>
              <p className="text-gray-600">Verificando estado de caja...</p>
            </div>
          </div>
        ) : !currentSession ? (
          <div className="flex-1 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
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
          <div className="flex-1 p-4 rounded-lg" style={{ background: 'var(--primary-bg)', borderLeft: '4px solid var(--primary)' }}>
            <div className="flex items-center">
              <div className="mr-3" style={{ color: 'var(--primary)' }}>✅</div>
              <div>
                <h3 className="font-medium" style={{ color: 'var(--primary-darker, var(--primary-dark))' }}>Caja Abierta</h3>
                <p style={{ color: 'var(--primary-dark)' }}>
                  Sesión activa - Monto inicial: ${formatAmount(currentSession.monto_inicial)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Scanner Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex-1">
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

        {/* Search + Products (dimmed when no session) */}
        <div style={{ ...sessionDisabledStyle, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Search Section */}
          <div className="pos-search">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                  <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
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
                <button
                  onClick={() => setShowPriceCheck(true)}
                  className="btn"
                  style={{ background: 'var(--tertiary)', color: 'var(--tertiary-text)' }}
                  title="Consultar precio"
                >
                  <Tag className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="pos-products">
            {productsLoading ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-gray-500">
                <div className="spinner w-10 h-10 mb-4"></div>
                <p className="text-sm">Cargando productos...</p>
              </div>
            ) : (
              <>
                <div className="products-grid">
                  {paginatedProducts.map(product => (
                    <div
                      key={product.id}
                      className="product-card"
                      onClick={() => { addToCart(product); if (isMobile()) playSuccessSound(); }}
                    >
                      <div className="product-name">{product.nombre}</div>
                      <div className="product-price">
                        {config?.currency_symbol || '$'}{formatAmount(product.tipo === 'por_peso' && product.precio_por_peso ? product.precio_por_peso : product.precio)}
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
                      totalItems={filteredProducts.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Section - Cart */}
      <div className={`pos-cart ${mobileTab === 'cart' ? 'pos-tab-active' : ''}`} style={sessionDisabledStyle}>
          {/* Sales Tabs Bar */}
          <div className="sales-tabs-bar">
            {tabs.map((tab, tabIndex) => {
              const tc = TAB_COLORS[tab.colorIndex % TAB_COLORS.length];
              const isActive = tab.id === activeTabId;
              return (
              <button
                key={tab.id}
                className={`sales-tab ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
                style={{
                  background: isActive ? tc.activeBg : tc.bg,
                  borderColor: isActive ? tc.activeBg : tc.border,
                  color: isActive ? 'white' : tc.text,
                }}
              >
                V{tabIndex + 1}
                {tab.cart.length > 0 && <span className="sales-tab-count">{tab.cart.length}</span>}
                {tabs.length > 1 && (
                  <span
                    className="sales-tab-close"
                    onClick={(e) => { e.stopPropagation(); closeSaleTab(tab.id); }}
                  >×</span>
                )}
              </button>
              );
            })}
            <button className="sales-tab-add" onClick={addSaleTab} title="Nueva venta">+</button>
          </div>

          <div className="cart-header">
            <div className="flex items-center justify-between">
              <h2 className="cart-title">
                <ShoppingCart className="w-5 h-5 inline mr-2" />
                Carrito ({cart.length})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={openLastTicket}
                  className="btn btn-sm"
                  style={{ background: 'var(--secondary)', color: 'var(--secondary-text)' }}
                  title="Ver último ticket"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={openReturnModal}
                  className="btn btn-sm"
                  style={{ background: 'var(--tertiary)', color: 'var(--tertiary-text)' }}
                  title="Devolver última venta"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
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
          </div>

          <div className="cart-items" ref={cartItemsRef}>
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
                      {config?.currency_symbol || '$'}{formatAmount(getEffectivePrice(item))}{item.tipo === 'por_peso' ? '/kg' : ''} x {item.tipo === 'por_peso' ? `${item.quantity}kg` : item.quantity} =
                      {config?.currency_symbol || '$'}{formatAmount(getEffectivePrice(item) * item.quantity)}
                    </div>
                  </div>

                  <div className="cart-item-controls">
                    <button
                      onClick={() => updateQuantity(item.id, parseFloat((item.quantity - (item.tipo === 'por_peso' ? 0.1 : 1)).toFixed(3)))}
                      className="quantity-btn"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <input
                      type="number"
                      min={item.tipo === 'por_peso' ? '0.01' : '1'}
                      step={item.tipo === 'por_peso' ? '0.1' : '1'}
                      value={item.quantity}
                      onChange={(e) => {
                        const val = item.tipo === 'por_peso'
                          ? parseFloat(e.target.value) || 0.1
                          : parseInt(e.target.value) || 1;
                        updateQuantity(item.id, val);
                      }}
                      className="quantity-input"
                    />

                    <button
                      onClick={() => updateQuantity(item.id, parseFloat((item.quantity + (item.tipo === 'por_peso' ? 0.1 : 1)).toFixed(3)))}
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
                  <span className="total-value">{config?.currency_symbol || '$'}{formatAmount(calculateSubtotal())}</span>
                </div>
                <div className="total-row">
                  <span className="total-label">Impuestos ({((config?.tax_rate ?? 0.12) * 100).toFixed(1)}%):</span>
                  <span className="total-value">{config?.currency_symbol || '$'}{formatAmount(calculateTax())}</span>
                </div>
                {(() => {
                  const adj = calculatePaymentAdjustment();
                  const pct = (config?.payment_method_adjustments || {})[paymentMethod] ?? 0;
                  if (pct === 0) return null;
                  return (
                    <div className="total-row" style={{ color: pct < 0 ? '#16a34a' : '#dc2626' }}>
                      <span className="total-label">
                        {pct < 0 ? `Descuento ${paymentMethod} (${Math.abs(pct)}%):` : `Recargo ${paymentMethod} (${pct}%):`}
                      </span>
                      <span className="total-value">
                        {pct < 0 ? '-' : '+'}{config?.currency_symbol || '$'}{formatAmount(Math.abs(adj))}
                      </span>
                    </div>
                  );
                })()}
                <div className="total-row total-final">
                  <span>Total:</span>
                  <span>{config?.currency_symbol || '$'}{formatAmount(calculateTotal())}</span>
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
                    Procesar Venta ({config?.currency_symbol || '$'}{formatAmount(calculateTotal())})
                  </>
                )}
              </button>
            </div>
          )}
      </div>

      {/* Ticket Modal */}
      {saleReceipt && (
        <TicketModal
          sale={saleReceipt}
          returns={receiptReturns}
          config={config}
          afipConfig={afipConfig}
          cajeroName={user?.nombre}
          title="Venta procesada"
          closing={receiptClosing}
          onClose={closeReceipt}
          onPrint={printTicket}
        />
      )}

      {/* Return Modal */}
      {returnModal && (
        <ReturnModal
          sale={returnModal.sale}
          returnedQty={returnModal.returnedQty}
          onClose={() => setReturnModal(null)}
          onSuccess={fetchProducts}
        />
      )}

      {/* Price Check Modal */}
      {showPriceCheck && (
        <div className={`price-check-overlay${priceCheckClosing ? ' closing' : ''}`} onClick={closePriceCheckAnim}>
          <div className={`price-check-modal${priceCheckClosing ? ' closing' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-600" />
                Consulta de Precio
              </h3>
              <button onClick={closePriceCheckAnim} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Código de barras o nombre..."
                className="form-input flex-1"
                value={priceCheckQuery}
                onChange={e => { setPriceCheckQuery(e.target.value); setPriceCheckResult(null); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') searchPriceCheck();
                  if (e.key === 'Escape') closePriceCheckAnim();
                }}
                autoFocus
              />
              <button onClick={() => searchPriceCheck()} className="btn btn-primary">
                <Search className="w-4 h-4" />
              </button>
            </div>
            {priceCheckResult === 'not_found' && (
              <div className="text-center py-4 text-red-500 font-medium">
                Producto no encontrado
              </div>
            )}
            {priceCheckResult && priceCheckResult !== 'not_found' && (
              priceCheckResult.length === 1 ? (
                <div className="price-check-result">
                  <div className="price-check-name">{priceCheckResult[0].nombre}</div>
                  <div className="price-check-price">
                    {config?.currency_symbol || '$'}{formatAmount(priceCheckResult[0].tipo === 'por_peso' && priceCheckResult[0].precio_por_peso ? priceCheckResult[0].precio_por_peso : priceCheckResult[0].precio)}
                    {priceCheckResult[0].tipo === 'por_peso' && <span className="text-lg"> /kg</span>}
                  </div>
                  <div className="price-check-details">
                    <span>Stock: {priceCheckResult[0].stock}</span>
                    <span>{getCategoryName(priceCheckResult[0].categoria_id)}</span>
                  </div>
                  {priceCheckResult[0].codigo_barras && (
                    <div className="text-xs text-gray-400 mt-2">Cód: {priceCheckResult[0].codigo_barras}</div>
                  )}
                </div>
              ) : (
                <div className="price-check-list">
                  <div className="text-xs text-gray-500 mb-2">{priceCheckResult.length} productos encontrados</div>
                  {priceCheckResult.map(product => (
                    <div key={product.id} className="price-check-list-item">
                      <div className="price-check-list-info">
                        <span className="price-check-list-name">{product.nombre}</span>
                        <span className="price-check-list-meta">
                          {getCategoryName(product.categoria_id)} · Stock: {product.stock}
                        </span>
                      </div>
                      <span className="price-check-list-price">
                        {config?.currency_symbol || '$'}{formatAmount(product.tipo === 'por_peso' && product.precio_por_peso ? product.precio_por_peso : product.precio)}
                        {product.tipo === 'por_peso' && '/kg'}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}

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