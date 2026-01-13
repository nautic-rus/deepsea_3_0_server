# Sitemap — DeepSea 3.0 (страницы и модальные окна)

Этот файл — карта пользовательского интерфейса системы DeepSea 3.0: основные страницы (views) и часто используемые модальные окна (dialogs). Цель — помочь дизайнерам и разработчикам фронтенда/бэкенда понять, где какие сущности доступны и какие модалки открываются на каких страницах.

Формат:
- Страница — URL / view (короткое описание)
- Модальные окна — название (контекст использования / какие поля показывают)

> Примечание: репозиторий содержит только backend, но ниже приведена карта интерфейса, соответствующая API и обычным клиентским экраном для этой системы.

## Главные страницы

- Вход / Аутентификация
  - /login — страница входа (email/username + password)

- Дашборд
  - / — Главная панель после входа: быстрые ссылки, статистика, последние активности

- Профиль
  - /profile — Просмотр и редактирование профиля текущего пользователя (first/last/middle name, contact)

## Users (Пользователи)

- Список пользователей
  - /users — таблица с фильтрами, поиском и пагинацией
  - Основные действия: создать, редактировать, деактивировать
  - Модальные окна:
    - Create / Edit User (modal)
      - Поля: username, email, phone, password (create), first_name, last_name, middle_name, department_id (picker), job_title_id (picker), is_active, is_verified
    - Confirm Delete (modal)
      - Подтверждение soft-delete
    - User details drawer / modal
      - Показать полные данные, связи (department name, job title name, roles)

## Departments

- Departments list
  - /departments — CRUD список отделов
  - Модалы:
    - Create/Edit Department (modal)
    - Confirm Delete

## Roles & Permissions

- Roles list
  - /roles — список ролей
  - /roles/:id — просмотр роли и её permissions
  - Модалы:
    - Create/Edit Role (modal)
    - Manage Permissions (modal)

## Projects

- Projects list
  - /projects — список проектов
  - Actions: create, edit, delete, open project

- Project detail
  - /projects/:id — карточка проекта (информация, задачи, документы, назначения)
  - Вкладки: Overview, Issues, Documents, Assignments, Settings
  - Модалы / диалоги:
    - Edit Project (modal/page)
    - Assign User to Project (modal)
      - Поля: user picker, roles (multi-select) — теперь поддерживает передачу role IDs
    - Unassign User (confirm modal) / Unassign with role selector (modal)
    - Create Issue (modal)

## Issues (Задачи)

- Issues list
  - /issues — список задач по всем проектам с фильтрами
  - Модалы:
    - Create/Edit Issue (modal)
    - Assign/Change Assignee (modal)
    - Comment (modal)
    - Change Status (modal)

## Documents

- Documents list
  - /documents — список документов
  - /documents/:id — просмотр документа (viewer)
  - Модалы:
    - Upload Document (modal)
    - Edit Document metadata (modal)
    - Document viewer (modal/drawer) — preview PDF/DWG/etc.

## Materials, Equipment, Material Kits

- Materials
  - /materials — список / карточки
  - Модалы: Create/Edit Material, Adjust Stock (modal)

- Equipment
  - /equipment — CRUD

- Material Kits
  - /material_kits — list, apply kit modal

## Specifications, Stages, Storage, Statements

- Specifications — /specifications
  - Модалы: Create/Edit Specification, Apply Material Kit

- Stages — /stages (CRUD)
- Storage — /storage (CRUD)
- Statements — /statements (CRUD)

## Permissions & Admin

- Permissions
  - /permissions — просмотр всех разрешений

- Admin / System settings
  - /admin or /settings — глобальные настройки, аудиты, интеграции
  - Модалы: System settings editor, Import/Export data, Audit viewer

## Часто используемые модальные окна (catalog)

- Create / Edit entity (generic modal)
  - Используется для users, departments, roles, projects, issues, documents и т.д.
  - Поля зависят от сущности; общий паттерн: form, validation, submit, success toast

- Confirm Action (danger)
  - Подтверждение удаления/отвязывания/сброса — минимальный набор: reason, checkbox

- Picker dialogs
  - User picker — поиск и выбор пользователя
  - Department picker — выбор отдела
  - Job title picker — выбор должности
  - Role picker — мультиселект ролей (отображает role name и id)

- Assignment modals
  - Assign User to Project — user picker + roles (multi) + optional start/end dates
  - Unassign roles — выбор ролей для удаления (multi) или удалить все

- Document viewer / Upload
  - Preview documents and download
  - Upload with metadata form

- Inline editors / drawers
  - Quick-edit drawer for table rows (users, materials, roles)

## Примеры потоков (UX flows)

- Назначение пользователя в проект
  1. Открыть /projects/:id
  2. Нажать "Assign user" → откроется Assign User modal
  3. Выбрать пользователя, выбрать роли (multi-select role IDs) → Submit → API `POST /api/projects/assign`

- Удаление роли у пользователя
  1. В Project → Assignments найти строку пользователя → Unassign → откроется Confirm/Role selector
  2. Выбрать роли для удаления (или оставить пустым для удаления всех) → Submit → API `DELETE /api/projects/:id/assignments` (body { user_id, roles: [ids] })

## Примечания для разработчиков

- API соответствует страницам: смотрите `backend/src/api/routes/index.js` для полного списка REST путей.
- В OpenAPI (`backend/docs/api/swagger.yaml`) теперь указаны request/response примеры для большинства операций — используйте их для построения форм и mock-данных.
- Если интерфейс изменится (новые страницы/модалки), обновите этот `sitemap.md` и при необходимости добавьте новые OpenAPI описания.

---

Если нужно, могу:
- Автоматически сгенерировать более детальную карту всех путей/методов из `swagger.yaml` и вставить их в отдельный раздел;
- Сгенерировать простой визуальный PNG/Draw.io диаграмму навигации (требуется права на запись/добавление файла).

