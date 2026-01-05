# 🏋️ Inti-Gym Ayacucho - Sistema de Gestión Premium

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=for-the-badge&logo=supabase)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=for-the-badge&logo=tailwind-css)

Sistema de gestión completo para gimnasios con diseño moderno, autenticación segura y tracking de pagos individual.

[Demo en Vivo](https://tu-demo.vercel.app) · [Reportar Bug](https://github.com/tu-usuario/sistema-gym/issues) · [Solicitar Feature](https://github.com/tu-usuario/sistema-gym/issues)

</div>

---

## ✨ Características Principales

### 🎨 Interfaz Moderna
- **Dark Mode Premium**: Diseño oscuro elegante con acentos dorados
- **Glassmorphism**: Efectos visuales modernos con blur y transparencias
- **Responsive Design**: Optimizado para móvil, tablet y desktop
- **Animaciones Fluidas**: Transiciones suaves con Framer Motion

### 👥 Gestión de Clientes
- CRUD completo de socios
- Generación automática de códigos QR basados en DNI
- Subida y almacenamiento de fotos de perfil
- Búsqueda y filtrado rápido
- Historial completo de membresías

### 💰 Sistema de Pagos Avanzado
- **Pagos Parciales**: Soporte para pagos en múltiples transacciones
- **Múltiples Métodos**: Efectivo y Yape
- **Historial Detallado**: Registro individual de cada transacción
- **Dashboard Estadístico**: Desglose de ingresos por método de pago
- **Tracking de Deudas**: Visualización clara de pagos pendientes

### 🔐 Seguridad
- Autenticación con Supabase Auth
- Row Level Security (RLS) en base de datos
- Protección de rutas privadas
- Gestión segura de sesiones

### 📊 Dashboard Inteligente
- Estadísticas en tiempo real
- Total de socios activos
- Ingresos del mes
- Pagos pendientes y vencidos
- Desglose por método de pago con gráficos animados

### 📱 Funcionalidades Adicionales
- Escáner QR para acceso rápido
- Gestión de planes personalizables
- Renovación automática de membresías
- Notificaciones con toast messages

---

## 🚀 Inicio Rápido

### Requisitos Previos

- Node.js 18+ ([Descargar](https://nodejs.org/))
- Cuenta de Supabase ([Crear cuenta gratis](https://supabase.com))
- Git

### Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/sistema-gym.git
cd sistema-gym
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

> 💡 Obtén estas credenciales desde [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API

4. **Configurar Base de Datos**

Ejecuta los siguientes scripts SQL en Supabase SQL Editor:

#### a) Tabla de Clientes
```sql
CREATE TABLE clientes (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  dni TEXT NOT NULL UNIQUE,
  telefono TEXT,
  email TEXT,
  fecha_nacimiento DATE,
  genero TEXT,
  direccion TEXT,
  plan TEXT NOT NULL,
  fecha_inicio DATE,
  fecha_vencimiento DATE,
  estado_pago TEXT NOT NULL DEFAULT 'al-dia' CHECK (estado_pago IN ('al-dia', 'vencido')),
  monto_pagado DECIMAL(10, 2) DEFAULT 0,
  metodo_pago VARCHAR(50) CHECK (metodo_pago IN ('efectivo', 'yape')),
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_clientes_dni ON clientes(dni);
CREATE INDEX idx_clientes_estado_pago ON clientes(estado_pago);
```

#### b) Tabla de Historial de Pagos
```sql
CREATE TABLE historial_pagos (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  monto DECIMAL(10, 2) NOT NULL,
  metodo_pago VARCHAR(50) NOT NULL CHECK (metodo_pago IN ('efectivo', 'yape')),
  concepto VARCHAR(255) DEFAULT 'Pago de membresía',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_historial_pagos_cliente_id ON historial_pagos(cliente_id);
CREATE INDEX idx_historial_pagos_created_at ON historial_pagos(created_at);
CREATE INDEX idx_historial_pagos_metodo_pago ON historial_pagos(metodo_pago);
```

#### c) Tabla de Configuración
```sql
CREATE TABLE configuracion (
  id BIGSERIAL PRIMARY KEY,
  nombre_plan TEXT NOT NULL UNIQUE,
  precio DECIMAL(10, 2) NOT NULL,
  duracion_dias INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Planes por defecto
INSERT INTO configuracion (nombre_plan, precio, duracion_dias) VALUES
  ('Mensual', 60.00, 30),
  ('Trimestral', 100.00, 90),
  ('Semestral', 180.00, 180);
```

#### d) Habilitar RLS (Row Level Security)
```sql
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso (ajustar según necesidades)
CREATE POLICY "Enable all for authenticated users" ON clientes FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON historial_pagos FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON configuracion FOR ALL USING (true);
```

5. **Configurar Storage**

En Supabase Dashboard → Storage:
- Crear bucket: `fotos-clientes`
- Configurar como público para lectura

```sql
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'fotos-clientes');

CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'fotos-clientes' AND auth.role() = 'authenticated');
```

6. **Crear usuario administrador**

En Supabase Dashboard → Authentication → Add User:
- Email: `admin@intigym.com`
- Password: (tu contraseña segura)

7. **Ejecutar el proyecto**
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 📁 Estructura del Proyecto

```
sistema-gym/
├── src/
│   ├── app/                    # App Router de Next.js
│   │   ├── page.tsx           # Dashboard principal
│   │   ├── clientes/          # Gestión de clientes
│   │   ├── pagos/             # Historial de pagos
│   │   ├── acceso/            # Control de acceso con QR
│   │   ├── configuracion/     # Configuración de planes
│   │   └── login/             # Autenticación
│   ├── components/            # Componentes reutilizables
│   │   ├── AddMemberModal.tsx
│   │   ├── EditMemberModal.tsx
│   │   ├── QRScannerModal.tsx
│   │   ├── QRViewModal.tsx
│   │   ├── Sidebar.tsx
│   │   └── ...
│   └── lib/
│       ├── supabase.ts        # Cliente de Supabase
│       └── supabase-browser.ts
├── public/
│   └── intigym-logo.png       # Logo del gimnasio
└── .env.local                 # Variables de entorno (no commitear)
```

---

## 🛠️ Tecnologías

| Tecnología | Uso |
|------------|-----|
| [Next.js 16](https://nextjs.org/) | Framework React con App Router |
| [TypeScript](https://www.typescriptlang.org/) | Tipado estático |
| [Tailwind CSS 4](https://tailwindcss.com/) | Estilos utility-first |
| [Supabase](https://supabase.com/) | Backend as a Service (Auth, DB, Storage) |
| [Framer Motion](https://www.framer.com/motion/) | Animaciones |
| [Lucide React](https://lucide.dev/) | Iconos |
| [QRCode.react](https://www.npmjs.com/package/qrcode.react) | Generación de QR |
| [html5-qrcode](https://www.npmjs.com/package/html5-qrcode) | Escáner QR |
| [Sonner](https://sonner.emilkowal.ski/) | Toast notifications |

---

## 📸 Screenshots

> 🚧 Agregar screenshots del sistema

---

## 🚢 Deployment

### Vercel (Recomendado)

1. Push tu código a GitHub
2. Importa el proyecto en [Vercel](https://vercel.com)
3. Configura las variables de entorno
4. Deploy automático ✨

### Variables de Entorno en Vercel

```
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key
```

---

## 📝 Uso del Sistema

### Login
- Accede con las credenciales de administrador
- Email: `admin@intigym.com`

### Agregar Cliente
1. Click en "Nuevo Socio"
2. Completa el formulario
3. Selecciona plan y método de pago
4. El sistema genera automáticamente el código QR

### Registrar Pago Parcial
1. Al crear cliente, ingresa el monto pagado
2. Selecciona el método de pago
3. Para completar: ir a "Pagos" → "Completar Pago"
4. Selecciona el método del pago complementario

### Escanear QR
1. Ve a "Control de Acceso"
2. Click en "Escanear QR"
3. Permite acceso a la cámara
4. Escanea el código QR del socio

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: Amazing Feature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la [MIT License](LICENSE).

---

## 👨‍💻 Autor

**José AT**
- Portfolio: [tu-portfolio.com](https://tu-portfolio.com)
- LinkedIn: [tu-linkedin](https://linkedin.com/in/tu-perfil)
- GitHub: [@tu-usuario](https://github.com/tu-usuario)

---

## 🙏 Agradecimientos

- Diseño inspirado en interfaces modernas de gestión
- Iconos por [Lucide](https://lucide.dev/)
- Backend por [Supabase](https://supabase.com/)

---

<div align="center">

**⭐ Si te gustó este proyecto, dale una estrella en GitHub ⭐**

Hecho con ❤️ para la comunidad fitness

</div>
