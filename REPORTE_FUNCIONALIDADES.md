# 📋 REPORTE DE FUNCIONALIDADES - MiniMarket POS

## 🎯 RESUMEN EJECUTIVO

**MiniMarket POS** es un sistema completo de punto de venta (POS) diseñado como plataforma **SaaS multi-tenant** para supermercados con gestión multi-sucursal. El sistema incluye gestión de inventario, ventas, caja, usuarios, reportes, compras, devoluciones, facturación electrónica AFIP/ARCA, suscripciones con MercadoPago y panel de administración para el propietario del SaaS.

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### Backend
- **Framework**: FastAPI (Python)
- **Base de Datos**: MongoDB (Motor - AsyncIOMotorClient)
- **Autenticación**: JWT (JSON Web Tokens)
- **Seguridad**: HTTPBearer, bcrypt para hash de contraseñas
- **API REST**: Endpoints bajo el prefijo `/api`
- **Routers**: `api_router` (clientes), `owner_router` (admin SaaS), `afip_router` (AFIP/ARCA)
- **Multi-tenant**: Cada empresa tiene su propio `empresa_id`

### Frontend
- **Framework**: React 19
- **Routing**: React Router DOM
- **UI Components**: Radix UI + Tailwind CSS
- **HTTP Client**: Axios
- **Estado**: Context API (AuthContext)
- **Build Tool**: CRACO (Create React App Configuration Override)

---

## 🔐 1. SISTEMA DE AUTENTICACIÓN Y AUTORIZACIÓN

### 1.1 Autenticación de Usuarios
- ✅ **Registro de empresa** (`POST /api/auth/empresa/register`)
  - Registro multi-tenant: crea empresa + usuario admin + suscripción trial

- ✅ **Registro de usuarios** (`POST /api/auth/register`)
  - Validación de email único
  - Hash de contraseñas con bcrypt
  - Asignación de roles y sucursales

- ✅ **Login de usuarios** (`POST /api/auth/login`)
  - Validación de credenciales
  - Generación de JWT tokens
  - Expiración de tokens (30 minutos por defecto)
  - Verificación de estado activo del usuario

- ✅ **Perfil del usuario** (`GET /api/auth/me`)
  - Restauración de sesión tras recarga de página

### 1.2 Control de Acceso Basado en Roles (RBAC)
- ✅ **Tres roles principales**:
  - **Admin**: Acceso completo al sistema
  - **Supervisor**: Acceso a reportes y supervisión
  - **Cajero**: Acceso limitado a POS y caja

- ✅ **Protección de rutas**:
  - Middleware de autenticación JWT
  - Validación de roles por endpoint
  - Redirección automática según permisos

### 1.3 Gestión de Sesiones
- ✅ Almacenamiento de token en localStorage
- ✅ Headers de autorización automáticos
- ✅ Context API para estado de autenticación global

---

## 👥 2. GESTIÓN DE USUARIOS

### 2.1 CRUD de Usuarios
- ✅ **Crear usuarios** (Solo Admin)
  - Nombre, email, contraseña
  - Asignación de rol (admin, supervisor, cajero)
  - Asignación a sucursal

- ✅ **Listar usuarios**
- ✅ **Editar usuarios**
- ✅ **Activar/Desactivar usuarios**

### 2.2 Asignación de Sucursales
- ✅ Usuarios pueden estar asignados a una sucursal específica
- ✅ Restricción de acceso según sucursal del usuario

---

## 🏪 3. GESTIÓN DE SUCURSALES (BRANCHES)

### 3.1 CRUD de Sucursales
- ✅ **Crear sucursales** (Solo Admin)
  - Nombre, dirección, teléfono
  - Estado activo/inactivo

- ✅ **Listar sucursales activas**
- ✅ **Obtener detalles de sucursal**
- ✅ **Gestión multi-sucursal**

### 3.2 Productos por Sucursal
- ✅ Cada sucursal tiene su propio inventario
- ✅ Precios independientes por sucursal
- ✅ Stock independiente por sucursal
- ✅ Productos pueden tener diferentes precios en diferentes sucursales
- ✅ **Exportar productos de sucursal** (`GET /api/branches/{id}/products/export`)

---

## 📦 4. GESTIÓN DE PRODUCTOS E INVENTARIO

### 4.1 CRUD de Productos
- ✅ **Crear productos** (Solo Admin)
  - Nombre, código de barras (opcional)
  - Tipo: `codigo_barras` o `por_peso`
  - Precio base y precio por peso
  - Categoría
  - Stock inicial y stock mínimo
  - Estado activo/inactivo

- ✅ **Listar productos activos**
- ✅ **Buscar producto por ID**
- ✅ **Buscar producto por código de barras**
- ✅ **Actualizar productos** (Solo Admin)
- ✅ **Validación de códigos de barras únicos**

### 4.2 Importación y Exportación de Productos
- ✅ **Exportar productos** (`GET /api/products/export`) — CSV descargable
- ✅ **Importar productos** (`POST /api/products/import`) — Carga masiva por CSV

### 4.3 Gestión de Categorías
- ✅ **Crear categorías** (Solo Admin)
  - Nombre y descripción

- ✅ **Listar todas las categorías**
- ✅ Organización de productos por categorías

