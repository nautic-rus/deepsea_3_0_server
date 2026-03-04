-- 003_add_notification_permissions.sql
-- Добавляет разрешения для уведомлений (events и methods).

BEGIN;

INSERT INTO permissions (name, code, description)
SELECT 'Notification Events: view', 'notification_events.view', 'Просмотр событий уведомлений'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'notification_events.view');

INSERT INTO permissions (name, code, description)
SELECT 'Notification Events: create', 'notification_events.create', 'Создание события уведомления'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'notification_events.create');

INSERT INTO permissions (name, code, description)
SELECT 'Notification Events: update', 'notification_events.update', 'Обновление события уведомления'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'notification_events.update');

INSERT INTO permissions (name, code, description)
SELECT 'Notification Events: delete', 'notification_events.delete', 'Удаление события уведомления'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'notification_events.delete');

INSERT INTO permissions (name, code, description)
SELECT 'Notification Methods: view', 'notification_methods.view', 'Просмотр методов уведомлений'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'notification_methods.view');

INSERT INTO permissions (name, code, description)
SELECT 'Notification Methods: create', 'notification_methods.create', 'Создание метода уведомления'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'notification_methods.create');

INSERT INTO permissions (name, code, description)
SELECT 'Notification Methods: update', 'notification_methods.update', 'Обновление метода уведомления'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'notification_methods.update');

INSERT INTO permissions (name, code, description)
SELECT 'Notification Methods: delete', 'notification_methods.delete', 'Удаление метода уведомления'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'notification_methods.delete');

COMMIT;
