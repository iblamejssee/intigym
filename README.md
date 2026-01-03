# Inti-Gym Ayacucho - Sistema de Gestión

Sistema de gestión premium para gimnasios con diseño Dark Elegance y funcionalidades completas de CRUD.

## 🚀 Características

- **Dashboard Premium**: Diseño oscuro con acentos rojo racing (CFMOTO 250SR)
- **Gestión de Clientes**: CRUD completo con Supabase
- **Códigos QR**: Generación automática basada en DNI
- **Subida de Fotos**: Almacenamiento en Supabase Storage
- **Escáner QR**: Búsqueda rápida de clientes
- **Glassmorphism**: Efectos visuales modernos

## 📋 Requisitos Previos

- Node.js 18+ 
- Cuenta de Supabase (https://supabase.com)

## 🔧 Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

Puedes obtener estos valores desde tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard).

### 3. Configurar Supabase

#### Crear la tabla `clientes`

Ejecuta el siguiente SQL en el SQL Editor de Supabase:

```sql
CREATE TABLE clientes (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  dni TEXT NOT NULL UNIQUE,
  telefono TEXT,
  email TEXT,
  fecha_nacimiento DATE,
  plan TEXT NOT NULL,
  fecha_inicio DATE,
  fecha_vencimiento DATE,
  estado_pago TEXT NOT NULL DEFAULT 'al-dia' CHECK (estado_pago IN ('al-dia', 'vencido')),
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas por DNI
CREATE INDEX idx_clientes_dni ON clientes(dni);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Si ya tienes la tabla creada, agrega la columna fecha_vencimiento:
-- ALTER TABLE clientes ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;
```

#### Crear el bucket de Storage para fotos

1. Ve a Storage en el dashboard de Supabase
2. Crea un nuevo bucket llamado `fotos-clientes`
3. Configura las políticas de acceso (puedes usar políticas públicas para lectura y autenticadas para escritura)

Ejemplo de política para lectura pública:

```sql
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'fotos-clientes');
```

Ejemplo de política para escritura autenticada:

```sql
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'fotos-clientes');
```

## 🏃 Ejecutar el proyecto

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
sistema-gym/
├── src/
│   ├── app/              # Páginas de Next.js
│   │   ├── clientes/     # Página de gestión de clientes
│   │   ├── pagos/        # Página de pagos
│   │   └── configuracion/ # Página de configuración
│   ├── components/        # Componentes React
│   │   ├── AddMemberModal.tsx
│   │   ├── EditMemberModal.tsx
│   │   ├── DeleteConfirmModal.tsx
│   │   ├── QRScannerModal.tsx
│   │   ├── MemberCard.tsx
│   │   └── Sidebar.tsx
│   └── lib/
│       └── supabase.ts   # Configuración de Supabase
└── .env.local            # Variables de entorno (no commitear)
```

## 🛠️ Tecnologías

- **Next.js 16**: Framework React
- **TypeScript**: Tipado estático
- **Tailwind CSS**: Estilos
- **Supabase**: Base de datos y almacenamiento
- **Lucide React**: Iconos
- **qrcode.react**: Generación de códigos QR

## 📝 Notas

- El código QR se genera automáticamente basado en el DNI del cliente
- Las fotos se almacenan en Supabase Storage
- Todos los componentes están preparados para trabajar con Supabase

## 🔐 Seguridad

Asegúrate de configurar correctamente las políticas de Row Level Security (RLS) en Supabase según tus necesidades de seguridad.
