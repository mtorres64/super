import React, { useState, useContext, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext, API } from '../../App';
import { toast } from 'sonner';
import LoginView from './LoginView';

const FEATURES = [
  { text: 'Punto de venta con escáner' },
  { text: 'Inventario y alertas de stock' },
  { text: 'Reportes y exportación Excel' },
  { text: 'Multi-sucursal y multi-usuario' },
];

const Login = () => {
  const location = useLocation();
  const initialMode = location.state?.mode === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState('datos');

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [adminNombre, setAdminNombre]   = useState('');

  const [otpDigits, setOtpDigits]       = useState(['', '', '', '']);
  const [resetToken, setResetToken]     = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [showNueva, setShowNueva]       = useState(false);

  const [loading, setLoading]           = useState(false);
  const { user, login }                 = useContext(AuthContext);
  const otpRefs                         = [useRef(), useRef(), useRef(), useRef()];

  if (user) return <Navigate to="/dashboard" />;

  const otpCode = otpDigits.join('');

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/login`, { email, password });
      login(data.user, data.access_token);
      toast.success(`¡Bienvenido, ${data.user.nombre}!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al iniciar sesión');
    } finally { setLoading(false); }
  };

  const handleEnviarOtpRegistro = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/otp/enviar`, { email });
      setStep('otp');
      toast.success('Código enviado a tu correo');
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al enviar el código');
    } finally { setLoading(false); }
  };

  const handleVerificarYRegistrar = async (e) => {
    e.preventDefault();
    if (otpCode.length < 4) { toast.error('Ingresá los 4 dígitos del código'); return; }
    setLoading(true);
    try {
      const { data: otpData } = await axios.post(`${API}/auth/otp/verificar`, { email, codigo: otpCode });
      const { data } = await axios.post(`${API}/auth/empresa/register`, {
        empresa_nombre: empresaNombre, admin_nombre: adminNombre,
        admin_email: email, admin_password: password, otp_token: otpData.verificacion_token,
      });
      login(data.user, data.access_token);
      toast.success(`¡Empresa "${empresaNombre}" registrada! Bienvenido, ${data.user.nombre}.`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al verificar o registrar');
    } finally { setLoading(false); }
  };

  const handleEnviarReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/password-reset/enviar`, { email });
      setStep('otp');
      toast.success('Si el correo está registrado, recibirás un código');
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al enviar el código');
    } finally { setLoading(false); }
  };

  const handleVerificarReset = async (e) => {
    e.preventDefault();
    if (otpCode.length < 4) { toast.error('Ingresá los 4 dígitos del código'); return; }
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/password-reset/verificar`, { email, codigo: otpCode });
      setResetToken(data.reset_token);
      setStep('nueva');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Código inválido o expirado');
    } finally { setLoading(false); }
  };

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/password-reset/cambiar`, { reset_token: resetToken, nueva_password: nuevaPassword });
      toast.success('Contraseña actualizada. Ya podés iniciar sesión.');
      goToLogin();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al cambiar la contraseña');
    } finally { setLoading(false); }
  };

  // ── OTP ───────────────────────────────────────────────────────────────────
  const handleOtpKeyDown = (i, e) => {
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const next = [...otpDigits];
      next[i] = e.key;
      setOtpDigits(next);
      if (i < 3) otpRefs[i + 1].current?.focus();
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...otpDigits];
      if (next[i]) {
        next[i] = '';
        setOtpDigits(next);
      } else if (i > 0) {
        next[i - 1] = '';
        setOtpDigits(next);
        otpRefs[i - 1].current?.focus();
      }
    }
  };
  // Fallback para teclado mobile (no siempre dispara onKeyDown)
  const handleOtpChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    if (!digit) return;
    const next = [...otpDigits];
    next[i] = digit;
    setOtpDigits(next);
    if (i < 3) otpRefs[i + 1].current?.focus();
  };
  const handleOtpPaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (p.length === 4) { setOtpDigits(p.split('')); otpRefs[3].current?.focus(); }
    e.preventDefault();
  };
  const reenviarCodigo = async (endpoint) => {
    setLoading(true);
    try {
      await axios.post(`${API}/${endpoint}`, { email });
      toast.success('Nuevo código enviado al correo');
      setOtpDigits(['', '', '', '']);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al reenviar');
    } finally { setLoading(false); }
  };

  // ── Nav ───────────────────────────────────────────────────────────────────
  const goToLogin = () => {
    setMode('login'); setStep('datos');
    setEmail(''); setPassword(''); setEmpresaNombre(''); setAdminNombre('');
    setOtpDigits(['', '', '', '']); setResetToken(''); setNuevaPassword('');
    setShowPassword(false); setShowNueva(false);
  };

  return (
    <LoginView
      mode={mode}
      step={step}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      empresaNombre={empresaNombre}
      setEmpresaNombre={setEmpresaNombre}
      adminNombre={adminNombre}
      setAdminNombre={setAdminNombre}
      otpDigits={otpDigits}
      otpRefs={otpRefs}
      otpCode={otpCode}
      nuevaPassword={nuevaPassword}
      setNuevaPassword={setNuevaPassword}
      showNueva={showNueva}
      setShowNueva={setShowNueva}
      loading={loading}
      features={FEATURES}
      handleLogin={handleLogin}
      handleEnviarOtpRegistro={handleEnviarOtpRegistro}
      handleVerificarYRegistrar={handleVerificarYRegistrar}
      handleEnviarReset={handleEnviarReset}
      handleVerificarReset={handleVerificarReset}
      handleCambiarPassword={handleCambiarPassword}
      handleOtpKeyDown={handleOtpKeyDown}
      handleOtpChange={handleOtpChange}
      handleOtpPaste={handleOtpPaste}
      reenviarCodigo={reenviarCodigo}
      goToLogin={goToLogin}
      setMode={setMode}
      setStep={setStep}
      setOtpDigits={setOtpDigits}
    />
  );
};

export default Login;
