#!/usr/bin/env bash
# PURRE PETS — natychmiastowa naprawa po niekompletnym install.sh
# Uruchom na serwerze: sudo bash /opt/purre-pets/deploy/fix-server.sh
# albo: curl -fsSL https://raw.githubusercontent.com/axelgadomski420/TIKBENGOS/main/deploy/fix-server.sh | sudo bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/purre-pets}"
BACKEND_PORT=8087
AI_PORT=8000
DOMAIN="${DOMAIN:-purrepets.pl}"
PUBLIC_IP="${PUBLIC_IP:-92.5.154.243}"

log() { echo -e "\n\033[1;35m[PURRE FIX]\033[0m $*"; }
ok()  { echo -e "\033[1;32m✓\033[0m $*"; }
warn(){ echo -e "\033[1;33m!\033[0m $*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Uruchom jako root (sudo)."
  exit 1
fi

cd "$APP_DIR"

log "1. Znajdź JAR backendu"
JAR=$(ls -1 "$APP_DIR"/backend/target/*.jar 2>/dev/null | grep -v '\.original$' | head -1 || true)
if [[ -z "$JAR" ]]; then
  log "Brak JAR — buduję backend…"
  cd "$APP_DIR/backend"
  ./mvnw -q -DskipTests package || ./mvnw -DskipTests package
  JAR=$(ls -1 "$APP_DIR"/backend/target/*.jar 2>/dev/null | grep -v '\.original$' | head -1)
fi
ok "JAR: $JAR"

log "2. systemd purre-pets (jawna ścieżka do JAR)"
cat > /etc/systemd/system/purre-pets.service <<EOF
[Unit]
Description=PURRE PETS Spring Boot API
After=network.target mysql.service redis-server.service
Wants=mysql.service redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}/backend
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/java -jar ${JAR}
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

log "3. systemd purre-ai"
if [[ ! -x "$APP_DIR/ai-service/venv/bin/uvicorn" ]]; then
  python3 -m venv "$APP_DIR/ai-service/venv"
  "$APP_DIR/ai-service/venv/bin/pip" install -q fastapi 'uvicorn[standard]' httpx pydantic python-multipart redis pytesseract Pillow || true
fi

cat > /etc/systemd/system/purre-ai.service <<EOF
[Unit]
Description=PURRE PETS AI Service (FastAPI + Ollama)
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}/ai-service
Environment=OLLAMA_URL=http://127.0.0.1:11434
Environment=AI_MODEL=qwen2.5:3b
ExecStart=${APP_DIR}/ai-service/venv/bin/uvicorn main:app --host 127.0.0.1 --port ${AI_PORT} --workers 1
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable purre-pets purre-ai
systemctl restart purre-pets
systemctl restart purre-ai || systemctl start purre-ai || warn "AI service — sprawdź journalctl -u purre-ai"
ok "Backend + AI services restarted"

log "4. Nginx — start + config"
DIST_DIR="${APP_DIR}/frontend/dist/frontend/browser"
if [[ ! -d "$DIST_DIR" ]]; then
  DIST_DIR="${APP_DIR}/frontend/dist/frontend"
fi
if [[ ! -d "$DIST_DIR" ]]; then
  warn "Brak dist — buduję frontend…"
  cd "$APP_DIR/frontend"
  npm ci --prefer-offline || npm install
  npm run build -- --configuration production
  DIST_DIR="${APP_DIR}/frontend/dist/frontend/browser"
  [[ -d "$DIST_DIR" ]] || DIST_DIR="${APP_DIR}/frontend/dist/frontend"
fi
ok "Frontend dist: $DIST_DIR"

cat > /etc/nginx/sites-available/purre-pets <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${DOMAIN} www.${DOMAIN} ${PUBLIC_IP} _;
    client_max_body_size 25M;

    root ${DIST_DIR};
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

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
EOF
ln -sfn /etc/nginx/sites-available/purre-pets /etc/nginx/sites-enabled/purre-pets
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl start nginx
systemctl reload nginx
ok "Nginx działa"

log "5. Health checks"
sleep 3
echo -n "Backend: "
curl -sS -m 5 "http://127.0.0.1:${BACKEND_PORT}/elif/api/health" || curl -sS -m 5 "http://127.0.0.1:${BACKEND_PORT}/elif/actuator/health" || echo "FAIL — journalctl -u purre-pets -n 50"
echo
echo -n "AI: "
curl -sS -m 5 "http://127.0.0.1:${AI_PORT}/health" || echo "FAIL (opcjonalne)"
echo
echo -n "Nginx HTTP: "
curl -sS -m 5 -o /dev/null -w "%{http_code}" "http://127.0.0.1/" || echo "FAIL"
echo

echo ""
echo "============================================================"
echo "  PURRE PETS — serwer naprawiony"
echo "  Otwórz: http://${PUBLIC_IP}"
echo "  Logi:   journalctl -u purre-pets -f"
echo "============================================================"
