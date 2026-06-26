import React, { useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { TiendaAuthContext, TiendaContext } from '../index';
import TiendaLoginView from './TiendaLoginView';

const TiendaLogin = () => {
  const { empresa_id, tiendaLogin } = useContext(TiendaAuthContext);
  const { config, apiBase, sucursales } = useContext(TiendaContext);
  const navigate = useNavigate();

  const [mode, setMode] = useState('login');   // 'login' | 'register' | 'reset'
  const [step, setStep] = useState('datos');   // 'datos' | 'otp' | 'nueva'

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sucursalId, setSucursalId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [showNueva, setShowNueva] = useState(false);

  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const otpRefs = [useRef(), useRef(), useRef(), useRef()];

  const [loading, setLoading] = useState(false);

  const otpCode = otpDigits.join('');

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${apiBase}/auth/login`, { email, password });
      tiendaLogin(data.customer, data.access_token);
      toast.success(`¡Bienvenido, ${data.customer.nombre}!`);
      navigate(`/tienda/${empresa_id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Email o contraseña incorrectos');
    } finally { setLoading(false); }
  };

  const handleEnviarOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${apiBase}/auth/otp/enviar`, { email });
      setStep('otp');
      toast.success('Código enviado a tu correo');
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al enviar el código');
    } finally { setLoading(false); }
  };

  const normalizarTelefono = (tel) => {
    // El prefijo +54 ya está fijo en la UI — tel es solo la parte local (ej: "381 5123456")
    const digits = tel.replace(/\D/g, '');
    // Si el usuario igual puso 54 o 549 adelante, los quitamos para no duplicar
    const local = digits.startsWith('549') ? digits.slice(3)
                : digits.startsWith('54')  ? digits.slice(2)
                : digits.startsWith('9')   ? digits.slice(1)
                : digits;
    return `549${local}`;  // +54 9 (área sin 0)(número sin 15)
  };

  const handleVerificarYRegistrar = async (e) => {
    e.preventDefault();
    if (otpCode.length < 4) { toast.error('Ingresá los 4 dígitos del código'); return; }
    const telefonoNorm = telefono.trim() ? normalizarTelefono(telefono) : '';
    if (telefono.trim() && telefonoNorm.length < 11) {
      toast.error('El teléfono no parece válido. Ej: 381 5123456 (sin el 0 y sin el 15)');
      return;
    }
    setLoading(true);
    try {
      const { data: otpData } = await axios.post(`${apiBase}/auth/otp/verificar`, { email, codigo: otpCode });
      const { data } = await axios.post(`${apiBase}/auth/register`, {
        nombre, email, telefono: telefonoNorm, password, otp_token: otpData.verificacion_token,
        sucursal_id: sucursalId || undefined,
      });
      tiendaLogin(data.customer, data.access_token);
      toast.success(`¡Cuenta creada! Bienvenido, ${data.customer.nombre}.`);
      navigate(`/tienda/${empresa_id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al verificar o registrar');
    } finally { setLoading(false); }
  };

  const handleEnviarReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Reutilizamos el endpoint OTP para reset de contraseña
      await axios.post(`${apiBase}/auth/otp/enviar`, { email });
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
      const { data } = await axios.post(`${apiBase}/auth/otp/verificar`, { email, codigo: otpCode });
      setResetToken(data.verificacion_token);
      setStep('nueva');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Código inválido o expirado');
    } finally { setLoading(false); }
  };

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${apiBase}/auth/reset-password`, {
        email,
        otp_token: resetToken,
        nueva_password: nuevaPassword,
      });
      toast.success('Contraseña cambiada correctamente. Podés iniciar sesión.');
      goToLogin();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al cambiar la contraseña');
    } finally { setLoading(false); }
  };

  // ── OTP ───────────────────────────────────────────────────────────────────

  const handleOtpKeyDown = (i, e) => {
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const next = [...otpDigits]; next[i] = e.key; setOtpDigits(next);
      if (i < 3) otpRefs[i + 1].current?.focus();
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...otpDigits];
      if (next[i]) { next[i] = ''; setOtpDigits(next); }
      else if (i > 0) { next[i - 1] = ''; setOtpDigits(next); otpRefs[i - 1].current?.focus(); }
    }
  };
  const handleOtpChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    if (!digit) return;
    const next = [...otpDigits]; next[i] = digit; setOtpDigits(next);
    if (i < 3) otpRefs[i + 1].current?.focus();
  };
  const handleOtpPaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (p.length === 4) { setOtpDigits(p.split('')); otpRefs[3].current?.focus(); }
    e.preventDefault();
  };
  const reenviarCodigo = async () => {
    setLoading(true);
    try {
      await axios.post(`${apiBase}/auth/otp/enviar`, { email });
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
    setEmail(''); setPassword(''); setNombre(''); setTelefono(''); setSucursalId('');
    setOtpDigits(['', '', '', '']); setResetToken(''); setNuevaPassword('');
    setShowPassword(false); setShowNueva(false);
  };

  return (
    <TiendaLoginView
      config={config}
      sucursales={sucursales}
      mode={mode} step={step}
      nombre={nombre} setNombre={setNombre}
      telefono={telefono} setTelefono={setTelefono}
      email={email} setEmail={setEmail}
      password={password} setPassword={setPassword}
      showPassword={showPassword} setShowPassword={setShowPassword}
      nuevaPassword={nuevaPassword} setNuevaPassword={setNuevaPassword}
      showNueva={showNueva} setShowNueva={setShowNueva}
      sucursalId={sucursalId} setSucursalId={setSucursalId}
      otpDigits={otpDigits} otpRefs={otpRefs} otpCode={otpCode}
      loading={loading}
      handleLogin={handleLogin}
      handleEnviarOtp={handleEnviarOtp}
      handleVerificarYRegistrar={handleVerificarYRegistrar}
      handleEnviarReset={handleEnviarReset}
      handleVerificarReset={handleVerificarReset}
      handleCambiarPassword={handleCambiarPassword}
      handleOtpKeyDown={handleOtpKeyDown}
      handleOtpChange={handleOtpChange}
      handleOtpPaste={handleOtpPaste}
      reenviarCodigo={reenviarCodigo}
      goToLogin={goToLogin}
      setMode={setMode} setStep={setStep}
      setOtpDigits={setOtpDigits}
      onVolverTienda={() => navigate(`/tienda/${empresa_id}`)}
    />
  );
};

export default TiendaLogin;
