#!/usr/bin/env bash
set -euo pipefail
DOMAIN="${DOMAIN:-bengos.pl}"
PUBLIC_IP="${PUBLIC_IP:-92.5.154.243}"
APP_DIR="${APP_DIR:-/opt/purre-pets}"
BACKEND_PORT=8087
DIST_DIR="${APP_DIR}/frontend/dist/frontend/browser"
[[ -d "$DIST_DIR" ]] || DIST_DIR="${APP_DIR}/frontend/dist/frontend"

cat > /etc/nginx/sites-available/purre-pets <<NGX
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN} ${PUBLIC_IP};
    client_max_body_size 25M;
    root ${DIST_DIR};
    index index.html;
    location / { try_files \$uri \$uri/ /index.html; }
    location /elif/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/elif/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 120s;
    }
    location /ws/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 3600s;
    }
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
NGX
ln -sfn /etc/nginx/sites-available/purre-pets /etc/nginx/sites-enabled/purre-pets
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "Nginx PURRE PETS skonfigurowany."
