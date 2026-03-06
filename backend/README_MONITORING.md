Мониторинг и логирование (Prometheus + Grafana + Loki + Promtail)

Краткая инструкция:

1) Установите зависимость в проекте и перезапустите (или установите локально):

```bash
cd backend
npm install
npm install prom-client --save
```

2) Запустите сервисы мониторинга через Docker Compose:

```bash
cd backend
docker compose -f docker-compose.monitoring.yml up -d
```

3) Доступы:
- Grafana: http://localhost:3000  (admin / admin)
- Grafana: http://localhost:4000  (admin / admin)
- Prometheus: http://localhost:9090
- Loki: http://localhost:3100

4) Конфигурация:
- Prometheus скрапит метрики с `host.docker.internal:3000/metrics` (порт сервера по-умолчанию `3000`).
- Promtail читает логи из `./logs` внутри проекта и отправляет их в Loki.

5) Интеграция в код:
- В `src/app.js` добавлен `prom-client` и endpoint `/metrics`.

Примечания:
- На macOS `host.docker.internal` позволяет контейнерам доставать метрики с локальной машины. Если запускаете сервер внутри контейнера, измените цель в `monitoring/prometheus/prometheus.yml` на `backend:3000` и добавьте сервис `backend` в compose.
- По желанию можно добавить готовые дашборды Grafana через provisioning/dashboards.
