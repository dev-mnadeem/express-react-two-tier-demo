# syntax=docker/dockerfile:1

# ---- build -----------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Vite inlines VITE_* at build time, not at run time, so the API origin has to
# be supplied here rather than as a container env var. Empty means same-origin.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

# ---- runtime ---------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Give the unprivileged nginx user ownership of the paths it writes to and bind
# an unprivileged port, so the container never needs root.
RUN touch /var/run/nginx.pid \
  && chown -R nginx:nginx /var/cache/nginx /var/run/nginx.pid /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
