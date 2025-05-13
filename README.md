# Sistema de Gestión de Habitaciones con QR

## 🌟 Características Principales

### 🏨 Portal de Huéspedes
- Acceso fácil mediante códigos QR
- Interfaz intuitiva para huéspedes
- Gestión de servicios y solicitudes

### 👩‍💼 Panel de Recepción
- Dashboard administrativo completo
- Gestión de check-in/check-out
- Monitoreo en tiempo real de habitaciones

### 🔐 Sistema de Códigos QR
- Generación dinámica de códigos QR
- Asignación de habitaciones
- Control de acceso seguro

## 🚀 Tecnologías Utilizadas

- ⚛️ React 18
- 🏃‍♂️ Vite
- 💾 Supabase
- 🎨 Tailwind CSS + Shadcn/UI
- 📱 Diseño Responsive
- 🔄 TanStack Query

## 📱 Rutas de la Aplicación

- `/` - Página principal
- `/guest` - Portal de huéspedes
- `/reception` - Login de recepción
- `/reception/dashboard` - Panel de control de recepción
- `/qr-code` - Administración de códigos QR
- `/qr-code/:roomId` - Visualización de QR específico

## 🛠️ Instalación

```bash
# Clonar el repositorio
git clone [URL_DEL_REPOSITORIO]

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Iniciar en desarrollo
npm run dev

# Construir para producción
npm run build
```

## 🔧 Configuración de Supabase

1. Crear una cuenta en Supabase
2. Crear un nuevo proyecto
3. Copiar las credenciales de la API
4. Configurar las variables de entorno

## 📦 Variables de Entorno Necesarias

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima
```

## 🖥️ Previsualización de la Aplicación

### Portal de Huéspedes
- Interfaz moderna y limpia
- Acceso rápido mediante QR
- Solicitud de servicios en tiempo real

### Dashboard de Recepción
- Vista general de habitaciones
- Gestión de huéspedes
- Estadísticas en tiempo real

### Administración de QR
- Generación de códigos
- Asignación a habitaciones
- Control de accesos

## 👥 Roles de Usuario

### Huéspedes
- Escaneo de QR
- Solicitud de servicios
- Vista de información de habitación

### Recepcionistas
- Gestión de check-in/check-out
- Monitoreo de habitaciones
- Atención de solicitudes

### Administradores
- Gestión de códigos QR
- Configuración del sistema
- Reportes y estadísticas

## 📊 Estructura del Proyecto

```
src/
├── components/     # Componentes reutilizables
├── pages/         # Páginas principales
├── hooks/         # Hooks personalizados
├── lib/           # Utilidades y configuraciones
├── types/         # Definiciones de TypeScript
└── utils/         # Funciones auxiliares
```

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor, sigue estos pasos:

1. Fork el repositorio
2. Crea una rama para tu feature
3. Realiza tus cambios
4. Envía un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.
