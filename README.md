# Torneo Municipal — Sistema de Gestión de Basquetbol

Plataforma web completa para administrar un torneo de basquetbol municipal. Permite gestionar equipos, jugadores, partidos, estadísticas, transmisiones en vivo y cuentas de usuario con roles diferenciados.
> [!WARNING] En la parte de abajo estan los usuarios y contraseñas para acceder a la plataforma donde esta la URL de producción, por favor no los compartas con nadie.

---

## Tecnologías utilizadas

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| React | 19 | Librería de UI |
| TypeScript | 5 | Tipado estático |
| Vite | 8 | Bundler y dev server |
| Tailwind CSS | 4 | Estilos utilitarios |
| TanStack Query | 5 | Caché y fetching de datos |
| Wouter | 3 | Enrutamiento del cliente |
| Lucide React | — | Íconos |
| Sileo | — | Notificaciones toast |

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 16 | Framework API (App Router) |
| TypeScript | 5 | Tipado estático |
| Drizzle ORM | 0.45 | ORM para PostgreSQL |
| Zod | 4 | Validación de esquemas |
| Jose | 6 | JWT (autenticación) |
| bcryptjs | 3 | Hash de contraseñas |

### Infraestructura
| Servicio | Uso |
|---|---|
| Supabase (PostgreSQL) | Base de datos principal |
| Supabase Storage | Almacenamiento de imágenes (logos, fotos, actas) |
| Google Cloud Run | Deploy del backend y frontend |
| Docker | Contenedorización |
| nginx | Servidor del frontend en producción |

---

## Arquitectura

```
┌─────────────────────┐         ┌─────────────────────┐
│   Frontend (Vite)   │ ──API── │   Backend (Next.js) │
│  React + Tailwind   │  HTTPS  │   API Routes + JWT  │
│  Cloud Run :8080    │         │   Cloud Run :3000   │
└─────────────────────┘         └──────────┬──────────┘
                                           │
                                ┌──────────▼──────────┐
                                │  Supabase (Postgres) │
                                │  + Storage           │
                                └─────────────────────┘
```

---

## Roles de usuario

| Rol | Acceso |
|---|---|
| `admin` | Todo el sistema |
| `lider` | Gestión de su equipo (roster, fotos, logo) |
| `anotador` | Mesa técnica (marcador, estadísticas en vivo) |
| `transmision` | Gestión de enlaces de transmisión |

Los roles `anotador` y `transmision` pueden recibir permisos adicionales por sección configurados por el admin.

---

## Funcionalidades principales

- **Inicio público**: clasificación en vivo, próximos partidos, carrusel de equipos
- **Clasificación**: tabla de posiciones con estadísticas (PJ, PG, PP, PF, PC, Pts)
- **Historial**: resultados de partidos finalizados con actas descargables
- **Calendario**: agenda de partidos con fechas y horarios
- **Mesa técnica** *(admin/anotador)*: marcador en tiempo real, estadísticas de jugadores, árbitros
- **Roster** *(admin/lider)*: gestión de jugadores, fotos, nombre de equipo y logo
- **Transmisiones** *(admin/transmision)*: asignación de enlaces YouTube/Twitch/Facebook, control de partidos en vivo
- **Configuración** *(admin)*: parámetros del torneo, generación de calendario
- **Cuentas** *(admin)*: creación y gestión de usuarios, matriz de permisos por sección

---

## Estructura del proyecto

```
web_project_final/
├── client/src/           # Frontend React
│   ├── components/       # Componentes reutilizables
│   ├── context/          # AuthContext (estado de sesión)
│   ├── lib/              # apiClient, queryClient
│   └── pages/            # Una página por ruta
├── server/               # Backend Next.js
│   ├── app/api/          # Rutas de la API REST
│   ├── db/               # Schema de Drizzle + conexión
│   └── lib/              # Helpers (auth, API responses)
├── shared/               # Tipos compartidos entre cliente y servidor
├── Dockerfile            # Build del frontend para Cloud Run
└── server/Dockerfile     # Build del backend para Cloud Run
```

---

## Variables de entorno

### Backend (`server/.env.local`)
```env
DATABASE_URL=postgresql://...
AUTH_SECRET=tu_secreto_largo_y_aleatorio
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FRONTEND_URL=http://localhost:5173
```

### Frontend
```env
VITE_API_URL=http://localhost:3000
```

---

## Desarrollo local

```bash
# Terminal 1 — Backend
cd server
npm install
npm run dev        # http://localhost:3000

# Terminal 2 — Frontend
npm install
npm run dev:client # http://localhost:5173
```

---

## Deploy en producción (Google Cloud Run)

### Backend
```bash
gcloud run deploy torneo-api \
  --source server/ \
  --region us-central1 \
  --port 3000 \
  --set-env-vars DATABASE_URL="...",AUTH_SECRET="...",SUPABASE_URL="...",SUPABASE_SERVICE_ROLE_KEY="...",FRONTEND_URL="https://torneo-web-xxx.run.app"
```

### Frontend
```bash
gcloud run deploy torneo-web \
  --source . \
  --region us-central1 \
  --port 8080
```

---

## URLs de producción

- **Frontend**: https://torneo-web-167747831325.us-central1.run.app
- **Backend API**: https://torneo-api-167747831325.us-central1.run.app

---

>## Usuarios de prueba

- | Usuario | Contraseña | Rol |
- | admin   | Admin2026  | admin|
- | lider1   | Lider2026  | lider|
- | anotador1 | Anotador2026 | anotador|
- | transmision1 | Transmision2026 | transmision|

---


## Autor

Jesús Manzanilla — [@JManzanilla](https://github.com/JManzanilla)
