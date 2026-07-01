import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatAmount } from '../../lib/utils';
import BarcodeScanner from '../BarcodeScanner';
import ReturnModal from '../ReturnModal';
import { getCategoryIcon } from '../../utils/categoryIcons';
import TicketModal from '../TicketModal';
import Pagination from '../Pagination';
import InvoicePanel from './InvoicePanel';
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
  Tag,
  BarChart2,
  Package,
  FileText,
  LayoutDashboard,
  ChevronDown,
  ChevronUp,
  Receipt,
  Edit2,
} from 'lucide-react';

const POSView = ({
  sessionLoading,
  currentSession,
  mobileTab,
  setMobileTab,
  cart,
  tabs,
  activeTabId,
  setActiveTabId,
  addSaleTab,
  closeSaleTab,
  TAB_COLORS,
  searchTerm,
  searchInputRef,
  handleSearchChange,
  commitSearch,
  clearSearch,
  barcode,
  barcodeInputRef,
  handleBarcodeInput,
  handleBarcodeKeyPress,
  isAutoScanning,
  searchProductByBarcode,
  setShowBarcodeScanner,
  setShowPriceCheck,
  productsLoading,
  paginatedProducts,
  totalPages,
  totalItems,
  currentPage,
  filteredProducts,
  itemsPerPage,
  handlePageChange,
  addToCart,
  isMobile,
  playSuccessSound,
  getCategoryName,
  categories,
  sessionDisabledStyle,
  cartItemsRef,
  loadingLastTicket,
  openLastTicket,
  loadingReturn,
  openReturnModal,
  clearCart,
  getEffectivePrice,
  updateQuantity,
  removeFromCart,
  config,
  calculateSubtotal,
  calculateTax,
  calculatePaymentAdjustment,
  calculateTotal,
  paymentMethod,
  setPaymentMethod,
  loading,
  processSale,
  generarPresupuesto,
  presupuestoReceipt,
  presupuestoClosing,
  closePresupuesto,
  saleReceipt,
  receiptReturns,
  receiptClosing,
  closeReceipt,
  printTicket,
  afipConfig,
  user,
  returnModal,
  setReturnModal,
  fetchProducts,
  showPriceCheck,
  priceCheckClosing,
  closePriceCheckAnim,
  priceCheckQuery,
  setPriceCheckQuery,
  setPriceCheckResult,
  priceCheckResult,
  searchPriceCheck,
  showBarcodeScanner,
  handleCameraScan,
  branchName,
  branchCount,
  infoPanelVisible,
  toggleInfoPanel,
  selectedCustomer,
  setSelectedCustomer,
  invoiceConfig,
  setInvoiceConfig,
  showInvoicePanel,
  setShowInvoicePanel,
  calculateDiscount,
  calculateImpuestosExtra,
  tieneFacturacion = true,
  tieneClientes = true,
  loadingModify,
  lastSaleIsAfip,
  loadLastSaleForModification,
  modifyingSaleId,
  modifyingInvoiceNum,
  cancelModification,
}) => {
  const [slideDir, setSlideDir] = useState('right');
  const handleTabSwitch = (tabId) => {
    const oldIdx = tabs.findIndex(t => t.id === activeTabId);
    const newIdx = tabs.findIndex(t => t.id === tabId);
    setSlideDir(newIdx >= oldIdx ? 'right' : 'left');
    setActiveTabId(tabId);
  };

  const [weightInputDraft, setWeightInputDraft] = React.useState({});
  const [focusedIdx, setFocusedIdx] = React.useState(-1);
  const [priceCheckFocusedIdx, setPriceCheckFocusedIdx] = React.useState(-1);
  const priceCheckListRef = React.useRef(null);

  React.useEffect(() => { setFocusedIdx(-1); }, [paginatedProducts]);
  React.useEffect(() => { setPriceCheckFocusedIdx(-1); }, [priceCheckResult]);
  React.useEffect(() => {
    if (priceCheckFocusedIdx >= 0 && priceCheckListRef.current) {
      priceCheckListRef.current.children[priceCheckFocusedIdx]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [priceCheckFocusedIdx]);
  React.useEffect(() => {
    if (focusedIdx >= 0) {
      document.querySelector('[data-pos-focused="true"]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIdx]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.target.select();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx(i => Math.min(i + 1, paginatedProducts.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (focusedIdx >= 0 && paginatedProducts[focusedIdx]) {
        addToCart(paginatedProducts[focusedIdx]);
        playSuccessSound();
        setFocusedIdx(-1);
      } else if (paginatedProducts.length === 1) {
        addToCart(paginatedProducts[0]);
        playSuccessSound();
        setFocusedIdx(-1);
      } else {
        commitSearch();
      }
    }
  };

  const commitWeightDraft = (itemId) => {
    if (weightInputDraft[itemId] !== undefined) {
      const val = parseFloat(weightInputDraft[itemId]);
      if (!isNaN(val) && val > 0) updateQuantity(itemId, val);
      setWeightInputDraft(prev => { const next = { ...prev }; delete next[itemId]; return next; });
    }
  };

  return (
    <div className="pos-page">
      {/* Vista móvil: caja cerrada */}
      {!sessionLoading && !currentSession && (
        <div className="md:hidden flex flex-col items-center justify-center" style={{ minHeight: '60vh', padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#b91c1c', marginBottom: '0.5rem' }}>Caja Cerrada</h2>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Debes abrir una caja antes de realizar ventas.</p>
          <Link to="/cash" className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
            Abrir Caja
          </Link>
        </div>
      )}

      {/* Tabs móvil: Productos / Carrito (solo si caja abierta) */}
      <div className={`pos-mobile-tabs${!sessionLoading && !currentSession ? ' hidden' : ''}`}>
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
      <div className={`pos-left ${mobileTab === 'products' ? 'pos-tab-active' : ''}${!sessionLoading && !currentSession ? ' hidden md:flex' : ''}`}>
        <div className="hidden md:block mb-2">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Punto de Venta
          </h1>
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              Cajero: {user?.nombre}
              {branchName && (
                <span className="ml-3 px-2 py-0.5 text-xs font-medium bg-green-100 rounded-full" style={{ color: '#052e16' }}>
                  {branchName}{branchCount > 1 ? ' — precios diferenciados' : ''}
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={toggleInfoPanel}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 select-none"
            >
              {infoPanelVisible ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {infoPanelVisible ? 'Ocultar info' : 'Mostrar info'}
            </button>
          </div>
        </div>

        {/* Cash Session Alert + Scanner Info */}
        {infoPanelVisible && <div className="hidden md:block mb-2">
          <div className="flex flex-col md:flex-row gap-4">
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
          <div className="flex-1 py-2 px-4 rounded-lg pos-session-open" style={{ background: 'var(--primary-bg)', borderLeft: '4px solid var(--primary)' }}>
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg py-2 px-3 flex-1">
          <div className="flex items-center text-sm text-blue-800">
            <Scan className="w-4 h-4 mr-2" />
            <span className="font-medium">Modos de escaneado:</span>
          </div>
          <div className="text-xs text-blue-700">
            <p>• <strong>Escáner USB/Bluetooth:</strong> Simplemente escanea, se detecta automáticamente</p>
            <p>• <strong>Cámara web:</strong> Usa el botón de cámara para escanear visualmente</p>
            <p>• <strong>Manual:</strong> Ingresa el código y presiona Enter</p>
          </div>
        </div>
          </div>
        </div>}

        {/* Search + Products (dimmed when no session) */}
        <div style={{ ...sessionDisabledStyle, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: '1rem' }}>
          {/* Search Section */}
          <div className="pos-search">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Columna 1: búsqueda */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={config?.unified_barcode_search ? searchInputRef : undefined}
                  type="text"
                  placeholder={config?.unified_barcode_search ? 'Buscar productos o escanear código...' : 'Buscar productos...'}
                  className={`form-input pl-10 ${config?.unified_barcode_search && isAutoScanning ? 'bg-green-50 border-green-300' : ''}`}
                  style={searchTerm && !(config?.unified_barcode_search && isAutoScanning) ? { paddingRight: '2.25rem' } : {}}
                  value={searchTerm}
                  autoComplete="off"
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                />
                {config?.unified_barcode_search && isAutoScanning && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Volume2 className="h-4 w-4 text-green-600 animate-pulse" />
                  </div>
                )}
                {searchTerm && !(config?.unified_barcode_search && isAutoScanning) && (
                  productsLoading
                    ? <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="spinner spinner-on-light w-4 h-4 text-gray-400" /></div>
                    : <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                      </button>
                )}
              </div>

              {/* Columna 2: barcode (modo clásico) o solo botones (modo unificado) */}
              <div className="flex gap-2">
                {!config?.unified_barcode_search && (
                  <>
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
                    <button onClick={() => searchProductByBarcode()} className="btn btn-secondary" disabled={!barcode.trim()}>
                      <Keyboard className="w-4 h-4" />
                    </button>
                  </>
                )}
                {config?.unified_barcode_search && (
                  <button onClick={() => searchProductByBarcode(searchTerm)} className="btn btn-secondary" disabled={!searchTerm.trim()}>
                    <Keyboard className="w-4 h-4" />
                  </button>
                )}
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

          {/* Products Grid / Rows */}
          <div className="pos-products">
            {productsLoading && paginatedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-gray-500">
                <div className="spinner spinner-on-light w-10 h-10 mb-4"></div>
                <p className="text-sm">Cargando productos...</p>
              </div>
            ) : (
              <>
                <div className={`products-scroll-area${(config?.product_view_mode || 'cards') === 'cards' ? ' products-scroll-area--cards' : ''}`}>
                {(config?.product_view_mode || 'cards') === 'rows' ? (
                  <div className="products-rows">
                    {paginatedProducts.map((product, idx) => {
                      const cat = categories?.find(c => c.id === product.categoria_id);
                      const CatIcon = getCategoryIcon(cat?.nombre, cat?.icono);
                      const isBlocked = config?.auto_update_inventory !== false && product.control_stock !== false && (product.stock ?? 0) <= 0;
                      return (
                        <div
                          key={product.id}
                          className={`product-row${focusedIdx === idx ? ' focused' : ''}${isBlocked ? ' product-row--no-stock' : ''}`}
                          data-pos-focused={focusedIdx === idx ? 'true' : undefined}
                          onClick={() => { if (isBlocked) return; addToCart(product); if (isMobile()) playSuccessSound(); }}
                        >
                          <div>
                            <div className="product-row-name">{product.nombre}</div>
                            <div className="product-row-meta">
                              <CatIcon className="w-3 h-3 shrink-0" />
                              {getCategoryName(product.categoria_id)}
                              {product.codigo_barras && (
                                <span className="product-row-code ml-2">· {product.codigo_barras}</span>
                              )}
                            </div>
                          </div>
                          <div className="product-row-price">
                            {config?.currency_symbol || '$'}{formatAmount(product.tipo === 'por_peso' && product.precio_por_peso ? product.precio_por_peso : product.precio)}
                            {product.tipo === 'por_peso' && '/kg'}
                          </div>
                          <div className={`product-row-stock${isBlocked ? ' product-row-stock--blocked' : ''}`}>
                            {isBlocked ? 'Sin stock' : `Stock: ${product.stock}`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="products-grid">
                    {paginatedProducts.map((product, idx) => {
                      const isBlocked = config?.auto_update_inventory !== false && product.control_stock !== false && (product.stock ?? 0) <= 0;
                      return (
                      <div
                        key={product.id}
                        className={`product-card${focusedIdx === idx ? ' focused' : ''}${isBlocked ? ' product-card--no-stock' : ''}`}
                        data-pos-focused={focusedIdx === idx ? 'true' : undefined}
                        onClick={() => { if (isBlocked) return; addToCart(product); if (isMobile()) playSuccessSound(); }}
                      >
                        <div className="product-name">{product.nombre}</div>
                        <div className="product-price">
                          {config?.currency_symbol || '$'}{formatAmount(product.tipo === 'por_peso' && product.precio_por_peso ? product.precio_por_peso : product.precio)}
                          {product.tipo === 'por_peso' && '/kg'}
                        </div>
                        <div className={`product-stock${isBlocked ? ' product-stock--blocked' : ''}`}>
                          {isBlocked ? 'Sin stock' : `Stock: ${product.stock}`}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          {(() => {
                            const cat = categories?.find(c => c.id === product.categoria_id);
                            const CatIcon = getCategoryIcon(cat?.nombre, cat?.icono);
                            return <CatIcon className="w-3 h-3 shrink-0" />;
                          })()}
                          {getCategoryName(product.categoria_id)}
                        </div>
                        {product.codigo_barras && (
                          <div className="text-xs text-blue-600 mt-1">
                            Código: {product.codigo_barras}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={totalItems}
                      itemsPerPage={itemsPerPage}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}

                {/* Quick Access Links */}
                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1rem', paddingTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <Link to="/cash" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 500, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', textDecoration: 'none' }}>
                    <DollarSign className="w-3 h-3" />
                    Caja
                  </Link>
                  <Link to="/sales" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 500, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', textDecoration: 'none' }}>
                    <FileText className="w-3 h-3" />
                    Historial de ventas
                  </Link>
                  {(user?.rol === 'admin' || user?.rol === 'supervisor') && (
                    <>
                      <Link to="/reports" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 500, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', textDecoration: 'none' }}>
                        <BarChart2 className="w-3 h-3" />
                        Reportes
                      </Link>
                      <Link to="/compras" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 500, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', textDecoration: 'none' }}>
                        <ShoppingCart className="w-3 h-3" />
                        Compras
                      </Link>
                    </>
                  )}
                  {user?.rol === 'admin' && (
                    <>
                      <Link to="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 500, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', textDecoration: 'none' }}>
                        <Package className="w-3 h-3" />
                        Productos
                      </Link>
                      <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 500, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', textDecoration: 'none' }}>
                        <LayoutDashboard className="w-3 h-3" />
                        Dashboard
                      </Link>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Panel — solo visible con módulo facturacion activo */}
      {tieneFacturacion && (
        <>
          {showInvoicePanel && (
            <div
              className="invoice-panel-mobile-overlay"
              onClick={() => setShowInvoicePanel(false)}
            />
          )}
          <InvoicePanel
            open={showInvoicePanel}
            currencySymbol={config?.currency_symbol || '$'}
            invoiceConfig={invoiceConfig}
            setInvoiceConfig={setInvoiceConfig}
            selectedCustomer={tieneClientes ? selectedCustomer : null}
            setSelectedCustomer={tieneClientes ? setSelectedCustomer : () => {}}
            subtotal={calculateSubtotal()}
            tax={calculateTax()}
            paymentAdjustment={calculatePaymentAdjustment()}
            discount={calculateDiscount()}
            impuestosExtraTotal={calculateImpuestosExtra()}
            onClose={() => setShowInvoicePanel(false)}
            tieneClientes={tieneClientes}
          />
        </>
      )}

      {/* Right Section - Cart */}
      <div className={`pos-cart ${mobileTab === 'cart' ? 'pos-tab-active' : ''}${!sessionLoading && !currentSession ? ' hidden md:flex' : ''}`} style={sessionDisabledStyle}>
          {/* Sales Tabs Bar */}
          <div className="sales-tabs-bar">
            {tabs.map((tab, tabIndex) => {
              const tc = TAB_COLORS[tab.colorIndex % TAB_COLORS.length];
              const isActive = tab.id === activeTabId;
              return (
              <button
                key={tab.id}
                className={`sales-tab ${isActive ? 'active' : ''}`}
                onClick={() => handleTabSwitch(tab.id)}
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
                {tieneFacturacion && (
                  <div className={`btn-reveal${cart.length > 0 ? ' show' : ''}`}>
                    <button
                      onClick={() => setShowInvoicePanel(v => !v)}
                      className="btn btn-secondary btn-sm"
                      title="Factura"
                      style={showInvoicePanel
                        ? { background: 'var(--primary)', borderColor: 'var(--primary)', color: '#fff' }
                        : (selectedCustomer || (invoiceConfig?.tipo_comprobante !== 'ticket') || (invoiceConfig?.descuento_valor > 0))
                          ? { background: 'var(--primary-bg)', borderColor: 'var(--primary)', color: 'var(--primary)' }
                          : {}
                      }
                    >
                      <Receipt className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <button
                  onClick={openLastTicket}
                  className="btn btn-secondary btn-sm"
                  style={{ background: 'var(--secondary)', color: 'var(--secondary-text)', borderColor: 'var(--secondary)' }}
                  title="Ver último ticket"
                  disabled={loadingLastTicket}
                >
                  {loadingLastTicket ? <div className="spinner w-4 h-4" /> : <Printer className="w-4 h-4" />}
                </button>
                <button
                  onClick={openReturnModal}
                  className="btn btn-sm"
                  style={{ background: 'var(--tertiary)', color: 'var(--tertiary-text)' }}
                  title="Devolver última venta"
                  disabled={loadingReturn}
                >
                  {loadingReturn ? <div className="spinner w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                </button>
                {!lastSaleIsAfip && (
                  <button
                    onClick={loadLastSaleForModification}
                    className="btn btn-secondary btn-sm"
                    title="Modificar última venta"
                    disabled={loadingModify}
                  >
                    {loadingModify ? <div className="spinner w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                  </button>
                )}
                <div className={`btn-reveal${cart.length > 0 ? ' show' : ''}`}>
                  <button
                    onClick={clearCart}
                    className="btn btn-secondary btn-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div key={activeTabId} className={`tab-slide-${slideDir}`}>
          {modifyingSaleId && (
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '2px solid #f59e0b',
              borderRadius: '8px',
              margin: '0 0 0 0',
              padding: '0.5rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Edit2 style={{ width: '1rem', height: '1rem', color: '#b45309', flexShrink: 0 }} />
                <span style={{ fontWeight: 700, color: '#92400e', fontSize: '0.82rem' }}>
                  Modificando venta {modifyingInvoiceNum}
                </span>
              </div>
              <button
                onClick={cancelModification}
                style={{ fontSize: '0.75rem', color: '#92400e', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '0.1rem 0.3rem', borderRadius: '4px' }}
                title="Cancelar modificación"
              >
                Cancelar
              </button>
            </div>
          )}
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
                      onClick={() => {
                        setWeightInputDraft(prev => { const next = { ...prev }; delete next[item.id]; return next; });
                        updateQuantity(item.id, parseFloat((item.quantity - (item.tipo === 'por_peso' ? 0.1 : 1)).toFixed(3)));
                      }}
                      className="quantity-btn"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <input
                      type="number"
                      min={item.tipo === 'por_peso' ? '0.001' : '1'}
                      step={item.tipo === 'por_peso' ? '0.001' : '1'}
                      value={weightInputDraft[item.id] !== undefined ? weightInputDraft[item.id] : item.quantity}
                      onChange={(e) => {
                        if (item.tipo === 'por_peso') {
                          setWeightInputDraft(prev => ({ ...prev, [item.id]: e.target.value }));
                        } else {
                          updateQuantity(item.id, parseInt(e.target.value) || 1);
                        }
                      }}
                      onBlur={() => commitWeightDraft(item.id)}
                      onClick={(e) => e.target.select()}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
                      className="quantity-input"
                    />

                    <button
                      onClick={() => {
                        setWeightInputDraft(prev => { const next = { ...prev }; delete next[item.id]; return next; });
                        updateQuantity(item.id, parseFloat((item.quantity + (item.tipo === 'por_peso' ? 0.1 : 1)).toFixed(3)));
                      }}
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
                {(config?.tax_rate ?? 0) > 0 && (
                <div className="total-row">
                  <span className="total-label">Impuestos ({((config?.tax_rate ?? 0.12) * 100).toFixed(1)}%):</span>
                  <span className="total-value">{config?.currency_symbol || '$'}{formatAmount(calculateTax())}</span>
                </div>
                )}
                {(() => {
                  const adj = calculatePaymentAdjustment();
                  const pct = (config?.payment_method_adjustments || {})[paymentMethod] ?? 0;
                  if (pct === 0) return null;
                  return (
                    <div key={paymentMethod} className="total-row amount-update" style={{ color: pct < 0 ? '#16a34a' : '#dc2626' }}>
                      <span className="total-label">
                        {pct < 0 ? `Desc. ${paymentMethod} (${Math.abs(pct)}%):` : `Recargo ${paymentMethod} (${pct}%):`}
                      </span>
                      <span className="total-value">
                        {pct < 0 ? '-' : '+'}{config?.currency_symbol || '$'}{formatAmount(Math.abs(adj))}
                      </span>
                    </div>
                  );
                })()}
                {!tieneFacturacion && (
                  <div className="total-row">
                    <span className="total-label">Descuento:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={invoiceConfig?.descuento_valor || ''}
                        placeholder="0"
                        onChange={e => {
                          const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                          setInvoiceConfig(prev => ({ ...prev, descuento_tipo: 'porcentaje', descuento_valor: val }));
                        }}
                        style={{ width: '52px', textAlign: 'right', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--input-bg, #fff)', color: 'inherit', fontSize: 'inherit' }}
                      />
                      <span>%</span>
                    </div>
                  </div>
                )}
                {calculateDiscount() > 0 && (
                  <div className="total-row" style={{ color: '#16a34a' }}>
                    <span className="total-label">
                      Descuento{invoiceConfig?.descuento_tipo === 'porcentaje' ? ` (${invoiceConfig.descuento_valor}%)` : ''}:
                    </span>
                    <span className="total-value">-{config?.currency_symbol || '$'}{formatAmount(calculateDiscount())}</span>
                  </div>
                )}
                {calculateImpuestosExtra() > 0 && (
                  <div className="total-row" style={{ color: 'var(--primary)' }}>
                    <span className="total-label">Imp. adicionales:</span>
                    <span className="total-value">+{config?.currency_symbol || '$'}{formatAmount(calculateImpuestosExtra())}</span>
                  </div>
                )}
                <div className="total-row total-final">
                  <span>Total:</span>
                  <span key={paymentMethod} className="amount-update">{config?.currency_symbol || '$'}{formatAmount(calculateTotal())}</span>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  onClick={generarPresupuesto}
                  disabled={cart.length === 0}
                  style={{ background: 'none', border: 'none', color: 'var(--primary, #10b981)', fontSize: '0.82rem', fontWeight: 600, cursor: cart.length === 0 ? 'default' : 'pointer', opacity: cart.length === 0 ? 0.4 : 1, padding: '2px 0', textDecoration: 'none' }}
                >
                  Presupuesto
                </button>
              </div>

              <button
                onClick={processSale}
                disabled={loading || cart.length === 0}
                className="btn btn-lg w-full"
                style={modifyingSaleId
                  ? { background: '#f59e0b', borderColor: '#d97706', color: '#fff' }
                  : { background: 'var(--primary)', borderColor: 'var(--primary)', color: '#fff' }
                }
              >
                {loading ? (
                  <>
                    <div className="spinner" />
                    {modifyingSaleId ? 'Guardando...' : 'Procesando...'}
                  </>
                ) : modifyingSaleId ? (
                  <>
                    <Edit2 className="w-5 h-5" />
                    Confirmar modificación ({config?.currency_symbol || '$'}{formatAmount(calculateTotal())})
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
          </div>{/* end tab-slide wrapper */}
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

      {/* Presupuesto Modal */}
      {presupuestoReceipt && (
        <TicketModal
          sale={presupuestoReceipt}
          returns={[]}
          config={config}
          afipConfig={null}
          cajeroName={user?.nombre}
          title="Presupuesto"
          closing={presupuestoClosing}
          onClose={closePresupuesto}
          customerOverride={selectedCustomer || null}
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
                onChange={e => { setPriceCheckQuery(e.target.value); setPriceCheckResult(null); setPriceCheckFocusedIdx(-1); }}
                onKeyDown={e => {
                  const list = Array.isArray(priceCheckResult) ? priceCheckResult : [];
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (list.length > 0) setPriceCheckFocusedIdx(i => Math.min(i + 1, list.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setPriceCheckFocusedIdx(i => Math.max(i - 1, -1));
                  } else if (e.key === 'Enter') {
                    if (priceCheckFocusedIdx >= 0 && list.length > 0) {
                      const p = list[priceCheckFocusedIdx];
                      const blocked = config?.auto_update_inventory !== false && p.control_stock !== false && (p.stock ?? 0) <= 0;
                      if (!blocked) { addToCart(p); if (isMobile()) playSuccessSound(); closePriceCheckAnim(); }
                    } else {
                      searchPriceCheck();
                    }
                  } else if (e.key === 'Escape') {
                    closePriceCheckAnim();
                  }
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
                <div className={`price-check-result${priceCheckFocusedIdx === 0 ? ' focused' : ''}`} style={priceCheckFocusedIdx === 0 ? { outline: '2px solid var(--primary)', outlineOffset: '2px' } : {}}>
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
                  {(() => {
                    const p = priceCheckResult[0];
                    const blocked = config?.auto_update_inventory !== false && p.control_stock !== false && (p.stock ?? 0) <= 0;
                    return (
                      <button
                        className="price-check-add-btn mx-auto mt-3"
                        style={{ width: 'auto', borderRadius: '999px', padding: '0.375rem 1rem', gap: '0.375rem', display: 'flex' }}
                        disabled={blocked}
                        title={blocked ? 'Sin stock' : 'Agregar al carrito'}
                        onClick={() => { addToCart(p); if (isMobile()) playSuccessSound(); closePriceCheckAnim(); }}
                      >
                        <Plus className="w-4 h-4" /> Agregar al carrito
                      </button>
                    );
                  })()}
                </div>
              ) : (
                <div className="price-check-list">
                  <div className="text-xs text-gray-500 mb-2">{priceCheckResult.length} productos encontrados</div>
                  <div ref={priceCheckListRef}>
                    {priceCheckResult.map((product, idx) => {
                      const blocked = config?.auto_update_inventory !== false && product.control_stock !== false && (product.stock ?? 0) <= 0;
                      return (
                        <div
                          key={product.id}
                          className={`price-check-list-item${priceCheckFocusedIdx === idx ? ' focused' : ''}`}
                          onClick={() => { if (!blocked) { addToCart(product); if (isMobile()) playSuccessSound(); closePriceCheckAnim(); } }}
                        >
                          <div className="price-check-list-info">
                            <span className="price-check-list-name">{product.nombre}</span>
                            <span className="price-check-list-meta">
                              {getCategoryName(product.categoria_id)} · Stock: {product.stock}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                            <span className="price-check-list-price">
                              {config?.currency_symbol || '$'}{formatAmount(product.tipo === 'por_peso' && product.precio_por_peso ? product.precio_por_peso : product.precio)}
                              {product.tipo === 'por_peso' && '/kg'}
                            </span>
                            <button
                              className="price-check-add-btn"
                              disabled={blocked}
                              title={blocked ? 'Sin stock' : 'Agregar al carrito'}
                              onClick={e => { e.stopPropagation(); if (!blocked) { addToCart(product); if (isMobile()) playSuccessSound(); closePriceCheckAnim(); } }}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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

export default POSView;
