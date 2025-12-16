# VaroLogs

Tu tracker personal de películas, series, juegos, libros, anime, manga, música y podcasts.

![VaroLogs](https://via.placeholder.com/800x400/0d1117/6366f1?text=VaroLogs)

## Características

- **Multi-usuario sin contraseñas**: Login rápido solo con nombre
- **Fichas compartidas**: Un item, múltiples reseñas de diferentes usuarios  
- **Auto-complete con IA**: Gemini rellena título, año, autor, género y sinopsis
- **Búsqueda de portadas**: URLs externas, sin almacenamiento local
- **Puntuación 0-10**: Sistema de rating flexible
- **Estados de progreso**: Pendiente, En progreso, Completado, Abandonado
- **Listas personalizadas**: Organiza tu contenido como quieras
- **Diseño oscuro elegante**: Inspirado en Letterboxd

## Requisitos

- Docker y Docker Compose
- API Key de Google Gemini (opcional, para auto-complete)

## Instalación rápida

```bash
# Clonar repositorio
git clone https://github.com/TU_USUARIO/varologs.git
cd varologs

# Configurar API Key de Gemini
cp .env.example .env
nano .env  # Añadir tu GEMINI_API_KEY

# Construir y arrancar
docker-compose up -d --build

# Ver logs
docker-compose logs -f
```

## Acceso

- **URL**: http://192.168.1.56:8400
- **Puerto**: 8400

## Estructura del proyecto

```
varologs/
├── backend/
│   ├── server.js          # API Express
│   ├── database.js        # SQLite schema
│   ├── package.json
│   └── services/
│       ├── gemini.js      # AI autocomplete
│       └── covers.js      # Cover image fetching
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── pages/
│   │   └── components/
│   ├── package.json
│   └── vite.config.js
├── data/                  # SQLite DB (gitignored)
├── docker-compose.yml
├── Dockerfile
└── .env                   # Tu API key (gitignored)
```

## API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/users` | Lista usuarios |
| POST | `/api/users` | Crear usuario |
| GET | `/api/items` | Lista items (filtrable) |
| POST | `/api/items` | Crear item |
| GET | `/api/items/:id` | Detalle + reseñas |
| POST | `/api/items/:id/reviews` | Añadir reseña |
| GET | `/api/lists` | Mis listas |
| POST | `/api/ai/autocomplete` | Auto-completar con Gemini |

## Desarrollo local

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

## Backup

```bash
# Copiar base de datos
cp data/varologs.db /path/to/backup/varologs-$(date +%Y%m%d).db
```

## Licencia

MIT
