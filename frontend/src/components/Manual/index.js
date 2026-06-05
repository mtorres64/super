import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import { Download, BookOpen, ArrowLeft, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const SECTIONS = [
  { id: 'intro',         num: '1',  title: '¿Qué es PULS Market?',       roles: ['admin','supervisor','cajero'], group: 'Introducción' },
  { id: 'registro',      num: '2',  title: 'Registro de empresa',         roles: ['admin'],                      group: 'Acceso al sistema' },
  { id: 'login',         num: '3',  title: 'Inicio de sesión',            roles: ['admin','supervisor','cajero'], group: 'Acceso al sistema' },
  { id: 'interfaz',      num: '4',  title: 'Interfaz principal',          roles: ['admin','supervisor','cajero'], group: 'Acceso al sistema' },
  { id: 'dashboard',     num: '5',  title: 'Dashboard',                   roles: ['admin','supervisor','cajero'], group: 'Operación diaria' },
  { id: 'caja',          num: '6',  title: 'Gestión de Caja',             roles: ['admin','supervisor','cajero'], group: 'Operación diaria' },
  { id: 'pos',           num: '7',  title: 'Punto de Venta',              roles: ['admin','supervisor','cajero'], group: 'Operación diaria' },
  { id: 'devoluciones',  num: '8',  title: 'Devoluciones',                roles: ['admin','supervisor','cajero'], group: 'Operación diaria' },
  { id: 'productos',     num: '9',  title: 'Productos e Inventario',      roles: ['admin'],                      group: 'Administración' },
  { id: 'categorias',    num: '10', title: 'Categorías',                  roles: ['admin'],                      group: 'Administración' },
  { id: 'sucursales',    num: '11', title: 'Sucursales',                  roles: ['admin'],                      group: 'Administración' },
  { id: 'compras',       num: '12', title: 'Compras y Proveedores',       roles: ['admin','supervisor'],          group: 'Administración' },
  { id: 'usuarios',      num: '13', title: 'Usuarios',                    roles: ['admin'],                      group: 'Administración' },
  { id: 'reportes',      num: '14', title: 'Reportes de Ventas',          roles: ['admin','supervisor'],          group: 'Reportes y Alertas' },
  { id: 'stock',         num: '15', title: 'Alertas de Stock',            roles: ['admin','supervisor','cajero'], group: 'Reportes y Alertas' },
  { id: 'notificaciones',num: '16', title: 'Notificaciones',              roles: ['admin'],                      group: 'Reportes y Alertas' },
  { id: 'configuracion', num: '17', title: 'Configuración',               roles: ['admin'],                      group: 'Cuenta' },
  { id: 'cuenta',        num: '18', title: 'Cuenta y Suscripción',        roles: ['admin'],                      group: 'Cuenta' },
  { id: 'roles',         num: 'A',  title: 'Roles y Permisos',            roles: ['admin','supervisor','cajero'], group: 'Apéndices' },
  { id: 'planes',        num: 'B',  title: 'Planes de Suscripción',       roles: ['admin'],                      group: 'Apéndices' },
];

const MANUAL_STYLES = `
  .m-sec-badge { background: var(--primary); color: var(--primary-text, white); font-size: 0.7rem; font-weight: 700; padding: 0.1rem 0.45rem; border-radius: 0.25rem; }
  .m-step-num  { background: var(--primary); color: var(--primary-text, white); }
  .m-th        { background: var(--primary-bg); color: var(--primary-darker); border-bottom: 2px solid var(--primary-light); }
  .m-nav-active{ border-left-color: var(--primary) !important; background: var(--primary-bg); color: var(--primary); font-weight: 600; }
  .m-nav-link  { border-left: 2px solid transparent; }
  .m-nav-link:hover { background: #f9fafb; }
  .m-icon-p    { color: var(--primary); }
  .m-sec-border{ border-bottom: 2px solid var(--primary-light); }
  .m-note-tip   { background: var(--primary-bg); border-left: 4px solid var(--primary); }
  .m-note-warn  { background: #fffbeb; border-left: 4px solid #f59e0b; color: #78350f; }
  .m-note-danger{ background: #fff1f2; border-left: 4px solid #f43f5e; color: #9f1239; }
  .m-screenshot { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 0.75rem; padding: 1.25rem; margin: 1rem 0; text-align: center; }
  .m-role-block { border-radius: 0.5rem; padding: 0.75rem 1rem; margin: 0.75rem 0; font-size: 0.85rem; }
  .m-role-admin { background: #faf5ff; border-left: 3px solid #9333ea; }
  .m-role-supervisor { background: #eff6ff; border-left: 3px solid #3b82f6; }
  .m-role-cajero { background: #f0fdf4; border-left: 3px solid #22c55e; }
  .m-subsection { margin-top: 1.5rem; margin-bottom: 0.5rem; padding-bottom: 0.375rem; border-bottom: 1px solid #e5e7eb; }
`;

const RoleBadge = ({ rol }) => {
  const styles = {
    admin:      'bg-purple-100 text-purple-800',
    supervisor: 'bg-blue-100 text-blue-800',
    cajero:     'bg-green-100 text-green-800',
  };
  const labels = { admin: 'Administrador', supervisor: 'Supervisor', cajero: 'Cajero' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${styles[rol]}`}>
      {labels[rol]}
    </span>
  );
};

const Screenshot = ({ title, desc, src }) => (
  src ? (
    <figure className="my-5">
      <img src={src} alt={title} className="w-full rounded-xl border border-gray-200 shadow-sm" />
      {title && <figcaption className="text-xs text-gray-400 text-center mt-1">{title}</figcaption>}
    </figure>
  ) : (
    <div className="m-screenshot">
      <div className="text-3xl mb-2">📸</div>
      <p className="font-semibold text-gray-600 text-sm mb-1">{title}</p>
      {desc && <p className="text-xs text-gray-400 mx-auto">{desc}</p>}
    </div>
  )
);

const Note = ({ children, type = 'tip' }) => (
  <div className={`m-note-${type} rounded-r-lg px-4 py-3 my-4 text-sm`}>{children}</div>
);

const Steps = ({ items }) => (
  <ol className="my-4 space-y-3">
    {items.map((item, i) => (
      <li key={i} className="flex gap-3 items-start">
        <span className="m-step-num flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5">
          {i + 1}
        </span>
        <span className="text-gray-600 text-sm leading-relaxed">{item}</span>
      </li>
    ))}
  </ol>
);

const DataTable = ({ headers, rows }) => (
  <div className="overflow-x-auto my-4">
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr>{headers.map((h, i) => <th key={i} className="m-th text-left px-3 py-2 font-semibold">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
            {row.map((cell, j) => <td key={j} className="px-3 py-2 text-gray-600">{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Bloque de contenido específico para un rol
const ForRole = ({ rol, only, children }) => {
  if (!only.includes(rol)) return null;
  const styles = { admin: 'm-role-admin', supervisor: 'm-role-supervisor', cajero: 'm-role-cajero' };
  const labels = { admin: '👑 Para Administradores', supervisor: '🔵 Para Supervisores', cajero: '🟢 Para Cajeros' };
  const uniqueStyle = only.length === 1 ? styles[only[0]] : 'bg-gray-50 border-l-4 border-gray-300';
  const label = only.length === 1 ? labels[only[0]] : '📋 ' + only.map(r => ({ admin: 'Administradores', supervisor: 'Supervisores', cajero: 'Cajeros' }[r])).join(' y ');
  return (
    <div className={`m-role-block ${uniqueStyle}`}>
      <div className="text-xs font-bold mb-1.5 text-gray-500 uppercase tracking-wide">{label}</div>
      {children}
    </div>
  );
};

const H3 = ({ children }) => (
  <h3 className="m-subsection font-semibold text-gray-800 text-base">{children}</h3>
);

// ── Contenido de cada sección ──────────────────────────────────────────
const SectionContent = ({ id, rol }) => {
  switch (id) {

    case 'intro':
      return (
        <div>
          <p className="text-gray-600 mb-4">
            <strong>PULS Market</strong> es un sistema de Punto de Venta (POS) en la nube para supermercados y
            comercios minoristas. Funciona desde cualquier dispositivo con internet — computadora, tablet o
            celular — sin necesidad de instalar ningún programa. Todos los datos se guardan en la nube y
            están disponibles en tiempo real.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 my-4">
            {[
              { icon: '🛒', title: 'Punto de Venta', desc: 'Ventas rápidas con escáner de código de barras y múltiples métodos de pago.' },
              { icon: '📦', title: 'Inventario en tiempo real', desc: 'Control de stock por sucursal con alertas automáticas cuando baja el mínimo.' },
              { icon: '💰', title: 'Gestión de Caja', desc: 'Apertura, cierre y arqueo con historial completo de movimientos y diferencias.' },
              { icon: '🏢', title: 'Multi-Sucursal', desc: 'Múltiples locales con precios e inventarios independientes (plan Empresarial).' },
              { icon: '📊', title: 'Reportes', desc: 'Estadísticas de ventas por período, cajero o sucursal, exportables a Excel.' },
              { icon: '👥', title: 'Roles y Usuarios', desc: 'Administrador, Supervisor y Cajero con permisos y vistas diferenciadas.' },
            ].map((f, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="font-semibold text-gray-800 text-sm mb-1">{f.title}</div>
                <div className="text-xs text-gray-500">{f.desc}</div>
              </div>
            ))}
          </div>

          <H3>Estructura de roles</H3>
          <DataTable
            headers={['Rol', 'Quién lo usa', 'Qué puede hacer']}
            rows={[
              [<RoleBadge rol="admin" />, 'Dueño o encargado general del negocio', 'Acceso completo: configurar la empresa, usuarios, productos, reportes y suscripción.'],
              [<RoleBadge rol="supervisor" />, 'Encargado de turno o gerente de sucursal', 'Caja, POS, devoluciones, compras, reportes de su sucursal.'],
              [<RoleBadge rol="cajero" />, 'Personal de atención al cliente', 'Caja propia, POS y devoluciones. No puede ver reportes ni configurar nada.'],
            ]}
          />

          <ForRole rol={rol} only={['admin']}>
            <p className="text-gray-700 text-sm font-medium mb-1">Primeros pasos recomendados para el Administrador:</p>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Configurar el logo y color de la empresa en <strong>Configuración → Apariencia</strong>.</li>
              <li>Crear las categorías de productos (sección 10).</li>
              <li>Cargar el catálogo de productos o importar desde Excel (sección 9).</li>
              <li>Crear los usuarios del equipo y asignarles rol y sucursal (sección 13).</li>
              <li>Configurar el stock mínimo de cada producto para activar alertas (sección 15).</li>
            </ol>
          </ForRole>

          <ForRole rol={rol} only={['supervisor']}>
            <p className="text-gray-700 text-sm font-medium mb-1">Flujo de trabajo típico del Supervisor:</p>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Al iniciar el turno: verificar el Dashboard para ver el estado del día.</li>
              <li>Abrir la caja con el fondo inicial del turno.</li>
              <li>Durante el día: supervisar cajas, registrar compras a proveedores.</li>
              <li>Al cerrar: revisar el reporte de ventas y cerrar la caja.</li>
            </ol>
          </ForRole>

          <ForRole rol={rol} only={['cajero']}>
            <p className="text-gray-700 text-sm font-medium mb-1">Flujo de trabajo típico del Cajero:</p>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Al iniciar: abrir tu sesión de caja con el monto inicial.</li>
              <li>Durante el día: realizar ventas en el Punto de Venta.</li>
              <li>Si hay devolución: procesarla desde el historial de ventas.</li>
              <li>Al terminar el turno: cerrar tu sesión de caja ingresando el monto contado.</li>
            </ol>
          </ForRole>
        </div>
      );

    case 'registro':
      return (
        <div>
          <p className="text-gray-600 mb-4">
            El registro se hace una sola vez y crea la cuenta principal con rol de Administrador.
            Incluye <strong>15 días de prueba gratuita</strong> con acceso completo al plan Empresarial.
            No se requiere tarjeta de crédito para empezar.
          </p>

          <H3>Paso a paso: crear la cuenta</H3>
          <Steps items={[
            'Abrí el sistema en tu navegador. Verás la pantalla de bienvenida con dos opciones: "Ingresar" y "Registrar empresa". Hacé clic en "Registrar empresa".',
            'Se abre el formulario de registro. Completá los siguientes campos: Nombre de la empresa (como aparecerá en los tickets), tu nombre y apellido, tu correo electrónico (será tu usuario de acceso), y una contraseña segura (mínimo 6 caracteres).',
            'Revisá que todos los datos sean correctos y hacé clic en "Crear cuenta". El sistema envía un código OTP de 6 dígitos a tu correo.',
            'Abrí tu correo electrónico. El mensaje llega desde PULS Market con el asunto "Verificación de cuenta". Si no lo ves en bandeja de entrada, revisá la carpeta de spam o correo no deseado.',
            'Volvé al sistema. Verás una pantalla con un campo para ingresar el código de 6 dígitos. Copiá el código del correo y escribilo exactamente como aparece.',
            'Hacé clic en "Verificar". Si el código es correcto, el sistema te redirige directamente al panel de administración. ¡Ya podés empezar a usar PULS Market!',
          ]} />

          <Screenshot title="Formulario de Registro" src="/manual/registro.png" />

          <Note type="warn">
            ⚠️ <strong>El código OTP vence en 10 minutos.</strong> Si expiró, hacé clic en "Reenviar código" para recibir uno nuevo. Cada vez que reenvíes, el código anterior queda inválido.
          </Note>

          <H3>Recuperar contraseña olvidada</H3>
          <Steps items={[
            'En la pantalla de inicio de sesión, hacé clic en el enlace "¿Olvidaste tu contraseña?" que aparece debajo del formulario.',
            'Ingresá el correo electrónico con el que te registraste y hacé clic en "Enviar enlace".',
            'Revisá tu correo. Recibirás un mensaje con un botón o enlace "Restablecer contraseña". El enlace es válido por 30 minutos.',
            'Hacé clic en el enlace del correo. Se abre una pantalla donde podés escribir tu nueva contraseña.',
            'Ingresá la nueva contraseña dos veces para confirmar y hacé clic en "Guardar contraseña".',
            'El sistema te redirige a la pantalla de login. Podés ingresar con tu nueva contraseña.',
          ]} />

          <Note>
            💡 <strong>Consejo de seguridad:</strong> Usá una contraseña que no uses en otros servicios. Combiná letras mayúsculas, minúsculas y números.
          </Note>
        </div>
      );

    case 'login':
      return (
        <div>
          <p className="text-gray-600 mb-4">
            Todos los usuarios — Administrador, Supervisor y Cajero — acceden por la misma pantalla de inicio de sesión.
            El sistema detecta automáticamente el rol y redirige a la vista correspondiente.
          </p>

          <H3>Cómo ingresar al sistema</H3>
          <Steps items={[
            'Abrí el sistema en tu navegador. Verás el logo de PULS Market y el formulario de acceso.',
            'Ingresá tu correo electrónico en el primer campo y tu contraseña en el segundo.',
            'Hacé clic en "Ingresar". El sistema verifica tus credenciales.',
            'Si los datos son correctos, serás redirigido al panel principal. El sistema muestra tu nombre y rol en la barra lateral izquierda.',
          ]} />

          <Screenshot title="Pantalla de Inicio de Sesión" src="/manual/login.png" />

          <ForRole rol={rol} only={['admin']}>
            <p className="text-sm text-gray-700">Al ingresar como <strong>Administrador</strong> serás redirigido al <strong>Dashboard</strong> con el resumen del negocio y acceso a todos los módulos en el menú lateral.</p>
          </ForRole>

          <ForRole rol={rol} only={['supervisor']}>
            <p className="text-sm text-gray-700">Al ingresar como <strong>Supervisor</strong> serás redirigido al <strong>Dashboard</strong>. Verás los módulos Caja, POS, Compras, Reportes y Alertas en el menú. Los módulos de configuración y administración de usuarios no aparecen.</p>
          </ForRole>

          <ForRole rol={rol} only={['cajero']}>
            <p className="text-sm text-gray-700">Al ingresar como <strong>Cajero</strong> serás redirigido al <strong>Dashboard</strong>. El menú muestra solo: Caja, Punto de Venta y Alertas de Stock. Si no ves alguna de estas opciones, consultá al Administrador para verificar que tu usuario esté activo y con el rol correcto.</p>
          </ForRole>

          <H3>Cómo cerrar sesión</H3>
          <Steps items={[
            'Buscá tu nombre en la parte inferior del menú lateral izquierdo.',
            'Hacé clic sobre tu nombre o en el ícono de salida que aparece al lado.',
            'El sistema cierra tu sesión y vuelve a la pantalla de inicio de sesión.',
          ]} />

          <Note>
            💡 <strong>Duración de sesión:</strong> La sesión se mantiene activa durante 8 horas. Después de ese tiempo, el sistema te pedirá que ingreses nuevamente por seguridad. Si compartís una computadora con otros usuarios, cerrá siempre tu sesión al terminar.
          </Note>

          <H3>Problemas frecuentes al ingresar</H3>
          <DataTable
            headers={['Problema', 'Posible causa', 'Solución']}
            rows={[
              ['"Email o contraseña incorrectos"', 'Datos escritos con error o cuenta inexistente', 'Verificá mayúsculas/minúsculas. Si olvidaste la contraseña, usá "¿Olvidaste tu contraseña?".'],
              ['"Tu cuenta está inactiva"', 'El Administrador desactivó tu usuario', 'Contactá al Administrador para reactivar tu cuenta.'],
              ['"Suscripción vencida"', 'El plan del negocio venció', 'Solo el Administrador puede renovar la suscripción desde la sección Cuenta.'],
              ['La página no carga', 'Problema de conexión a internet', 'Verificá tu conexión. El sistema requiere internet para funcionar.'],
            ]}
          />
        </div>
      );

    case 'interfaz':
      return (
        <div>
          <p className="text-gray-600 mb-4">
            Una vez dentro del sistema, verás tres áreas principales: el <strong>menú lateral</strong> (navegación),
            la <strong>barra superior</strong> (contexto y acciones rápidas) y el <strong>área central</strong> donde
            se muestra el contenido de cada módulo.
          </p>

          <Screenshot title="Vista General del Sistema" src="/manual/dashboard.png" />

          <H3>Menú lateral</H3>
          <p className="text-gray-600 text-sm mb-3">
            El menú lateral izquierdo es la navegación principal del sistema. Cada ícono corresponde a un módulo.
            Solo aparecen los módulos que tenés permitidos según tu rol.
          </p>

          <ForRole rol={rol} only={['admin']}>
            <DataTable
              headers={['Ícono / Nombre', 'Qué hace']}
              rows={[
                ['🏠 Dashboard', 'Resumen del negocio con métricas del día.'],
                ['💰 Caja', 'Abrir, cerrar y consultar movimientos de caja.'],
                ['🛒 Punto de Venta', 'Registrar ventas a clientes.'],
                ['📦 Productos', 'Gestionar catálogo e inventario.'],
                ['🏢 Sucursales', 'Administrar locales del negocio.'],
                ['🛍️ Compras', 'Registrar facturas de proveedores.'],
                ['👥 Usuarios', 'Crear y administrar cuentas de empleados.'],
                ['📊 Reportes', 'Ver estadísticas de ventas.'],
                ['🔔 Alertas de Stock', 'Ver productos con stock bajo o agotado.'],
                ['📬 Notificaciones', 'Mensajes del sistema.'],
                ['⚙️ Configuración', 'Logo, colores y ajustes de la empresa.'],
                ['💳 Cuenta', 'Ver y renovar la suscripción.'],
              ]}
            />
          </ForRole>

          <ForRole rol={rol} only={['supervisor']}>
            <DataTable
              headers={['Ícono / Nombre', 'Qué hace']}
              rows={[
                ['🏠 Dashboard', 'Resumen del día en tu sucursal.'],
                ['💰 Caja', 'Abrir, cerrar y revisar movimientos de caja.'],
                ['🛒 Punto de Venta', 'Registrar ventas a clientes.'],
                ['🛍️ Compras', 'Registrar facturas de proveedores.'],
                ['📊 Reportes', 'Ver estadísticas de ventas de tu sucursal.'],
                ['🔔 Alertas de Stock', 'Ver productos con stock bajo o agotado.'],
              ]}
            />
          </ForRole>

          <ForRole rol={rol} only={['cajero']}>
            <DataTable
              headers={['Ícono / Nombre', 'Qué hace']}
              rows={[
                ['🏠 Dashboard', 'Resumen básico del día.'],
                ['💰 Caja', 'Abrir y cerrar tu propia sesión de caja.'],
                ['🛒 Punto de Venta', 'Registrar ventas a clientes.'],
                ['🔔 Alertas de Stock', 'Ver productos con stock bajo (solo lectura).'],
              ]}
            />
            <p className="text-sm text-gray-500 mt-2">Si alguno de estos módulos no aparece en tu menú, consultá al Administrador ya que puede ser que tu usuario no esté correctamente configurado.</p>
          </ForRole>

          <H3>Barra superior</H3>
          <p className="text-gray-600 text-sm mb-2">
            La barra que aparece arriba en cada pantalla muestra el nombre del módulo activo y, dependiendo
            del módulo, botones de acción como "Nueva venta", "Exportar" o "Agregar".
          </p>

          <H3>Uso en dispositivos móviles</H3>
          <Note>
            💡 <strong>Responsive:</strong> En celulares y tablets pequeñas, el menú lateral se oculta automáticamente para aprovechar el espacio. Para abrirlo, tocá el botón ☰ (tres líneas) que aparece en la esquina superior izquierda. Para cerrarlo, tocá fuera del menú o el botón ✕.
          </Note>
        </div>
      );

    case 'dashboard':
      return (
        <div>
          <p className="text-gray-600 mb-4">
            El Dashboard es la primera pantalla que ves al ingresar. Muestra un resumen del estado del
            negocio en tiempo real para ayudarte a tomar decisiones rápidas al inicio de cada turno o día.
          </p>

          <Screenshot title="Dashboard Principal" src="/manual/dashboard2.png" />

          <H3>Tarjetas de resumen</H3>
          <DataTable
            headers={['Tarjeta', 'Qué muestra', 'Cómo interpretarla']}
            rows={[
              ['💵 Ventas de hoy', 'Suma total en pesos de las ventas del día.', 'Si es mucho menor a un día típico, puede indicar un problema en el POS o que todavía no se abrió caja.'],
              ['🔢 Transacciones', 'Cantidad de ventas realizadas hoy.', 'Compará con días anteriores para identificar picos o caídas en el flujo de clientes.'],
              ['📦 Productos activos', 'Total de productos que figuran como "Activo" en el inventario.', 'Solo los productos activos aparecen en el POS. Si falta un producto en la venta, verificá que esté activo.'],
              ['⚠️ Alertas de stock', 'Cantidad de productos con stock igual o menor al mínimo configurado.', 'Si este número es mayor a 0, es importante reponer esos productos. Hacé clic en la tarjeta para ver cuáles son.'],
            ]}
          />

          <ForRole rol={rol} only={['admin']}>
            <H3>Vista para Administrador</H3>
            <p className="text-sm text-gray-600 mb-2">
              Como Administrador, el Dashboard muestra datos consolidados de <strong>todas las sucursales</strong>.
              Si querés ver los datos de una sucursal específica, podés cambiar el filtro de sucursal en la
              parte superior del Dashboard (si tenés el plan Empresarial con múltiples sucursales).
            </p>
            <Note>💡 Si hay cajas abiertas de otros usuarios, el Dashboard las muestra. Esto te permite monitorear el estado operativo del negocio desde un solo lugar.</Note>
          </ForRole>

          <ForRole rol={rol} only={['supervisor']}>
            <H3>Vista para Supervisor</H3>
            <p className="text-sm text-gray-600">
              Tu Dashboard muestra los datos de <strong>tu sucursal asignada</strong>. Las ventas de hoy incluyen
              todas las ventas de todos los cajeros en tu sucursal. Usá esta vista para decidir si necesitás
              pedir reposición de productos o ajustar el personal durante el día.
            </p>
          </ForRole>

          <ForRole rol={rol} only={['cajero']}>
            <H3>Vista para Cajero</H3>
            <p className="text-sm text-gray-600">
              Tu Dashboard muestra el estado general del día. <strong>Antes de empezar a atender</strong>,
              verificá que la tarjeta "Alertas de stock" sea 0 o un número bajo. Si hay muchos productos
              sin stock, informá al supervisor para que gestione la reposición.
            </p>
          </ForRole>

          <Note type="warn">
            ⚠️ Los datos del Dashboard se actualizan automáticamente. Si ves números que parecen incorrectos,
            recargá la página (F5 en computadora, o deslizá hacia abajo en móvil) para obtener los últimos datos.
          </Note>
        </div>
      );

    case 'caja':
      return (
        <div>
          <Note type="danger">
            🚫 <strong>Requisito previo:</strong> Debe abrirse una sesión de caja antes de poder registrar
            cualquier venta. Si intentás vender sin una caja abierta, el sistema te avisará y no dejará
            completar la operación.
          </Note>

          <H3>Abrir sesión de caja</H3>
          <Steps items={[
            'En el menú lateral, hacé clic en "Gestión de Caja". Si ya hay una sesión abierta, verás el estado actual. Si no hay ninguna, verás el formulario de apertura.',
            'En el campo "Monto inicial", ingresá el dinero en efectivo que tenés disponible para dar vuelto al inicio del turno. Por ejemplo, si contás los billetes y tenés $5.000, ingresá 5000.',
            'Hacé clic en el botón "Abrir caja". El sistema registra la hora exacta de apertura y queda listo para recibir ventas.',
            'Verás el panel de caja con el estado "Abierta", la hora de apertura y el balance actual (que al principio muestra solo el monto inicial).',
          ]} />

          <Screenshot title="Apertura de Caja" src="/manual/abrir_caja.png" />

          <Note type="danger">
            🚫 <strong>Solo puede haber una sesión de caja abierta por usuario a la vez.</strong> Si intentás abrir una segunda caja sin cerrar la anterior, el sistema no lo permitirá.
          </Note>

          <ForRole rol={rol} only={['admin', 'supervisor']}>
            <H3>Registrar un retiro de caja</H3>
            <p className="text-sm text-gray-600 mb-2">
              Si necesitás sacar dinero de la caja durante el turno (por ejemplo, para pagar un gasto o llevar
              dinero a la caja fuerte), registralo como un "Retiro" para que quede en el historial.
            </p>
            <Steps items={[
              'Con la sesión de caja abierta, buscá el botón "Registrar movimiento" o "Retiro" en el panel de caja.',
              'Seleccioná el tipo "Retiro" e ingresá el monto retirado.',
              'Opcionalmente, escribí una descripción (por ejemplo: "Pago a proveedor" o "Depósito en banco").',
              'Confirmá el retiro. El saldo de la caja se actualiza automáticamente.',
            ]} />
          </ForRole>

          <H3>Cerrar sesión de caja</H3>
          <Steps items={[
            'Con la sesión abierta, hacé clic en el botón "Cerrar caja".',
            'Antes de confirmar, contá físicamente el dinero que tenés en la caja.',
            'Ingresá el monto real contado en el campo "Monto final contado".',
            'El sistema calcula automáticamente la diferencia: si es positiva, hay un sobrante; si es negativa, hay un faltante.',
            'Revisá el resumen de la sesión: total de ventas en efectivo, retiros, y diferencia.',
            'Hacé clic en "Confirmar cierre". Se genera el reporte de la sesión con todos los movimientos.',
          ]} />

          <Screenshot title="Cierre de Caja — Resumen" src="/manual/cerrar_caja.png" />

          <Note type="warn">
            ⚠️ <strong>Si hay diferencia:</strong> Una diferencia pequeña (pocos pesos) puede ser normal por el vuelto. Si la diferencia es grande, revisá los movimientos del día en el historial antes de cerrar para identificar el error.
          </Note>

          <H3>Historial de movimientos</H3>
          <p className="text-sm text-gray-600 mb-2">
            Dentro de la sección Caja podés ver todos los movimientos de la sesión actual ordenados por hora.
          </p>
          <DataTable
            headers={['Tipo de movimiento', 'Descripción', 'Efecto en el saldo']}
            rows={[
              ['Apertura',   'Monto inicial ingresado al abrir la caja.',       '+ Suma al saldo'],
              ['Venta efectivo', 'Cada venta cobrada en efectivo.',             '+ Suma al saldo'],
              ['Retiro',     'Dinero sacado de la caja durante el turno.',       '− Resta al saldo'],
              ['Devolución', 'Reintegro de efectivo al cliente por devolución.', '− Resta al saldo'],
              ['Cierre',     'Registro del monto contado al cerrar.',            '— Solo registro'],
            ]}
          />
        </div>
      );

    case 'pos':
      return (
        <div>
          <Note type="danger">
            🚫 <strong>Requisito:</strong> Debe haber una sesión de caja abierta para poder realizar ventas.
            Si no abriste la caja, el POS te mostrará un aviso y no dejará procesar ningún pago.
          </Note>

          <Screenshot title="Pantalla Principal del POS" src="/manual/pos.png" />

          <p className="text-gray-600 text-sm mb-4">
            La pantalla del POS tiene dos partes: el <strong>buscador de productos</strong> (izquierda o arriba)
            y el <strong>carrito de la venta actual</strong> (derecha o abajo). El total se actualiza automáticamente
            a medida que agregás productos.
          </p>

          <H3>Agregar productos al carrito</H3>
          <DataTable
            headers={['Método', 'Cómo usarlo', 'Cuándo conviene']}
            rows={[
              ['Búsqueda por nombre', 'Escribí parte del nombre del producto en el buscador. Aparece una lista de resultados. Hacé clic en el producto para agregarlo al carrito.', 'Cuando no tenés el código de barras a mano o el producto no tiene etiqueta.'],
              ['Búsqueda por código', 'Escribí el código de barras exacto en el buscador. El sistema lo agrega directamente si es único.', 'Cuando conocés el código del producto.'],
              ['Escáner de cámara', 'Hacé clic en el ícono 📷 en el buscador. El sistema pide permiso para usar la cámara. Apuntá la cámara al código de barras del producto. Se agrega solo al detectarlo.', 'Para ventas rápidas en tienda.'],
            ]}
          />

          <Note type="warn">
            ⚠️ <strong>Permiso de cámara:</strong> La primera vez que usés el escáner, el navegador te pedirá permiso para acceder a la cámara. Hacé clic en "Permitir". Si lo rechazaste por error, podés cambiarlo desde la configuración de tu navegador (ícono de candado o cámara en la barra de direcciones).
          </Note>

          <H3>Gestionar el carrito</H3>
          <DataTable
            headers={['Acción', 'Cómo hacerlo']}
            rows={[
              ['Cambiar cantidad', 'Usá los botones − y + del ítem en el carrito, o hacé clic en el número y escribí la cantidad directamente. Presioná Enter para confirmar.'],
              ['Aplicar descuento por ítem', 'Ingresá el porcentaje en el campo "%" que aparece junto a cada producto en el carrito. El precio se recalcula al instante.'],
              ['Eliminar un producto', 'Hacé clic en el botón × (tache rojo) a la derecha del ítem.'],
              ['Vaciar todo el carrito', 'Hacé clic en el botón "Limpiar" o "Vaciar carrito" para eliminar todos los productos y empezar de cero.'],
            ]}
          />

          <H3>Procesar el pago</H3>
          <Steps items={[
            'Verificá que todos los productos y cantidades en el carrito sean correctos antes de cobrar.',
            'Seleccioná el método de pago: Efectivo, Tarjeta de débito/crédito, o Transferencia bancaria.',
            'Si el pago es en efectivo: ingresá el monto que te entrega el cliente en el campo "Recibido". El sistema calcula el vuelto automáticamente.',
            'Si el pago es con tarjeta o transferencia: no hace falta ingresar ningún monto extra. Simplemente seleccioná el método.',
            'Hacé clic en "Confirmar venta". El sistema descuenta el stock, registra el movimiento en caja (si es efectivo) y genera el número de comprobante (FAC-000001).',
            'Se muestra la pantalla de ticket con el resumen de la venta. Podés imprimir el ticket haciendo clic en "Imprimir" o guardarlo como PDF con "Descargar PDF".',
          ]} />

          <Note>
            💡 <strong>Vuelto automático:</strong> Al seleccionar pago en efectivo e ingresar el monto recibido,
            el campo "Vuelto" se actualiza en tiempo real. Si el monto recibido es menor al total, aparece
            en rojo indicando que falta dinero.
          </Note>

          <ForRole rol={rol} only={['admin', 'supervisor']}>
            <H3>Anular una venta reciente</H3>
            <p className="text-sm text-gray-600 mb-2">
              Si cometiste un error al registrar una venta, podés usar la función de Devoluciones (sección 8)
              para revertir total o parcialmente esa operación. El stock y la caja se ajustan automáticamente.
            </p>
          </ForRole>
        </div>
      );

    case 'devoluciones':
      return (
        <div>
          <p className="text-gray-600 mb-4">
            Las devoluciones permiten revertir una venta total o parcialmente. El sistema actualiza el stock
            y la caja automáticamente. Cada devolución genera un comprobante propio (DEV-000001).
          </p>

          <H3>Cómo procesar una devolución</H3>
          <Steps items={[
            'Andá al módulo de Punto de Venta y buscá la pestaña o sección "Historial de ventas".',
            'Buscá la venta original que necesitás devolver. Podés buscar por número de comprobante (FAC-XXXXXX), por fecha, o por producto.',
            'Hacé clic en el botón "Devolución" que aparece junto a esa venta.',
            'Se abre el modal de devolución con todos los ítems de la venta original. Seleccioná los productos a devolver activando su casilla.',
            'Para cada producto seleccionado, indicá la cantidad a devolver (puede ser menor a la cantidad original si es una devolución parcial).',
            'Revisá el resumen: monto total a reintegrar y productos afectados.',
            'Hacé clic en "Confirmar devolución". El sistema procesa todo automáticamente.',
          ]} />

          <Screenshot title="Modal de Devolución" src="/manual/devolucion.png" />

          <H3>Tipos de devolución</H3>
          <DataTable
            headers={['Tipo', 'Cuándo se usa', 'Estado final de la venta original']}
            rows={[
              ['Parcial', 'Se devuelven algunos productos pero no todos, o una cantidad menor.', 'Queda como "Devolución parcial".'],
              ['Total', 'Se devuelven todos los productos en su cantidad completa.', 'Queda como "Cancelada".'],
            ]}
          />

          <H3>Qué pasa después de una devolución</H3>
          <DataTable
            headers={['Qué se actualiza', 'Cómo']}
            rows={[
              ['Stock', 'Los productos devueltos vuelven al inventario automáticamente.'],
              ['Caja (efectivo)', 'Si la venta original fue en efectivo, el monto se descuenta del saldo de caja como un egreso.'],
              ['Caja (tarjeta/transferencia)', 'La devolución queda registrada, pero el reintegro al cliente debe hacerse manualmente por el medio que corresponda.'],
              ['Historial', 'La venta original queda marcada con el tipo de devolución y se crea el comprobante DEV-XXXXXX.'],
            ]}
          />

          <Note>
            💡 Una devolución no elimina la venta original — solo la modifica. Siempre podés ver el historial completo de la operación haciendo clic en el comprobante de devolución.
          </Note>

          <Note type="warn">
            ⚠️ <strong>Devoluciones en efectivo:</strong> Si la venta fue en efectivo y la caja ya fue cerrada, igual podés procesar la devolución, pero tenés que acordarte de ajustar el efectivo físico de forma manual.
          </Note>
        </div>
      );

    case 'productos':
      return (
        <div>
          <p className="text-gray-600 mb-4">
            El módulo de Productos es donde se gestiona todo el catálogo del negocio: crear, editar, desactivar
            productos y controlar el inventario. Solo el Administrador tiene acceso completo a este módulo.
          </p>

          <Screenshot title="Listado de Productos" src="/manual/productos.png" />

          <H3>Crear un nuevo producto</H3>
          <Steps items={[
            'Hacé clic en el botón "Nuevo producto" o "+ Agregar producto".',
            'Completá el formulario con los datos del producto. Los campos obligatorios están marcados con *.',
            'En "Código de barras": podés escribirlo manualmente o hacé clic en el ícono de cámara para escanearlo directamente. Si no tenés código, podés dejarlo vacío.',
            'En "Categoría": seleccioná una categoría existente del desplegable. Si no existe la categoría que necesitás, primero créala en la sección Categorías (sección 10) y luego volvé aquí.',
            'En "Stock inicial": ingresá la cantidad actual que tenés en el depósito o estantería. Este valor es el punto de partida del inventario.',
            'En "Stock mínimo": ingresá la cantidad a partir de la cual querés recibir una alerta de reposición. Por ejemplo, si querés saber cuando queden menos de 5 unidades, ingresá 5.',
            'Verificá todos los datos y hacé clic en "Guardar". El producto queda disponible de inmediato en el POS si su estado es "Activo".',
          ]} />

          <H3>Campos del formulario</H3>
          <DataTable
            headers={['Campo', 'Descripción', '¿Obligatorio?']}
            rows={[
              ['Nombre', 'Nombre tal como aparece en el POS y en los tickets de venta.', '✅ Sí'],
              ['Código de barras', 'EAN-13 u otro formato. Permite buscar y escanear en el POS.', 'No'],
              ['Categoría', 'Agrupa productos para facilitar la búsqueda. Debe existir previamente.', 'No'],
              ['Precio de venta', 'Precio unitario al público. Lo que paga el cliente.', '✅ Sí'],
              ['Precio de costo', 'Precio de compra al proveedor. Se usa para calcular el margen de ganancia.', 'No'],
              ['Stock inicial', 'Cantidad actual en inventario al momento de crear el producto.', '✅ Sí'],
              ['Stock mínimo', 'Umbral para generar alerta automática de reposición.', 'No'],
              ['Estado', '"Activo" significa que aparece en el POS. "Inactivo" lo oculta sin eliminarlo.', '✅ Sí'],
            ]}
          />

          <H3>Editar un producto existente</H3>
          <Steps items={[
            'En la lista de productos, buscá el producto por nombre o código.',
            'Hacé clic en el ícono de edición (lápiz) en la fila del producto.',
            'Modificá los campos que necesitás cambiar.',
            'Hacé clic en "Guardar cambios". Los cambios se aplican de inmediato en el POS.',
          ]} />

          <Note type="warn">
            ⚠️ <strong>Ajuste de inventario:</strong> Si necesitás corregir el stock (por ejemplo, después de un recuento físico), editá el producto y modificá el campo "Stock". El sistema registra el ajuste en el historial.
          </Note>

          <H3>Importación masiva desde Excel</H3>
          <Steps items={[
            'Hacé clic en "Importar Excel" en la parte superior de la lista de productos.',
            'Hacé clic en "Descargar plantilla" para obtener el archivo Excel con el formato correcto.',
            'Abrí la plantilla en Excel o Google Sheets. Cada fila es un producto. Respetá el formato de las columnas.',
            'Completá los datos de todos los productos. No modifiques los encabezados de las columnas.',
            'Guardá el archivo y volvé al sistema. Hacé clic en "Seleccionar archivo" y elegí tu Excel.',
            'El sistema muestra un resumen: cantidad de productos importados correctamente y los errores (filas con datos faltantes o inválidos).',
            'Revisá los errores si los hay, corregí el archivo y volvé a importar solo las filas con error.',
          ]} />

          <Note>
            💡 <strong>Exportar catálogo:</strong> Podés exportar todos tus productos actuales a Excel desde el botón "Exportar Excel". Útil para hacer backups o para editar muchos productos a la vez y reimportar.
          </Note>
        </div>
      );

    case 'categorias':
      return (
        <div>
          <p className="text-gray-600 mb-4">
            Las categorías organizan el catálogo para facilitar la búsqueda de productos en el POS y
            mejorar la claridad de los reportes. Por ejemplo: "Lácteos", "Bebidas", "Limpieza", etc.
          </p>

          <H3>Crear una categoría</H3>
          <Steps items={[
            'Dentro del módulo Productos, buscá la pestaña o sección "Categorías" en la parte superior.',
            'Hacé clic en "Nueva categoría".',
            'Ingresá el nombre de la categoría. Usá nombres claros y concisos (máximo 50 caracteres).',
            'Hacé clic en "Guardar". La categoría queda disponible de inmediato para asignar a productos.',
          ]} />

          <H3>Editar o eliminar una categoría</H3>
          <Steps items={[
            'En la lista de categorías, buscá la que querés modificar.',
            'Para editar: hacé clic en el ícono de lápiz, cambiá el nombre y guardá.',
            'Para eliminar: hacé clic en el ícono de basura. El sistema pedirá confirmación.',
          ]} />

          <Note type="warn">
            ⚠️ <strong>No se pueden eliminar categorías con productos asignados.</strong> Primero tenés que
            reasignar o desactivar todos los productos de esa categoría, y luego sí podés eliminarla.
          </Note>

          <H3>Buenas prácticas para organizar categorías</H3>
          <DataTable
            headers={['Recomendación', 'Por qué ayuda']}
            rows={[
              ['Usá categorías amplias', 'Si tenés pocas categorías pero bien definidas, es más fácil navegar en el POS.'],
              ['Evitá duplicados', 'No crees "Bebidas" y "Bebidas frías" por separado si no es necesario; generan confusión.'],
              ['Usá mayúscula inicial', 'Por consistencia visual en el POS y los reportes.'],
              ['Revisalas periódicamente', 'Si hay categorías sin productos, podés eliminarlas para mantener el sistema ordenado.'],
            ]}
          />
        </div>
      );

    case 'sucursales':
      return (
        <div>
          <p className="text-gray-600 mb-4">
            El módulo de Sucursales te permite gestionar múltiples locales, cada uno con su propio inventario,
            precios y usuarios asignados. Requiere el plan <strong>Empresarial</strong>.
          </p>

          <Note>
            💡 <strong>Plan requerido:</strong> El módulo Multi-Sucursal solo está disponible en el plan Empresarial.
            Con los planes Emprendedor y Profesional, operás con una sola sucursal por defecto.
          </Note>

          <H3>Crear una nueva sucursal</H3>
          <Steps items={[
            'Hacé clic en "Nueva sucursal".',
            'Completá los campos: Nombre del local (por ejemplo "Sucursal Centro"), Dirección completa, Teléfono de contacto.',
            'Definí el estado: "Activa" para que esté operativa, "Inactiva" si todavía no está en funcionamiento.',
            'Hacé clic en "Guardar". La sucursal queda disponible para asignar usuarios.',
          ]} />

          <Screenshot title="Listado de Sucursales" src="/manual/sucursales.png" />

          <H3>Asignar usuarios a una sucursal</H3>
          <Steps items={[
            'Una vez creada la sucursal, andá al módulo de Usuarios (sección 13).',
            'Creá o editá el usuario que querés asignar.',
            'En el campo "Sucursal", seleccioná la sucursal correspondiente del desplegable.',
            'Guardá el usuario. Desde ese momento, ese usuario solo verá los datos de su sucursal asignada.',
          ]} />

          <H3>Inventario por sucursal</H3>
          <p className="text-sm text-gray-600 mb-2">
            Cada sucursal maneja su propio stock. Cuando se realiza una venta en una sucursal, solo se
            descuenta el stock de esa sucursal. Las alertas de stock también son independientes por sucursal.
          </p>

          <Note type="warn">
            ⚠️ <strong>Transferencias entre sucursales:</strong> Si necesitás mover stock de una sucursal a otra,
            debés registrar una salida en la sucursal de origen y una entrada en la de destino. Consultar documentación
            de ajustes de inventario en la sección de Productos.
          </Note>
        </div>
      );

    case 'compras':
      return (
        <div>
          <p className="text-gray-600 mb-4">
            El módulo de Compras registra las facturas de proveedores. Al guardar una compra, el stock
            de los productos incluidos se actualiza automáticamente. Acceso: Administrador y Supervisor.
          </p>

          <H3>Gestionar proveedores</H3>
          <Steps items={[
            'En el módulo Compras, buscá la pestaña "Proveedores" y hacé clic en "Nuevo proveedor".',
            'Completá los datos: Nombre o razón social, CUIT o DNI, dirección, teléfono y correo electrónico.',
            'Hacé clic en "Guardar". El proveedor queda disponible al registrar nuevas compras.',
            'Para editar un proveedor existente, buscalo en la lista y hacé clic en el ícono de edición.',
          ]} />

          <H3>Registrar una compra</H3>
          <Steps items={[
            'Hacé clic en "Nueva compra".',
            'Seleccioná el proveedor del desplegable. Si no existe todavía, primero crealo en la sección Proveedores.',
            'Ingresá el número de factura del proveedor (tal como aparece en el comprobante físico) y la fecha de la factura.',
            'Agregá los ítems de la compra. Para cada ítem necesitás: el producto del sistema al que corresponde, la cantidad comprada y el precio unitario de costo.',
            'El sistema muestra el margen de ganancia en tiempo real al vincular el ítem con un producto existente (compara precio de costo con precio de venta).',
            'Si el producto no existe en el sistema todavía, primero crealo en el módulo Productos y luego volvé a la compra.',
            'Verificá el total de la factura y hacé clic en "Guardar compra". El stock de cada producto se incrementa automáticamente con las cantidades compradas.',
          ]} />

          <Note>
            💡 <strong>Margen de ganancia:</strong> Al vincular un ítem de compra con un producto existente, el sistema calcula automáticamente el margen basándose en el precio de costo de la compra y el precio de venta del producto. Usá esto para revisar si necesitás ajustar los precios de venta.
          </Note>

          <H3>Historial de compras</H3>
          <p className="text-sm text-gray-600 mb-2">
            Podés ver todas las compras registradas ordenadas por fecha. Cada compra muestra el proveedor,
            número de factura, fecha y monto total. Hacé clic en una compra para ver su detalle completo.
          </p>

          <ForRole rol={rol} only={['supervisor']}>
            <Note type="warn">
              ⚠️ Como Supervisor, podés registrar y ver las compras de tu sucursal asignada. Para ver compras de otras sucursales, necesitás que el Administrador te otorgue acceso.
            </Note>
          </ForRole>
        </div>
      );

    case 'usuarios':
      return (
        <div>
          <p className="text-gray-600 mb-4">
            El módulo de Usuarios permite al Administrador crear cuentas para el equipo, asignarles rol
            y sucursal, y gestionar su acceso al sistema.
          </p>

          <H3>Crear un nuevo usuario</H3>
          <Steps items={[
            'Hacé clic en "Nuevo usuario".',
            'Ingresá el nombre y apellido del empleado.',
            'Ingresá el correo electrónico del empleado. Este será su usuario de login. Debe ser único en el sistema.',
            'Asignale una contraseña inicial. Podés usar una contraseña temporal y pedirle al empleado que la cambie después.',
            'Seleccioná el rol: Supervisor (para encargados) o Cajero (para personal de ventas).',
            'Si tenés múltiples sucursales, seleccioná la sucursal donde trabajará este usuario.',
            'Asegurate que el estado sea "Activo".',
            'Hacé clic en "Guardar". El empleado ya puede ingresar al sistema con sus credenciales.',
          ]} />

          <H3>Campos del formulario de usuario</H3>
          <DataTable
            headers={['Campo', 'Descripción']}
            rows={[
              ['Nombre y apellido', 'Nombre completo del empleado. Aparece en reportes y en su perfil.'],
              ['Email', 'Correo electrónico del empleado. Será su nombre de usuario para ingresar.'],
              ['Contraseña', 'Contraseña inicial. Se recomienda que el empleado la cambie en su primer acceso.'],
              ['Rol', 'Supervisor o Cajero. Define qué módulos puede ver y usar.'],
              ['Sucursal', 'Local al que está asignado. Solo verá datos de esa sucursal.'],
              ['Estado', '"Activo" para que pueda ingresar. "Inactivo" bloquea el acceso sin eliminar al usuario.'],
            ]}
          />

          <Note type="warn">
            ⚠️ <strong>Límite de usuarios por plan:</strong>
            <br/>• Plan Emprendedor: hasta 2 usuarios (sin contar al Administrador)
            <br/>• Plan Profesional: hasta 5 usuarios
            <br/>• Plan Empresarial: usuarios ilimitados
          </Note>

          <H3>Desactivar un usuario</H3>
          <Steps items={[
            'Buscá al usuario en la lista.',
            'Hacé clic en el ícono de edición.',
            'Cambiá el estado de "Activo" a "Inactivo".',
            'Guardá los cambios. El usuario ya no podrá ingresar pero su historial se conserva.',
          ]} />

          <H3>Cambiar la contraseña de un usuario</H3>
          <Steps items={[
            'Editá el usuario que necesita el cambio de contraseña.',
            'Ingresá una nueva contraseña en el campo correspondiente.',
            'Guardá los cambios. El usuario deberá usar la nueva contraseña en su próximo acceso.',
          ]} />

          <Note>
            💡 Los usuarios no pueden cambiar su propia contraseña desde el sistema actualmente. Si un empleado olvidó su contraseña, el Administrador puede asignarle una nueva desde este módulo.
          </Note>
        </div>
      );

    case 'reportes':
      return (
        <div>
          <p className="text-gray-600 mb-4">
            El módulo de Reportes permite analizar las ventas del negocio con diferentes filtros. Los datos
            se pueden exportar a Excel para análisis externos.
          </p>

          <Screenshot title="Reportes de Ventas" src="/manual/reporte_ventas.png" />

          <H3>Cómo generar un reporte</H3>
          <Steps items={[
            'Andá al módulo "Reportes de Ventas" desde el menú lateral.',
            'Seleccioná el período de tiempo usando el filtro de fechas: podés elegir Hoy, Esta semana, Este mes, o un rango personalizado con fechas de inicio y fin.',
            'Si tenés múltiples sucursales (plan Empresarial), seleccioná si querés ver todas las sucursales o solo una.',
            'Opcionalmente, filtrá por cajero específico para ver el rendimiento de un empleado en particular.',
            'Opcionalmente, filtrá por método de pago (Efectivo, Tarjeta, Transferencia, o Todos).',
            'El reporte se actualiza automáticamente al cambiar los filtros. No es necesario hacer clic en "Buscar".',
          ]} />

          <H3>Filtros disponibles</H3>
          <DataTable
            headers={['Filtro', 'Opciones disponibles', 'Para qué sirve']}
            rows={[
              ['Período', 'Hoy / Esta semana / Este mes / Rango personalizado', 'Acotar el análisis a un período específico.'],
              ['Sucursal', 'Todas o una específica', 'Comparar sucursales o focalizar en una sola.'],
              ['Cajero', 'Todos o filtrar por usuario', 'Evaluar el rendimiento individual de cada cajero.'],
              ['Método de pago', 'Efectivo / Tarjeta / Transferencia / Todos', 'Ver qué porcentaje de las ventas es en efectivo vs otros medios.'],
            ]}
          />

          <ForRole rol={rol} only={['admin']}>
            <Note>
              💡 <strong>Vista de Administrador:</strong> Podés ver datos de <strong>todas las sucursales juntas</strong> o filtrar por una sucursal específica. El reporte consolidado es útil para comparar la performance entre locales.
            </Note>
          </ForRole>

          <ForRole rol={rol} only={['supervisor']}>
            <Note>
              💡 <strong>Vista de Supervisor:</strong> Solo verás datos de tu sucursal asignada. No podés ver datos de otras sucursales. Si necesitás un reporte consolidado, solicitáselo al Administrador.
            </Note>
          </ForRole>

          <H3>Exportar a Excel</H3>
          <Steps items={[
            'Configurá los filtros del reporte que querés exportar.',
            'Hacé clic en el botón "Exportar Excel" en la parte superior del reporte.',
            'Se descarga automáticamente un archivo .xlsx con todos los datos del reporte según los filtros aplicados.',
            'El archivo incluye: fecha, número de comprobante, cajero, productos, cantidades, método de pago y totales.',
          ]} />
        </div>
      );

    case 'stock':
      return (
        <div>
          <p className="text-gray-600 mb-4">
            Las Alertas de Stock muestran en tiempo real todos los productos cuyo stock actual está
            por debajo del mínimo configurado. El objetivo es avisarte antes de quedarte sin mercadería.
          </p>

          <Screenshot title="Alertas de Stock" src="/manual/alertas_stock.png" />

          <H3>Niveles de alerta</H3>
          <DataTable
            headers={['Nivel', 'Condición', 'Qué indica']}
            rows={[
              ['⚠️ Stock bajo', 'Stock actual es mayor a 0 pero menor o igual al stock mínimo configurado.', 'El producto se está agotando. Hacer pedido al proveedor.'],
              ['🔴 Stock crítico', 'Stock actual es 0 o negativo.', 'Producto agotado. No aparece en el POS o no puede venderse.'],
            ]}
          />

          <H3>Cómo interpretar y actuar ante una alerta</H3>
          <Steps items={[
            'Andá al módulo "Alertas de Stock" desde el menú lateral.',
            'Verás la lista de productos con alerta ordenada por nivel (crítico primero).',
            'Para cada producto, ves: nombre, stock actual, stock mínimo y la diferencia.',
            'Si el producto está en rojo (stock 0): hay que reponer urgente. Nadie puede venderlo hasta que se registre una compra.',
            'Si el producto está en amarillo (bajo mínimo): planificá la reposición en los próximos días.',
          ]} />

          <ForRole rol={rol} only={['cajero']}>
            <Note type="warn">
              ⚠️ Como Cajero, podés <strong>ver</strong> las alertas de stock pero no podés modificar el inventario.
              Si ves que un producto tiene stock crítico, informá al Supervisor o Administrador para que gestionen
              la reposición.
            </Note>
          </ForRole>

          <ForRole rol={rol} only={['admin']}>
            <H3>Configurar el stock mínimo</H3>
            <p className="text-sm text-gray-600 mb-2">
              El stock mínimo se configura en cada producto individualmente:
            </p>
            <Steps items={[
              'Andá al módulo Productos.',
              'Editá el producto que querés configurar.',
              'En el campo "Stock mínimo", ingresá la cantidad a partir de la cual querés recibir alerta (por ejemplo: 5).',
              'Guardá el producto. Si el stock actual ya está por debajo de ese número, aparecerá en las alertas de inmediato.',
            ]} />
            <Note>💡 Si un producto no tiene stock mínimo configurado (campo vacío o 0), no generará alertas aunque el stock llegue a cero.</Note>
          </ForRole>

          <ForRole rol={rol} only={['supervisor']}>
            <H3>Actuar ante alertas</H3>
            <p className="text-sm text-gray-600">
              Cuando veas alertas de stock, podés registrar una nueva compra al proveedor desde el módulo
              Compras (sección 12) para actualizar el stock automáticamente al guardar la factura.
            </p>
          </ForRole>
        </div>
      );

    case 'notificaciones':
      return (
        <div>
          <p className="text-gray-600 mb-4">
            El sistema genera notificaciones automáticas para eventos importantes del negocio.
            Las notificaciones aparecen en el ícono de campana en la barra superior y también
            en la sección dedicada del menú.
          </p>

          <H3>Tipos de notificaciones</H3>
          <DataTable
            headers={['Tipo', 'Cuándo se genera', 'Qué hacer']}
            rows={[
              ['📦 Stock bajo', 'Cuando un producto cae por debajo de su stock mínimo configurado.', 'Ir a Alertas de Stock para ver qué productos necesitan reposición.'],
              ['💼 Suscripción por vencer', 'Cuando quedan 7 días o menos para el vencimiento del plan.', 'Ir a Cuenta y Suscripción para renovar antes de que expire.'],
              ['🛒 Eventos de ventas', 'Eventos destacados del día (ventas grandes, volumen inusual).', 'Revisar el reporte de ventas para más detalle.'],
              ['⚙️ Sistema', 'Actualizaciones de la plataforma, mantenimiento programado o mensajes de PULS Market.', 'Leer el mensaje para estar al tanto de cambios o mejoras.'],
            ]}
          />

          <H3>Gestionar las notificaciones</H3>
          <Steps items={[
            'Hacé clic en el ícono de campana 🔔 en la barra superior para ver las notificaciones recientes.',
            'Las notificaciones no leídas aparecen con un punto o badge de color.',
            'Hacé clic en una notificación para verla en detalle y marcarla como leída.',
            'Para ver todas las notificaciones (incluyendo las antiguas), andá al módulo "Notificaciones" desde el menú lateral.',
            'Podés marcar todas como leídas desde el botón "Marcar todas como leídas".',
          ]} />

          <Note>
            💡 Las notificaciones de stock bajo también se pueden ver directamente en el módulo "Alertas de Stock" con más detalle (stock actual vs mínimo por producto).
          </Note>
        </div>
      );

    case 'configuracion':
      return (
        <div>
          <p className="text-gray-600 mb-4">
            El módulo de Configuración permite personalizar la apariencia del sistema para que refleje
            la identidad visual de tu negocio. Solo el Administrador tiene acceso.
          </p>

          <H3>Personalizar la apariencia</H3>
          <Steps items={[
            'Andá a "Configuración" desde el menú lateral.',
            'Abrí la pestaña "Apariencia".',
            'Para subir el logo: hacé clic en el área de carga de imagen o arrastrá el archivo. Formatos aceptados: PNG, JPG, SVG. Tamaño recomendado: mínimo 200×200px, fondo transparente (PNG). El logo aparece en el menú lateral y en los tickets de venta.',
            'Para cambiar el color principal: hacé clic en el selector de color y elegí el color que representa a tu marca. Este color se aplica a botones, acentos, bordes y elementos de navegación en toda la interfaz.',
            'Para activar/desactivar el modo oscuro por defecto: mové el interruptor correspondiente. Este ajuste se aplica a todos los usuarios de tu empresa.',
            'Hacé clic en "Guardar cambios". Los cambios visuales se aplican de inmediato sin necesidad de recargar la página.',
          ]} />

          <Note>
            💡 <strong>Colores recomendados:</strong> Elegí un color con suficiente contraste para que el texto blanco sobre él sea legible. Colores muy claros (amarillo pastel, celeste muy claro) pueden hacer que el texto sea difícil de leer.
          </Note>

          <Note type="warn">
            ⚠️ El logo y el color se aplican para todos los usuarios de tu empresa, sin importar el rol o dispositivo que usen.
          </Note>
        </div>
      );

    case 'cuenta':
      return (
        <div>
          <p className="text-gray-600 mb-4">
            La sección Cuenta muestra el estado de tu suscripción y permite renovar o cambiar de plan.
            El pago se procesa de forma segura a través de MercadoPago.
          </p>

          <H3>Estados posibles de la suscripción</H3>
          <DataTable
            headers={['Estado', 'Descripción', 'Acceso al sistema']}
            rows={[
              ['🔵 Trial', 'Período de prueba gratuito de 15 días con acceso al plan Empresarial.', '✅ Acceso completo'],
              ['🟢 Activa', 'Suscripción vigente y pagada.', '✅ Acceso completo'],
              ['🟡 Por vencer', 'Quedan 7 días o menos para el vencimiento. Se muestran avisos.', '✅ Acceso completo con aviso'],
              ['🔴 Vencida', 'Superó la fecha de vencimiento. Período de gracia activo.', '⚠️ Acceso limitado por 15 días adicionales'],
              ['⚫ Suspendida', 'Se agotó el período de gracia sin renovar.', '❌ Acceso bloqueado. Solo podés ver la pantalla de renovación.'],
            ]}
          />

          <Note type="danger">
            🚫 <strong>Si la suscripción se suspende:</strong> Los datos del negocio se conservan. Al renovar,
            todo vuelve a funcionar normalmente. No se pierde ninguna información.
          </Note>

          <H3>Renovar o cambiar de plan</H3>
          <Steps items={[
            'Andá a "Cuenta y Suscripción" desde el menú lateral.',
            'Verás tu plan actual, la fecha de vencimiento y las opciones disponibles.',
            'Elegí el plan deseado (Emprendedor, Profesional o Empresarial).',
            'Seleccioná la modalidad: mensual o anual (el plan anual equivale a 11 meses — un mes de regalo).',
            'Hacé clic en "Suscribirse" o "Cambiar a este plan".',
            'Serás redirigido a MercadoPago para completar el pago de forma segura con tarjeta, dinero en cuenta o efectivo.',
            'Una vez confirmado el pago por MercadoPago, la suscripción se activa automáticamente y podés seguir usando el sistema.',
          ]} />

          <Note>
            💡 <strong>Plan anual:</strong> Al pagar 12 meses de precio, recibís 13 meses de acceso (un mes gratis). Es la opción más conveniente si ya sabés que vas a usar PULS Market por más de un año.
          </Note>

          <H3>Cambiar de plan (upgrade/downgrade)</H3>
          <p className="text-sm text-gray-600 mb-2">
            Podés cambiar a un plan superior en cualquier momento. El costo se prorratea desde la fecha del
            cambio. Al bajar de plan, el cambio aplica al vencimiento del plan actual, no de inmediato.
          </p>
          <Note type="warn">
            ⚠️ <strong>Al bajar de plan:</strong> Verificá que el nuevo plan tenga suficientes usuarios y funcionalidades
            para tu operación actual. Por ejemplo, si tenés 4 usuarios activos y bajás a Emprendedor (máximo 2), deberás
            desactivar usuarios antes de que el cambio entre en vigor.
          </Note>
        </div>
      );

    case 'roles':
      return (
        <div>
          <p className="text-gray-600 mb-4">
            Esta tabla muestra el detalle completo de permisos de cada rol en todos los módulos del sistema.
          </p>
          <DataTable
            headers={['Módulo', 'Administrador', 'Supervisor', 'Cajero']}
            rows={[
              ['Dashboard',            '✅ Todas las sucursales', '✅ Su sucursal',          '✅ Vista básica'],
              ['Gestión de Caja',      '✅ Ver todas las cajas',  '✅ Abrir/cerrar/ver',     '✅ Solo su propia caja'],
              ['Punto de Venta',       '✅ Completo',             '✅ Completo',             '✅ Completo'],
              ['Devoluciones',         '✅ Completo',             '✅ Completo',             '✅ Completo'],
              ['Productos',            '✅ CRUD completo',        '—',                       '—'],
              ['Categorías',           '✅ CRUD completo',        '—',                       '—'],
              ['Sucursales',           '✅ CRUD completo',        '—',                       '—'],
              ['Compras / Proveedores','✅ Completo',             '✅ Completo',             '—'],
              ['Usuarios',             '✅ CRUD completo',        '—',                       '—'],
              ['Reportes de Ventas',   '✅ Todas las sucursales', '✅ Su sucursal',          '—'],
              ['Alertas de Stock',     '✅ Completo',             '✅ Completo',             '✅ Solo lectura'],
              ['Notificaciones',       '✅ Completo',             '—',                       '—'],
              ['Configuración',        '✅ Completo',             '—',                       '—'],
              ['Cuenta / Suscripción', '✅ Completo',             '—',                       '—'],
            ]}
          />
          <Note>
            💡 <strong>"—"</strong> significa que ese módulo no aparece en el menú ni es accesible para ese rol. No es un error; es el diseño de permisos del sistema.
          </Note>
        </div>
      );

    case 'planes':
      return (
        <div>
          <p className="text-gray-600 mb-4">
            PULS Market ofrece tres planes de suscripción para adaptarse al tamaño y necesidades de cada negocio.
            Todos incluyen 15 días de prueba gratuita con acceso completo al plan Empresarial.
          </p>
          <DataTable
            headers={['Característica', 'Emprendedor', 'Profesional', 'Empresarial']}
            rows={[
              ['Usuarios máximos',          '2',            '5',            'Ilimitados'],
              ['Sucursales',                '1',            '1',            'Ilimitadas'],
              ['Punto de Venta (POS)',       '✅',           '✅',           '✅'],
              ['Gestión de Caja',           '✅',           '✅',           '✅'],
              ['Inventario de productos',   '✅',           '✅',           '✅'],
              ['Notificaciones básicas',    '✅',           '✅',           '✅'],
              ['Reportes de Ventas',        '—',            '✅',           '✅'],
              ['Compras y Proveedores',     '—',            '✅',           '✅'],
              ['Alertas de Stock',          '—',            '✅',           '✅'],
              ['Gestión de Usuarios',       '—',            '✅',           '✅'],
              ['Configuración avanzada',    '—',            '✅',           '✅'],
              ['Multi-Sucursal',            '—',            '—',            '✅'],
            ]}
          />
          <H3>¿Qué plan elegir?</H3>
          <DataTable
            headers={['Plan', 'Ideal para']}
            rows={[
              ['Emprendedor', 'Negocios pequeños o unipersonales que solo necesitan vender y controlar stock básico. Sin reportes ni compras.'],
              ['Profesional', 'Negocios con equipo de hasta 5 personas que necesitan reportes de ventas, gestión de compras a proveedores y alertas de stock.'],
              ['Empresarial', 'Negocios con múltiples sucursales o equipos grandes que necesitan todas las funcionalidades sin límites.'],
            ]}
          />
          <Note>
            💡 Todos los planes incluyen <strong>15 días de prueba gratuita</strong> con acceso completo al plan Empresarial.
            No se requiere tarjeta de crédito para iniciar la prueba.
          </Note>
        </div>
      );

    default:
      return null;
  }
};

function getScrollContainer(el) {
  let node = el?.parentElement;
  while (node && node !== document.body) {
    const { overflow, overflowY } = window.getComputedStyle(node);
    if (/auto|scroll/.test(overflow) || /auto|scroll/.test(overflowY)) return node;
    node = node.parentElement;
  }
  return window;
}

export default function Manual() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const rol = user?.rol || 'cajero';
  const [activeSection, setActiveSection] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const contentRef = useRef(null);
  const topbarRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const visibleSections = SECTIONS.filter(s => s.roles.includes(rol));

  const groups = visibleSections.reduce((acc, s) => {
    if (!acc[s.group]) acc[s.group] = [];
    acc[s.group].push(s);
    return acc;
  }, {});

  useEffect(() => {
    if (contentRef.current) {
      scrollContainerRef.current = getScrollContainer(contentRef.current);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const topbarH = topbarRef.current?.getBoundingClientRect().height ?? 56;
      const threshold = topbarH + 16;
      let current = visibleSections[0]?.id;
      for (const s of visibleSections) {
        const el = document.getElementById(`sec-${s.id}`);
        if (el && el.getBoundingClientRect().top <= threshold) current = s.id;
      }
      setActiveSection(current);
    };
    const container = scrollContainerRef.current ?? window;
    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener('scroll', handleScroll);
  }, [visibleSections]);

  const scrollToSection = (id) => {
    const el = document.getElementById(`sec-${id}`);
    if (!el) return;
    const topbarH = topbarRef.current?.getBoundingClientRect().height ?? 56;
    const container = scrollContainerRef.current ?? window;
    const isWindow = container === window;
    const containerTop = isWindow ? 0 : container.getBoundingClientRect().top;
    const currentScroll = isWindow ? window.scrollY : container.scrollTop;
    const elTop = el.getBoundingClientRect().top;
    const target = currentScroll + elTop - containerTop - topbarH - 8;
    container.scrollTo({ top: target, behavior: 'smooth' });
    setActiveSection(id);
  };

  const rolLabel = { admin: 'Administrador', supervisor: 'Supervisor', cajero: 'Cajero' }[rol] || rol;

  const handleDownloadPdf = async () => {
    if (!contentRef.current || generatingPdf) return;
    setGeneratingPdf(true);
    try {
      const el = contentRef.current;
      const canvas = await html2canvas(el, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: el.scrollWidth,
        height: el.scrollHeight,
        scrollY: 0,
      });

      const imgData  = canvas.toDataURL('image/png');
      const pdf      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW    = pdf.internal.pageSize.getWidth();
      const pageH    = pdf.internal.pageSize.getHeight();
      const margin   = 10;
      const usableW  = pageW - margin * 2;
      const ratio    = canvas.width / usableW;
      const usableH  = pageH - margin * 2;
      let   srcY     = 0;

      while (srcY < canvas.height) {
        const sliceH = Math.min(usableH * ratio, canvas.height - srcY);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width  = canvas.width;
        sliceCanvas.height = sliceH;
        const ctx = sliceCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        if (srcY > 0) pdf.addPage();
        pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, margin, usableW, sliceH / ratio);
        srcY += sliceH;
      }

      const fecha = new Date().toISOString().slice(0, 10);
      pdf.save(`Manual_PULS_${rolLabel}_${fecha}.pdf`);
    } catch (err) {
      console.error('Error generando PDF:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <>
      <style>{MANUAL_STYLES}</style>

      <div className="flex min-h-full bg-gray-50">

        <aside className="m-toc hidden lg:block w-60 shrink-0 sticky top-0 h-screen overflow-y-auto bg-white border-r border-gray-200 py-4">
          <div className="px-4 mb-4">
            <div className="flex items-center gap-2 text-sm font-bold m-icon-p">
              <BookOpen className="w-4 h-4" />
              Manual del Sistema
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              Rol: <span className="font-medium text-gray-600">{rolLabel}</span>
            </div>
          </div>

          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="mb-2">
              <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">{group}</div>
              {items.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className={`w-full text-left m-nav-link flex items-center gap-2 px-4 py-1.5 text-xs transition-colors ${
                    activeSection === s.id ? 'm-nav-active' : 'text-gray-500'
                  }`}
                >
                  <span className="bg-gray-100 text-gray-500 rounded text-[10px] font-bold px-1.5 py-0.5 min-w-[20px] text-center">
                    {s.num}
                  </span>
                  {s.title}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <div className="flex-1 min-w-0">
          <div ref={topbarRef} className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <button onClick={() => navigate(-1)} className="btn btn-secondary flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>

            <div className="flex items-center gap-2 font-semibold text-gray-700 text-sm">
              <BookOpen className="w-4 h-4 m-icon-p" />
              Manual del Sistema
              <span className="text-gray-400 font-normal hidden sm:inline">— {rolLabel}</span>
            </div>

            <button
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="btn btn-primary flex items-center gap-2 shrink-0"
            >
              {generatingPdf
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
                : <><Download className="w-4 h-4" /> Descargar PDF</>
              }
            </button>
          </div>

          <div ref={contentRef} className="max-w-3xl mx-auto px-4 sm:px-6 py-8 bg-white" id="manual-content">

            <div className="mb-10 pb-8 border-b-2 border-gray-200 text-center">
              <div className="text-4xl font-black mb-1" style={{ color: 'var(--primary)' }}>PULS Market</div>
              <div className="text-xl font-bold text-gray-800">Manual del Sistema</div>
              <div className="text-sm text-gray-500 mt-2">Rol: {rolLabel} · Versión 2.0 · Junio 2026</div>
            </div>

            {visibleSections.map((s, idx) => (
              <section key={s.id} id={`sec-${s.id}`} className="mb-12 scroll-mt-16">
                {idx > 0 && <hr className="my-8 border-gray-200" />}
                <div className="flex items-center gap-3 pb-3 mb-5 m-sec-border">
                  <span className="m-sec-badge">{s.num}</span>
                  <h2 className="text-xl font-bold text-gray-900">{s.title}</h2>
                </div>
                <SectionContent id={s.id} rol={rol} />
              </section>
            ))}

            <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
              <div className="font-bold text-sm mb-1 m-icon-p">PULS Market</div>
              Manual del Sistema · Versión 2.0 · Junio 2026
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
