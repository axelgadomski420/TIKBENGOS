#!/usr/bin/env bash
# PURRE PETS — pełne, idempotentne wdrożenie produkcyjne na Ubuntu 24.04 (Oracle Cloud)
# Użycie: curl -fsSL https://raw.githubusercontent.com/axelgadomski420/TIKBENGOS/main/deploy/install.sh | sudo bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
APP_NAME="purre-pets"
APP_DIR="${APP_DIR:-/opt/purre-pets}"
REPO_URL="${REPO_URL:-https://github.com/axelgadomski420/TIKBENGOS.git}"
DOMAIN="${DOMAIN:-purrepets.pl}"
PUBLIC_IP="${PUBLIC_IP:-92.5.154.243}"
JAVA_VERSION=17
NODE_MAJOR=20
MYSQL_DB="purre_pets"
MYSQL_USER="purre"
AI_PORT=8000
BACKEND_PORT=8087

log() { echo -e "\n\033[1;35m[PURRE PETS]\033[0m $*"; }
ok()  { echo -e "\033[1;32m✓\033[0m $*"; }
warn(){ echo -e "\033[1;33m!\033[0m $*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Uruchom jako root (sudo)."
  exit 1
fi

log "1/12 Aktualizacja systemu"
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl wget git unzip software-properties-common \
  ca-certificates gnupg lsb-release apt-transport-https \
  build-essential python3 python3-pip python3-venv \
  tesseract-ocr tesseract-ocr-pol tesseract-ocr-eng \
  nginx certbot python3-certbot-nginx ufw fail2ban \
  redis-server mysql-server openjdk-${JAVA_VERSION}-jdk
ok "System zaktualizowany"

log "2/12 Node.js ${NODE_MAJOR}"
if ! command -v node >/dev/null 2>&1 || [[ $(node -v | cut -d. -f1 | tr -d v) -lt $NODE_MAJOR ]]; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -
  apt-get install -y -qq nodejs
fi
ok "Node $(node -v) / npm $(npm -v)"

log "3/12 Ollama + Qwen2.5 3B"
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
fi
systemctl enable ollama || true
systemctl start ollama || true
ollama pull qwen2.5:3b || warn "Model qwen2.5:3b — można dociągnąć później (ollama pull qwen2.5:3b)"
ok "Ollama gotowe"

log "4/12 MySQL — baza i użytkownik"
systemctl enable mysql
systemctl start mysql
if [[ ! -f /root/.purre_mysql ]]; then
  MYSQL_ROOT_PASS=$(openssl rand -hex 16)
  MYSQL_PASS=$(openssl rand -hex 16)
  echo "MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASS}" > /root/.purre_mysql
  echo "MYSQL_PASSWORD=${MYSQL_PASS}" >> /root/.purre_mysql
  chmod 600 /root/.purre_mysql
  mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PASS}'; FLUSH PRIVILEGES;" 2>/dev/null || true