### 4.4 Productos por Sucursal (Branch Products)
- ✅ **Asignar productos a sucursales**
  - Precio específico por sucursal
  - Precio por peso específico por sucursal
  - Stock por sucursal
  - Stock mínimo por sucursal

- ✅ **Listar productos de la sucursal actual**
  - Agregación con información del producto base
  - Filtrado por sucursal del usuario

- ✅ **Actualizar stock automáticamente** al realizar ventas

### 4.5 Control de Inventario
- ✅ **Actualización automática de stock** al procesar ventas
- ✅ **Validación de stock disponible** antes de vender
- ✅ **Alertas de stock bajo** (productos con stock ≤ stock mínimo)
- ✅ **Dashboard de productos con stock bajo**
- ✅ **Exportar alertas de stock** (`GET /api/dashboard/stock-alerts/export`)

---

## 🛒 5. PUNTO DE VENTA (POS)

### 5.1 Interfaz de Venta
- ✅ **Vista dividida**: Productos a la izquierda, Carrito a la derecha
- ✅ **Búsqueda de productos** por nombre o código de barras
- ✅ **Grid de productos** con información clave
- ✅ **Paginación de productos** (configurable)
- ✅ **Visualización de stock disponible**

### 5.2 Escaneo de Códigos de Barras
- ✅ **Tres modos de escaneo**:
  1. **Escáner USB/Bluetooth**: Detección automática de entrada rápida
  2. **Cámara web**: Escaneo visual con HTML5 QR Code
  3. **Manual**: Ingreso de código y presionar Enter

- ✅ **Detección automática de escáneres**:
  - Timeout configurable para detectar entrada de escáner
  - Indicador visual cuando se detecta escaneo automático
  - Auto-focus en campo de código de barras (configurable)

- ✅ **Componente BarcodeScanner**:
  - Acceso a cámara web
  - Escaneo en tiempo real
  - Feedback visual y sonoro

### 5.3 Gestión del Carrito
- ✅ **Agregar productos al carrito**
  - Click en producto o escaneo
  - Cantidad inicial de 1

- ✅ **Modificar cantidades**:
  - Botones +/-
  - Input numérico directo
  - Soporte para productos por peso (decimales)

- ✅ **Eliminar productos del carrito**
- ✅ **Vaciar carrito completo**
- ✅ **Cálculo automático de subtotales**

### 5.4 Cálculo de Totales
- ✅ **Subtotal**: Suma de precios × cantidades
- ✅ **Impuestos**: Configurable por sistema (default 12%)
- ✅ **Total**: Subtotal + Impuestos
- ✅ **Visualización clara** de desglose

### 5.5 Métodos de Pago
- ✅ **Tres métodos de pago**:
  - **Efectivo**
  - **Tarjeta**
  - **Transferencia**

- ✅ **Selección visual** con radio buttons
- ✅ **Registro del método** en cada venta

### 5.6 Procesamiento de Ventas
- ✅ **Validaciones antes de vender**:
  - Caja debe estar abierta
  - Usuario debe estar asignado a sucursal
  - Stock suficiente disponible
  - Producto debe estar activo en la sucursal

- ✅ **Generación automática de número de factura**:
  - Formato: `FAC-000001`, `FAC-000002`, etc.
  - Secuencial por sucursal

- ✅ **Actualización automática**:
  - Stock de productos
  - Sesión de caja (monto de ventas)
  - Movimientos de caja

- ✅ **Feedback al usuario**:
  - Sonidos de éxito/error (configurable)
  - Notificaciones toast
  - Número de factura generado

### 5.7 Sonidos del Sistema
- ✅ **Sonido de éxito** (800Hz, sine wave)
- ✅ **Sonido de error** (400Hz, sawtooth)
- ✅ **Activación/desactivación** configurable
- ✅ **Generación con Web Audio API**

### 5.8 Restricciones de Venta
- ✅ **Bloqueo si caja está cerrada**
- ✅ **Alerta visual** cuando no hay sesión de caja activa
- ✅ **Link directo** a gestión de caja

---

## 🔄 6. DEVOLUCIONES DE VENTAS

### 6.1 Procesamiento de Devoluciones
- ✅ **Devoluciones parciales**: Devolver solo algunos ítems de una venta
- ✅ **Devoluciones totales**: Devolver toda la factura
- ✅ **Número de devolución automático**: Formato `DEV-000001`, secuencial
- ✅ **Actualización automática de stock** al procesar devolución
- ✅ **Movimiento de caja** generado automáticamente por cada devolución

### 6.2 Estados de Ventas con Devolución
- ✅ **Estado `cancelado`**: Venta totalmente devuelta
- ✅ **Estado `devolucion_parcial`**: Venta parcialmente devuelta
- ✅ **Historial de devoluciones** por venta (`GET /api/sales/{id}/returns`)

---

## 💰 7. GESTIÓN DE CAJA (CASH MANAGEMENT)

### 7.1 Sesiones de Caja
- ✅ **Abrir sesión de caja**:
  - Monto inicial requerido
  - Observaciones opcionales
  - Validación: solo una sesión abierta por usuario
  - Creación automática de movimiento de apertura

- ✅ **Cerrar sesión de caja**:
  - Monto final requerido
  - Observaciones opcionales
  - Cálculo automático de:
    - Monto esperado
    - Diferencia (sobrante/faltante)
  - Creación automática de movimiento de cierre
  - Bloqueo de nuevas ventas al cerrar

