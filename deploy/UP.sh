#!/usr/bin/env bash
# PURRE PETS — jednorazowe podniesienie serwisu (bez cache, bez set -e)
# bash <(curl -fsSL https://raw.githubusercontent.com/axelgadomski420/TIKBENGOS/main/deploy/UP.sh)
set -u

APP_DIR=/opt/purre-pets
BACKEND_PORT=8087
PUBLIC_IP=92.5.154.243

echo "=== 1. Zabij Caddy / zwolnij 80/443 ==="
systemctl stop caddy 2>/dev/null || true
systemctl disable caddy 2>/dev/null || true
systemctl mask caddy 2>/dev/null || true
pkill -9 caddy 2>/dev/null || true
systemctl stop apache2 2>/dev/null || true
pkill -9 apache2 2>/dev/null || true
fuser -k 80/tcp 2>/dev/null || true
fuser -k 443/tcp 2>/dev/null || true
sleep 1
ss -tlnp | grep -E ':80 |:443 ' || echo "porty wolne"

echo "=== 2. Nginx config ==="
DIST="$APP_DIR/frontend/dist/frontend/browser"
[ -d "$DIST" ] || DIST="$APP_DIR/frontend/dist/frontend"
[ -d "$DIST" ] || DIST="$APP_DIR/frontend/dist"
[ -d "$DIST" ] || { mkdir -p /var/www/purre; echo '<h1>PURRE PETS</h1>' > /var/www/purre/index.html; DIST=/var/www/purre; }
echo "root=$DIST"

rm -f /etc/nginx/sites-enabled/*
cat > /etc/nginx/sites-available/purre-pets <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 25M;
    root $DIST;
    index index.html;
    location / { try_files \$uri \$uri/ /index.html; }
    location /elif/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
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
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 3600s;
    }
}
EOF
ln -sfn /etc/nginx/sites-available/purre-pets /etc/nginx/sites-enabled/purre-pets
nginx -t

echo "=== 3. Start Nginx ==="
systemctl reset-failed nginx 2>/dev/null || true
systemctl enable nginx
systemctl restart nginx
sleep 1
systemctl is-active nginx && echo "Nginx OK" || { systemctl status nginx --no-pager -l; exit 1; }

echo "=== 4. Backend ==="
JAR=$(ls -1 $APP_DIR/backend/target/*.jar 2>/dev/null | grep -v original | head -1 || true)
echo "JAR=$JAR"
if [ -n "$JAR" ]; then
  cat > /etc/systemd/system/purre-pets.service <<EOF
[Unit]
Description=PURRE PETS API
After=network.target mysql.service
[Service]
Type=simple
WorkingDirectory=$APP_DIR/backend
EnvironmentFile=-$APP_DIR/.env
ExecStart=/usr/bin/java -jar $JAR
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable purre-pets
  systemctl restart purre-pets
fi
systemctl restart purre-ai 2>/dev/null || true

sleep 3
echo "=== 5. Health ==="
echo -n "HTTP: "; curl -sS -m 3 -o /dev/null -w "%{http_code}\n" http://127.0.0.1/ || echo FAIL
echo -n "API : "; curl -sS -m 5 http://127.0.0.1:$BACKEND_PORT/elif/api/health || echo FAIL
echo
systemctl is-active nginx purre-pets
echo "=== GOTOWO: http://$PUBLIC_IP ==="