fi
source /root/.purre_mysql
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "
  CREATE DATABASE IF NOT EXISTS ${MYSQL_DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'localhost' IDENTIFIED BY '${MYSQL_PASSWORD}';
  GRANT ALL PRIVILEGES ON ${MYSQL_DB}.* TO '${MYSQL_USER}'@'localhost';
  FLUSH PRIVILEGES;
" 2>/dev/null || warn "MySQL już skonfigurowany"
ok "Baza ${MYSQL_DB} gotowa"

log "5/12 Redis"
systemctl enable redis-server
systemctl start redis-server
ok "Redis działa"

log "6/12 Klonowanie / aktualizacja repo"
if [[ -d "${APP_DIR}/.git" ]]; then
  cd "${APP_DIR}"
  git fetch --all
  git reset --hard origin/main || git pull --ff-only
else
  mkdir -p "$(dirname ${APP_DIR})"
  git clone --depth 1 "${REPO_URL}" "${APP_DIR}"
fi
cd "${APP_DIR}"
ok "Kod w ${APP_DIR}"

log "7/12 Plik .env produkcyjny"
if [[ ! -f "${APP_DIR}/.env" ]]; then
  cat > "${APP_DIR}/.env" <<EOF
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/${MYSQL_DB}?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true
SPRING_DATASOURCE_USERNAME=${MYSQL_USER}
SPRING_DATASOURCE_PASSWORD=${MYSQL_PASSWORD}
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SERVER_PORT=${BACKEND_PORT}
SERVER_SERVLET_CONTEXT_PATH=/elif
APP_FRONTEND_BASE_URL=https://${DOMAIN}
APP_BACKEND_BASE_URL=https://${DOMAIN}/elif
APP_MAIL_FROM=noreply@${DOMAIN}
STRIPE_SECRET_KEY=
GOOGLE_CLIENT_ID=
GROQ_API_KEY=
GEMINI_API_KEY=
OCR_SERVICE_URL=http://127.0.0.1:${AI_PORT}
AI_SERVICE_URL=http://127.0.0.1:${AI_PORT}
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
EOF
  chmod 600 "${APP_DIR}/.env"
fi
ok ".env gotowy"

log "8/12 Backend (Spring Boot)"
cd "${APP_DIR}/backend"
./mvnw -q -DskipTests package || ./mvnw -DskipTests package
ok "Backend zbudowany"

log "9/12 Frontend (Angular)"
cd "${APP_DIR}/frontend"
npm ci --prefer-offline || npm install
npm run build -- --configuration production
ok "Frontend zbudowany"

log "10/12 AI Service (FastAPI)"
mkdir -p "${APP_DIR}/ai-service"
cat > "${APP_DIR}/ai-service/requirements.txt" <<'REQ'
fastapi==0.115.0
uvicorn[standard]==0.30.6
httpx==0.27.2
pydantic==2.9.2
python-multipart==0.0.12
redis==5.1.1
pytesseract==0.3.13
Pillow==10.4.0
REQ
python3 -m venv "${APP_DIR}/ai-service/venv"
source "${APP_DIR}/ai-service/venv/bin/activate"
pip install -q -r "${APP_DIR}/ai-service/requirements.txt"
deactivate

cat > "${APP_DIR}/ai-service/main.py" <<'PY'
from fastapi import FastAPI
from pydantic import BaseModel
import httpx
import os

app = FastAPI(title="PURRE PETS AI Service", version="1.0.0")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
MODEL = os.getenv("AI_MODEL", "qwen2.5:3b")

class TextRequest(BaseModel):
    text: str
    lang: str = "pl"

@app.get("/health")
def health():
    return {"status": "ok", "service": "purre-pets-ai", "model": MODEL}

@app.post("/ai/moderate")
async def moderate(req: TextRequest):
    prompt = (
        "Jesteś moderatorem platformy PURRE PETS (hodowle psów i kotów rasowych). "
        "Oceń czy tekst narusza regulamin (spam, oszustwa, niebezpieczne treści, nienawiść). "
        "Odpowiedz krótko JSON: {\"safe\": true/false, \"reason\": \"...\"}\n\n"
        f"Tekst:\n{req.text[:2000]}"
    )
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            r = await client.post(f"{OLLAMA_URL}/api/generate", json={"model": MODEL, "prompt": prompt, "stream": False})
            r.raise_for_status()
            return {"result": r.json().get("response", ""), "model": MODEL}
        except Exception as e:
            return {"result": "fallback-safe", "error": str(e), "model": None}

@app.post("/ai/classify")
async def classify(req: TextRequest):
    return await moderate(req)

@app.post("/ai/extract")
async def extract(req: TextRequest):
    prompt = (
        "Wyodrębnij kluczowe dane (rasa, imię, wiek, płeć, lokalizacja, cena, status) "
        "z opisu zwierzaka na platformie PURRE PETS. Odpowiedz wyłącznie JSON.\n\n"
        f"{req.text[:2000]}"
    )
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            r = await client.post(f"{OLLAMA_URL}/api/generate", json={"model": MODEL, "prompt": prompt, "stream": False})
            return {"result": r.json().get("response", "")}
        except Exception as e:
            return {"result": {}, "error": str(e)}

@app.post("/ai/assistant")
async def assistant(req: TextRequest):
    prompt = (
        "Jesteś pomocnym, eleganckim asystentem platformy PURRE PETS. "
        "Odpowiadaj po polsku krótko, konkretnie i przyjaźnie.\n\n"
        f"Pytanie: {req.text[:1500]}"
    )
    async with httpx.AsyncClient(timeout=45.0) as client:
        try:
            r = await client.post(f"{OLLAMA_URL}/api/generate", json={"model": MODEL, "prompt": prompt, "stream": False})
            return {"answer": r.json().get("response", "")}
        except Exception as e:
            return {"answer": "Usługa AI chwilowo niedostępna.", "error": str(e)}

@app.post("/ai/risk")
async def risk(req: TextRequest):
    return await moderate(req)
PY
ok "AI Service przygotowany"

log "11/12 systemd + Nginx + firewall"
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
ExecStart=/usr/bin/java -jar ${APP_DIR}/backend/target/*.jar
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

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
systemctl restart purre-pets || systemctl start purre-pets
systemctl restart purre-ai || systemctl start purre-ai
ok "Usługi systemd uruchomione"

# Nginx
DIST_DIR="${APP_DIR}/frontend/dist/frontend/browser"
if [[ ! -d "$DIST_DIR" ]]; then
  DIST_DIR="${APP_DIR}/frontend/dist/frontend"
fi
cat > /etc/nginx/sites-available/purre-pets <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN} ${PUBLIC_IP};
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
nginx -t && systemctl reload nginx
ok "Nginx skonfigurowany"

ufw --force reset >/dev/null 2>&1 || true
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ok "Firewall (UFW) aktywny — tylko 22/80/443"

log "12/12 Certbot"
if host "${DOMAIN}" >/dev/null 2>&1; then
  certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --non-interactive --agree-tos --email admin@${DOMAIN} --redirect || warn "Certbot — uruchom ręcznie po DNS"
else
  warn "DNS dla ${DOMAIN} jeszcze nie wskazuje na ten serwer. Po ustawieniu A → ${PUBLIC_IP}:"
  echo "  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --redirect"
fi

echo ""
echo "============================================================"
echo "  PURRE PETS — wdrożenie zakończone"
echo "============================================================"
echo "  Aplikacja:     http://${PUBLIC_IP}  (lub https://${DOMAIN})"
echo "  API health:    http://127.0.0.1:${BACKEND_PORT}/elif/api/health"
echo "  AI health:     http://127.0.0.1:${AI_PORT}/health"
echo "  Logi backend:  journalctl -u purre-pets -f"
echo "  Logi AI:       journalctl -u purre-ai -f"
echo "  Hasła MySQL:   /root/.purre_mysql"
echo "  Katalog:       ${APP_DIR}"
echo ""
echo "  DNS:"
echo "    A     @      ${PUBLIC_IP}"
echo "    A     www    ${PUBLIC_IP}"
echo "============================================================"
echo "  PURRE PETS — Where exceptional breeds find exceptional homes."
echo "============================================================"