### 7.2 Seguimiento de Caja
- ✅ **Monto inicial**: Dinero al abrir
- ✅ **Monto de ventas**: Suma de todas las ventas
- ✅ **Monto de retiros**: Retiros de efectivo
- ✅ **Monto esperado**: Cálculo teórico
- ✅ **Monto final**: Dinero real al cerrar
- ✅ **Diferencia**: Sobrante o faltante

### 7.3 Movimientos de Caja
- ✅ **Tipos de movimientos**:
  - `apertura`: Apertura de caja
  - `venta`: Cada venta realizada
  - `retiro`: Retiros de efectivo
  - `devolucion`: Devoluciones procesadas
  - `cierre`: Cierre de caja

- ✅ **Registro automático** de todos los movimientos
- ✅ **Historial completo** por sesión
- ✅ **Fecha y hora** de cada movimiento
- ✅ **Descripción** de cada movimiento

### 7.4 Reportes de Caja
- ✅ **Reporte detallado de sesión**:
  - Información de la sesión
  - Lista completa de movimientos
  - Lista de ventas realizadas
  - Información del usuario y sucursal
  - Resumen por método de pago:
    - Total de ventas
    - Ingresos en efectivo
    - Ingresos en tarjeta
    - Ingresos por transferencia

- ✅ **Historial de sesiones**:
  - Lista de todas las sesiones
  - Filtrado por usuario (cajeros ven solo las suyas)
  - Filtrado por sucursal (supervisores ven solo su sucursal)
  - Ordenamiento por fecha

### 7.5 Interfaz de Gestión de Caja
- ✅ **Vista de estado actual**:
  - Indicador visual de caja abierta/cerrada
  - Monto inicial mostrado
  - Botones para abrir/cerrar

- ✅ **Modal de apertura**:
  - Input de monto inicial
  - Campo de observaciones

- ✅ **Modal de cierre**:
  - Input de monto final
  - Campo de observaciones
  - Muestra diferencia calculada

---

## 🛍️ 8. MÓDULO DE COMPRAS

### 8.1 Gestión de Proveedores
- ✅ **Crear proveedores** (`POST /api/proveedores`)
  - Nombre, RUC/CUIT, email, teléfono, dirección

- ✅ **Listar proveedores** (`GET /api/proveedores`)
- ✅ **Editar proveedores** (`PUT /api/proveedores/{id}`)
- ✅ **Desactivar proveedores** (`DELETE /api/proveedores/{id}`) — soft delete

### 8.2 Facturas de Compra
- ✅ **Registrar compra** (`POST /api/compras`)
  - Selección de proveedor (opcional)
  - Selección de sucursal destino
  - Número de factura del proveedor
  - Fecha de compra
  - Líneas de ítems con:
    - Descripción / producto vinculado
    - Cantidad y precio unitario
    - Subtotal calculado automáticamente
    - Precio actual y margen actual (si está vinculado a producto)
  - Impuestos y total
  - Notas

- ✅ **Listar compras** (`GET /api/compras`)
  - Filtro por proveedor, sucursal, fecha

- ✅ **Ver detalle de compra** (`GET /api/compras/{id}`)
- ✅ **Editar compra** (`PUT /api/compras/{id}`)
- ✅ **Eliminar compra** (`DELETE /api/compras/{id}`)

### 8.3 Vinculación con Productos
- ✅ **Autocompletar** al tipear nombre de producto
- ✅ **Visualización de precio actual** y margen al vincular producto
- ✅ **Actualización de stock** al registrar compra

---

## 🧾 9. FACTURACIÓN ELECTRÓNICA AFIP/ARCA

### 9.1 Integración con ARCA (AFIP Argentina)
- ✅ **Solicitud de CAE** automática al procesar ventas
- ✅ **Modo contingencia**: si AFIP falla, la venta sigue procesándose
- ✅ **Almacenamiento de CAE** en la venta (`cae`, `cae_vto`, `nro_comprobante_afip`)

### 9.2 Configuración AFIP por Empresa
- ✅ **Certificado digital** y clave privada (encriptados en BD)
- ✅ **CUIT** de la empresa
- ✅ **Punto de venta** y tipo de comprobante por defecto
- ✅ **Estado de autorización**: `no_configurado`, `autorizado`, `contingencia`, `error`

### 9.3 Tipos de Comprobante
- ✅ Soporte para distintos tipos de comprobante (Factura A, B, C, etc.)
- ✅ Selección del tipo al procesar venta

---

## 📊 10. REPORTES Y ANALÍTICAS

### 10.1 Dashboard Principal
- ✅ **Estadísticas en tiempo real** (Admin y Supervisor):
  - **Ventas de hoy**: Total y cantidad de transacciones
  - **Total de productos**: Productos activos en el sistema
  - **Stock bajo**: Cantidad de productos con stock bajo

- ✅ **Alertas de stock bajo**:
  - Lista de productos con stock bajo
  - Muestra stock actual vs. stock mínimo
  - Limitado a 5 productos en vista rápida

### 10.2 Reportes de Ventas
- ✅ **Lista completa de ventas**:
  - Filtros por fecha:
    - Hoy
    - Última semana
    - Último mes
    - Rango personalizado
  - Ordenamiento por fecha (más reciente primero)

