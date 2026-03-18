import React, { useState, useContext, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext, API } from '../App';
import { toast } from 'sonner';
import { User, Lock, Building2, LogIn, UserPlus, Mail, ShieldCheck, ArrowLeft, Send } from 'lucide-react';
import PulsLogo from './PulsLogo';

const Login = () => {
  const location = useLocation();
  const initialMode = location.state?.mode === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [step, setStep] = useState('datos');      // 'datos' | 'otp'

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [adminNombre, setAdminNombre] = useState('');

  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);

  const [loading, setLoading] = useState(false);
  const { user, login } = useContext(AuthContext);
  const otpRefs = [useRef(), useRef(), useRef(), useRef()];

  if (user) return <Navigate to="/dashboard" />;

  const otpCode = otpDigits.join('');

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;
      login(userData, access_token);
      toast.success(`¡Bienvenido, ${userData.nombre}!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // ── Paso 1: enviar OTP al correo ───────────────────────────────────────────
  const handleEnviarOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/otp/enviar`, { email });
      setStep('otp');
      toast.success('Código enviado a tu correo');
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al enviar el código');
    } finally {
      setLoading(false);
    }
  };

  // ── Paso 2: verificar OTP y registrar ──────────────────────────────────────
  const handleVerificarYRegistrar = async (e) => {
    e.preventDefault();
    if (otpCode.length < 4) {
      toast.error('Ingresá los 4 dígitos del código');
      return;
    }
    setLoading(true);
    try {
      const { data: otpData } = await axios.post(`${API}/auth/otp/verificar`, {
        email,
        codigo: otpCode,
      });
      const response = await axios.post(`${API}/auth/empresa/register`, {
        empresa_nombre: empresaNombre,
        admin_nombre: adminNombre,
        admin_email: email,
        admin_password: password,
        otp_token: otpData.verificacion_token,
      });
      const { access_token, user: userData } = response.data;
      login(userData, access_token);
      toast.success(`¡Empresa "${empresaNombre}" registrada! Bienvenido, ${userData.nombre}.`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al verificar o registrar');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP digit handlers ─────────────────────────────────────────────────────
  const handleOtpDigit = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    if (value && index < 3) otpRefs[index + 1].current?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (paste.length === 4) {
      setOtpDigits(paste.split(''));
      otpRefs[3].current?.focus();
    }
    e.preventDefault();
  };

  const reenviarCodigo = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/auth/otp/enviar`, { email });
      toast.success('Nuevo código enviado al correo');
      setOtpDigits(['', '', '', '']);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al reenviar el código');
    } finally {
      setLoading(false);
    }
  };

  // ── Switch mode ───────────────────────────────────────────────────────────
  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setStep('datos');
    setEmail('');
    setPassword('');
    setEmpresaNombre('');
    setAdminNombre('');
    setOtpDigits(['', '', '', '']);
  };

  const GREEN = {
    '--primary':        '#10b981',
    '--primary-dark':   '#059669',
    '--primary-darker': '#047857',
    '--primary-light':  'rgba(16, 185, 129, 0.1)',
    '--primary-bg':     '#ecfdf5',
    '--primary-text':   'white',
  };

  return (
    <div className="login-container" style={GREEN}>
      <div className="login-card fade-in">
        <div className="login-header">
          <div className="mb-4">
            <PulsLogo variant="text" fullWidth />
          </div>
          {mode === 'register' && (
            <p className="login-subtitle">
              {step === 'datos' ? 'Registrar mi empresa' : 'Verificar correo'}
            </p>
          )}
        </div>

        {/* ── LOGIN ────────────────────────────────────────────────────────── */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">
                <User className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                <Lock className="w-4 h-4 inline mr-2" />
                Contraseña
              </label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
              {loading ? <><div className="spinner" />Iniciando sesión...</> : <><LogIn className="w-4 h-4 inline mr-2" />Iniciar Sesión</>}
            </button>
          </form>
        )}

        {/* ── REGISTRO PASO 1: datos ────────────────────────────────────────── */}
        {mode === 'register' && step === 'datos' && (
          <form onSubmit={handleEnviarOtp}>
            <div className="form-group">
              <label className="form-label">
                <Building2 className="w-4 h-4 inline mr-2" />
                Nombre de la empresa
              </label>
              <input type="text" className="form-input" value={empresaNombre}
                onChange={(e) => setEmpresaNombre(e.target.value)}
                placeholder="Mi Supermercado S.A." required />
            </div>
            <div className="form-group">
              <label className="form-label">
                <User className="w-4 h-4 inline mr-2" />
                Tu nombre (administrador)
              </label>
              <input type="text" className="form-input" value={adminNombre}
                onChange={(e) => setAdminNombre(e.target.value)}
                placeholder="Juan Pérez" required />
            </div>
            <div className="form-group">
              <label className="form-label">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input type="email" className="form-input" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@miempresa.com" required />
            </div>
            <div className="form-group">
              <label className="form-label">
                <Lock className="w-4 h-4 inline mr-2" />
                Contraseña
              </label>
              <input type="password" className="form-input" value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required />
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Se creará una cuenta de administrador. Podrás agregar usuarios desde el sistema.
            </p>
            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
              {loading
                ? <><div className="spinner" />Enviando código...</>
                : <><Send className="w-4 h-4 inline mr-2" />Enviar código de verificación</>}
            </button>
          </form>
        )}

        {/* ── REGISTRO PASO 2: OTP ──────────────────────────────────────────── */}
        {mode === 'register' && step === 'otp' && (
          <form onSubmit={handleVerificarYRegistrar}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--primary-light)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
              }}>
                <ShieldCheck style={{ width: 28, height: 28, color: '#10b981' }} />
              </div>
              <p style={{ color: '#374151', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Enviamos un código de 4 dígitos a
              </p>
              <p style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem' }}>{email}</p>
              <p style={{ color: '#9ca3af', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                Revisá también la carpeta de spam.
              </p>
            </div>

            {/* 4 cajas de dígitos */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={otpRefs[i]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigit(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  style={{
                    width: 56, height: 64,
                    textAlign: 'center',
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    border: `2px solid ${digit ? '#10b981' : '#d1d5db'}`,
                    borderRadius: 12,
                    outline: 'none',
                    color: '#111827',
                    background: digit ? '#ecfdf5' : 'white',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                />
              ))}
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full"
              disabled={loading || otpCode.length < 4}>
              {loading
                ? <><div className="spinner" />Verificando...</>
                : <><ShieldCheck className="w-4 h-4 inline mr-2" />Verificar y crear cuenta</>}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button type="button"
                onClick={() => { setStep('datos'); setOtpDigits(['', '', '', '']); }}
                style={{ fontSize: '0.8rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ArrowLeft style={{ width: 13, height: 13 }} /> Cambiar datos
              </button>
              <button type="button" onClick={reenviarCodigo} disabled={loading}
                style={{ fontSize: '0.8rem', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>
                Reenviar código
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 text-center">
          <button type="button" onClick={switchMode}
            className="text-sm text-green-600 hover:text-green-800 underline">
            {mode === 'login'
              ? '¿Eres nuevo? Registra tu empresa'
              : '¿Ya tienes cuenta? Iniciar sesión'}
          </button>
        </div>

        {mode === 'login' && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-sm text-gray-700 mb-2">Usuarios de prueba:</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Admin:</strong> admin@supermarket.com / admin123</p>
              <p><strong>Cajero:</strong> cajero@supermarket.com / cajero123</p>
              <p><strong>Supervisor:</strong> supervisor@supermarket.com / super123</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
