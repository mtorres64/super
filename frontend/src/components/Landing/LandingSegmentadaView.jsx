import React from 'react';
import { Link } from 'react-router-dom';
import PulsLogo from '../PulsLogo';
import {
  BarChart3, ShoppingCart, ShoppingBag, Users, Store,
  Zap, CheckCircle, ArrowRight, TrendingUp,
} from 'lucide-react';

const S = {
  flexCenter: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sectionPad: { padding: '5rem 1.5rem' },
  maxW: (w) => ({ maxWidth: w, margin: '0 auto' }),
};

const TIER_CONFIG = [
  {
    key: 'emprendedor',
    label: 'Emprendedor',
    badgeStyle: { background: '#d1fae5', color: '#065f46' },
    features: ['POS / Ventas', 'Caja', 'Inventario', 'Notificaciones'],
    limits: { usuarios: '2 usuarios', sucursales: '1 sucursal' },
    popular: false,
  },
  {
    key: 'profesional',
    label: 'Profesional',
    badgeStyle: { background: '#dbeafe', color: '#1e40af' },
    features: ['Todo Emprendedor', 'Clientes', 'Facturación Electrónica (AFIP/ARCA)', 'Reportes de Ventas', 'Compras y Proveedores', 'Alertas de Stock', 'Usuarios y Roles', 'Configuración'],
    limits: { usuarios: 'Hasta 5 usuarios', sucursales: '1 sucursal' },
    popular: true,
  },
  {
    key: 'empresarial',
    label: 'Empresarial',
    badgeStyle: { background: '#ede9fe', color: '#5b21b6' },
    features: ['Todo Profesional', 'Multi-sucursal'],
    limits: { usuarios: 'Usuarios ilimitados', sucursales: 'Sucursales ilimitadas' },
    popular: false,
  },
];

