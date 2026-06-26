import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { TiendaAuthContext, TiendaContext } from '../index';
import TiendaCatalogoView from './TiendaCatalogoView';
import TiendaEcommerceView from './TiendaEcommerceView';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const PER_PAGE = 12;

const TiendaCatalogo = () => {
  const { tiendaUser, empresa_id, tiendaLogout, updateTiendaUser } = useContext(TiendaAuthContext);
  const { config, sucursales, carrito, carritoOpen, setCarritoOpen, agregarAlCarrito, actualizarCantidad, vaciarCarrito, cambiarSucursal, totalCarrito, cantidadCarrito, apiBase, authHeaders } = useContext(TiendaContext);
  const isEcommerce = config?.tienda_modo === 'ecommerce';
  const sucursalId = isEcommerce
    ? (config?.tienda_ecommerce_sucursal_id || null)
    : (tiendaUser?.sucursal_id || null);
  const navigate = useNavigate();

  const [categorias, setCategorias] = useState([]);
  const [masVendidos, setMasVendidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMasVendidos, setLoadingMasVendidos] = useState(true);

  // Cargar categorías y más vendidos al montar (y al cambiar sucursal)
  useEffect(() => {
    const params = sucursalId ? { sucursal_id: sucursalId } : {};
    axios.get(`${apiBase}/categorias`, { params })
      .then(res => setCategorias(res.data))
      .catch(() => {});
    setLoadingMasVendidos(true);
    axios.get(`${apiBase}/mas-vendidos`, { params })
      .then(res => setMasVendidos(res.data))
      .catch(() => {})
      .finally(() => setLoadingMasVendidos(false));
  }, [apiBase, sucursalId]);

  // Cargar productos con filtros
  const fetchProductos = useCallback(() => {
    setLoading(true);
    const params = { page, per_page: PER_PAGE };
    if (search) params.search = search;
    if (categoriaActiva) params.category_id = categoriaActiva;
    if (sucursalId) params.sucursal_id = sucursalId;
    axios.get(`${apiBase}/productos`, { params })
      .then(res => {
        setProductos(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.total_pages);
      })
      .catch(() => toast.error('Error al cargar productos'))
      .finally(() => setLoading(false));
  }, [apiBase, page, search, categoriaActiva, sucursalId]);

  useEffect(() => { fetchProductos(); }, [fetchProductos]);

  // Búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleCategoriaClick = (id) => {
    setCategoriaActiva(id === categoriaActiva ? null : id);
    setPage(1);
  };

  const handlePageChange = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCambiarSucursal = async (id) => {
    if (isEcommerce) return;
    try {
      await cambiarSucursal(id);
      updateTiendaUser({ sucursal_id: id });
      setPage(1);
      toast.success('Sucursal cambiada');
    } catch {
      toast.error('No se pudo cambiar la sucursal');
    }
  };

  const handleIrAlCheckout = () => {
    if (!tiendaUser) {
      navigate(`/tienda/${empresa_id}/login`);
    } else {
      navigate(`/tienda/${empresa_id}/checkout`);
    }
    setCarritoOpen(false);
  };

  // No mostrar más vendidos cuando hay búsqueda o filtro activo
  const mostrarMasVendidos = !search && !categoriaActiva;

  const ViewComponent = config?.tienda_modo === 'ecommerce' ? TiendaEcommerceView : TiendaCatalogoView;

  return (
    <ViewComponent
      config={config}
      sucursales={sucursales}
      sucursalId={sucursalId}
      onCambiarSucursal={handleCambiarSucursal}
      empresa_id={empresa_id}
      tiendaUser={tiendaUser}
      categorias={categorias}
      categoriaActiva={categoriaActiva}
      onCategoriaClick={handleCategoriaClick}
      masVendidos={mostrarMasVendidos ? masVendidos : []}
      loadingMasVendidos={loadingMasVendidos && mostrarMasVendidos}
      productos={productos}
      loading={loading}
      total={total}
      totalPages={totalPages}
      page={page}
      perPage={PER_PAGE}
      onPageChange={handlePageChange}
      searchInput={searchInput}
      onSearchChange={(v) => setSearchInput(v)}
      carrito={carrito}
      carritoOpen={carritoOpen}
      setCarritoOpen={setCarritoOpen}
      agregarAlCarrito={agregarAlCarrito}
      actualizarCantidad={actualizarCantidad}
      vaciarCarrito={vaciarCarrito}
      totalCarrito={totalCarrito}
      cantidadCarrito={cantidadCarrito}
      onIrAlCheckout={handleIrAlCheckout}
      onLoginClick={() => navigate(`/tienda/${empresa_id}/login`)}
      onLogoutClick={tiendaLogout}
    />
  );
};

export default TiendaCatalogo;
