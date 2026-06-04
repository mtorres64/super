import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import { Download, BookOpen, ArrowLeft, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ── Secciones disponibles por rol ────────────────────────────────────
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

// ── Estilos CSS (inline + print) ──────────────────────────────────────
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
`;

// ── Subcomponentes ─────────────────────────────────────────────────────
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
      <img
        src={src}
        alt={title}
        className="w-full rounded-xl border border-gray-200 shadow-sm"
      />
      {title && <figcaption className="text-xs text-gray-400 text-center mt-1">{title}</figcaption>}
    </figure>
  ) : (
    <div className="m-screenshot">
      <div className="text-3xl mb-2">📸</div>
      <p className="font-semibold text-gray-600 text-sm mb-1">{title}</p>
      <p className="text-xs text-gray-400 mx-auto">{desc}</p>
    </div>
  )
);

const Note = ({ children, type = 'tip' }) => (
  <div className={`m-note-${type} rounded-r-lg px-4 py-3 my-4 text-sm`}>{children}</div>
);

const Steps = ({ items }) => (
  <ol className="my-4 space-y-2">
    {items.map((item, i) => (
      <li key={i} className="flex gap-3 items-start">
        <span className="m-step-num flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5">
          {i + 1}
        </span>
        <span className="text-gray-600 text-sm">{item}</span>
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

// ── Contenido de cada sección ──────────────────────────────────────────
const SectionContent = ({ id }) => {
  switch (id) {
    case 'intro':
      return (
        <div>
          <p className="text-gray-600 mb-4">
            <strong>PULS Market</strong> es un sistema de Punto de Venta (POS) basado en la nube para supermercados
            y comercios minoristas. Permite gestionar ventas, inventario, caja, compras y reportes desde
            cualquier dispositivo con Internet, sin instalar nada.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 my-4">
            {[
              { icon: '🛒', title: 'Punto de Venta', desc: 'Ventas rápidas con escáner de código de barras y múltiples métodos de pago.' },
              { icon: '📦', title: 'Inventario en tiempo real', desc: 'Control de stock por sucursal con alertas automáticas de mínimo.' },
              { icon: '💰', title: 'Gestión de Caja', desc: 'Apertura, cierre y arqueo con historial completo de movimientos.' },
              { icon: '🏢', title: 'Multi-Sucursal', desc: 'Múltiples locales con precios e inventarios independientes.' },
              { icon: '📊', title: 'Reportes', desc: 'Estadísticas de ventas por período, cajero o sucursal, exportables a Excel.' },
              { icon: '👥', title: 'Roles y Usuarios', desc: 'Administrador, Supervisor y Cajero con accesos diferenciados.' },
            ].map((f, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="font-semibold text-gray-800 text-sm mb-1">{f.title}</div>
                <div className="text-xs text-gray-500">{f.desc}</div>
              </div>
            ))}
          </div>
          <h3 className="font-semibold text-gray-800 mt-5 mb-2">Estructura de roles</h3>
          <DataTable
            headers={['Rol', 'Descripción', 'Accesos principales']}
            rows={[
              [<RoleBadge rol="admin" />, 'Dueño o encargado general del negocio', 'Acceso completo a todos los módulos'],
              [<RoleBadge rol="supervisor" />, 'Encargado de turno o gerente de sucursal', 'Caja, POS, Compras, Reportes, Alertas'],
              [<RoleBadge rol="cajero" />, 'Personal de atención y ventas', 'Caja, POS, Alertas de stock'],
            ]}
          />
        </div>
      );

    case 'registro':
      return (
        <div>
          <p className="text-gray-600 mb-4">El registro se realiza una vez y crea el perfil principal de Administrador, con 15 días de prueba gratuita.</p>
          <Steps items={[
            'Ingresá al sistema y hacé clic en "Registrar empresa".',
            'Completá el formulario: nombre de empresa, email, contraseña, nombre y apellido.',
            'Hacé clic en "Crear cuenta".',
            'Revisá tu casilla de correo y anotá el código OTP de 6 dígitos.',
            'Ingresá el código OTP para verificar tu email.',
            '¡Listo! Accedés al panel con 15 días de prueba gratuita.',
          ]} />
          <Screenshot
            title="Formulario de Registro"
            src="/manual/registro.png"
          />
          <Note type="warn">⚠️ El código OTP vence en 10 minutos. Si no lo recibís, revisá spam o hacé clic en "Reenviar código".</Note>
          <h3 className="font-semibold text-gray-800 mt-5 mb-2">Recuperación de contraseña</h3>
          <Steps items={[
            'En la pantalla de login, hacé clic en "¿Olvidaste tu contraseña?".',
            'Ingresá tu correo electrónico registrado.',
            'Seguí el enlace recibido por email para restablecer la contraseña.',
          ]} />
        </div>
      );

    case 'login':
      return (
        <div>
          <p className="text-gray-600 mb-4">Todos los usuarios acceden por la misma pantalla. El sistema detecta el rol automáticamente.</p>
          <Steps items={[
            'Ingresá tu correo electrónico y contraseña.',
            'Hacé clic en "Ingresar".',
            'El sistema redirige al panel según tu rol.',
          ]} />
          <Screenshot
            title="Pantalla de Inicio de Sesión"
            src="/manual/login.png"
          />
          <Note>💡 <strong>Duración de sesión:</strong> La sesión dura 8 horas. Para salir de forma segura, hacé clic en tu nombre al pie del menú lateral.</Note>
        </div>
      );

    case 'interfaz':
      return (
        <div>
          <p className="text-gray-600 mb-4">La interfaz tiene tres áreas: <strong>menú lateral</strong> (navegación), <strong>barra superior</strong> (usuario/alertas) y <strong>área central</strong> (contenido).</p>
          <Screenshot
            title="Vista General del Sistema"
            src="/manual/dashboard.png"
          />
          <Note>💡 <strong>Responsive:</strong> En celulares el menú lateral se oculta. Tocá el botón ☰ en la barra superior para abrirlo.</Note>
          <h3 className="font-semibold text-gray-800 mt-5 mb-2">Módulos visibles por rol</h3>
          <DataTable
            headers={['Sección', 'Admin', 'Supervisor', 'Cajero']}
            rows={[
              ['Dashboard',          '✅','✅','✅'],
              ['Gestión de Caja',    '✅','✅','✅'],
              ['Punto de Venta',     '✅','✅','✅'],
              ['Productos',          '✅','—','—'],
              ['Sucursales',         '✅','—','—'],
              ['Reportes',           '✅','✅','—'],
              ['Compras',            '✅','✅','—'],
              ['Usuarios',           '✅','—','—'],
              ['Configuración',      '✅','—','—'],
              ['Alertas de Stock',   '✅','✅','✅'],
              ['Notificaciones',     '✅','—','—'],
            ]}
          />
        </div>
      );

    case 'dashboard':
      return (
        <div>
          <p className="text-gray-600 mb-4">El Dashboard muestra un resumen del estado del negocio en tiempo real al ingresar al sistema.</p>
          <Screenshot
            title="Dashboard Principal"
            src="/manual/dashboard2.png"
          />
          <DataTable
            headers={['Tarjeta', 'Descripción']}
            rows={[
              ['Ventas de hoy',     'Suma total de ventas del día en la sucursal activa.'],
              ['Transacciones',     'Cantidad de operaciones de venta realizadas hoy.'],
              ['Productos activos', 'Total de productos activos en el inventario.'],
              ['Alertas de stock',  'Productos por debajo del stock mínimo configurado.'],
            ]}
          />
          <Note type="warn">⚠️ Las estadísticas corresponden a la sucursal del usuario. El Administrador ve datos consolidados de todas las sucursales.</Note>
        </div>
      );

    case 'caja':
      return (
        <div>
          <Note type="danger">🚫 <strong>Requisito previo:</strong> Debe abrirse una sesión de caja antes de realizar cualquier venta.</Note>
          <h3 className="font-semibold text-gray-800 mt-4 mb-2">Abrir sesión de caja</h3>
          <Steps items={[
            'Ingresá a Gestión de Caja desde el menú lateral.',
            'Completá el monto inicial (efectivo disponible al inicio del turno).',
            'Hacé clic en "Abrir caja".',
            'El sistema registra la hora de apertura. Ya podés comenzar a vender.',
          ]} />
          <Screenshot
            title="Apertura de Caja"
            src="/manual/abrir_caja.png"
          />
          <Note type="danger">🚫 Solo puede haber <strong>una sesión de caja abierta por usuario</strong> a la vez.</Note>
          <h3 className="font-semibold text-gray-800 mt-5 mb-2">Cerrar sesión de caja</h3>
          <Steps items={[
            'Con la sesión abierta, hacé clic en "Cerrar caja".',
            'Ingresá el monto real contado físicamente.',
            'El sistema calcula la diferencia (sobrante o faltante).',
            'Confirmá el cierre. Se genera el reporte de la sesión.',
          ]} />
          <Screenshot
            title="Cierre de Caja — Resumen"
            src="/manual/cerrar_caja.png"
          />
          <h3 className="font-semibold text-gray-800 mt-5 mb-2">Tipos de movimiento</h3>
          <DataTable
            headers={['Tipo', 'Descripción', 'Efecto']}
            rows={[
              ['Apertura',   'Monto inicial al comenzar el turno',    '+ Ingreso'],
              ['Venta',      'Cada venta en efectivo',                '+ Ingreso'],
              ['Retiro',     'Extracción de efectivo de la caja',     '− Egreso'],
              ['Devolución', 'Reintegro de efectivo al cliente',      '− Egreso'],
              ['Cierre',     'Registro del monto final contado',      '— (registro)'],
            ]}
          />
        </div>
      );

    case 'pos':
      return (
        <div>
          <Note type="danger">🚫 Debe haber una sesión de caja abierta para poder realizar ventas.</Note>
          <Screenshot
            title="Pantalla Principal del POS"
            src="/manual/pos.png"
          />
          <h3 className="font-semibold text-gray-800 mt-4 mb-2">Agregar productos</h3>
          <DataTable
            headers={['Método', 'Pasos']}
            rows={[
              ['Búsqueda por nombre/código', 'Escribí en el buscador → clic en el resultado para agregar al carrito.'],
              ['Escáner de código de barras', 'Clic en el ícono 📷 → apuntá la cámara al código → se agrega automáticamente.'],
            ]}
          />
          <h3 className="font-semibold text-gray-800 mt-4 mb-2">Gestionar el carrito</h3>
          <DataTable
            headers={['Acción', 'Cómo hacerlo']}
            rows={[
              ['Cambiar cantidad',  'Usá los botones − y + del ítem, o escribí la cantidad directamente.'],
              ['Aplicar descuento', 'Ingresá el porcentaje en el campo "%" de cada ítem.'],
              ['Eliminar ítem',     'Clic en el botón × rojo a la derecha del ítem.'],
              ['Limpiar carrito',   'Clic en el botón "Limpiar" para vaciar todo.'],
            ]}
          />
          <h3 className="font-semibold text-gray-800 mt-4 mb-2">Procesar el pago</h3>
          <Steps items={[
            'Verificá productos y cantidades en el carrito.',
            'Seleccioná el método: Efectivo (calcula vuelto), Tarjeta o Transferencia.',
            'Hacé clic en "Confirmar venta".',
            'El sistema descuenta stock, registra en caja y genera el número de factura (FAC-000001).',
            'Se muestra el ticket para imprimir o guardar como PDF.',
          ]} />
          <Note>💡 El vuelto se calcula automáticamente al seleccionar pago en efectivo.</Note>
        </div>
      );

    case 'devoluciones':
      return (
        <div>
          <p className="text-gray-600 mb-4">Permite procesar devoluciones parciales o totales. El stock y la caja se actualizan automáticamente.</p>
          <Steps items={[
            'Desde el historial de ventas, buscá la venta original.',
            'Hacé clic en el botón "Devolución".',
            'Seleccioná los ítems a devolver y la cantidad de cada uno.',
            'Confirmá la devolución.',
          ]} />
          <Screenshot
            title="Modal de Devolución"
            src="/manual/devolucion.png"
          />
          <DataTable
            headers={['Tipo', 'Descripción']}
            rows={[
              ['Parcial', 'Se devuelven solo algunos ítems. La venta queda en estado "devolución parcial".'],
              ['Total',   'Se devuelven todos los ítems. La venta queda en estado "cancelado".'],
            ]}
          />
          <Note>💡 Cada devolución recibe un número correlativo (DEV-000001). El stock se repone automáticamente.</Note>
        </div>
      );

    case 'productos':
      return (
        <div>
          <Screenshot
            title="Listado de Productos"
            src="/manual/productos.png"
          />
          <DataTable
            headers={['Campo', 'Descripción', '¿Obligatorio?']}
            rows={[
              ['Nombre',          'Nombre tal como aparece en el POS y tickets', '✅'],
              ['Código de barras','EAN-13 u otro. Podés escanearlo con la cámara', 'No'],
              ['Categoría',       'Debe existir previamente',                    'No'],
              ['Precio de venta', 'Precio unitario al público',                  '✅'],
              ['Precio de costo', 'Precio de compra (para cálculo de margen)',   'No'],
              ['Stock inicial',   'Cantidad inicial en inventario',              '✅'],
              ['Stock mínimo',    'Umbral para generar alerta de reposición',    'No'],
              ['Estado',          'Activo o Inactivo. Solo activos aparecen en el POS', '✅'],
            ]}
          />
          <h3 className="font-semibold text-gray-800 mt-4 mb-2">Importación masiva desde Excel</h3>
          <Steps items={[
            'Clic en "Importar Excel".',
            'Descargá el template de importación.',
            'Completá la plantilla (una fila por producto).',
            'Cargá el archivo. El sistema muestra resumen de importados y errores.',
          ]} />
          <Note>💡 Exportá tu catálogo actual a Excel desde el botón "Exportar Excel" para backups.</Note>
        </div>
      );

    case 'categorias':
      return (
        <div>
          <p className="text-gray-600 mb-4">Las categorías organizan el catálogo para facilitar la búsqueda en el POS y los reportes.</p>
          <Steps items={[
            'Dentro de Productos, abrí la sección "Categorías".',
            'Clic en "Nueva categoría", ingresá el nombre y guardá.',
            'Para editar o eliminar, usá las acciones de la tabla.',
          ]} />
          <Note type="warn">⚠️ Solo se pueden eliminar categorías sin productos asociados.</Note>
        </div>
      );

    case 'sucursales':
      return (
        <div>
          <p className="text-gray-600 mb-4">Gestioná múltiples locales, cada uno con su propio inventario, precios y usuarios asignados.</p>
          <Steps items={[
            'Clic en "Nueva sucursal".',
            'Completá: Nombre, Dirección, Teléfono y estado.',
            'Guardá. La sucursal queda disponible para asignar usuarios y gestionar inventario.',
          ]} />
          <Screenshot
            title="Listado de Sucursales"
            src="/manual/sucursales.png"
          />
          <Note>💡 <strong>Plan requerido:</strong> El módulo Multi-Sucursal requiere el plan Empresarial.</Note>
        </div>
      );

    case 'compras':
      return (
        <div>
          <p className="text-gray-600 mb-4">Registrá facturas de proveedores: el stock se actualiza automáticamente al guardar.</p>
          <h3 className="font-semibold text-gray-800 mb-2">Gestión de Proveedores</h3>
          <Steps items={[
            'Clic en "Proveedores" → "Nuevo proveedor".',
            'Ingresá: nombre, CUIT/DNI, dirección, teléfono, email.',
            'Guardá. El proveedor queda disponible al registrar compras.',
          ]} />
          <h3 className="font-semibold text-gray-800 mt-4 mb-2">Registrar una compra</h3>
          <Steps items={[
            'Clic en "Nueva compra".',
            'Seleccioná el proveedor, ingresá número de factura y fecha.',
            'Agregá ítems: producto vinculado, cantidad, precio, impuestos.',
            'Verificá el total y clic en "Guardar compra". El stock se actualiza solo.',
          ]} />
          <Note>💡 Al vincular un ítem con un producto existente, el sistema muestra el margen de ganancia en tiempo real.</Note>
        </div>
      );

    case 'usuarios':
      return (
        <div>
          <DataTable
            headers={['Campo', 'Descripción']}
            rows={[
              ['Nombre y apellido', 'Nombre completo del empleado'],
              ['Email',             'Correo electrónico (usuario de login)'],
              ['Contraseña',        'Contraseña inicial'],
              ['Rol',               'Administrador, Supervisor o Cajero'],
              ['Sucursal',          'Sucursal(es) a las que está asignado'],
            ]}
          />
          <Note type="warn">⚠️ Límite por plan: <strong>Emprendedor</strong> = 2 · <strong>Profesional</strong> = 5 · <strong>Empresarial</strong> = ilimitados.</Note>
          <p className="text-gray-600 text-sm mt-3">Un usuario inactivo no puede ingresar al sistema. Para reactivarlo, editá el usuario y cambiá su estado a "Activo".</p>
        </div>
      );

    case 'reportes':
      return (
        <div>
          <Screenshot
            title="Reportes de Ventas"
            src="/manual/reporte_ventas.png"
          />
          <DataTable
            headers={['Filtro', 'Opciones']}
            rows={[
              ['Período',        'Hoy, Esta semana, Este mes, Rango personalizado'],
              ['Sucursal',       'Todas o una específica (Admin)'],
              ['Cajero',         'Todos o filtrar por usuario'],
              ['Método de pago', 'Efectivo, Tarjeta, Transferencia o todos'],
            ]}
          />
          <Note>💡 Clic en "Exportar Excel" para descargar el reporte con los filtros aplicados actualmente.</Note>
        </div>
      );

    case 'stock':
      return (
        <div>
          <p className="text-gray-600 mb-4">Lista todos los productos cuyo stock está por debajo del mínimo configurado.</p>
          <Screenshot
            title="Alertas de Stock"
            src="/manual/alertas_stock.png"
          />
          <DataTable
            headers={['Nivel', 'Condición']}
            rows={[
              ['⚠️ Bajo',    'Stock actual ≤ stock mínimo configurado'],
              ['🔴 Crítico', 'Stock es 0 o negativo'],
            ]}
          />
          <Note>💡 El stock mínimo se configura al crear o editar cada producto. Sin mínimo, no se generan alertas.</Note>
        </div>
      );

    case 'notificaciones':
      return (
        <div>
          <DataTable
            headers={['Tipo', 'Cuándo se genera']}
            rows={[
              ['📦 Stock bajo',  'Cuando un producto cae por debajo del stock mínimo'],
              ['💼 Suscripción', 'Cuando quedan ≤ 7 días para el vencimiento del plan'],
              ['🛒 Ventas',      'Eventos importantes de ventas del día'],
              ['⚙️ Sistema',     'Actualizaciones y mensajes de la plataforma'],
            ]}
          />
        </div>
      );

    case 'configuracion':
      return (
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Apariencia</h3>
          <Steps items={[
            'Abrí la pestaña "Apariencia".',
            'Subí el logo de empresa (PNG, JPG, SVG). Aparecerá en el menú y los tickets.',
            'Personalizá el color principal. Se aplica a botones y acentos de toda la interfaz.',
            'Activá o desactivá el modo oscuro por defecto.',
            'Guardá los cambios.',
          ]} />
          <h3 className="font-semibold text-gray-800 mt-4 mb-2">Configuración AFIP</h3>
          <DataTable
            headers={['Parámetro', 'Descripción']}
            rows={[
              ['CUIT',           'CUIT de la empresa sin guiones'],
              ['Punto de venta', 'Número de PV habilitado en AFIP (4 dígitos)'],
              ['Certificado',    'Archivo .crt emitido por AFIP'],
              ['Clave privada',  'Archivo .key correspondiente al certificado'],
              ['Entorno',        'Homologación (pruebas) o Producción'],
            ]}
          />
          <Note>💡 <strong>Modo contingencia:</strong> Si AFIP no responde, la venta se procesa igualmente y el CAE se obtiene en diferido.</Note>
        </div>
      );

    case 'cuenta':
      return (
        <div>
          <DataTable
            headers={['Estado', 'Descripción', 'Acceso']}
            rows={[
              ['🔵 Trial',      'Período de prueba gratuito de 15 días',    '✅ Completo'],
              ['🟢 Activa',     'Suscripción vigente y pagada',              '✅ Completo'],
              ['🟡 Por vencer', 'Quedan ≤ 7 días',                          '✅ Con aviso'],
              ['🔴 Vencida',    'Fecha de vencimiento superada',             '⚠️ Gracia 15 días'],
              ['⚫ Suspendida', 'Período de gracia agotado sin renovación',  '❌ Bloqueado'],
            ]}
          />
          <h3 className="font-semibold text-gray-800 mt-4 mb-2">Renovar o cambiar de plan</h3>
          <Steps items={[
            'En Cuenta, elegí el plan deseado (mensual o anual).',
            'Clic en "Suscribirse" o "Cambiar a este plan".',
            'Serás redirigido a MercadoPago para completar el pago de forma segura.',
            'Una vez confirmado, la suscripción se activa automáticamente.',
          ]} />
          <Note>💡 El plan anual equivale a 11 meses: recibís un mes de regalo.</Note>
        </div>
      );

    case 'roles':
      return (
        <DataTable
          headers={['Módulo', 'Admin', 'Supervisor', 'Cajero']}
          rows={[
            ['Dashboard',            '✅ Completo',       '✅ Completo',    '✅ Limitado'],
            ['Gestión de Caja',      '✅ Completo',       '✅ Completo',    '✅ Abrir/Cerrar propia'],
            ['Punto de Venta',       '✅ Completo',       '✅ Completo',    '✅ Completo'],
            ['Devoluciones',         '✅ Completo',       '✅ Completo',    '✅ Completo'],
            ['Productos',            '✅ CRUD completo',  '—',             '—'],
            ['Categorías',           '✅ CRUD completo',  '—',             '—'],
            ['Sucursales',           '✅ CRUD completo',  '—',             '—'],
            ['Compras',              '✅ Completo',       '✅ Completo',    '—'],
            ['Usuarios',             '✅ CRUD completo',  '—',             '—'],
            ['Reportes de Ventas',   '✅ Todas sucursales','✅ Su sucursal','—'],
            ['Alertas de Stock',     '✅ Completo',       '✅ Completo',    '✅ Solo lectura'],
            ['Notificaciones',       '✅ Completo',       '—',             '—'],
            ['Configuración',        '✅ Completo',       '—',             '—'],
            ['Cuenta / Suscripción', '✅ Completo',       '—',             '—'],
          ]}
        />
      );

    case 'planes':
      return (
        <div>
          <DataTable
            headers={['Característica', 'Emprendedor', 'Profesional', 'Empresarial']}
            rows={[
              ['Usuarios',              '2',   '5',   'Ilimitados'],
              ['Sucursales',            '1',   '1',   'Ilimitadas'],
              ['POS / Ventas',          '✅',  '✅',  '✅'],
              ['Gestión de Caja',       '✅',  '✅',  '✅'],
              ['Inventario',            '✅',  '✅',  '✅'],
              ['Notificaciones',        '✅',  '✅',  '✅'],
              ['Reportes de Ventas',    '—',   '✅',  '✅'],
              ['Compras y Proveedores', '—',   '✅',  '✅'],
              ['Alertas de Stock',      '—',   '✅',  '✅'],
              ['Gestión de Usuarios',   '—',   '✅',  '✅'],
              ['Configuración avanzada','—',   '✅',  '✅'],
              ['Multi-Sucursal',        '—',   '—',   '✅'],
              ['Facturación AFIP',      '—',   '—',   '✅'],
            ]}
          />
          <Note>💡 Todos los planes incluyen <strong>15 días de prueba gratuita</strong> con acceso completo al plan Empresarial.</Note>
        </div>
      );

    default:
      return null;
  }
};

// ── Encuentra el contenedor con scroll ────────────────────────────────
function getScrollContainer(el) {
  let node = el?.parentElement;
  while (node && node !== document.body) {
    const { overflow, overflowY } = window.getComputedStyle(node);
    if (/auto|scroll/.test(overflow) || /auto|scroll/.test(overflowY)) return node;
    node = node.parentElement;
  }
  return window;
}

// ── Componente principal ───────────────────────────────────────────────
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

  // Detectar el contenedor de scroll una vez montado
  useEffect(() => {
    if (contentRef.current) {
      scrollContainerRef.current = getScrollContainer(contentRef.current);
    }
  }, []);

  // Actualizar sección activa al hacer scroll
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

  // Scroll a una sección compensando el topbar
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

      // Capturar todo el contenido (altura completa, sin scroll)
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
      const imgH     = canvas.height / ratio;       // altura total en mm
      const usableH  = pageH - margin * 2;
      let   srcY     = 0;                           // posición en canvas (px)

      while (srcY < canvas.height) {
        // Recortar un fragmento de una página
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

        {/* ── Nav lateral ── */}
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

        {/* ── Contenido ── */}
        <div className="flex-1 min-w-0">
          {/* Barra de acciones (fuera del área capturada) */}
          <div ref={topbarRef} className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <button
              onClick={() => navigate(-1)}
              className="btn btn-secondary flex items-center gap-2"
            >
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

          {/* Área capturada para el PDF */}
          <div ref={contentRef} className="max-w-3xl mx-auto px-4 sm:px-6 py-8 bg-white" id="manual-content">

            {/* Portada del PDF */}
            <div className="mb-10 pb-8 border-b-2 border-gray-200 text-center">
              <div className="text-4xl font-black mb-1" style={{ color: 'var(--primary)' }}>PULS Market</div>
              <div className="text-xl font-bold text-gray-800">Manual del Sistema</div>
              <div className="text-sm text-gray-500 mt-2">Rol: {rolLabel} · Versión 1.0 · Junio 2026</div>
            </div>

            {/* Secciones */}
            {visibleSections.map((s, idx) => (
              <section key={s.id} id={`sec-${s.id}`} className="mb-12 scroll-mt-16">
                {idx > 0 && <hr className="my-8 border-gray-200" />}
                <div className="flex items-center gap-3 pb-3 mb-5 m-sec-border">
                  <span className="m-sec-badge">{s.num}</span>
                  <h2 className="text-xl font-bold text-gray-900">{s.title}</h2>
                </div>
                <SectionContent id={s.id} />
              </section>
            ))}

            {/* Pie */}
            <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
              <div className="font-bold text-sm mb-1 m-icon-p">PULS Market</div>
              Manual del Sistema · Versión 1.0 · Junio 2026
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
