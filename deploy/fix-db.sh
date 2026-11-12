#!/usr/bin/env bash
set -u
APP=/opt/purre-pets
PASS=$(openssl rand -hex 12)

echo "=== MySQL root login ==="
if [ -f /root/.purre_mysql ]; then source /root/.purre_mysql; fi
ROOT_PASS="${MYSQL_ROOT_PASSWORD:-}"

mysql_cmd() {
  if [ -n "$ROOT_PASS" ]; then
    mysql -u root -p"$ROOT_PASS" "$@"
  else
    mysql -u root "$@"
  fi
}

mysql_cmd -e "CREATE DATABASE IF NOT EXISTS purre_pets CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'purre'@'localhost' IDENTIFIED BY '$PASS';
ALTER USER 'purre'@'localhost' IDENTIFIED BY '$PASS';
GRANT ALL PRIVILEGES ON purre_pets.* TO 'purre'@'localhost';
FLUSH PRIVILEGES;"

echo "MYSQL_ROOT_PASSWORD=${ROOT_PASS}" > /root/.purre_mysql
echo "MYSQL_PASSWORD=$PASS" >> /root/.purre_mysql
chmod 600 /root/.purre_mysql
echo "DB user purre password reset OK"

# test login as purre
mysql -u purre -p"$PASS" -e 'SELECT 1 AS ok;' purre_pets && echo "purre login OK"

# Spring Boot .env in property form + env form
cat > "$APP/.env" <<EOF
spring.datasource.url=jdbc:mysql://127.0.0.1:3306/purre_pets?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
spring.datasource.username=purre
spring.datasource.password=$PASS
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.jpa.database-platform=org.hibernate.dialect.MySQLDialect
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
server.port=8087
server.servlet.context-path=/elif
app.frontend.base-url=http://92.5.154.243
app.backend.base-url=http://92.5.154.243/elif
EOF

# also application-prod override inside backend
mkdir -p "$APP/backend/config"
cat > "$APP/backend/config/application.properties" <<EOF
spring.datasource.url=jdbc:mysql://127.0.0.1:3306/purre_pets?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
spring.datasource.username=purre
spring.datasource.password=$PASS
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.jpa.database-platform=org.hibernate.dialect.MySQLDialect
spring.jpa.hibernate.ddl-auto=update
server.port=8087
server.servlet.context-path=/elif
EOF

JAR=$(ls -1 $APP/backend/target/*.jar 2>/dev/null | grep -v original | head -1)
cat > /etc/systemd/system/purre-pets.service <<EOF
[Unit]
Description=PURRE PETS API
After=network.target mysql.service
Wants=mysql.service
[Service]
Type=simple
WorkingDirectory=$APP/backend
Environment=SPRING_DATASOURCE_URL=jdbc:mysql://127.0.0.1:3306/purre_pets?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
Environment=SPRING_DATASOURCE_USERNAME=purre
Environment=SPRING_DATASOURCE_PASSWORD=$PASS
Environment=SPRING_JPA_DATABASE_PLATFORM=org.hibernate.dialect.MySQLDialect
Environment=SPRING_JPA_HIBERNATE_DDL_AUTO=update
Environment=SERVER_PORT=8087
Environment=SERVER_SERVLET_CONTEXT_PATH=/elif
ExecStart=/usr/bin/java -jar $JAR
Restart=always
RestartSec=8
[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl restart purre-pets
echo "czekam 20s..."
sleep 20
ss -tlnp | grep 8087 || echo "brak 8087"
curl -sS -m 5 http://127.0.0.1:8087/elif/api/health || curl -sS -m 5 http://127.0.0.1:8087/elif/ || true
echo
journalctl -u purre-pets -n 25 --no-pager
