# VaroLogs - Multi-stage Dockerfile
# Optimized for minimal image size

# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:22-alpine AS frontend-builder

WORKDIR /build

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies (use npm install since no lock file)
RUN npm install

# Copy frontend source
COPY frontend/ ./

# Build production bundle
RUN npm run build

# ============================================
# Stage 2: Production Runtime
# ============================================
FROM node:22-alpine AS production

# Install required build tools for better-sqlite3
RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install production dependencies
RUN npm install --omit=dev && \
    npm cache clean --force

# Copy backend source
COPY backend/ ./

# Copy built frontend from stage 1
COPY --from=frontend-builder /build/dist ./frontend/dist

# Create data directory
RUN mkdir -p /app/data && \
    chown -R node:node /app

# Switch to non-root user (node user already exists in alpine)
USER node

# Expose port
EXPOSE 3001

# Environment
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/varologs.db

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start server
CMD ["node", "server.js"]
