#!/usr/bin/env bash
# Однократная настройка хоста (нужен sudo): виртуальные хосты nginx и сертификат
# Let's Encrypt на gtd.cloudyyy.tech и поддомены api / uptime / errors / logs.
# Запуск из каталога репозитория на сервере:  sudo bash deploy/setup-host.sh
set -euo pipefail
cd "$(dirname "$0")"

DOMAIN=gtd.cloudyyy.tech
NAMES=("$DOMAIN" "api.$DOMAIN" "uptime.$DOMAIN" "errors.$DOMAIN" "logs.$DOMAIN")
SITE=/etc/nginx/sites-available/$DOMAIN

# 1. Только HTTP, чтобы certbot прошёл проверку ACME через /var/www/html
mkdir -p /var/www/html
sed -n '1,/^}/p' nginx/gtd.conf > "$SITE"
ln -sf "$SITE" "/etc/nginx/sites-enabled/$DOMAIN"
nginx -t && systemctl reload nginx

# 2. Один сертификат на все пять имён (продлевается таймером certbot)
args=(); for n in "${NAMES[@]}"; do args+=(-d "$n"); done
certbot certonly --webroot -w /var/www/html --cert-name "$DOMAIN" "${args[@]}" \
  --non-interactive --agree-tos --register-unsafely-without-email --keep-until-expiring \
  --deploy-hook "systemctl reload nginx"

# 3. Полная конфигурация с HTTPS
install -m 644 nginx/gtd-tls.conf /etc/nginx/snippets/gtd-tls.conf
install -m 644 nginx/gtd-proxy.conf /etc/nginx/snippets/gtd-proxy.conf
install -m 644 nginx/gtd.conf "$SITE"
nginx -t && systemctl reload nginx
echo "Готово: https://$DOMAIN"
