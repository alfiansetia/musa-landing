# Tahap 1: generate halaman rilis statis dari releases.json
FROM node:20-alpine AS builder
WORKDIR /site
COPY . .
ARG SITE_URL=""
RUN if [ -n "$SITE_URL" ]; then node tools/build.mjs --base "$SITE_URL"; else node tools/build.mjs; fi

# Tahap 2: serve file statis (hasil generate + aset) via nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /site /usr/share/nginx/html
# Jangan serve file internal (workflow build, bukan konten situs)
RUN rm -rf /usr/share/nginx/html/tools \
           /usr/share/nginx/html/releases.json \
           /usr/share/nginx/html/Dockerfile \
           /usr/share/nginx/html/docker-compose.yml \
           /usr/share/nginx/html/.dockerignore \
           /usr/share/nginx/html/.gitignore \
           /usr/share/nginx/html/.git
EXPOSE 80