- ✅ **Estadísticas de ventas**:
  - Total de ventas (cantidad)
  - Ingresos totales
  - Promedio por venta
  - Desglose por método de pago:
    - Cantidad y total por efectivo
    - Cantidad y total por tarjeta
    - Cantidad y total por transferencia

- ✅ **Información detallada de cada venta**:
  - Número de factura
  - Fecha y hora
  - Cajero que realizó la venta
  - Items vendidos (producto, cantidad, precio)
  - Subtotal, impuestos, total
  - Método de pago
  - Estado AFIP (si aplica)

### 10.3 Alertas de Stock (StockAlerts)
- ✅ **Módulo dedicado** para alertas de stock bajo
- ✅ **Exportar alertas** a CSV/Excel

### 10.4 Reportes de Caja
- ✅ **Reporte detallado por sesión**:
  - Información completa de la sesión
  - Movimientos cronológicos
  - Ventas realizadas
  - Resumen financiero

### 10.5 Acciones Rápidas
- ✅ **Panel de acceso rápido** según rol:
  - **Cajero**: Ir a POS
  - **Admin**: Gestionar productos, ver reportes, gestionar usuarios
  - **Supervisor**: Realizar ventas, ver reportes

---

## 💳 11. SUSCRIPCIONES Y PAGOS (SaaS)

### 11.1 Gestión de Suscripción
- ✅ **Estados de suscripción**:
  - `trial`: Período de prueba inicial
  - `activa`: Suscripción vigente
  - `vencida`: Suscripción expirada
  - `suspendida`: Suspendida manualmente

- ✅ **Información de suscripción** (`GET /api/cuenta/status`):
  - Plan actual, estado, fecha de vencimiento
  - Días restantes
  - Precio y moneda

### 11.2 Planes Disponibles
- ✅ **Plan Mensual**: Renovación mes a mes
- ✅ **Plan Anual**: 12 meses al precio de 11 (1 mes gratis)
- ✅ **Consulta de precios** dinámicos (`GET /api/cuenta/planes`)

### 11.3 Integración MercadoPago
- ✅ **Crear preferencia de pago** (`POST /api/cuenta/pago/crear`)
  - Redirección segura a MercadoPago
  - Soporte para plan mensual y anual

- ✅ **Webhook** de MercadoPago para confirmación automática de pagos
- ✅ **Manejo de retorno**:
  - Éxito: notifica y actualiza suscripción
  - Falla: muestra error
  - Pendiente: informa estado

- ✅ **Simulación de pago** (modo desarrollo/test)

### 11.4 Historial de Pagos
- ✅ **Listar pagos** (`GET /api/cuenta/pagos`)
  - Fecha, concepto, monto, estado
  - Período de vigencia (inicio–fin)
  - ID de pago de MercadoPago
  - Estados: `approved`, `pending`, `rejected`, `cancelled`

### 11.5 Alertas de Vencimiento
- ✅ **Alerta visual** cuando la suscripción vence en ≤ 7 días
- ✅ **Alerta de suscripción vencida** con botón de reactivación
- ✅ **Días restantes** mostrados en la interfaz

---

## 🔔 12. NOTIFICACIONES

### 12.1 Sistema de Notificaciones
- ✅ **Notificaciones automáticas** generadas por el sistema:
  - `plan_por_vencer_10`: Aviso a 10 días del vencimiento
  - `plan_por_vencer_5`: Aviso a 5 días del vencimiento

- ✅ **Listado de notificaciones** (`GET /api/notificaciones`)
  - Paginación (máximo 50 en vista)
  - Título, mensaje, tipo, fecha
  - Estado leído/no leído

- ✅ **Contador de no leídas** (`GET /api/notificaciones/count`)

### 12.2 Gestión de Notificaciones
- ✅ **Marcar como leída** (`PUT /api/notificaciones/{id}/leer`)
- ✅ **Marcar todas como leídas** (`PUT /api/notificaciones/leer-todas`)
- ✅ **Indicador visual** de no leídas en la interfaz

---

## 🛠️ 13. PANEL DEL OWNER (SaaS Admin)

### 13.1 Autenticación del Owner
- ✅ **Login separado** con credenciales propias del propietario del SaaS
- ✅ **Token independiente** del sistema de clientes

### 13.2 Estadísticas Globales
- ✅ **Resumen de clientes**: total, activos, trial, vencidos
- ✅ **Estadísticas de ingresos**: métricas de suscripciones

### 13.3 Gestión de Clientes (Empresas)
- ✅ **Listar clientes** (`GET /owner/clientes`)
  - Nombre, estado, plan, fecha de vencimiento, saldo

- ✅ **Ver detalle de cliente** (`GET /owner/clientes/{empresa_id}`)
- ✅ **Modificar suscripción** (`PUT /owner/clientes/{empresa_id}/suscripcion`)
  - Cambiar estado, plan, fecha de vencimiento

- ✅ **Registrar pago manual** (`POST /owner/clientes/{empresa_id}/pago`)
- ✅ **Activar/Desactivar cliente** (`PUT /owner/clientes/{empresa_id}/activo`)

