#!/usr/bin/env bash
# PURRE PETS — zabij Caddy / zwolnij :80 / uruchom Nginx + backend
# curl -fsSL https://raw.githubusercontent.com/axelgadomski420/TIKBENGOS/main/deploy/fix-nginx.sh | sudo bash
set -uo pipefail

APP_DIR="${APP_DIR:-/opt/purre-pets}"
BACKEND_PORT=8087
PUBLIC_IP="${PUBLIC_IP:-92.5.154.243}"

log() { echo -e "\n\033[1;35m[PURRE NGX]\033[0m $*"; }
ok()  { echo -e "\033[1;32m✓\033[0m $*"; }
warn(){ echo -e "\033[1;33m!\033[0m $*"; }

if [[ $EUID -ne 0 ]]; then echo "sudo required"; exit 1; fi

log "1. Co trzyma :80 / :443"
ss -tlnp | grep -E ':80 |:443 ' || echo "(wolne)"

log "2. Zabij Caddy / Apache / stare proxy"
systemctl stop caddy 2>/dev/null || true
systemctl disable caddy 2>/dev/null || true
systemctl stop apache2 2>/dev/null || true
systemctl disable apache2 2>/dev/null || true
pkill -9 caddy 2>/dev/null || true
pkill -9 apache2 2>/dev/null || true
# Docker publish 80
if command -v docker >/dev/null 2>&1; then
  docker ps -q 2>/dev/null | while read -r id; do
    ports=$(docker port "$id" 2>/dev/null || true)
    if echo "$ports" | grep -qE '80/tcp|443/tcp'; then
      warn "docker stop $id (publikuje 80/443)"
      docker stop "$id" 2>/dev/null || true
    fi
  done
fi
fuser -k 80/tcp 2>/dev/null || true
fuser -k 443/tcp 2>/dev/null || true
sleep 2
ss -tlnp | grep -E ':80 |:443 ' || ok "Porty 80/443 wolne"

log "3. Konfiguracja Nginx"
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/* 2>/dev/null || true

DIST_DIR="${APP_DIR}/frontend/dist/frontend/browser"
[[ -d "$DIST_DIR" ]] || DIST_DIR="${APP_DIR}/frontend/dist/frontend"
[[ -d "$DIST_DIR" ]] || DIST_DIR="${APP_DIR}/frontend/dist"
if [[ ! -d "$DIST_DIR" ]]; then
  mkdir -p /var/www/purre-pets
  echo '<!doctype html><title>PURRE PETS</title><body style="background:#050507;color:#fff;font-family:sans-serif;display:grid;place-items:center;min-height:100vh"><h1>PURRE PETS</h1></body>' > /var/www/purre-pets/index.html
  DIST_DIR=/var/www/purre-pets
fi
ok "root=$DIST_DIR"

cat > /etc/nginx/sites-available/purre-pets <<NGX
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 25M;
    root ${DIST_DIR};
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /elif/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 120s;
        proxy_buffering off;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 3600s;
    }
}
NGX
ln -sfn /etc/nginx/sites-available/purre-pets /etc/nginx/sites-enabled/purre-pets
nginx -t

log "4. Start Nginx"
systemctl reset-failed nginx 2>/dev/null || true
systemctl enable nginx
systemctl restart nginx
sleep 1
if systemctl is-active --quiet nginx; then
  ok "Nginx ACTIVE"
else
  systemctl status nginx --no-pager -l
  journalctl -xeu nginx -n 20 --no-pager
  exit 1
fi

log "5. Backend"
JAR=$(ls -1 "$APP_DIR"/backend/target/*.jar 2>/dev/null | grep -v original | head -1 || true)
if [[ -n "$JAR" ]]; then
  cat > /etc/systemd/system/purre-pets.service <<EOF
[Unit]
Description=PURRE PETS API
After=network.target mysql.service
[Service]
Type=simple
WorkingDirectory=${APP_DIR}/backend
EnvironmentFile=-${APP_DIR}/.env
ExecStart=/usr/bin/java -jar ${JAR}
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable purre-pets
  systemctl restart purre-pets
  ok "Backend: $JAR"
fi
systemctl restart purre-ai 2>/dev/null || true

sleep 3
log "6. Health"
echo -n "HTTP  : "; curl -sS -m 3 -o /dev/null -w "%{http_code}\n" http://127.0.0.1/ || echo FAIL
echo -n "API   : "; curl -sS -m 5 http://127.0.0.1:${BACKEND_PORT}/elif/api/health || echo FAIL
echo
systemctl is-active nginx purre-pets
echo "============================================================"
echo "  PURRE PETS → http://${PUBLIC_IP}"
echo "============================================================"
