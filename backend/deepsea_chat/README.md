# DeepSea Chat

Отдельный чат-сервис с собственной PostgreSQL базой и авторизацией через уже существующий backend auth-service.

## Что реализовано первым этапом

- matrix-подобные комнаты
- membership (`invite`, `join`, `leave`)
- event timeline
- сообщения как события `m.room.message`
- state-события `m.room.name`, `m.room.topic`, `m.room.member`
- `sync` по stream position
- read marker пользователя

## Основные методы

- `POST /api/chat/rooms`
- `GET /api/chat/rooms`
- `GET /api/chat/rooms/:roomId`
- `GET /api/chat/rooms/:roomId/members`
- `POST /api/chat/rooms/:roomId/invite`
- `POST /api/chat/rooms/:roomId/join`
- `POST /api/chat/rooms/:roomId/leave`
- `POST /api/chat/rooms/:roomId/messages`
- `GET /api/chat/rooms/:roomId/messages`
- `POST /api/chat/rooms/:roomId/read_markers`
- `POST /api/chat/read_markers/all`
- `GET /api/chat/sync`
- `GET /api/chat/stream`
- `POST /api/internal/bot_notifications` - internal endpoint for backend notifications

## Авторизация

Сервис не хранит свои логины и пароли. На каждый защищенный запрос он обращается в существующий backend, но результат коротко кэшируется в памяти chat-service:

- `GET ${AUTH_SERVICE_URL}/api/auth/me`

И пробрасывает входящий `Authorization` и `Cookie`.

По умолчанию кэш живет `10` секунд. Значение можно изменить через `CHAT_AUTH_CACHE_TTL_MS`.

Для живого обновления интерфейса есть SSE-канал:

- `GET /api/chat/stream`

Клиент может держать одно соединение и обновлять список комнат/сообщения только по событиям, а `GET /api/chat/sync` оставить как fallback для первичной подгрузки и восстановления после обрывов.

По умолчанию в `.env.example` используется `https://v3.deep-sea.ru`, чтобы отдельный chat-service проверял токен через production auth backend.

Для внутренних уведомлений backend может обращаться в `POST /api/internal/bot_notifications` с заголовком `X-DeepSea-Internal-Token`.
Сервис кладет такие сообщения в bot-room пользователя и отображает отправителя как `DeepSea Bot`.

## Запуск

```bash
cp .env.example .env
docker compose up -d --build
```

По умолчанию сервис слушает внутри контейнера `3100`, а наружу публикуется на `3110`.
Если на сервере нужен другой порт, задай `CHAT_PUBLIC_PORT`.