### 13.4 Configuración Global del Sistema
- ✅ **Ver configuración** (`GET /owner/config`)
  - Precio mensual, precio anual, nombre del plan

- ✅ **Actualizar precios** (`PUT /owner/config`)

### 13.5 Alertas y Vencimientos
- ✅ **Listar suscripciones próximas a vencer** (`GET /owner/alertas`)
- ✅ **Generar notificaciones de vencimiento** (`POST /owner/alertas/generar`)
  - Genera alertas para clientes a 5 y 10 días del vencimiento

---

## ⚙️ 14. CONFIGURACIÓN DEL SISTEMA

### 14.1 Información de la Empresa
- ✅ **Datos básicos**:
  - Nombre de la empresa
  - Dirección
  - Teléfono
  - Email
  - Número de identificación fiscal (RUC/NIT)

### 14.2 Configuración Financiera
- ✅ **Tasa de impuestos**: Configurable (default 12%)
- ✅ **Símbolo de moneda**: Configurable (default $)
- ✅ **Código de moneda**: Configurable (default USD)

### 14.3 Configuración de POS
- ✅ **Sonidos habilitados/deshabilitados**
- ✅ **Auto-focus en código de barras**
- ✅ **Timeout de escaneo**: Milisegundos para detectar escáner (default 100ms)
- ✅ **Texto de pie de recibo**: Personalizable

### 14.4 Configuración de Inventario
- ✅ **Stock mínimo por defecto**: Para nuevos productos (default 10)
- ✅ **Alertas de stock bajo**: Habilitar/deshabilitar
- ✅ **Actualización automática de inventario**: Habilitar/deshabilitar

### 14.5 Configuración de Interfaz
- ✅ **Formato de fecha**: Configurable (default DD/MM/YYYY)
- ✅ **Formato de hora**: 12h o 24h (default 24h)
- ✅ **Idioma**: Configurable (default es)
- ✅ **Items por página**: Para paginación (default 10)
- ✅ **Tema de color**: Color primario, secundario y terciario personalizables

### 14.6 Configuración de Recibos
- ✅ **Impresión automática**: Habilitar/deshabilitar
- ✅ **Ancho de recibo**: En caracteres (default 80)

### 14.7 Branding
- ✅ **Logo de la empresa**:
  - Subida de imagen (máx. 2MB)
  - Validación de tipo de archivo (solo imágenes)
  - Almacenamiento en base64
  - Visualización en sistema

### 14.8 Interfaz de Configuración
- ✅ **Tabs organizados**:
  - Empresa
  - Finanzas
  - Punto de Venta
  - Inventario
  - Interfaz
  - Sistema
  - Recibos

- ✅ **Guardado de configuración** con validación
- ✅ **Carga de configuración** al iniciar sistema

---

## 🔍 15. BÚSQUEDA Y FILTROS

### 15.1 Búsqueda de Productos
- ✅ **Búsqueda por nombre**: Búsqueda parcial case-insensitive
- ✅ **Búsqueda por código de barras**: Búsqueda exacta
- ✅ **Filtrado en tiempo real** mientras se escribe

### 15.2 Filtros de Reportes
- ✅ **Filtros por fecha**:
  - Hoy
  - Última semana
  - Último mes
  - Rango personalizado (desde-hasta)

- ✅ **Filtros por método de pago** (en reportes)
- ✅ **Filtros por sucursal** (según permisos)

### 15.3 Paginación
- ✅ **Paginación de productos** en POS
- ✅ **Paginación de ventas** en reportes
- ✅ **Items por página configurable**

---

## 📱 16. INTERFAZ DE USUARIO

### 16.1 Diseño Responsive
- ✅ **Layout adaptativo**:
  - Sidebar colapsable
  - Grid responsive para productos
  - Modales adaptativos

- ✅ **Componentes UI modernos**:
  - Radix UI primitives
  - Tailwind CSS para estilos
  - Iconos Lucide React

### 16.2 Navegación
- ✅ **Sidebar con menú**:
  - Dashboard
  - Punto de Venta
  - Productos (solo Admin)
  - Ventas/Reportes (Admin y Supervisor)
  - Usuarios (solo Admin)
  - Configuración (solo Admin)
  - Gestión de Caja
  - Compras (Admin)
  - Mi Cuenta
  - Notificaciones

- ✅ **Rutas protegidas** según rol
- ✅ **Indicadores visuales** de página activa
- ✅ **Badge de notificaciones no leídas** en menú

### 16.3 Feedback Visual
- ✅ **Notificaciones toast** (Sonner):
  - Éxito (verde)
  - Error (rojo)
  - Información (azul)
  - Advertencia (amarillo)

- ✅ **Estados de carga**:
  - Spinners en operaciones asíncronas
  - Botones deshabilitados durante procesamiento

- ✅ **Validaciones visuales**:
  - Campos requeridos
  - Errores de formulario
  - Confirmaciones de acción

### 16.4 Landing Page
- ✅ **Página pública** de presentación del sistema (`/`)
- ✅ **Separación** entre rutas públicas y autenticadas

### 16.5 Accesibilidad
- ✅ **Navegación por teclado**
- ✅ **Focus management**
- ✅ **Labels descriptivos**
- ✅ **Contraste adecuado**

---

## 🔒 17. SEGURIDAD

