#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/purre-pets}"
cat > /etc/systemd/system/purre-pets.service <<EOS
[Unit]
Description=PURRE PETS Spring Boot API
After=network.target mysql.service redis-server.service
[Service]
Type=simple
WorkingDirectory=${APP_DIR}/backend
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/java -jar ${APP_DIR}/backend/target/*.jar
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOS
cat > /etc/systemd/system/purre-ai.service <<EOS
[Unit]
Description=PURRE PETS AI Service
After=network.target ollama.service
[Service]
Type=simple
WorkingDirectory=${APP_DIR}/ai-service
Environment=OLLAMA_URL=http://127.0.0.1:11434
Environment=AI_MODEL=qwen2.5:3b
ExecStart=${APP_DIR}/ai-service/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 1
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOS
systemctl daemon-reload
systemctl enable purre-pets purre-ai
echo "systemd services PURRE PETS created and enabled."
