# TechAssets Pro

Sistema integral de gestión de activos TI para pequeñas y medianas empresas (PyMEs). Permite gestionar equipos físicos, aplicaciones, contratos, licencias y servicios de infraestructura con seguimiento de costos y alertas de vencimiento.

## 🚀 Características Principales

- **Gestión Multi-empresa**: Soporte para múltiples compañías con control de acceso basado en roles
- **Activos Físicos**: Inventario de equipos, servidores y hardware con historial de mantenimiento
- **Aplicaciones**: Diferenciación entre SaaS y desarrollo interno con costos de infraestructura
- **Servicios de Infraestructura**: Seguimiento de dominios, SSL, hosting y servidores virtuales
- **Alertas de Vencimiento**: Notificaciones automáticas para servicios próximos a expirar
- **Dashboard de Costos**: Análisis visual de gastos y tendencias
- **Historial de Actividad**: Registro completo de todas las operaciones del sistema

## 🛠️ Stack Tecnológico

### Frontend
- React 18 con TypeScript
- Vite como build tool
- Tailwind CSS para estilos
- shadcn/ui para componentes
- TanStack Query para gestión de estado
- Wouter para routing
- Recharts para visualización de datos

### Backend
- Node.js con Express
- TypeScript
- Autenticación con Replit OIDC
- Sesiones con PostgreSQL

### Base de Datos
- PostgreSQL con Neon Database
- Drizzle ORM para manejo de datos
- Esquemas con validación Zod

## 📋 Requisitos Previos

- Node.js 18 o superior
- PostgreSQL 14 o superior
- Cuenta en Replit (para autenticación)
- Base de datos Neon (recomendado) o PostgreSQL local

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd techassets-pro
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto:

```bash
# Base de datos
DATABASE_URL="postgresql://usuario:contraseña@host:puerto/basededatos"
PGHOST="host-de-la-base"
PGPORT="5432"
PGUSER="usuario"
PGPASSWORD="contraseña"
PGDATABASE="nombre_base_datos"

# Autenticación Replit
REPL_ID="tu-repl-id"
ISSUER_URL="https://replit.com/oidc"
SESSION_SECRET="clave-secreta-muy-segura-de-al-menos-32-caracteres"
REPLIT_DOMAINS="tu-dominio.replit.app,dominio-personalizado.com"
```

### 4. Configurar Base de Datos

#### Opción A: Usando Neon Database (Recomendado)

