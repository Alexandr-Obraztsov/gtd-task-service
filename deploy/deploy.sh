#!/usr/bin/env bash
# Деплой GTD Task Service на VPS. Вызывается из GitHub Actions по SSH отдельным ключом,
# который в ~/.ssh/authorized_keys ограничен запуском только этого скрипта:
#   command="/home/cloudy/apps/gtd/deploy/deploy.sh",restrict ssh-ed25519 AAAA... gtd-github-actions
# Ветка передаётся в командной строке SSH: "deploy <ветка>".
# Тело обёрнуто в функцию: bash дочитывает файл целиком до того, как git его обновит.
set -euo pipefail

ALLOWED_BRANCHES="main ipr22 ipr22-vps"
COMPOSE=(docker compose -f docker-compose.prod.yml)

main() {
  local branch
  branch="$(echo "${SSH_ORIGINAL_COMMAND:-${1:-}}" | awk '{print $NF}')"
  if [[ ! " ${ALLOWED_BRANCHES} " == *" ${branch} "* ]] || [[ ! "$branch" =~ ^[a-z0-9-]+$ ]]; then
    echo "отказ: ветка '${branch}' не входит в список разрешённых" >&2
    exit 2
  fi

  cd "$(dirname "$(readlink -f "$0")")/.."
  echo "==> обновление кода: ${branch}"
  git fetch --prune --quiet origin "${branch}"
  git checkout --quiet -B "${branch}" "origin/${branch}"
  export APP_VERSION
  APP_VERSION="$(git rev-parse --short HEAD)"

  echo "==> сборка и запуск контейнеров (${APP_VERSION})"
  "${COMPOSE[@]}" up -d --build --remove-orphans api web

  echo "==> ожидание /health/ready"
  for _ in $(seq 1 40); do
    if curl -fsS http://127.0.0.1:8121/health/ready >/dev/null 2>&1; then
      curl -fsS http://127.0.0.1:8121/health/ready; echo
      curl -fsS -o /dev/null http://127.0.0.1:8120/healthz
      docker image prune -f >/dev/null
      echo "==> развёрнуто: ${branch} @ ${APP_VERSION}"
      return 0
    fi
    sleep 3
  done
  echo "проверка /health/ready не пройдена" >&2
  "${COMPOSE[@]}" logs --tail 50 api >&2
  exit 1
}

main "$@"
exit
