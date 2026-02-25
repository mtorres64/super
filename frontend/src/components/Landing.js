import React, { useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../App';
import {
  Store,
  ShoppingCart,
  BarChart3,
  Package,
  Users,
  Building2,
  CreditCard,
  ShoppingBag,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Smartphone,
  TrendingUp,
} from 'lucide-react';

// ─── Fotos de Unsplash ───────────────────────────────────────────
const PHOTOS = {
  // Supermercado iluminado — hero background
  hero: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1800&q=80',
  // Persona en caja / checkout
  pos: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80',
  // Laptop con gráficos / analytics
  analytics: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80',
  // Persona registrando en notebook
  step1: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80',
  // Estantes con productos
  step2: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80',
  // Vendedor atendiendo cliente
  step3: 'https://images.unsplash.com/photo-1556742031-c6961e8560b0?auto=format&fit=crop&w=400&q=80',
};

const FEATURES = [
  { icon: ShoppingCart, title: 'Punto de Venta',        desc: 'Interfaz rápida para agilizar cada venta. Código de barras, productos por peso y múltiples métodos de pago.' },
  { icon: Package,      title: 'Gestión de Inventario', desc: 'Control de stock en tiempo real por sucursal. Alertas de stock mínimo y actualización automática.' },
  { icon: BarChart3,    title: 'Reportes y Estadísticas',desc: 'Informes detallados de ventas, cierres de caja y movimientos. Exportación a Excel.' },
  { icon: Building2,    title: 'Multi-Sucursal',         desc: 'Administrá múltiples locales desde un solo sistema. Precios y stock independientes por sucursal.' },
  { icon: ShoppingBag,  title: 'Gestión de Compras',     desc: 'Registrá facturas de proveedores y actualizá costos automáticamente.' },
  { icon: Users,        title: 'Multi-Usuario',          desc: 'Roles diferenciados: Administrador, Supervisor y Cajero. Cada uno ve solo lo que necesita.' },
  { icon: CreditCard,   title: 'Gestión de Caja',        desc: 'Apertura y cierre con arqueo detallado. Registro de retiros y movimientos en tiempo real.' },
  { icon: Shield,       title: 'Seguro y Confiable',     desc: 'Tus datos siempre protegidos. Aislamiento total entre empresas.' },
  { icon: Smartphone,   title: 'Diseño Responsive',      desc: 'Funcioná desde cualquier dispositivo: computadora, tablet o celular.' },
];

const PLAN_FEATURES = [
  'Sucursales ilimitadas',
  'Usuarios ilimitados',
  'Punto de venta completo',
  'Gestión de inventario',
  'Reportes y exportación Excel',
  'Gestión de compras y proveedores',
  'Soporte por email',
  '30 días de prueba gratis',
];

const S = {
  // helpers de estilo reutilizables
  flexCenter: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sectionPad: { padding: '5rem 1.5rem' },
  maxW: (w) => ({ maxWidth: w, margin: '0 auto' }),
};

export default function Landing() {
  const { user } = useContext(AuthContext);
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div style={{ minHeight: '100vh', background: 'white', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Navbar ─────────────────────────────── */}
      <header style={{ borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, background: 'white', zIndex: 50 }}>
        <div style={{ ...S.maxW(1200), padding: '0 1.5rem', display: 'flex', alignItems: 'center', height: 64, gap: 8 }}>
          <Store style={{ width: 26, height: 26, color: 'var(--primary)' }} />
          <span style={{ fontWeight: 700, fontSize: '1.15rem', color: '#111827', flex: 1 }}>SuperMarket POS</span>
          <Link to="/login" style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: '1.5px solid var(--primary)', color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', marginRight: '0.5rem' }}>
            Ingresar
          </Link>
          <Link to="/login" state={{ mode: 'register' }} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, background: 'var(--primary)', color: 'white', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
            Registrarse gratis
          </Link>
        </div>
      </header>

      {/* ── Hero con foto de fondo ──────────────── */}
      <section style={{
        position: 'relative',
        minHeight: 560,
        display: 'flex', alignItems: 'center',
        backgroundImage: `linear-gradient(135deg, rgba(5,150,105,0.93) 0%, rgba(4,120,87,0.90) 100%), url(${PHOTOS.hero})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'white',
        padding: '5rem 1.5rem 4.5rem',
      }}>
        <div style={{ ...S.maxW(800), textAlign: 'center', width: '100%' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: 999, padding: '0.4rem 1.1rem', fontSize: '0.85rem', fontWeight: 500, marginBottom: '1.5rem' }}>
            <Zap style={{ width: 14, height: 14 }} />
            Sistema POS en la nube · Multi-sucursal · Multi-usuario
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.25rem' }}>
            El sistema de gestión que tu negocio necesita
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', opacity: 0.9, lineHeight: 1.75, maxWidth: 580, margin: '0 auto 2.5rem' }}>
            Punto de venta, inventario, compras y reportes en una sola plataforma. Diseñado para supermercados, almacenes y comercios minoristas.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" state={{ mode: 'register' }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: 'var(--primary-darker)', padding: '0.9rem 2rem', borderRadius: 10, fontWeight: 700, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
              Empezar gratis — 30 días <ArrowRight style={{ width: 18, height: 18 }} />
            </Link>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '2px solid rgba(255,255,255,0.6)', color: 'white', padding: '0.9rem 2rem', borderRadius: 10, fontWeight: 600, fontSize: '1rem', textDecoration: 'none' }}>
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────── */}
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ ...S.maxW(1000), padding: '1.75rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', textAlign: 'center' }}>
          {[
            { value: 'Multi-sucursal', label: 'Gestioná varios locales' },
            { value: 'Tiempo real',    label: 'Stock y ventas al instante' },
            { value: 'Sin límites',    label: 'Usuarios y productos' },
            { value: '30 días',        label: 'Prueba gratuita' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary-darker)' }}>{value}</p>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features grid ───────────────────────── */}
      <section style={S.sectionPad}>
        <div style={S.maxW(1100)}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
              Todo lo que necesitás en un solo lugar
            </h2>
            <p style={{ color: '#6b7280', maxWidth: 500, margin: '0 auto' }}>
              Cada módulo fue pensado para simplificar el trabajo diario de tu equipo.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title}
                style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem', transition: 'box-shadow 0.2s, transform 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--primary-bg)', ...S.flexCenter, marginBottom: '0.85rem' }}>
                  <Icon style={{ width: 22, height: 22, color: 'var(--primary)' }} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: '0.4rem' }}>{title}</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Showcase 1: POS en acción ────────────── */}
      <section style={{ background: '#f0fdf4', borderTop: '1px solid #d1fae5', borderBottom: '1px solid #d1fae5', ...S.sectionPad }}>
        <div style={{ ...S.maxW(1100), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'center' }}>
          {/* Foto */}
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', lineHeight: 0 }}>
            <img
              src={PHOTOS.pos}
              alt="Punto de venta en acción"
              style={{ width: '100%', height: 380, objectFit: 'cover', display: 'block' }}
              loading="lazy"
            />
          </div>
          {/* Texto */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--primary-bg)', color: 'var(--primary-darker)', borderRadius: 999, padding: '0.3rem 1rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1.25rem' }}>
              <ShoppingCart style={{ width: 14, height: 14 }} />
              Punto de venta
            </div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: '#111827', lineHeight: 1.25, marginBottom: '1rem' }}>
              Vendé más rápido con menos errores
            </h2>
            <p style={{ color: '#4b5563', lineHeight: 1.75, marginBottom: '1.5rem' }}>
              El módulo de ventas fue diseñado para que tus cajeros operen de manera ágil: escaneá productos, aplicá descuentos, cobrá con efectivo, tarjeta o transferencia y cerrá la caja en segundos.
            </p>
            {[
              'Búsqueda por código de barras o nombre',
              'Productos por peso con tara automática',
              'Tickets impresos o por pantalla',
              'Múltiples métodos de pago por venta',
            ].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.6rem' }}>
                <CheckCircle style={{ width: 16, height: 16, color: 'var(--primary)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.9rem', color: '#374151' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Showcase 2: Reportes y analytics ─────── */}
      <section style={{ ...S.sectionPad, background: 'white' }}>
        <div style={{ ...S.maxW(1100), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'center' }}>
          {/* Texto (primero en mobile, segundo en desktop via order) */}
          <div style={{ order: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eff6ff', color: '#1d4ed8', borderRadius: 999, padding: '0.3rem 1rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1.25rem' }}>
              <BarChart3 style={{ width: 14, height: 14 }} />
              Reportes inteligentes
            </div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: '#111827', lineHeight: 1.25, marginBottom: '1rem' }}>
              Tomá decisiones basadas en datos reales
            </h2>
            <p style={{ color: '#4b5563', lineHeight: 1.75, marginBottom: '1.5rem' }}>
              Accedé a reportes de ventas por período, sucursal o cajero. Analizá tus márgenes, controlá los cierres de caja y exportá todo a Excel con un solo clic.
            </p>
            {[
              'Ventas por día, semana o mes',
              'Ranking de productos más vendidos',
              'Control de caja y arqueo detallado',
              'Exportación a Excel / CSV',
            ].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.6rem' }}>
                <CheckCircle style={{ width: 16, height: 16, color: '#2563eb', flexShrink: 0 }} />
                <span style={{ fontSize: '0.9rem', color: '#374151' }}>{item}</span>
              </div>
            ))}
          </div>
          {/* Foto */}
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', lineHeight: 0, order: 2 }}>
            <img
              src={PHOTOS.analytics}
              alt="Dashboard de reportes"
              style={{ width: '100%', height: 380, objectFit: 'cover', display: 'block' }}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* ── Cómo funciona (con fotos en los pasos) ── */}
      <section style={{ background: '#f8fafc', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', ...S.sectionPad }}>
        <div style={S.maxW(1000)}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
              Empezá en minutos
            </h2>
            <p style={{ color: '#6b7280' }}>Sin instalaciones ni configuraciones complejas.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
            {[
              { n: '1', title: 'Registrá tu empresa',  desc: 'Creá tu cuenta en minutos. Solo necesitás el nombre de tu negocio y un correo electrónico.', photo: PHOTOS.step1, alt: 'Registrar empresa' },
              { n: '2', title: 'Cargá tus productos',  desc: 'Importá tu catálogo desde Excel o cargá los productos manualmente con precios por sucursal.', photo: PHOTOS.step2, alt: 'Cargar productos' },
              { n: '3', title: 'Empezá a vender',      desc: 'Tu equipo ya puede operar el sistema. Seguí ventas y reportes en tiempo real.', photo: PHOTOS.step3, alt: 'Empezar a vender' },
            ].map(({ n, title, desc, photo, alt }) => (
              <div key={n} style={{ textAlign: 'center' }}>
                {/* Foto circular */}
                <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 1.25rem', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                  <img src={photo} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  {/* Número sobre la foto */}
                  <div style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: 'white', fontWeight: 800, fontSize: '0.95rem', ...S.flexCenter, boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
                    {n}
                  </div>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#111827', marginBottom: '0.5rem' }}>{title}</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────── */}
      <section style={S.sectionPad}>
        <div style={{ ...S.maxW(480), textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
            Precio simple y transparente
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '2.5rem' }}>Un solo plan con todo incluido. Sin sorpresas.</p>

          <div style={{ background: 'white', border: '2px solid var(--primary)', borderRadius: 20, padding: '2.5rem', boxShadow: '0 12px 40px rgba(16,185,129,0.15)' }}>
            <div style={{ background: 'var(--primary)', color: 'white', borderRadius: 999, padding: '0.3rem 1rem', fontSize: '0.8rem', fontWeight: 600, display: 'inline-block', marginBottom: '1.25rem' }}>
              Plan Mensual
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#6b7280', verticalAlign: 'top', marginTop: 6, display: 'inline-block' }}>$</span>
              <span style={{ fontSize: '3.25rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>20.000</span>
              <span style={{ color: '#6b7280', fontSize: '0.9rem' }}> ARS / mes</span>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
              Primeros 30 días gratis, sin necesidad de tarjeta.
            </p>
            <ul style={{ textAlign: 'left', marginBottom: '2rem', listStyle: 'none', padding: 0 }}>
              {PLAN_FEATURES.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.45rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.9rem', color: '#374151' }}>
                  <CheckCircle style={{ width: 16, height: 16, color: 'var(--primary)', flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/login" state={{ mode: 'register' }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--primary)', color: 'white', padding: '0.95rem', borderRadius: 10, fontWeight: 700, fontSize: '1rem', textDecoration: 'none' }}>
              Empezar prueba gratis <ArrowRight style={{ width: 18, height: 18 }} />
            </Link>
          </div>
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '1rem' }}>
            Pagos procesados de forma segura con MercadoPago
          </p>
        </div>
      </section>

      {/* ── CTA final ───────────────────────────── */}
      <section style={{
        position: 'relative',
        backgroundImage: `linear-gradient(135deg, rgba(5,150,105,0.95) 0%, rgba(4,120,87,0.92) 100%), url(${PHOTOS.hero})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        padding: '5rem 1.5rem', textAlign: 'center', color: 'white',
      }}>
        <div style={S.maxW(600)}>
          <TrendingUp style={{ width: 44, height: 44, color: 'rgba(255,255,255,0.7)', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)', fontWeight: 800, marginBottom: '0.75rem' }}>
            ¿Listo para transformar tu negocio?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '2rem', fontSize: '1rem', lineHeight: 1.7 }}>
            Registrá tu empresa hoy y probá el sistema 30 días sin costo. Sin tarjeta, sin compromiso.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" state={{ mode: 'register' }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: 'var(--primary-darker)', padding: '0.9rem 2rem', borderRadius: 10, fontWeight: 700, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
              Crear cuenta gratis <ArrowRight style={{ width: 18, height: 18 }} />
            </Link>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '2px solid rgba(255,255,255,0.6)', color: 'white', padding: '0.9rem 2rem', borderRadius: 10, fontWeight: 600, fontSize: '1rem', textDecoration: 'none' }}>
              Ingresar al sistema
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────── */}
      <footer style={{ background: '#111827', color: '#9ca3af', padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '0.5rem' }}>
          <Store style={{ width: 18, height: 18, color: 'var(--primary)' }} />
          <span style={{ color: 'white', fontWeight: 600 }}>SuperMarket POS</span>
        </div>
        <p>Sistema de gestión para comercios · {new Date().getFullYear()}</p>
      </footer>

    </div>
  );
}