export default function LandingSegmentadaView({ planes, trialDias, PLAN_FEATURES, formatCurrency, config }) {
  const { theme, photos, badge, heroTitle, heroDesc, stats, features, showcase1, showcase2, showcase3, ctaTitle, ctaDesc, footerDesc } = config;

  const cssVars = {
    '--primary':        theme.primary,
    '--primary-dark':   theme.dark,
    '--primary-darker': theme.darker,
    '--primary-light':  theme.light,
    '--primary-bg':     theme.bg,
    '--primary-text':   'white',
  };

  const resolvedCtaDesc = ctaDesc.replace('{trialDias}', trialDias);

  return (
    <div style={{ minHeight: '100vh', background: 'white', fontFamily: 'Inter, sans-serif', ...cssVars }}>

      {/* ── Navbar ──────────────────────────────── */}
      <header style={{ borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, background: 'white', zIndex: 50 }}>
        <div style={{ ...S.maxW(1200), padding: '0 1rem', display: 'flex', alignItems: 'center', height: 64, gap: 8 }}>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}><PulsLogo size="md" /></span>
          <Link to="/login" style={{ padding: '0.5rem 1rem', borderRadius: 8, border: `1.5px solid ${theme.primary}`, color: theme.primary, fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>
            Ingresar
          </Link>
          <Link to="/login" state={{ mode: 'register' }} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: theme.primary, color: 'white', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>
            Registrarse gratis
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────── */}
      <section style={{
        position: 'relative', minHeight: 560,
        display: 'flex', alignItems: 'center',
        backgroundImage: `${theme.heroGrad}, url(${photos.hero})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        color: 'white', padding: '5rem 1.5rem 4.5rem',
      }}>
        <div style={{ ...S.maxW(820), textAlign: 'center', width: '100%' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: 999, padding: '0.4rem 1.1rem', fontSize: '0.85rem', fontWeight: 500, marginBottom: '1.5rem' }}>
            <Zap style={{ width: 14, height: 14 }} />
            {badge}
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.25rem' }}>
            {heroTitle}
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', opacity: 0.9, lineHeight: 1.75, maxWidth: 600, margin: '0 auto 2.5rem' }}>
            {heroDesc}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" state={{ mode: 'register' }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: theme.darker, padding: '0.9rem 2rem', borderRadius: 10, fontWeight: 700, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
              Empezar gratis — {trialDias} días <ArrowRight style={{ width: 18, height: 18 }} />
            </Link>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '2px solid rgba(255,255,255,0.6)', color: 'white', padding: '0.9rem 2rem', borderRadius: 10, fontWeight: 600, fontSize: '1rem', textDecoration: 'none' }}>
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────── */}
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ ...S.maxW(1100), padding: '1.75rem 1.5rem', display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))`, gap: '1rem', textAlign: 'center' }}>
          {[...stats, { value: `${trialDias} días`, label: 'Prueba gratuita sin tarjeta' }].map(({ value, label }) => (
            <div key={label}>
              <p style={{ fontWeight: 700, fontSize: '1.05rem', color: theme.darker }}>{value}</p>
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
            <p style={{ color: '#6b7280', maxWidth: 520, margin: '0 auto' }}>
              Cada módulo fue pensado para simplificar el trabajo diario de tu equipo.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.25rem' }}>
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title}
                style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem', transition: 'box-shadow 0.2s, transform 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: theme.bg, ...S.flexCenter, marginBottom: '0.85rem' }}>
                  <Icon style={{ width: 22, height: 22, color: theme.primary }} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: '0.4rem' }}>{title}</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Showcase 1: POS ─────────────────────── */}
      <section style={{ background: theme.s1Bg, borderTop: `1px solid ${theme.s1Border}`, borderBottom: `1px solid ${theme.s1Border}`, ...S.sectionPad }}>
        <div style={{ ...S.maxW(1100), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'center' }}>
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', lineHeight: 0 }}>
            <img src={photos.pos} alt="Punto de venta" style={{ width: '100%', height: 380, objectFit: 'cover', display: 'block' }} loading="lazy" />
          </div>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: theme.s1BadgeBg, color: theme.s1BadgeColor, borderRadius: 999, padding: '0.3rem 1rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1.25rem' }}>
              {showcase1.badgeIcon && <showcase1.badgeIcon style={{ width: 14, height: 14 }} />}
              {showcase1.badge}
            </div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: '#111827', lineHeight: 1.25, marginBottom: '1rem' }}>
              {showcase1.title}
            </h2>
            <p style={{ color: '#4b5563', lineHeight: 1.75, marginBottom: '1.5rem' }}>{showcase1.desc}</p>
            {showcase1.bullets.map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.6rem' }}>
                <CheckCircle style={{ width: 16, height: 16, color: theme.s1Check, flexShrink: 0 }} />
                <span style={{ fontSize: '0.9rem', color: '#374151' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Showcase 2: Reportes ─────────────────── */}
      <section style={{ ...S.sectionPad, background: 'white' }}>
        <div style={{ ...S.maxW(1100), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'center' }}>
          <div style={{ order: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eff6ff', color: '#1d4ed8', borderRadius: 999, padding: '0.3rem 1rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1.25rem' }}>
              <BarChart3 style={{ width: 14, height: 14 }} />
              Reportes inteligentes
            </div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: '#111827', lineHeight: 1.25, marginBottom: '1rem' }}>
              {showcase2.title}
            </h2>
            <p style={{ color: '#4b5563', lineHeight: 1.75, marginBottom: '1.5rem' }}>{showcase2.desc}</p>
            {showcase2.bullets.map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.6rem' }}>
                <CheckCircle style={{ width: 16, height: 16, color: '#2563eb', flexShrink: 0 }} />
                <span style={{ fontSize: '0.9rem', color: '#374151' }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', lineHeight: 0, order: 2 }}>
            <img src={photos.analytics} alt="Dashboard de reportes" style={{ width: '100%', height: 380, objectFit: 'cover', display: 'block' }} loading="lazy" />
          </div>
        </div>
      </section>

      {/* ── Showcase 3: Compras ──────────────────── */}
      <section style={{ background: theme.s3Bg, borderTop: `1px solid ${theme.s3Border}`, borderBottom: `1px solid ${theme.s3Border}`, ...S.sectionPad }}>
        <div style={{ ...S.maxW(1100), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'center' }}>
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', lineHeight: 0 }}>
            <img src={photos.compras} alt="Compras y proveedores" style={{ width: '100%', height: 380, objectFit: 'cover', display: 'block' }} loading="lazy" />
          </div>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: theme.s3BadgeBg, color: theme.s3BadgeColor, borderRadius: 999, padding: '0.3rem 1rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1.25rem', border: `1px solid ${theme.s3Border}` }}>
              {showcase3.badgeIcon && <showcase3.badgeIcon style={{ width: 14, height: 14 }} />}
              {showcase3.badge}
            </div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: '#111827', lineHeight: 1.25, marginBottom: '1rem' }}>
              {showcase3.title}
            </h2>
            <p style={{ color: '#4b5563', lineHeight: 1.75, marginBottom: '1.5rem' }}>{showcase3.desc}</p>
            {showcase3.bullets.map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.6rem' }}>
                <CheckCircle style={{ width: 16, height: 16, color: theme.s3Check, flexShrink: 0 }} />
                <span style={{ fontSize: '0.9rem', color: '#374151' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ────────────────────────── */}
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
              { n: '1', title: 'Registrá tu empresa',  desc: `Creá tu cuenta en minutos. Solo necesitás el nombre de tu negocio y un correo. Los primeros ${trialDias} días son gratis.`, photo: photos.step1, alt: 'Registrar empresa' },
              { n: '2', title: 'Cargá tus productos',  desc: 'Importá tu catálogo desde Excel o CSV, o cargá los productos manualmente con precios y stock.', photo: photos.step2, alt: 'Cargar productos' },
              { n: '3', title: 'Empezá a vender',      desc: 'Tu equipo ya puede operar el sistema desde el primer día. Seguí ventas y reportes en tiempo real.', photo: photos.step3, alt: 'Empezar a vender' },
            ].map(({ n, title, desc, photo, alt }) => (
              <div key={n} style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 1.25rem' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                    <img src={photo} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  </div>
                  <div style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: '50%', background: theme.primary, color: 'white', fontWeight: 800, fontSize: '0.95rem', ...S.flexCenter, boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
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
        <div style={{ ...S.maxW(1020), textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
            Planes simples y transparentes
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.25rem' }}>Todo incluido. Sin costos ocultos ni sorpresas.</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: theme.bg, border: `1.5px solid ${theme.primary}`, borderRadius: 999, padding: '0.5rem 1.25rem', fontSize: '0.875rem', color: theme.darker, fontWeight: 500, marginBottom: '2rem', opacity: 0.9 }}>
            🎁 Los primeros <strong style={{ margin: '0 3px' }}>{trialDias} días</strong> probás con el <strong style={{ margin: '0 3px' }}>plan Empresarial completo</strong> — sin tarjeta requerida.
          </div>

          <div style={{ background: 'white', border: '2px solid #e5e7eb', borderRadius: 20, padding: '2rem', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', marginBottom: '2rem', textAlign: 'left' }}>
            <p style={{ fontWeight: 700, color: '#111827', marginBottom: '1rem', textAlign: 'center', fontSize: '0.95rem' }}>
              Todo esto incluido en cualquier plan
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.25rem 1.5rem' }}>
              {PLAN_FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.35rem 0', fontSize: '0.875rem', color: '#374151' }}>
                  <CheckCircle style={{ width: 15, height: 15, color: theme.primary, flexShrink: 0 }} />
                  {f}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
            {TIER_CONFIG.map(tier => {
              const priceMensual = planes?.tiers?.[tier.key]?.precio_mensual;
              const priceAnual   = planes?.tiers?.[tier.key]?.precio_anual;
              return (
                <div key={tier.key} style={{
                  background: 'white',
                  border: `2px solid ${tier.popular ? theme.primary : '#e5e7eb'}`,
                  borderRadius: 16,
                  boxShadow: tier.popular ? `0 12px 40px ${theme.light}` : '0 4px 16px rgba(0,0,0,0.06)',
                  position: 'relative', display: 'flex', flexDirection: 'column',
                }}>
                  {tier.popular && (
                    <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: theme.primary, color: 'white', borderRadius: 999, padding: '0.3rem 1.1rem', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      ⭐ Más popular
                    </div>
                  )}
                  <div style={{ padding: tier.popular ? '1.75rem 1.5rem 1.5rem' : '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                    <div>
                      <span style={{ ...tier.badgeStyle, borderRadius: 999, padding: '0.3rem 1rem', fontSize: '0.8rem', fontWeight: 600, display: 'inline-block', marginBottom: '0.75rem' }}>
                        {tier.label}
                      </span>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {tier.features.map(f => (
                          <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.2rem 0', fontSize: '0.825rem', color: '#6b7280' }}>
                            <CheckCircle style={{ width: 13, height: 13, color: theme.primary, flexShrink: 0 }} />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <div style={{ borderTop: '1px solid #f3f4f6', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.825rem', fontWeight: 600, color: '#374151', margin: 0 }}>
                          <Users style={{ width: 13, height: 13, color: theme.primary, flexShrink: 0 }} />
                          {tier.limits.usuarios}
                        </p>
                        <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.825rem', fontWeight: 600, color: '#374151', margin: 0 }}>
                          <Store style={{ width: 13, height: 13, color: theme.primary, flexShrink: 0 }} />
                          {tier.limits.sucursales}
                        </p>
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem', marginTop: 'auto' }}>
                      <p style={{ fontWeight: 800, color: '#111827', marginBottom: '0.15rem', lineHeight: 1 }}>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 400 }}>$</span>
                        <span style={{ fontSize: '1.75rem' }}>{priceMensual != null ? formatCurrency(priceMensual) : '—'}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#6b7280' }}> / mes</span>
                      </p>
                      {priceAnual != null && (
                        <p style={{ fontSize: '0.75rem', color: theme.dark, marginBottom: '0.75rem' }}>
                          O {formatCurrency(priceAnual)} / año — 1 mes gratis
                        </p>
                      )}
                      <Link to="/login" state={{ mode: 'register' }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: theme.primary, color: 'white', padding: '0.75rem', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}>
                        Empezar prueba gratis <ArrowRight style={{ width: 15, height: 15 }} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '1.5rem' }}>
            Pagos procesados de forma segura con MercadoPago
          </p>
        </div>
      </section>

      {/* ── CTA final ───────────────────────────── */}
      <section style={{
        position: 'relative',
        backgroundImage: `${theme.heroGrad}, url(${photos.hero})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        padding: '5rem 1.5rem', textAlign: 'center', color: 'white',
      }}>
        <div style={S.maxW(620)}>
          <TrendingUp style={{ width: 44, height: 44, color: 'rgba(255,255,255,0.7)', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)', fontWeight: 800, marginBottom: '0.75rem' }}>
            {ctaTitle}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '2rem', fontSize: '1rem', lineHeight: 1.7 }}>
            {resolvedCtaDesc}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" state={{ mode: 'register' }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: theme.darker, padding: '0.9rem 2rem', borderRadius: 10, fontWeight: 700, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
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
          <PulsLogo size="sm" dark={true} />
        </div>
        <p>{footerDesc} · {new Date().getFullYear()}</p>
      </footer>

    </div>
  );
}