1. Crear cuenta en [Neon](https://neon.tech)
2. Crear nuevo proyecto
3. Copiar la connection string al archivo `.env`

#### Opción B: PostgreSQL Local

1. Instalar PostgreSQL
2. Crear base de datos:

```sql
CREATE DATABASE techassets_pro;
CREATE USER techassets_user WITH PASSWORD 'tu_contraseña_segura';
GRANT ALL PRIVILEGES ON DATABASE techassets_pro TO techassets_user;
```

### 5. Ejecutar Migraciones

```bash
npm run db:push
```

### 6. Configurar Autenticación Replit

1. Ir a tu Repl en Replit
2. Configurar las variables de entorno en Secrets
3. Asegurar que `REPLIT_DOMAINS` incluya todos los dominios donde se ejecutará la app

## 🏃‍♂️ Ejecutar en Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5000`

## 🏗️ Compilar para Producción

```bash
npm run build
```

## 🚀 Despliegue en Producción

### Despliegue en Replit (Recomendado)

1. **Preparar el Proyecto**:
   ```bash
   git add .
   git commit -m "Preparar para producción"
   git push
   ```

2. **Configurar Variables de Entorno en Replit**:
   - Ir a Secrets en tu Repl
   - Agregar todas las variables del archivo `.env`

3. **Configurar Base de Datos**:
   - Crear base de datos en Neon
   - Ejecutar migraciones: `npm run db:push`

4. **Desplegar**:
   - La aplicación se desplegará automáticamente en Replit
   - Usar Replit Deployments para producción estable

### Despliegue en Servidor VPS

#### 1. Preparar el Servidor

```bash
# Actualizar sistema (Ubuntu/Debian)
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 para gestión de procesos
sudo npm install -g pm2

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib
```

#### 2. Configurar PostgreSQL

```bash
# Cambiar a usuario postgres
sudo -u postgres psql

# Crear base de datos y usuario
CREATE DATABASE techassets_pro;
CREATE USER techassets_user WITH PASSWORD 'contraseña_muy_segura';
GRANT ALL PRIVILEGES ON DATABASE techassets_pro TO techassets_user;
\q
```

#### 3. Clonar y Configurar Proyecto

```bash
# Clonar repositorio
git clone <url-repositorio> /var/www/techassets-pro
cd /var/www/techassets-pro

# Instalar dependencias
npm ci --only=production

# Configurar variables de entorno
sudo nano .env
# (Agregar todas las variables necesarias)

# Ejecutar migraciones
npm run db:push

# Compilar aplicación
npm run build
```

#### 4. Configurar PM2

Crear archivo `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'techassets-pro',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/techassets-pro',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    instances: 'max',
    exec_mode: 'cluster'
  }]
}
```

Iniciar aplicación:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 5. Configurar Nginx (Proxy Reverso)

```bash
sudo apt install nginx

# Crear configuración
sudo nano /etc/nginx/sites-available/techassets-pro
```

Contenido del archivo de configuración:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activar configuración:

```bash
sudo ln -s /etc/nginx/sites-available/techassets-pro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 6. Configurar SSL con Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

### Despliegue en Docker

#### 1. Crear Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

#### 2. Crear docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - SESSION_SECRET=${SESSION_SECRET}
      - REPL_ID=${REPL_ID}
      - REPLIT_DOMAINS=${REPLIT_DOMAINS}
    depends_on:
      - postgres

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=techassets_pro
      - POSTGRES_USER=techassets_user
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

#### 3. Ejecutar

```bash
docker-compose up -d
```

## 🔧 Scripts Disponibles

- `npm run dev` - Ejecutar en modo desarrollo
- `npm run build` - Compilar para producción
- `npm start` - Ejecutar aplicación compilada
- `npm run db:push` - Aplicar cambios de schema a la base de datos
- `npm run db:studio` - Abrir Drizzle Studio para inspeccionar la base de datos

## 📊 Monitoreo y Mantenimiento

### Logs de Aplicación

Con PM2:
```bash
pm2 logs techassets-pro
pm2 monit
```

### Backup de Base de Datos

```bash
# Backup
pg_dump -h localhost -U techassets_user techassets_pro > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar
psql -h localhost -U techassets_user techassets_pro < backup_archivo.sql
```

### Actualizaciones

```bash
# Hacer backup de la base de datos
pg_dump -h localhost -U techassets_user techassets_pro > backup_antes_actualizacion.sql

# Actualizar código
git pull origin main
npm ci --only=production

# Aplicar migraciones
npm run db:push

# Recompilar
npm run build

# Reiniciar aplicación
pm2 restart techassets-pro
```

## 🛡️ Seguridad

### Recomendaciones de Seguridad

1. **Variables de Entorno**: Nunca commitear archivos `.env`
2. **Contraseñas**: Usar contraseñas fuertes para la base de datos
3. **SESSION_SECRET**: Generar clave secreta única y segura
4. **HTTPS**: Siempre usar SSL en producción
5. **Firewall**: Configurar firewall para exponer solo puertos necesarios
6. **Actualizaciones**: Mantener dependencias actualizadas

### Configuración de Firewall (Ubuntu)

```bash
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 🐛 Solución de Problemas Comunes

### Error de Conexión a Base de Datos

1. Verificar variables de entorno
2. Confirmar que PostgreSQL esté ejecutándose
3. Verificar permisos de usuario en la base de datos

### Error de Autenticación

1. Verificar configuración de Replit OIDC
2. Confirmar que `REPLIT_DOMAINS` sea correcto
3. Verificar que `SESSION_SECRET` esté configurado

### Problemas de Rendimiento

1. Verificar logs con `pm2 logs`
2. Monitorear uso de memoria con `pm2 monit`
3. Optimizar consultas de base de datos si es necesario

## 📝 Licencia

[Especificar la licencia del proyecto]

## 🤝 Contribución

[Instrucciones para contribuir al proyecto]

## 📞 Soporte

Para soporte técnico, contactar a [información de contacto].