import React from 'react';
import {
  User, Lock, Building2, Mail, ShieldCheck,
  ArrowLeft, Send, KeyRound, Eye, EyeOff,
  CheckCircle, BarChart2, ShoppingCart, Package,
} from 'lucide-react';
import PulsLogo from '../PulsLogo';

const ICON_MAP = {
  'Punto de venta con escáner': ShoppingCart,
  'Inventario y alertas de stock': Package,
  'Reportes y exportación Excel': BarChart2,
  'Multi-sucursal y multi-usuario': User,
};

const GREEN = {
  '--primary': '#10b981', '--primary-dark': '#059669', '--primary-darker': '#047857',
  '--primary-light': 'rgba(16,185,129,0.1)', '--primary-bg': '#ecfdf5', '--primary-text': 'white',
};

// ── OTP block defined outside LoginView to prevent remount on re-render ──────
const OtpBlock = ({ otpDigits, otpRefs, email, loading, otpCode,
  onSubmit, onReenviar, backLabel, backAction,
  handleOtpKeyDown, handleOtpChange, handleOtpPaste, onReenviarClick }) => (
  <form onSubmit={onSubmit}>
    <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
        <ShieldCheck style={{ width: 28, height: 28, color: '#10b981' }} />
      </div>
      <p style={{ color: '#374151', fontSize: '0.9rem', lineHeight: 1.6 }}>Enviamos un código de 4 dígitos a</p>
      <p style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem' }}>{email}</p>
      <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: 4 }}>Revisá también la carpeta de spam.</p>
    </div>
    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
      {otpDigits.map((d, i) => (
        <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={1} value={d}
          onChange={(e) => handleOtpChange(i, e.target.value)}
          onKeyDown={(e) => handleOtpKeyDown(i, e)}
          onPaste={i === 0 ? handleOtpPaste : undefined}
          style={{ width: 56, height: 64, textAlign: 'center', fontSize: '1.75rem', fontWeight: 700,
            border: `2px solid ${d ? '#10b981' : '#d1d5db'}`, borderRadius: 12, outline: 'none',
            color: '#111827', background: d ? '#ecfdf5' : 'white', transition: 'border-color .15s, background .15s' }} />
      ))}
    </div>
    <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading || otpCode.length < 4}>
      {loading ? <><div className="spinner" />Verificando...</> : <><ShieldCheck className="w-4 h-4 inline mr-2" />Verificar código</>}
    </button>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
      <button type="button" onClick={backAction}
        style={{ fontSize: '0.8rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
        <ArrowLeft style={{ width: 13, height: 13 }} />{backLabel}
      </button>
      <button type="button" onClick={() => onReenviarClick(onReenviar)} disabled={loading}
        style={{ fontSize: '0.8rem', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>
        Reenviar código
      </button>
    </div>
  </form>
);

const LoginView = ({
  mode,
  step,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  empresaNombre,
  setEmpresaNombre,
  adminNombre,
  setAdminNombre,
  otpDigits,
  otpRefs,
  otpCode,
  nuevaPassword,
  setNuevaPassword,
  showNueva,
  setShowNueva,
  loading,
  features,
  handleLogin,
  handleEnviarOtpRegistro,
  handleVerificarYRegistrar,
  handleEnviarReset,
  handleVerificarReset,
  handleCambiarPassword,
  handleOtpKeyDown,
  handleOtpChange,
  handleOtpPaste,
  reenviarCodigo,
  goToLogin,
  setMode,
  setStep,
  setOtpDigits,
}) => {
  return (
    <div className="login-container" style={GREEN}>

      {/* ════════════════════════ LOGIN — split card ════════════════════════ */}
      {mode === 'login' && (
        <div className="login-card login-card--split fade-in">

          {/* Panel izquierdo */}
          <div className="login-panel-left">
            <div style={{ position: 'relative', zIndex: 1 }}>
              <a href="/" style={{ display: 'inline-block', cursor: 'pointer' }}>
                <PulsLogo size="lg" dark={true} />
              </a>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', marginTop: '0.75rem', lineHeight: 1.6 }}>
                El sistema de gestión que tu comercio necesita
              </p>
            </div>

            <ul className="login-features" style={{ listStyle: 'none', padding: 0, margin: '2rem 0', position: 'relative', zIndex: 1 }}>
              {features.map(({ text }) => {
                const Icon = ICON_MAP[text] || User;
                return (
                  <li key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'white', fontSize: '0.875rem', marginBottom: '0.85rem' }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon style={{ width: 14, height: 14 }} />
                    </span>
                    {text}
                  </li>
                );
              })}
            </ul>

            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', position: 'relative', zIndex: 1 }}>
              © {new Date().getFullYear()} PULS
            </p>
          </div>

          {/* Panel derecho */}
          <div className="login-panel-right">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '0.35rem' }}>
              Bienvenido de vuelta
            </h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '2rem' }}>
              Ingresá tus datos para continuar
            </p>

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="input-icon-wrap">
                  <span className="input-icon"><Mail size={15} /></span>
                  <input type="email" className="form-input" value={email}
                    onChange={(e) => setEmail(e.target.value)} placeholder="tu@empresa.com" required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <div className="input-icon-wrap">
                  <span className="input-icon"><Lock size={15} /></span>
                  <input type={showPassword ? 'text' : 'password'} className="form-input"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" required style={{ paddingRight: '2.5rem' }} />
                  <button type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'right', marginBottom: '1.5rem', marginTop: '-0.75rem' }}>
                <button type="button"
                  onClick={() => { setMode('reset'); setStep('email'); setEmail(''); }}
                  style={{ fontSize: '0.8rem', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading
                  ? <><div className="spinner" />Iniciando sesión...</>
                  : 'Iniciar Sesión'}
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>¿No tenés cuenta? </span>
              <button type="button"
                onClick={() => { setMode('register'); setStep('datos'); }}
                style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                Registrá tu empresa
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ════════════════════════ REGISTRO — split card ════════════════════ */}
      {mode === 'register' && (
        <div className="login-card login-card--split fade-in">

          {/* Panel izquierdo */}
          <div className="login-panel-left">
            <div style={{ position: 'relative', zIndex: 1 }}>
              <a href="/" style={{ display: 'inline-block', cursor: 'pointer' }}>
                <PulsLogo size="lg" dark={true} />
              </a>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', marginTop: '0.75rem', lineHeight: 1.6 }}>
                Empezá tu prueba gratuita hoy
              </p>
              <div style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.15)', borderRadius: 999, padding: '0.3rem 0.9rem',
                fontSize: '0.8rem', color: 'white', fontWeight: 500 }}>
                Sin tarjeta requerida
              </div>
            </div>

            <ul className="login-features" style={{ listStyle: 'none', padding: 0, margin: '2rem 0', position: 'relative', zIndex: 1 }}>
              {features.map(({ text }) => {
                const Icon = ICON_MAP[text] || User;
                return (
                  <li key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'white', fontSize: '0.875rem', marginBottom: '0.85rem' }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon style={{ width: 14, height: 14 }} />
                    </span>
                    {text}
                  </li>
                );
              })}
            </ul>

            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', position: 'relative', zIndex: 1 }}>
              © {new Date().getFullYear()} PULS
            </p>
          </div>

          {/* Panel derecho */}
          <div className="login-panel-right">
            {step === 'datos' ? (
              <>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111827', marginBottom: '0.35rem' }}>
                  Crear cuenta
                </h2>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
                  Completá los datos para registrar tu empresa
                </p>
                <form onSubmit={handleEnviarOtpRegistro}>
                  <div className="form-group">
                    <label className="form-label">Nombre de la empresa</label>
                    <div className="input-icon-wrap">
                      <span className="input-icon"><Building2 size={15} /></span>
                      <input type="text" className="form-input" value={empresaNombre}
                        onChange={(e) => setEmpresaNombre(e.target.value)} placeholder="Mi Supermercado S.A." required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tu nombre</label>
                    <div className="input-icon-wrap">
                      <span className="input-icon"><User size={15} /></span>
                      <input type="text" className="form-input" value={adminNombre}
                        onChange={(e) => setAdminNombre(e.target.value)} placeholder="Juan Pérez" required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <div className="input-icon-wrap">
                      <span className="input-icon"><Mail size={15} /></span>
                      <input type="email" className="form-input" value={email}
                        onChange={(e) => setEmail(e.target.value)} placeholder="juan@miempresa.com" required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contraseña</label>
                    <div className="input-icon-wrap">
                      <span className="input-icon"><Lock size={15} /></span>
                      <input type={showPassword ? 'text' : 'password'} className="form-input"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••" required style={{ paddingRight: '2.5rem' }} />
                      <button type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                    {loading
                      ? <><div className="spinner" />Enviando código...</>
                      : <><Send className="w-4 h-4 inline mr-2" />Enviar código de verificación</>}
                  </button>
                </form>
              </>
            ) : (
              <OtpBlock
                otpDigits={otpDigits} otpRefs={otpRefs} email={email}
                loading={loading} otpCode={otpCode}
                handleOtpKeyDown={handleOtpKeyDown} handleOtpChange={handleOtpChange}
                handleOtpPaste={handleOtpPaste} onReenviarClick={reenviarCodigo}
                onSubmit={handleVerificarYRegistrar}
                onReenviar="auth/otp/enviar"
                backLabel="Cambiar datos"
                backAction={() => { setStep('datos'); setOtpDigits(['', '', '', '']); }}
              />
            )}

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>¿Ya tenés cuenta? </span>
              <button type="button" onClick={goToLogin}
                style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                Iniciar sesión
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ════════════════════════ RECUPERAR CONTRASEÑA ══════════════════════ */}
      {mode === 'reset' && (
        <div className="login-card fade-in" style={{ padding: 0, overflow: 'hidden', background: 'rgba(4, 80, 50, 0.72)', borderRadius: 20, boxShadow: '0 32px 64px -12px rgba(0,0,0,0.25)' }}>

          {/* Banner verde superior */}
          {(() => {
            const bannerInfo = {
              email: { icon: Lock,        title: 'Recuperar contraseña',  sub: 'Te enviamos un código a tu correo' },
              otp:   { icon: ShieldCheck, title: 'Verificar código',       sub: `Revisá el correo de ${email}` },
              nueva: { icon: KeyRound,    title: 'Nueva contraseña',        sub: 'Código verificado correctamente' },
            }[step];
            const BannerIcon = bannerInfo.icon;
            return (
              <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', padding: '2rem 2.5rem', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                  <BannerIcon style={{ width: 26, height: 26, color: 'white' }} />
                </div>
                <h2 style={{ color: 'white', fontWeight: 700, fontSize: '1.2rem', margin: '0 0 0.25rem' }}>{bannerInfo.title}</h2>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem', margin: 0 }}>{bannerInfo.sub}</p>
              </div>
            );
          })()}

          {/* Contenido */}
          <div style={{ padding: '2rem 2.5rem', background: 'rgba(255,255,255,0.92)', borderRadius: '0 0 20px 20px' }}>
            {step === 'email' && (
              <form onSubmit={handleEnviarReset}>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                  Ingresá el correo de tu cuenta y te enviamos un código para restablecer tu contraseña.
                </p>
                <div className="form-group">
                  <label className="form-label">Email de la cuenta</label>
                  <div className="input-icon-wrap">
                    <span className="input-icon"><Mail size={15} /></span>
                    <input type="email" className="form-input" value={email}
                      onChange={(e) => setEmail(e.target.value)} placeholder="tu@empresa.com" required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                  {loading ? <><div className="spinner" />Enviando...</> : <><Send className="w-4 h-4 inline mr-2" />Enviar código</>}
                </button>
              </form>
            )}

            {step === 'otp' && (
              <OtpBlock
                otpDigits={otpDigits} otpRefs={otpRefs} email={email}
                loading={loading} otpCode={otpCode}
                handleOtpKeyDown={handleOtpKeyDown} handleOtpChange={handleOtpChange}
                handleOtpPaste={handleOtpPaste} onReenviarClick={reenviarCodigo}
                onSubmit={handleVerificarReset}
                onReenviar="auth/password-reset/enviar"
                backLabel="Cambiar correo"
                backAction={() => { setStep('email'); setOtpDigits(['', '', '', '']); }}
              />
            )}

            {step === 'nueva' && (
              <form onSubmit={handleCambiarPassword}>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                  Elegí una contraseña nueva para tu cuenta.
                </p>
                <div className="form-group">
                  <label className="form-label">Nueva contraseña</label>
                  <div className="input-icon-wrap">
                    <span className="input-icon"><Lock size={15} /></span>
                    <input type={showNueva ? 'text' : 'password'} className="form-input"
                      value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres" required minLength={6} style={{ paddingRight: '2.5rem' }} />
                    <button type="button" className="input-icon-right" onClick={() => setShowNueva(!showNueva)}>
                      {showNueva ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                  {loading ? <><div className="spinner" />Guardando...</> : <><CheckCircle className="w-4 h-4 inline mr-2" />Cambiar contraseña</>}
                </button>
              </form>
            )}

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
              <button type="button" onClick={goToLogin}
                style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                ← Volver al inicio de sesión
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default LoginView;
