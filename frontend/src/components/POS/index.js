import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API, AuthContext } from '../../App';
import { toast } from 'sonner';
import useModalClose from '../../useModalClose';
import POSView from './POSView';

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

const TIPO_COMPROBANTE_AFIP = {
  factura_a: 1,
  factura_b: 6,
  factura_c: 11,
  nota_debito_a: 2,
  nota_debito_b: 7,
  nota_credito_a: 3,
  nota_credito_b: 8,
};

const defaultInvoiceConfig = {
  tipo_comprobante: 'ticket',
  condicion_iva_receptor: 'consumidor_final',
  cuit_receptor: '',
  descuento_tipo: 'porcentaje',
  descuento_valor: 0,
  impuestos_extra: [],
  observaciones: '',
};

const POS = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [config, setConfig] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcode, setBarcode] = useState('');
  const [tabs, setTabs] = useState([{ id: 1, cart: [], paymentMethod: 'efectivo', colorIndex: 0, customer: null, invoiceConfig: { ...defaultInvoiceConfig }, modifyingSaleId: null, modifyingInvoiceNum: null }]);
  const [showInvoicePanel, setShowInvoicePanel] = useState(false);
  const [activeTabId, setActiveTabId] = useState(1);
  const [nextTabId, setNextTabId] = useState(2);
  const [loading, setLoading] = useState(false);
  const [loadingLastTicket, setLoadingLastTicket] = useState(false);
  const [loadingReturn, setLoadingReturn] = useState(false);
  const [loadingModify, setLoadingModify] = useState(false);
  const [lastSaleIsAfip, setLastSaleIsAfip] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [mobileTab, setMobileTab] = useState('products');
  const [saleReceipt, setSaleReceipt] = useState(null);
  const [receiptReturns, setReceiptReturns] = useState([]);
  const [presupuestoReceipt, setPresupuestoReceipt] = useState(null);
  const [presupuestoClosing, setPresupuestoClosing] = useState(false);
  const [afipConfig, setAfipConfig] = useState(null);
  const [returnModal, setReturnModal] = useState(null);
  const [infoPanelVisible, setInfoPanelVisible] = useState(() => localStorage.getItem('pos_info_visible') !== 'false');
  const [tiendaPedido, setTiendaPedido] = useState(null);
  const toggleInfoPanel = () => setInfoPanelVisible(prev => {
    const next = !prev;
    localStorage.setItem('pos_info_visible', String(next));
    return next;
  });
  const dismissTiendaPedido = () => {
    setTiendaPedido(null);
    setTabs(prev => prev.map(t =>
      t.id === activeTabId ? { ...t, modifyingSaleId: null, modifyingInvoiceNum: null } : t
    ));
  };
  const [showPriceCheck, setShowPriceCheck] = useState(false);
  const [priceCheckQuery, setPriceCheckQuery] = useState('');
  const [priceCheckResult, setPriceCheckResult] = useState(null);
  const [branchCount, setBranchCount] = useState(0);
  const [receiptClosing, setReceiptClosing] = useState(false);
  const navigate = useNavigate();
  const { user, activeBranch, modulosActivos } = useContext(AuthContext);
  const tieneFacturacion = modulosActivos.includes('facturacion');
  const tieneClientes = modulosActivos.includes('clientes');

  const closePresupuesto = () => {
    setPresupuestoClosing(true);
    setTimeout(() => { setPresupuestoReceipt(null); setPresupuestoClosing(false); }, 300);
  };

  const generarPresupuesto = () => {
    if (cart.length === 0) return;
    const sub = calculateSubtotal();
    const tax = calculateTax();
    const adj = calculatePaymentAdjustment();
    setPresupuestoReceipt({
      _esPresupuesto: true,
      items: cart.map(item => ({
        nombre: item.nombre,
        cantidad: item.quantity,
        precio_unitario: getEffectivePrice(item),
        subtotal: getEffectivePrice(item) * item.quantity,
      })),
      subtotal: sub,
      impuestos: tax,
      total: sub + tax + adj,
      metodo_pago: paymentMethod,
      fecha: new Date().toISOString(),
      afip_estado: null,
    });
  };

  const closeReceipt = () => {
    setReceiptClosing(true);
    setTimeout(() => {
      setSaleReceipt(null);
      setReceiptReturns([]);
      setReceiptClosing(false);
    }, 200);
  };

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const cart = activeTab.cart;
  const paymentMethod = activeTab.paymentMethod;
  const selectedCustomer = activeTab.customer || null;
  const setCart = (newCart) =>
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, cart: newCart } : t));
  const setPaymentMethod = (pm) =>
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, paymentMethod: pm } : t));
  const setSelectedCustomer = (c) =>
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, customer: c } : t));

  const invoiceConfig = activeTab.invoiceConfig || defaultInvoiceConfig;
  const setInvoiceConfig = (updater) =>
    setTabs(prev => prev.map(t => t.id === activeTabId
      ? { ...t, invoiceConfig: typeof updater === 'function' ? updater(t.invoiceConfig || defaultInvoiceConfig) : updater }
      : t
    ));

  const modifyingSaleId = activeTab.modifyingSaleId || null;
  const modifyingInvoiceNum = activeTab.modifyingInvoiceNum || null;
  const setModifyingSale = (saleId, invoiceNum) =>
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, modifyingSaleId: saleId, modifyingInvoiceNum: invoiceNum } : t));
  const cancelModification = () => {
    if (activeTab.modifyingSaleId && tabs.length > 1) {
      closeSaleTab(activeTabId);
    } else {
      setModifyingSale(null, null);
      setCart([]);
      setSelectedCustomer(null);
      setInvoiceConfig({ ...defaultInvoiceConfig });
    }
  };

  const barcodeInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const focusSearch = () => {
    if (isMobile()) return;
    if (configRef.current?.unified_barcode_search) {
      searchInputRef.current?.focus();
    } else if (configRef.current?.auto_focus_barcode !== false) {
      barcodeInputRef.current?.focus();
    }
  };
  const isMobile = () => window.innerWidth < 768;
  const lastKeyTime = useRef(0);
  const cartItemsRef = useRef(null);
  const barcodeTimerRef = useRef(null);
  const lastCameraCode = useRef('');
  const lastCameraTime = useRef(0);
  const searchingRef = useRef(false);
  const globalBarcodeBuffer = useRef('');
  const globalLastKeyTime = useRef(0);
  const globalBarcodeTimerRef = useRef(null);
  const configRef = useRef(null);
  const searchByCodeRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/branches`)
      .then(res => setBranchCount(res.data.length))
      .catch(() => {});
  }, []);

  const fetchLastSaleAfipStatus = async () => {
    try {
      const res = await axios.get(`${API}/sales`);
      const sales = res.data;
      if (sales && sales.length > 0) {
        const afipTypes = Object.values(TIPO_COMPROBANTE_AFIP);
        setLastSaleIsAfip(afipTypes.includes(sales[0].tipo_comprobante));
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchCategories();
    fetchConfiguration();
    fetchAfipConfig();
    fetchCurrentSession();
    fetchLastSaleAfipStatus();
    focusSearch();

    const raw = sessionStorage.getItem('tienda_pedido_en_pos');
    if (raw) {
      try {
        const p = JSON.parse(raw);
        sessionStorage.removeItem('tienda_pedido_en_pos');
        const cartItems = (p.items || []).map(item => ({
          id: item.producto_id,
          product_id: item.producto_id,
          nombre: item.nombre || item.producto_id,
          precio: item.precio_unitario,
          precio_unitario: item.precio_unitario,
          quantity: item.cantidad,
          control_stock: false,
        }));
        setTabs(prev => prev.map(t => t.id === 1 ? {
          ...t,
          cart: cartItems,
          modifyingSaleId: p.id,
          modifyingInvoiceNum: p.numero_factura,
        } : t));
        setTiendaPedido(p);
        toast.success(`Pedido ${p.numero_factura} cargado en el carrito`);
      } catch (_) {}
    }
  }, []);

  // Auto-search while typing (from 2nd character), with debounce
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (searchTerm.length === 0) {
      setDebouncedSearch('');
      setCurrentPage(1);
    } else if (searchTerm.length >= 2) {
      searchTimerRef.current = setTimeout(() => {
        setDebouncedSearch(searchTerm);
        setCurrentPage(1);
      }, 350);
    }
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchTerm]);

  const handleSearchChange = (e) => {
    const value = e.target.value;

    if (config?.unified_barcode_search) {
      const currentTime = Date.now();
      const scanTimeout = config?.barcode_scan_timeout || 100;
      const elapsed = currentTime - lastKeyTime.current;
      lastKeyTime.current = currentTime;

      if (elapsed < scanTimeout && value.length >= 8) {
        setIsAutoScanning(true);
        clearTimeout(barcodeTimerRef.current);
        barcodeTimerRef.current = setTimeout(() => {
          searchProductByBarcode(value);
          setIsAutoScanning(false);
        }, scanTimeout);
        setSearchTerm(value);
        return;
      }
      setIsAutoScanning(false);
    }

    setSearchTerm(value);
  };

  // Confirm text search on Enter press (immediate, no debounce)
  const commitSearch = () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (config?.unified_barcode_search && isAutoScanning) {
      clearTimeout(barcodeTimerRef.current);
      searchProductByBarcode(searchTerm);
      setIsAutoScanning(false);
      return;
    }
    setDebouncedSearch(searchTerm);
    setCurrentPage(1);
  };

  const clearSearch = () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setSearchTerm('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  // Re-fetch cash session when branch changes
  useEffect(() => {
    fetchCurrentSession();
  }, [activeBranch?.id]);

  // Reload products when page, search, or active branch changes (wait for config first)
  useEffect(() => {
    if (!configLoaded) return;
    loadProducts(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch, configLoaded, activeBranch?.id]);

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
    } finally {
      setConfigLoaded(true);
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

  const loadProducts = async (page, search) => {
    setProductsLoading(true);
    const perPage = config?.items_per_page || 10;
    try {
      let response;
      if (activeBranch?.id || user?.branch_id) {
        response = await axios.get(`${API}/branch-products`, {
          params: { page, per_page: perPage, ...(search && { search }) }
        });
      } else {
        response = await axios.get(`${API}/products`, {
          params: { page, per_page: perPage, ...(search && { search }) }
        });
      }
      setProducts(response.data.items || []);
      setTotal(response.data.total || 0);
      setTotalPages(response.data.total_pages || 1);
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
    if (searchingRef.current) return;
    searchingRef.current = true;

    try {
      const endpoint = (activeBranch?.id || user?.branch_id) ? `${API}/branch-products` : `${API}/products`;
      const response = await axios.get(endpoint, { params: { search: code, per_page: 10, page: 1 } });
      const items = response.data.items || [];
      const match = items.find(p => p.codigo_barras === code);
      if (match) {
        const added = addToCart(match);
        setBarcode('');
        if (added) {
          playSuccessSound();
          toast.success(`${match.nombre} agregado al carrito`);
        }
      } else {
        playErrorSound();
        toast.error('Producto no encontrado en esta sucursal');
        setBarcode('');
      }

      focusSearch();
    } catch (error) {
      playErrorSound();
      toast.error('Error al buscar producto');
    } finally {
      searchingRef.current = false;
    }
  };

  const handleBarcodeInput = (e) => {
    const currentTime = Date.now();
    const value = e.target.value;

    setBarcode(value);

    const scanTimeout = config?.barcode_scan_timeout || 100;
    if (currentTime - lastKeyTime.current < scanTimeout && value.length > 3) {
      setIsAutoScanning(true);
    }
    lastKeyTime.current = currentTime;

    if (value.length >= 8 && isAutoScanning) {
      clearTimeout(barcodeTimerRef.current);
      barcodeTimerRef.current = setTimeout(() => {
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
    const now = Date.now();
    if (scannedCode === lastCameraCode.current && now - lastCameraTime.current < 2000) return;
    lastCameraCode.current = scannedCode;
    lastCameraTime.current = now;
    setBarcode(scannedCode);
    searchProductByBarcode(scannedCode);
  };

  // Mantener refs actualizados para el listener global
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { searchByCodeRef.current = searchProductByBarcode; });

  // Listener global: captura la pistola aunque ningún input tenga foco.
  // Si hay un input/textarea/select con foco, deja pasar las teclas sin interferir.
  useEffect(() => {
    const isInputActive = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
    };

    const handleGlobalKey = (e) => {
      if (isInputActive()) return;
      if (e.key.length > 1 && e.key !== 'Enter') return;

      const now = Date.now();
      const scanTimeout = configRef.current?.barcode_scan_timeout || 100;

      if (e.key === 'Enter') {
        const code = globalBarcodeBuffer.current;
        globalBarcodeBuffer.current = '';
        clearTimeout(globalBarcodeTimerRef.current);
        if (code.length >= 3) searchByCodeRef.current?.(code);
        return;
      }

      const elapsed = now - globalLastKeyTime.current;
      globalLastKeyTime.current = now;

      // Si tardó más de 500ms desde la última tecla, es inicio de nueva secuencia
      if (elapsed > 500) {
        globalBarcodeBuffer.current = e.key;
      } else {
        globalBarcodeBuffer.current += e.key;
      }

      // Disparar automáticamente cuando hay suficientes chars a velocidad de scanner
      if (globalBarcodeBuffer.current.length >= 8 && elapsed < scanTimeout) {
        clearTimeout(globalBarcodeTimerRef.current);
        globalBarcodeTimerRef.current = setTimeout(() => {
          const code = globalBarcodeBuffer.current;
          globalBarcodeBuffer.current = '';
          searchByCodeRef.current?.(code);
        }, scanTimeout);
      }
    };

    document.addEventListener('keydown', handleGlobalKey);
    return () => {
      document.removeEventListener('keydown', handleGlobalKey);
      clearTimeout(globalBarcodeTimerRef.current);
    };
  }, []);

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

  // Filtering and pagination are handled server-side
  const filteredProducts = products;
  const itemsPerPage = config?.items_per_page || 10;
  const paginatedProducts = products;

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    if (cartItemsRef.current) {
      cartItemsRef.current.scrollTop = cartItemsRef.current.scrollHeight;
    }
  }, [cart.length]);

  // Autocompletar CUIT del receptor cuando el cliente tiene CUIT y se usa Factura A
  useEffect(() => {
    if (
      invoiceConfig.tipo_comprobante === 'factura_a' &&
      selectedCustomer?.tipo_documento === 'cuit' &&
      selectedCustomer?.documento
    ) {
      setInvoiceConfig(prev => ({ ...prev, cuit_receptor: selectedCustomer.documento }));
    }
  }, [selectedCustomer, invoiceConfig.tipo_comprobante]);

  const addToCart = (product, quantity = 1) => {
    if (!currentSession) {
      const sucursal = activeBranch?.nombre || 'esta sucursal';
      toast.error(`No hay caja abierta en ${sucursal}. Abrí la caja desde Gestión de Caja para poder vender.`);
      return false;
    }
    const stockControlActive = config?.auto_update_inventory !== false;
    const productControlsStock = product.control_stock !== false;
    if (stockControlActive && productControlsStock && (product.stock ?? 0) <= 0) {
      playErrorSound();
      toast.error(`Sin stock disponible: ${product.nombre}`);
      return false;
    }

    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (stockControlActive && productControlsStock && newQty > (product.stock ?? 0)) {
        playErrorSound();
        toast.error(`Stock máximo disponible: ${product.stock ?? 0}`);
        return false;
      }
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: newQty }
          : item
      ));
    } else {
      setCart([...cart, {
        ...product,
        quantity,
        precio_unitario: product.precio
      }]);
    }

    if (searchTerm) clearSearch();
    focusSearch();
    return true;
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const stockControlActive = config?.auto_update_inventory !== false;
    const item = cart.find(i => i.id === productId);
    if (item && stockControlActive && item.control_stock !== false) {
      const maxStock = item.stock ?? 0;
      if (newQuantity > maxStock) {
        playErrorSound();
        toast.error(`Stock máximo disponible: ${maxStock}`);
        return;
      }
    }

    setCart(cart.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
    focusSearch();
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
    focusSearch();
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

  const calculateDiscount = () => {
    const { descuento_tipo, descuento_valor } = invoiceConfig;
    if (!descuento_valor) return 0;
    if (descuento_tipo === 'porcentaje') return calculateSubtotal() * (descuento_valor / 100);
    return parseFloat(descuento_valor) || 0;
  };

  const calculateImpuestosExtra = () => {
    const sub = calculateSubtotal();
    return (invoiceConfig.impuestos_extra || []).reduce((sum, t) => {
      const v = parseFloat(t.valor) || 0;
      return sum + (t.tipo === 'porcentaje' ? sub * v / 100 : v);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() + calculatePaymentAdjustment()
      - calculateDiscount() + calculateImpuestosExtra();
  };

  const processSale = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    if (invoiceConfig.tipo_comprobante === 'factura_a' && !invoiceConfig.cuit_receptor?.trim()) {
      toast.error('Factura A requiere el CUIT del receptor');
      return;
    }

    setLoading(true);
    try {
      const descuento = calculateDiscount();
      const impuestosExtraTotal = calculateImpuestosExtra();
      const tipoAfip = TIPO_COMPROBANTE_AFIP[invoiceConfig.tipo_comprobante];
      const saleData = {
        items: cart.map(item => ({
          producto_id: item.product_id || item.id,
          cantidad: item.quantity,
          precio_unitario: getEffectivePrice(item),
          subtotal: getEffectivePrice(item) * item.quantity
        })),
        metodo_pago: paymentMethod,
        ...(selectedCustomer && selectedCustomer.id && { cliente_id: selectedCustomer.id }),
        ...(tipoAfip && { tipo_comprobante: tipoAfip }),
        ...(invoiceConfig.cuit_receptor && { cuit_receptor: invoiceConfig.cuit_receptor }),
        ...(descuento > 0 && { descuento }),
        ...(impuestosExtraTotal > 0 && { impuestos_extra_total: impuestosExtraTotal }),
        ...(invoiceConfig.condicion_iva_receptor !== 'consumidor_final' && { condicion_iva_receptor: invoiceConfig.condicion_iva_receptor }),
        ...(invoiceConfig.observaciones && { observaciones_comprobante: invoiceConfig.observaciones }),
      };

      const isModifying = !!activeTab.modifyingSaleId;
      const response = isModifying
        ? await axios.put(`${API}/sales/${activeTab.modifyingSaleId}`, saleData)
        : await axios.post(`${API}/sales`, saleData);

      playSuccessSound();
      setShowInvoicePanel(false);
      loadProducts(currentPage, debouncedSearch);
      setLastSaleIsAfip(!!TIPO_COMPROBANTE_AFIP[invoiceConfig.tipo_comprobante]);
      const receiptData = response.data;
      if (config?.show_receipt_after_sale ?? true) {
        setSaleReceipt(receiptData);
      }
      if (tabs.length > 1) {
        closeSaleTab(activeTabId);
      } else {
        clearCart();
        setSelectedCustomer(null);
        setInvoiceConfig({ ...defaultInvoiceConfig });
        setModifyingSale(null, null);
      }
      if (config?.print_receipt_auto) {
        setSaleReceipt(receiptData);
        if (config?.receipt_format !== 'a4') {
          setTimeout(() => window.print(), 300);
        }
      }

      if (tiendaPedido) {
        try {
          await axios.patch(`${API}/pedidos/${tiendaPedido.id}/estado`, { estado_pedido: 'listo' });
        } catch (_) {}
        setTiendaPedido(null);
        navigate('/tienda-admin', { state: { expandPedidoId: tiendaPedido.id } });
      }
    } catch (error) {
      playErrorSound();
      const detail = error.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map(d => d.msg || JSON.stringify(d)).join(', ')
        : (typeof detail === 'string' ? detail : null);
      console.error('Error al procesar venta:', error.response?.status, error.response?.data);
      toast.error(msg || 'Error al procesar la venta');
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
  };

  const closePriceCheck = () => {
    setShowPriceCheck(false);
    setPriceCheckQuery('');
    setPriceCheckResult(null);
  };
  const [priceCheckClosing, closePriceCheckAnim] = useModalClose(closePriceCheck);

  const searchPriceCheck = async (query = priceCheckQuery) => {
    const q = query.trim();
    if (!q) return;
    try {
      const endpoint = (activeBranch?.id || user?.branch_id) ? `${API}/branch-products` : `${API}/products`;
      const response = await axios.get(endpoint, { params: { search: q, per_page: 20, page: 1 } });
      const items = response.data.items || [];
      const exact = items.find(p => p.codigo_barras === q);
      if (exact) { setPriceCheckResult([exact]); return; }
      setPriceCheckResult(items.length > 0 ? items : 'not_found');
    } catch {
      setPriceCheckResult('not_found');
    }
  };

  const addSaleTab = () => {
    const newId = nextTabId;
    setTabs(prev => [...prev, { id: newId, cart: [], paymentMethod: 'efectivo', colorIndex: prev.length % TAB_COLORS.length, customer: null, invoiceConfig: { ...defaultInvoiceConfig }, modifyingSaleId: null, modifyingInvoiceNum: null }]);
    setActiveTabId(newId);
    setNextTabId(prev => prev + 1);
    focusSearch();
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
    setLoadingReturn(true);
    try {
      const [salesResponse, productsResponse] = await Promise.all([
        axios.get(`${API}/sales`),
        axios.get(`${API}/products`, { params: { page: 1, per_page: 10000 } })
      ]);
      const sales = salesResponse.data;
      if (!sales || sales.length === 0) {
        toast.error('No hay ventas registradas');
        return;
      }
      const sale = sales[0];

      const productNames = {};
      (productsResponse.data.items || productsResponse.data).forEach(p => { productNames[p.id] = p.nombre; });

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
    } finally {
      setLoadingReturn(false);
    }
  };

  const openLastTicket = async () => {
    setLoadingLastTicket(true);
    try {
      const [salesResponse, productsResponse] = await Promise.all([
        axios.get(`${API}/sales`),
        axios.get(`${API}/products`, { params: { page: 1, per_page: 10000 } })
      ]);
      const sales = salesResponse.data;
      if (!sales || sales.length === 0) {
        toast.error('No hay ventas registradas');
        return;
      }
      const sale = sales[0];
      const productNames = {};
      (productsResponse.data.items || productsResponse.data).forEach(p => { productNames[p.id] = p.nombre; });
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
    } finally {
      setLoadingLastTicket(false);
    }
  };

  const loadLastSaleForModification = async () => {
    const existingModifyTab = tabs.find(t => t.modifyingSaleId);
    if (existingModifyTab) {
      setActiveTabId(existingModifyTab.id);
      return;
    }
    setLoadingModify(true);
    try {
      const salesResponse = await axios.get(`${API}/sales`);
      const sales = salesResponse.data;
      if (!sales || sales.length === 0) {
        toast.error('No hay ventas registradas para modificar');
        return;
      }
      const sale = sales[0];
      if (sale.estado === 'cancelado') {
        toast.error('La última venta está cancelada y no puede modificarse');
        return;
      }

      const cartItems = sale.items.map(item => ({
        id: item.producto_id,
        product_id: item.producto_id,
        nombre: item.nombre || item.producto_id,
        precio: item.precio_unitario,
        precio_unitario: item.precio_unitario,
        quantity: item.cantidad,
        control_stock: false,
      }));

      const targetTabHasItems = activeTab.cart.length > 0;

      if (targetTabHasItems) {
        // Open in a new tab
        const newId = nextTabId;
        setTabs(prev => [
          ...prev,
          {
            id: newId,
            cart: cartItems,
            paymentMethod: sale.metodo_pago || 'efectivo',
            colorIndex: prev.length % TAB_COLORS.length,
            customer: null,
            invoiceConfig: { ...defaultInvoiceConfig },
            modifyingSaleId: sale.id,
            modifyingInvoiceNum: sale.numero_factura,
            createdForModification: true,
          }
        ]);
        setActiveTabId(newId);
        setNextTabId(prev => prev + 1);
      } else {
        // Load in current tab
        setCart(cartItems);
        setPaymentMethod(sale.metodo_pago || 'efectivo');
        setModifyingSale(sale.id, sale.numero_factura);
      }

      toast.success(`Venta ${sale.numero_factura} cargada para modificación`);
    } catch (error) {
      toast.error('Error al cargar la venta para modificación');
    } finally {
      setLoadingModify(false);
    }
  };

  return (
    <POSView
      sessionLoading={sessionLoading}
      currentSession={currentSession}
      mobileTab={mobileTab}
      setMobileTab={setMobileTab}
      cart={cart}
      tabs={tabs}
      activeTabId={activeTabId}
      setActiveTabId={setActiveTabId}
      addSaleTab={addSaleTab}
      closeSaleTab={closeSaleTab}
      TAB_COLORS={TAB_COLORS}
      searchTerm={searchTerm}
      searchInputRef={searchInputRef}
      handleSearchChange={handleSearchChange}
      commitSearch={commitSearch}
      clearSearch={clearSearch}
      barcode={barcode}
      barcodeInputRef={barcodeInputRef}
      handleBarcodeInput={handleBarcodeInput}
      handleBarcodeKeyPress={handleBarcodeKeyPress}
      isAutoScanning={isAutoScanning}
      searchProductByBarcode={searchProductByBarcode}
      setShowBarcodeScanner={setShowBarcodeScanner}
      setShowPriceCheck={setShowPriceCheck}
      productsLoading={productsLoading}
      paginatedProducts={paginatedProducts}
      totalPages={totalPages}
      totalItems={total}
      currentPage={currentPage}
      filteredProducts={filteredProducts}
      itemsPerPage={itemsPerPage}
      handlePageChange={handlePageChange}
      addToCart={addToCart}
      isMobile={isMobile}
      playSuccessSound={playSuccessSound}
      getCategoryName={getCategoryName}
      categories={categories}
      sessionDisabledStyle={sessionDisabledStyle}
      cartItemsRef={cartItemsRef}
      loadingLastTicket={loadingLastTicket}
      openLastTicket={openLastTicket}
      loadingReturn={loadingReturn}
      openReturnModal={openReturnModal}
      loadingModify={loadingModify}
      lastSaleIsAfip={lastSaleIsAfip}
      loadLastSaleForModification={loadLastSaleForModification}
      modifyingSaleId={modifyingSaleId}
      modifyingInvoiceNum={modifyingInvoiceNum}
      cancelModification={cancelModification}
      clearCart={clearCart}
      getEffectivePrice={getEffectivePrice}
      updateQuantity={updateQuantity}
      removeFromCart={removeFromCart}
      config={config}
      calculateSubtotal={calculateSubtotal}
      calculateTax={calculateTax}
      calculatePaymentAdjustment={calculatePaymentAdjustment}
      calculateTotal={calculateTotal}
      paymentMethod={paymentMethod}
      setPaymentMethod={setPaymentMethod}
      loading={loading}
      processSale={processSale}
      saleReceipt={saleReceipt}
      receiptReturns={receiptReturns}
      receiptClosing={receiptClosing}
      closeReceipt={closeReceipt}
      printTicket={printTicket}
      presupuestoReceipt={presupuestoReceipt}
      presupuestoClosing={presupuestoClosing}
      closePresupuesto={closePresupuesto}
      generarPresupuesto={generarPresupuesto}
      afipConfig={afipConfig}
      user={user}
      returnModal={returnModal}
      setReturnModal={setReturnModal}
      fetchProducts={() => loadProducts(currentPage, debouncedSearch)}
      showPriceCheck={showPriceCheck}
      priceCheckClosing={priceCheckClosing}
      closePriceCheckAnim={closePriceCheckAnim}
      priceCheckQuery={priceCheckQuery}
      setPriceCheckQuery={setPriceCheckQuery}
      setPriceCheckResult={setPriceCheckResult}
      priceCheckResult={priceCheckResult}
      searchPriceCheck={searchPriceCheck}
      showBarcodeScanner={showBarcodeScanner}
      handleCameraScan={handleCameraScan}
      branchName={activeBranch?.nombre || null}
      branchCount={branchCount}
      infoPanelVisible={infoPanelVisible}
      toggleInfoPanel={toggleInfoPanel}
      selectedCustomer={selectedCustomer}
      setSelectedCustomer={setSelectedCustomer}
      invoiceConfig={invoiceConfig}
      setInvoiceConfig={setInvoiceConfig}
      showInvoicePanel={showInvoicePanel}
      setShowInvoicePanel={setShowInvoicePanel}
      calculateDiscount={calculateDiscount}
      calculateImpuestosExtra={calculateImpuestosExtra}
      tieneFacturacion={tieneFacturacion}
      tieneClientes={tieneClientes}
      tiendaPedido={tiendaPedido}
      dismissTiendaPedido={dismissTiendaPedido}
    />
  );
};

export default POS;
