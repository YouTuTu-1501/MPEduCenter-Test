# Multi-stage Dockerfile for EduTest Pro
# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci || npm install

# Copy source code and config
COPY . .

# Build Vite frontend and esbuild server backend into dist/
RUN npm run build

# Stage 2: Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package definition
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev || npm install --omit=dev

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
