import React from 'react';
import { Link } from 'react-router-dom';
import { formatAmount } from '../../lib/utils';
import BarcodeScanner from '../BarcodeScanner';
import ReturnModal from '../ReturnModal';
import { getCategoryIcon } from '../../utils/categoryIcons';
import TicketModal from '../TicketModal';
import Pagination from '../Pagination';
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
  LayoutDashboard
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
  setSearchTerm,
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
}) => {
  const [weightInputDraft, setWeightInputDraft] = React.useState({});
  const [focusedIdx, setFocusedIdx] = React.useState(-1);

  React.useEffect(() => { setFocusedIdx(-1); }, [paginatedProducts]);
  React.useEffect(() => {
    if (focusedIdx >= 0) {
      document.querySelector('[data-pos-focused="true"]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIdx]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
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
        <div className="hidden md:block mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Punto de Venta
          </h1>
          <p className="text-gray-600">
            Cajero: {user?.nombre}
            {branchName && (
              <span className="ml-3 px-2 py-0.5 text-xs font-medium bg-green-100 rounded-full" style={{ color: '#052e16' }}>
                {branchName}{branchCount > 1 ? ' — precios diferenciados' : ''}
              </span>
            )}
          </p>
        </div>

        {/* Cash Session Alert + Scanner Info */}
        <div className="hidden md:flex mb-2 flex-col md:flex-row gap-4">
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

        {/* Search + Products (dimmed when no session) */}
        <div style={{ ...sessionDisabledStyle, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: '1rem' }}>
          {/* Search Section */}
          <div className="pos-search">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  className="form-input pl-10"
                  style={searchTerm ? { paddingRight: '2.25rem' } : {}}
                  value={searchTerm}
                  autoComplete="on"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
                {searchTerm && (
                  productsLoading
                    ? <div className="absolute right-3 top-1/2 -translate-y-1/2 spinner w-4 h-4" />
                    : <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                )}
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

          {/* Products Grid / Rows */}
          <div className="pos-products">
            {productsLoading && paginatedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-gray-500">
                <div className="spinner w-10 h-10 mb-4"></div>
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
                      return (
                        <div
                          key={product.id}
                          className={`product-row${focusedIdx === idx ? ' focused' : ''}`}
                          data-pos-focused={focusedIdx === idx ? 'true' : undefined}
                          onClick={() => { addToCart(product); if (isMobile()) playSuccessSound(); }}
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
                          <div className="product-row-stock">Stock: {product.stock}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="products-grid">
                    {paginatedProducts.map((product, idx) => (
                      <div
                        key={product.id}
                        className={`product-card${focusedIdx === idx ? ' focused' : ''}`}
                        data-pos-focused={focusedIdx === idx ? 'true' : undefined}
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
                    ))}
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

export default POSView;