### 17.1 Autenticación
- ✅ **JWT tokens** con expiración
- ✅ **Hash de contraseñas** con bcrypt
- ✅ **Validación de credenciales** en backend

### 17.2 Autorización
- ✅ **Middleware de roles** en backend
- ✅ **Protección de rutas** en frontend
- ✅ **Validación de permisos** por endpoint
- ✅ **Aislamiento multi-tenant** por `empresa_id`

### 17.3 Validaciones
- ✅ **Validación de datos** en backend (Pydantic)
- ✅ **Validación de stock** antes de vender
- ✅ **Validación de sesión de caja** antes de vender
- ✅ **Validación de códigos de barras únicos**
- ✅ **Encriptación de claves AFIP** en base de datos

### 17.4 CORS
- ✅ **Configuración CORS** configurable
- ✅ **Orígenes permitidos** desde variables de entorno

---

## 🗄️ 18. BASE DE DATOS

### 18.1 Colecciones MongoDB
- ✅ **users**: Usuarios del sistema
- ✅ **branches**: Sucursales
- ✅ **products**: Productos base
- ✅ **branch_products**: Productos por sucursal (inventario)
- ✅ **categories**: Categorías de productos
- ✅ **sales**: Ventas realizadas
- ✅ **sale_returns**: Devoluciones de ventas
- ✅ **cash_sessions**: Sesiones de caja
- ✅ **cash_movements**: Movimientos de caja
- ✅ **configuration**: Configuración del sistema
- ✅ **suscripciones**: Suscripciones por empresa
- ✅ **pagos**: Historial de pagos
- ✅ **notificaciones**: Notificaciones de sistema
- ✅ **proveedores**: Proveedores de compras
- ✅ **compras**: Facturas de compra
- ✅ **system_config**: Configuración global del SaaS
- ✅ **afip_config**: Configuración AFIP por empresa

### 18.2 Relaciones
- ✅ **Productos ↔ Categorías**: Relación por categoria_id
- ✅ **Productos ↔ Sucursales**: Relación a través de branch_products
- ✅ **Ventas ↔ Usuarios**: Relación por cajero_id
- ✅ **Ventas ↔ Sucursales**: Relación por branch_id
- ✅ **Ventas ↔ Sesiones de Caja**: Relación por session_id
- ✅ **Usuarios ↔ Sucursales**: Relación por branch_id
- ✅ **Todo ↔ Empresa**: Aislamiento por empresa_id (multi-tenant)
- ✅ **Compras ↔ Proveedores**: Relación por proveedor_id
- ✅ **Devoluciones ↔ Ventas**: Relación por sale_id

---

## 🚀 19. FUNCIONALIDADES ADICIONALES

### 19.1 Inicialización de Base de Datos
- ✅ **Script de inicialización** (`scripts/init_db.py`):
  - Creación de usuarios de prueba
  - Creación de categorías de ejemplo
  - Creación de productos de ejemplo
  - Creación de sucursales
  - Asignación de productos a sucursales
  - Configuración por defecto

### 19.2 Logging
- ✅ **Sistema de logging** configurado
- ✅ **Nivel de log**: INFO
- ✅ **Formato estructurado** de logs

### 19.3 Manejo de Errores
- ✅ **Manejo centralizado** de errores HTTP
- ✅ **Mensajes de error descriptivos**
- ✅ **Códigos de estado HTTP apropiados**

### 19.4 Variables de Entorno
- ✅ **Configuración mediante .env**:
  - MONGO_URL: URL de conexión a MongoDB
  - DB_NAME: Nombre de la base de datos
  - JWT_SECRET: Clave secreta para JWT
  - CORS_ORIGINS: Orígenes permitidos para CORS
  - OWNER_USERNAME / OWNER_PASSWORD: Credenciales del panel owner
  - MERCADOPAGO_ACCESS_TOKEN: Token de MercadoPago

---

## 📈 20. MÉTRICAS Y ESTADÍSTICAS

### 20.1 Métricas de Ventas
- ✅ Total de ventas del día
- ✅ Cantidad de transacciones
- ✅ Promedio por venta
- ✅ Desglose por método de pago

### 20.2 Métricas de Inventario
- ✅ Total de productos activos
- ✅ Productos con stock bajo
- ✅ Stock actual por producto

### 20.3 Métricas de Caja
- ✅ Monto inicial vs. final
- ✅ Diferencia (sobrante/faltante)
- ✅ Total de ventas por sesión
- ✅ Movimientos por tipo

### 20.4 Métricas del Owner (SaaS)
- ✅ Total de clientes registrados
- ✅ Clientes activos, trial, vencidos
- ✅ Ingresos por suscripciones

---

## 🎨 21. EXPERIENCIA DE USUARIO

### 21.1 Flujo de Trabajo del Cajero
1. ✅ Login al sistema
2. ✅ Verificar/abrir caja
3. ✅ Ir a POS
4. ✅ Escanear/buscar productos
5. ✅ Agregar al carrito
6. ✅ Seleccionar método de pago
7. ✅ Procesar venta (con CAE AFIP automático)
8. ✅ Procesar devoluciones si corresponde
9. ✅ Cerrar caja al final del turno

