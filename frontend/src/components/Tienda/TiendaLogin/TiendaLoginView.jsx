import React from 'react';
import { Mail, Lock, User, Phone, ShieldCheck, Eye, EyeOff, ArrowLeft, ArrowRight, MapPin } from 'lucide-react';

const PRIMARY = 'var(--primary, #10b981)';
const PRIMARY_DARK = 'var(--primary-dark, #059669)';
const PRIMARY_BG = 'var(--primary-bg, #ecfdf5)';
const PRIMARY_TEXT = 'var(--primary-text, white)';

const OtpBlock = ({ otpDigits, otpRefs, email, loading, otpCode, onSubmit, onReenviar, backAction, backLabel, handleOtpKeyDown, handleOtpChange, handleOtpPaste }) => (
  <form onSubmit={onSubmit}>
    <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: PRIMARY_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
        <ShieldCheck style={{ width: 28, height: 28, color: PRIMARY }} />
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
            border: `2px solid ${d ? PRIMARY : '#d1d5db'}`, borderRadius: 12, outline: 'none',
            color: '#111827', background: d ? PRIMARY_BG : 'white', transition: 'border-color .15s, background .15s' }} />
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
      <button type="button" onClick={onReenviar} disabled={loading}
        style={{ fontSize: '0.8rem', color: PRIMARY, background: 'none', border: 'none', cursor: 'pointer' }}>
        Reenviar código
      </button>
    </div>
  </form>
);

const CONTAINER = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundImage: `linear-gradient(135deg, rgba(var(--primary-rgb, 5,150,105), 0.93) 0%, rgba(var(--primary-rgb, 4,120,87), 0.90) 100%), url('https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1800&q=80')`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  padding: '1.5rem',
};

const CARD = {
  background: 'white',
  borderRadius: 20,
  boxShadow: '0 32px 64px -12px rgba(0,0,0,0.25)',
  width: '100%',
  maxWidth: 440,
  padding: '2.5rem 2rem',
};

