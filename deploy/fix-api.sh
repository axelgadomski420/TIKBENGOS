#!/usr/bin/env bash
# PURRE PETS — naprawa backendu (port 8087)
set -u
APP=/opt/purre-pets

echo "=== status ==="
systemctl status purre-pets --no-pager -l | head -40
echo "=== journal (ostatnie 80 linii) ==="
journalctl -u purre-pets -n 80 --no-pager
echo "=== port 8087 ==="
ss -tlnp | grep 8087 || echo "nic na 8087"
echo "=== .env (bez haseł) ==="
grep -E '^(SPRING_|SERVER_|APP_)' "$APP/.env" 2>/dev/null | sed 's/PASSWORD=.*/PASSWORD=***/' || echo "brak .env"
echo "=== mysql ==="
systemctl is-active mysql || systemctl start mysql
source /root/.purre_mysql 2>/dev/null || true
mysql -u root -p"${MYSQL_ROOT_PASSWORD:-}" -e 'SHOW DATABASES;' 2>/dev/null | head -20 || mysql -u root -e 'SHOW DATABASES;' 2>/dev/null | head -20 || echo "mysql login fail"

echo "=== restart backend ==="
JAR=$(ls -1 $APP/backend/target/*.jar 2>/dev/null | grep -v original | head -1)
echo "JAR=$JAR"
# ensure .env has working datasource
if [ -f /root/.purre_mysql ]; then
  source /root/.purre_mysql
  cat > "$APP/.env" <<EOF
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/purre_pets?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
SPRING_DATASOURCE_USERNAME=purre
SPRING_DATASOURCE_PASSWORD=${MYSQL_PASSWORD}
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SERVER_PORT=8087
SERVER_SERVLET_CONTEXT_PATH=/elif
APP_FRONTEND_BASE_URL=http://92.5.154.243
APP_BACKEND_BASE_URL=http://92.5.154.243/elif
EOF
  # also grant / create user if needed
  mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "
    CREATE DATABASE IF NOT EXISTS purre_pets CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE USER IF NOT EXISTS 'purre'@'localhost' IDENTIFIED BY '${MYSQL_PASSWORD}';
    GRANT ALL PRIVILEGES ON purre_pets.* TO 'purre'@'localhost';
    FLUSH PRIVILEGES;
  " 2>/dev/null || true
fi

cat > /etc/systemd/system/purre-pets.service <<EOF
[Unit]
Description=PURRE PETS API
After=network.target mysql.service
Wants=mysql.service
[Service]
Type=simple
WorkingDirectory=$APP/backend
EnvironmentFile=-$APP/.env
ExecStart=/usr/bin/java -jar $JAR
Restart=always
RestartSec=8
StandardOutput=journal
StandardError=journal
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl restart purre-pets
echo "czekam 15s na start Spring Boot..."
sleep 15
ss -tlnp | grep 8087 || echo "nadal brak 8087"
curl -sS -m 5 http://127.0.0.1:8087/elif/api/health || curl -sS -m 5 http://127.0.0.1:8087/elif/ || true
echo
journalctl -u purre-pets -n 40 --no-pager