### 21.2 Flujo de Trabajo del Admin
1. ✅ Login al sistema
2. ✅ Ver dashboard con estadísticas
3. ✅ Gestionar productos y categorías (con importación masiva)
4. ✅ Gestionar usuarios
5. ✅ Ver reportes de ventas
6. ✅ Gestionar compras y proveedores
7. ✅ Configurar sistema (colores, impuestos, AFIP, etc.)
8. ✅ Supervisar cajas
9. ✅ Gestionar suscripción y pagos desde "Mi Cuenta"

### 21.3 Optimizaciones de UX
- ✅ **Auto-focus** en campos críticos
- ✅ **Detección automática** de escáneres
- ✅ **Feedback inmediato** con sonidos y notificaciones
- ✅ **Validaciones en tiempo real**
- ✅ **Carga asíncrona** de datos
- ✅ **Estados de carga** claros
- ✅ **Tema de color** personalizable con variables CSS

---

## 🔧 22. TECNOLOGÍAS Y DEPENDENCIAS

### Backend
- FastAPI 0.110.1
- Motor 3.3.1 (MongoDB async driver)
- PyJWT 2.10.1
- Passlib 1.7.4 (bcrypt)
- Python-dotenv 1.1.1
- Uvicorn 0.25.0
- MercadoPago SDK (pagos online)

### Frontend
- React 19.0.0
- React Router DOM 7.5.1
- Axios 1.8.4
- Radix UI (múltiples componentes)
- Tailwind CSS 3.4.17
- Lucide React 0.507.0 (iconos)
- Sonner 2.0.3 (notificaciones)
- HTML5 QR Code 2.3.8 (escáner)
- React Hook Form 7.56.2
- Zod 3.24.4 (validación)

---

## 📝 23. ENDPOINTS DE LA API

### Autenticación
- `POST /api/auth/empresa/register` - Registrar empresa (multi-tenant)
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Perfil del usuario autenticado

### Sucursales
- `POST /api/branches` - Crear sucursal (Admin)
- `GET /api/branches` - Listar sucursales
- `GET /api/branches/{id}` - Obtener sucursal
- `PUT /api/branches/{id}` - Actualizar sucursal
- `GET /api/branches/{id}/products` - Productos de la sucursal
- `GET /api/branches/{id}/products/export` - Exportar productos de sucursal

### Productos
- `POST /api/products` - Crear producto (Admin)
- `GET /api/products` - Listar productos
- `GET /api/products/export` - Exportar productos CSV
- `POST /api/products/import` - Importar productos CSV
- `GET /api/products/{id}` - Obtener producto
- `GET /api/products/barcode/{barcode}` - Buscar por código de barras
- `PUT /api/products/{id}` - Actualizar producto (Admin)

### Productos por Sucursal
- `POST /api/branch-products` - Asignar producto a sucursal (Admin)
- `GET /api/branch-products` - Listar productos de la sucursal
- `PUT /api/branch-products/{id}` - Actualizar producto en sucursal
- `DELETE /api/branch-products/{id}` - Eliminar producto de sucursal

### Categorías
- `POST /api/categories` - Crear categoría (Admin)
- `GET /api/categories` - Listar categorías

### Ventas
- `POST /api/sales` - Crear venta
- `GET /api/sales` - Listar ventas
- `GET /api/sales/{id}/returns` - Devoluciones de una venta
- `POST /api/sales/{id}/return` - Procesar devolución

### Sesiones de Caja
- `POST /api/cash-sessions` - Abrir sesión
- `PUT /api/cash-sessions/{id}/close` - Cerrar sesión
- `GET /api/cash-sessions/current` - Sesión actual
- `GET /api/cash-sessions` - Listar sesiones
- `GET /api/cash-sessions/{id}/movements` - Movimientos de sesión
- `GET /api/cash-sessions/{id}/report` - Reporte de sesión

### Proveedores
- `POST /api/proveedores` - Crear proveedor
- `GET /api/proveedores` - Listar proveedores
- `PUT /api/proveedores/{id}` - Actualizar proveedor
- `DELETE /api/proveedores/{id}` - Desactivar proveedor

### Compras
- `POST /api/compras` - Registrar compra
- `GET /api/compras` - Listar compras
- `GET /api/compras/{id}` - Detalle de compra
- `PUT /api/compras/{id}` - Actualizar compra
- `DELETE /api/compras/{id}` - Eliminar compra

### Configuración
- `GET /api/config` - Obtener configuración
- `PUT /api/config` - Actualizar configuración (Admin)
- `POST /api/config/upload-logo` - Subir logo (Admin)

### Dashboard
- `GET /api/dashboard/stats` - Estadísticas (Admin/Supervisor)
- `GET /api/dashboard/stock-alerts` - Alertas de stock bajo
- `GET /api/dashboard/stock-alerts/export` - Exportar alertas de stock

### Cuenta / Suscripción
- `GET /api/cuenta/status` - Estado de suscripción
- `GET /api/cuenta/pagos` - Historial de pagos
- `GET /api/cuenta/planes` - Planes disponibles y precios
- `POST /api/cuenta/pago/crear` - Crear preferencia de pago MercadoPago
- `POST /api/cuenta/pago/simular-aprobado` - Simular pago (dev/test)