const TiendaLoginView = ({
  config, sucursales = [], mode, step,
  nombre, setNombre, telefono, setTelefono,
  email, setEmail, password, setPassword, showPassword, setShowPassword,
  nuevaPassword, setNuevaPassword, showNueva, setShowNueva,
  sucursalId, setSucursalId,
  otpDigits, otpRefs, otpCode,
  loading,
  handleLogin, handleEnviarOtp, handleVerificarYRegistrar,
  handleEnviarReset, handleVerificarReset, handleCambiarPassword,
  handleOtpKeyDown, handleOtpChange, handleOtpPaste, reenviarCodigo,
  goToLogin, setMode, setStep, setOtpDigits, onVolverTienda,
}) => {
  const storeName = config?.company_name || config?.empresa_nombre || 'Tienda';

  const headerBrand = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
      {config?.company_logo
        ? <img src={config.company_logo} alt={storeName} style={{ height: 52, objectFit: 'contain', marginBottom: 8 }} />
        : <div style={{ width: 52, height: 52, borderRadius: '50%', background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '1.3rem' }}>{storeName.charAt(0).toUpperCase()}</span>
          </div>
      }
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#111827', margin: '0 0 0.4rem' }}>{storeName}</h1>
      <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Powered by <span style={{ fontWeight: 700, color: PRIMARY }}>PULS</span></span>
    </div>
  );

  return (
    <div style={CONTAINER}>
      <div style={CARD} className="fade-in">
        {headerBrand}

        {/* ── LOGIN ── */}
        {mode === 'login' && (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem', textAlign: 'center' }}>Iniciar sesión</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.75rem', textAlign: 'center' }}>Ingresá tu email y contraseña</p>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="input-icon-wrap">
                  <span className="input-icon"><Mail size={15} /></span>
                  <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value.toLowerCase())} placeholder="tu@email.com" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <div className="input-icon-wrap">
                  <span className="input-icon"><Lock size={15} /></span>
                  <input type={showPassword ? 'text' : 'password'} className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ paddingRight: '2.5rem' }} />
                  <button type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'right', marginBottom: '1.5rem', marginTop: '-0.75rem' }}>
                <button type="button" onClick={() => { setMode('reset'); setStep('datos'); setEmail(''); }}
                  style={{ fontSize: '0.8rem', color: PRIMARY, background: 'none', border: 'none', cursor: 'pointer' }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? <><div className="spinner" />Iniciando sesión...</> : 'Iniciar sesión'}
              </button>
            </form>
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>¿No tenés cuenta? </span>
              <button type="button" onClick={() => { setMode('register'); setStep('datos'); }}
                style={{ fontSize: '0.875rem', color: PRIMARY, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                Crear cuenta
              </button>
            </div>
          </>
        )}

        {/* ── REGISTRO paso datos ── */}
        {mode === 'register' && step === 'datos' && (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem', textAlign: 'center' }}>Crear cuenta</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.75rem', textAlign: 'center' }}>Completá tus datos para registrarte</p>
            <form onSubmit={handleEnviarOtp}>
              <div className="form-group">
                <label className="form-label">Nombre completo</label>
                <div className="input-icon-wrap">
                  <span className="input-icon"><User size={15} /></span>
                  <input type="text" className="form-input" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <div style={{ display: 'flex', border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: 'white' }}>
                  <span style={{ padding: '0.65rem 0.75rem', background: '#f3f4f6', borderRight: '1.5px solid #e5e7eb', color: '#374151', fontWeight: 700, fontSize: '0.875rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>+54</span>
                  <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                    placeholder="381 5123456"
                    style={{ flex: 1, border: 'none', padding: '0.65rem 0.75rem', fontSize: '0.875rem', outline: 'none', background: 'transparent' }} />
                </div>
                <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 4, marginBottom: 0 }}>
                  Código de área <strong>sin el 0</strong> y número <strong>sin el 15</strong>. Ej: <strong>381 5123456</strong>
                </p>
              </div>
              {sucursales.length > 1 && (
                <div className="form-group">
                  <label className="form-label">Sucursal</label>
                  <div className="input-icon-wrap">
                    <span className="input-icon"><MapPin size={15} /></span>
                    <select className="form-input" value={sucursalId} onChange={e => setSucursalId(e.target.value)} required style={{ appearance: 'none' }}>
                      <option value="">Seleccioná una sucursal</option>
                      {sucursales.map(s => (
                        <option key={s.id} value={s.id}>{s.nombre}{s.direccion ? ` — ${s.direccion}` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="input-icon-wrap">
                  <span className="input-icon"><Mail size={15} /></span>
                  <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value.toLowerCase())} placeholder="tu@email.com" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <div className="input-icon-wrap">
                  <span className="input-icon"><Lock size={15} /></span>
                  <input type={showPassword ? 'text' : 'password'} className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} style={{ paddingRight: '2.5rem' }} />
                  <button type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? <><div className="spinner" />Enviando código...</> : <>Verificar email <ArrowRight className="w-4 h-4 inline ml-1" /></>}
              </button>
            </form>
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>¿Ya tenés cuenta? </span>
              <button type="button" onClick={goToLogin}
                style={{ fontSize: '0.875rem', color: PRIMARY, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                Iniciar sesión
              </button>
            </div>
          </>
        )}

        {/* ── REGISTRO paso OTP ── */}
        {mode === 'register' && step === 'otp' && (
          <OtpBlock
            otpDigits={otpDigits} otpRefs={otpRefs} email={email} loading={loading} otpCode={otpCode}
            onSubmit={handleVerificarYRegistrar}
            onReenviar={reenviarCodigo}
            backLabel="Volver" backAction={() => setStep('datos')}
            handleOtpKeyDown={handleOtpKeyDown} handleOtpChange={handleOtpChange} handleOtpPaste={handleOtpPaste}
          />
        )}

        {/* ── RESET paso email ── */}
        {mode === 'reset' && step === 'datos' && (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem', textAlign: 'center' }}>Recuperar contraseña</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.75rem', textAlign: 'center' }}>Ingresá tu email y te enviaremos un código</p>
            <form onSubmit={handleEnviarReset}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="input-icon-wrap">
                  <span className="input-icon"><Mail size={15} /></span>
                  <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value.toLowerCase())} placeholder="tu@email.com" required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? <><div className="spinner" />Enviando...</> : 'Enviar código'}
              </button>
            </form>
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <button type="button" onClick={goToLogin}
                style={{ fontSize: '0.8rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ArrowLeft style={{ width: 13, height: 13 }} /> Volver al login
              </button>
            </div>
          </>
        )}

        {/* ── RESET paso OTP ── */}
        {mode === 'reset' && step === 'otp' && (
          <OtpBlock
            otpDigits={otpDigits} otpRefs={otpRefs} email={email} loading={loading} otpCode={otpCode}
            onSubmit={handleVerificarReset}
            onReenviar={reenviarCodigo}
            backLabel="Cambiar email" backAction={() => setStep('datos')}
            handleOtpKeyDown={handleOtpKeyDown} handleOtpChange={handleOtpChange} handleOtpPaste={handleOtpPaste}
          />
        )}

        {/* ── RESET nueva contraseña ── */}
        {mode === 'reset' && step === 'nueva' && (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem', textAlign: 'center' }}>Nueva contraseña</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.75rem', textAlign: 'center' }}>Ingresá tu nueva contraseña</p>
            <form onSubmit={handleCambiarPassword}>
              <div className="form-group">
                <label className="form-label">Nueva contraseña</label>
                <div className="input-icon-wrap">
                  <span className="input-icon"><Lock size={15} /></span>
                  <input type={showNueva ? 'text' : 'password'} className="form-input" value={nuevaPassword} onChange={e => setNuevaPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} style={{ paddingRight: '2.5rem' }} />
                  <button type="button" className="input-icon-right" onClick={() => setShowNueva(!showNueva)}>
                    {showNueva ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? <><div className="spinner" />Guardando...</> : 'Cambiar contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default TiendaLoginView;
