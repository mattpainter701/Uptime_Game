# NetOps Tower — Frontend Dockerfile
# Stage 1: Development server (default)
FROM node:22-alpine AS dev

WORKDIR /app

# Install dependencies first for layer caching
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start dev server
CMD ["npx", "vite", "--host", "0.0.0.0"]

# Stage 2: Test runner
FROM dev AS test
CMD ["npx", "vitest", "run"]

# Stage 3: Production build
FROM dev AS build
RUN npm run build

# Stage 4: Production server (nginx serving static files)
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