### Notificaciones
- `GET /api/notificaciones` - Listar notificaciones
- `GET /api/notificaciones/count` - Cantidad de no leídas
- `PUT /api/notificaciones/{id}/leer` - Marcar como leída
- `PUT /api/notificaciones/leer-todas` - Marcar todas como leídas

### Panel Owner (SaaS Admin) — `/owner`
- `POST /owner/login` - Login del owner
- `GET /owner/stats` - Estadísticas globales
- `GET /owner/clientes` - Listar empresas/clientes
- `GET /owner/clientes/{id}` - Detalle de cliente
- `PUT /owner/clientes/{id}/suscripcion` - Modificar suscripción
- `POST /owner/clientes/{id}/pago` - Registrar pago manual
- `PUT /owner/clientes/{id}/activo` - Activar/desactivar cliente
- `GET /owner/config` - Configuración global del SaaS
- `PUT /owner/config` - Actualizar configuración global
- `GET /owner/alertas` - Suscripciones próximas a vencer
- `POST /owner/alertas/generar` - Generar notificaciones de vencimiento

---

## ✅ 24. VALIDACIONES Y REGLAS DE NEGOCIO

### Ventas
- ✅ No se puede vender sin caja abierta
- ✅ No se puede vender sin stock suficiente
- ✅ No se puede vender productos inactivos
- ✅ El producto debe existir en la sucursal
- ✅ Integración AFIP en modo contingencia si el servicio falla

### Devoluciones
- ✅ No se puede devolver más cantidad de la vendida
- ✅ Se actualiza el stock al devolver
- ✅ Se genera movimiento de caja automático

### Caja
- ✅ Solo una sesión abierta por usuario
- ✅ No se puede cerrar una sesión ya cerrada
- ✅ Cálculo automático de diferencia

### Productos
- ✅ Códigos de barras únicos
- ✅ Categoría debe existir antes de crear producto
- ✅ Stock no puede ser negativo

### Usuarios
- ✅ Email único
- ✅ Debe estar asignado a sucursal para operaciones de venta

### Suscripciones
- ✅ Solo una suscripción activa por empresa
- ✅ Renovación extiende desde la fecha de vencimiento actual
- ✅ Plan anual suma 12 meses

---

## 🎯 25. CASOS DE USO PRINCIPALES

1. **Venta rápida en caja**: Cajero escanea productos, procesa venta con CAE AFIP automático
2. **Gestión de inventario**: Admin agrega productos (manual o importación masiva), actualiza stock
3. **Apertura/cierre de caja**: Cajero abre caja al inicio, cierra al final
4. **Reportes de ventas**: Supervisor/Admin revisa ventas del día
5. **Configuración del sistema**: Admin personaliza impuestos, logo, colores, etc.
6. **Gestión multi-sucursal**: Admin gestiona productos por sucursal
7. **Alertas de stock**: Sistema alerta cuando productos están bajos
8. **Devoluciones**: Cajero/Admin procesa devoluciones parciales o totales
9. **Registro de compras**: Admin registra facturas de proveedores
10. **Gestión de suscripción**: Admin renueva su plan desde "Mi Cuenta" vía MercadoPago
11. **Panel Owner**: Propietario del SaaS gestiona todos los clientes y sus suscripciones

---

## 📊 RESUMEN DE FUNCIONALIDADES POR MÓDULO

| Módulo | Funcionalidades Principales |
|--------|---------------------------|
| **Autenticación** | Login, Registro multi-tenant, JWT, Roles |
| **Usuarios** | CRUD, Asignación de roles y sucursales |
| **Sucursales** | CRUD, Gestión multi-sucursal, Exportar inventario |
| **Productos** | CRUD, Categorías, Códigos de barras, Stock, Import/Export |
| **Inventario** | Stock por sucursal, Alertas, Actualización automática, Export |
| **POS** | Escaneo, Carrito, Cálculo, Procesamiento de ventas |
| **Devoluciones** | Parciales/totales, Stock automático, Movimiento de caja |
| **Caja** | Apertura, Cierre, Movimientos (incl. devoluciones), Reportes |
| **Compras** | CRUD Proveedores, Facturas de compra, Vinculación productos |
| **Ventas** | Procesamiento, Facturación, Historial, Devoluciones |
| **AFIP/ARCA** | CAE automático, Contingencia, Configuración por empresa |
| **Reportes** | Dashboard, Estadísticas, Filtros, Stock Alerts |
| **Suscripciones** | Planes, MercadoPago, Historial de pagos |
| **Notificaciones** | Alertas de vencimiento, Marcar leídas |
| **Panel Owner** | Gestión de clientes, Suscripciones, Configuración global |
| **Configuración** | Empresa, Finanzas, POS, Inventario, Interfaz, Colores |

---

## 🎉 CONCLUSIÓN

El sistema **MiniMarket POS** ha evolucionado a una plataforma **SaaS multi-tenant completa** para la gestión de punto de venta en supermercados. Incorpora funcionalidades avanzadas de inventario, caja, reportes, compras a proveedores, devoluciones, facturación electrónica AFIP/ARCA (Argentina), pagos con MercadoPago y un panel de administración para el propietario del SaaS. El sistema está diseñado para ser escalable, seguro y fácil de usar, con soporte para múltiples empresas, sucursales y roles de usuario.

**Total de funcionalidades documentadas: 200+**

---

*Reporte actualizado el: 08/03/2026*
