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

Alerting (Alertmanager + Rocket.Chat):
- Alertmanager: http://localhost:9093
- To enable notifications to Rocket.Chat, edit `monitoring/alertmanager/config.yml` and set your incoming webhook URL at `webhook_configs.url`.
- Alerts will mention users by username if your Rocket.Chat webhook/template is configured to do so; by default the webhook URL is a placeholder `https://rocket.chat/hooks/REPLACE_ME`.
- The `HighRequestRate` threshold is set to 50 requests/sec. If you'd like a different threshold, tell me the preferred value and I'll update `monitoring/prometheus/alert_rules.yml`.

Postgres monitoring:
- Service: `postgres-exporter` available on container port `9187` and host port `9187`.
- Prometheus job: `postgres` scrapes `postgres-exporter:9187`.
- Default DSN used by exporter: `postgresql://postgres:230571Sp@host.docker.internal:3010/deepsea3?sslmode=disable`.
	- If your Postgres is reachable at a different IP (for example `192.168.1.177`), edit `docker-compose.monitoring.yml` and update the `DATA_SOURCE_NAME` env for `postgres-exporter` accordingly.
	- For improved security, consider creating a read-only monitoring user in Postgres and using its credentials here.

4) Конфигурация:
- Prometheus скрапит метрики с `host.docker.internal:3000/metrics` (порт сервера по-умолчанию `3000`).
- Promtail читает логи из `./logs` внутри проекта и отправляет их в Loki.

5) Интеграция в код:
- В `src/app.js` добавлен `prom-client` и endpoint `/metrics`.

Примечания:
- На macOS `host.docker.internal` позволяет контейнерам доставать метрики с локальной машины. Если запускаете сервер внутри контейнера, измените цель в `monitoring/prometheus/prometheus.yml` на `backend:3000` и добавьте сервис `backend` в compose.
- По желанию можно добавить готовые дашборды Grafana через provisioning/dashboards.
