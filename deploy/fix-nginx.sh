#!/usr/bin/env bash
# PURRE PETS — naprawa Nginx (port 80 / konflikty)
# curl -fsSL https://raw.githubusercontent.com/axelgadomski420/TIKBENGOS/main/deploy/fix-nginx.sh | sudo bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/purre-pets}"
BACKEND_PORT=8087
PUBLIC_IP="${PUBLIC_IP:-92.5.154.243}"

log() { echo -e "\n\033[1;35m[PURRE NGX]\033[0m $*"; }
ok()  { echo -e "\033[1;32m✓\033[0m $*"; }
warn(){ echo -e "\033[1;33m!\033[0m $*"; }

if [[ $EUID -ne 0 ]]; then echo "Uruchom jako root (sudo)."; exit 1; fi

log "1. Diagnostyka — port 80/443"
ss -tlnp | grep -E ':80 |:443 ' || echo "(nic nie słucha na 80/443)"
systemctl status nginx --no-pager -l 2>/dev/null || true
journalctl -u nginx -n 25 --no-pager 2>/dev/null || true

log "2. Zwolnij port 80"
systemctl stop apache2 2>/dev/null || true
systemctl disable apache2 2>/dev/null || true
systemctl stop caddy 2>/dev/null || true
if command -v docker >/dev/null 2>&1; then
  docker ps --format '{{.ID}} {{.Ports}}' 2>/dev/null | grep -E ':80->' | awk '{print $1}' | while read -r id; do
    warn "Zatrzymuję kontener na :80 → $id"
    docker stop "$id" 2>/dev/null || true
  done
fi
fuser -k 80/tcp 2>/dev/null || true
sleep 1

log "3. Wyczyść sitey Nginx"
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/purre-pets
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || true

DIST_DIR="${APP_DIR}/frontend/dist/frontend/browser"
if [[ ! -d "$DIST_DIR" ]]; then DIST_DIR="${APP_DIR}/frontend/dist/frontend"; fi
if [[ ! -d "$DIST_DIR" ]]; then DIST_DIR="${APP_DIR}/frontend/dist"; fi
if [[ ! -d "$DIST_DIR" ]]; then
  warn "Brak dist — minimalny index"
  mkdir -p /var/www/purre-pets
  printf '%s\n' '<!doctype html><html><head><meta charset="utf-8"><title>PURRE PETS</title></head><body style="font-family:sans-serif;background:#050507;color:#f5f5f7;display:grid;place-items:center;min-height:100vh"><h1>PURRE PETS</h1><p>API: /elif/</p></body></html>' > /var/www/purre-pets/index.html
  DIST_DIR=/var/www/purre-pets
fi
ok "root = $DIST_DIR"

log "4. Konfiguracja Nginx"
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

if ! nginx -t; then
  warn "nginx -t FAILED"
  exit 1
fi

log "5. Start Nginx"
systemctl reset-failed nginx 2>/dev/null || true
systemctl enable nginx
systemctl restart nginx
sleep 1
if systemctl is-active --quiet nginx; then
  ok "Nginx ACTIVE"
else
  warn "Nginx nadal nie działa"
  systemctl status nginx --no-pager -l
  journalctl -xeu nginx.service -n 40 --no-pager
  exit 1
fi

log "6. Backend"
JAR=$(ls -1 "$APP_DIR"/backend/target/*.jar 2>/dev/null | grep -v original | head -1 || true)
if [[ -n "$JAR" ]]; then
  cat > /etc/systemd/system/purre-pets.service <<EOF
[Unit]
Description=PURRE PETS Spring Boot API
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
  ok "Backend restarted ($JAR)"
else
  warn "Brak JAR w $APP_DIR/backend/target"
fi
systemctl restart purre-ai 2>/dev/null || true

sleep 4
log "7. Health"
echo -n "nginx :80 → "
curl -sS -m 3 -o /dev/null -w "%{http_code}\n" http://127.0.0.1/ || echo FAIL
echo -n "backend    → "
curl -sS -m 5 "http://127.0.0.1:${BACKEND_PORT}/elif/api/health" || curl -sS -m 5 "http://127.0.0.1:${BACKEND_PORT}/elif/" || echo FAIL
echo
systemctl is-active nginx purre-pets 2>/dev/null || true
echo ""
echo "============================================================"
echo "  PURRE PETS — http://${PUBLIC_IP}"
echo "============================================================"
