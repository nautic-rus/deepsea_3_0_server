#!/usr/bin/env node
/**
 * Swagger transformation script — comprehensive version
 * 1. Translate ALL Russian text to English
 * 2. Sort tags alphabetically (add missing customer_question_types tag)
 * 3. Sort paths by tag → path → method
 * 4. Standardize description style
 * 5. Wrap response schemas in { data: ... } where applicable
 * 6. Clear default filter values
 * 7. Sort component schemas alphabetically
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', 'api', 'swagger.json');
const swagger = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

// ============================================================
// Complete Russian → English translation map
// ============================================================
const translations = {
  // --- info ---
  "API документация для системы DeepSea 3.0": "API documentation for the DeepSea 3.0 system",

  // --- Long descriptions ---
  "# Пример запроса\nGET /api/documents?project_id=12&search=pipe&page=1&limit=20 HTTP/1.1\nHost: {{baseUrl}}\nAuthorization: Bearer <your-jwt-token>\n\n# Описание параметров в запросе:\n# - project_id: id проекта\n# - search: поиск по title/description\n# - page, limit: пагинация\n":
    "# Example request\nGET /api/documents?project_id=12&search=pipe&page=1&limit=20 HTTP/1.1\nHost: {{baseUrl}}\nAuthorization: Bearer <your-jwt-token>\n\n# Query parameter descriptions:\n# - project_id: project ID\n# - search: search by title/description\n# - page, limit: pagination\n",

  "Аутентификация пользователя по username или email и паролю; возвращает информацию о пользователе.\n\nПосле успешного входа сервер устанавливает HttpOnly cookies: `access_token` (JWT access token) и `refresh_token` (refresh token). Токены не возвращаются в теле ответа — они доставляются в HttpOnly cookies. Ответ содержит только `expires_at` и `user`.":
    "Authenticates a user by username or email and password; returns user information.\n\nAfter successful login the server sets HttpOnly cookies: `access_token` (JWT access token) and `refresh_token`. Tokens are not returned in the response body — they are delivered via HttpOnly cookies. The response body contains only `expires_at` and `user`.",

  "Деактивирует текущую сессию / refresh token. Требуется авторизация.":
    "Deactivates the current session / refresh token. Requires authentication.",

  "Возвращает профиль авторизованного пользователя.":
    "Returns the authenticated user profile.",

  "Обновляет access token по refresh token. Refresh token должен быть передан в HttpOnly cookie с именем `refresh_token`.\n\nНовые токены выдаются в HttpOnly cookies; тело ответа содержит только `expires_at` и `user`.":
    "Refreshes access token using the refresh token. The refresh token must be sent in an HttpOnly cookie named `refresh_token`.\n\nNew tokens are delivered via HttpOnly cookies; the response body contains only `expires_at` and `user`.",

  "Отправляет письмо с инструкциями по восстановлению пароля, если email существует в системе. Ответ не будет раскрывать, существует ли указанный адрес в системе.":
    "Sends an email with password reset instructions if the email exists. The response does not reveal whether the address exists.",

  "Сбрасывает пароль пользователя с помощью одноразового токена, полученного из письма.":
    "Resets user password using a one-time token received via email.",

  "Устанавливает новый пароль для аккаунта по предоставленному действительному токене восстановления.":
    "Sets a new password for the account using a valid recovery token.",

  "Устанавливает новый пароль для аккаунта по предоставленному действительному токену восстановления.":
    "Sets a new password for the account using a valid recovery token.",

  "Назначить пользователя в проект": "Assign user to project",
  "Назначить исполнителя задачи / сменить исполнителя": "Assign / change issue assignee",
  "Назначить пользователя на задачу (assignee). Тело запроса: { assignee_id: <int|null> } — передайте null чтобы снять назначение. Требуется разрешение issues.update.":
    "Assign user as issue assignee. Request body: { assignee_id: <int|null> } — pass null to unassign. Requires issues.update permission.",

  // --- Tag descriptions ---
  "CRUD для статусов вопросов от заказчика": "CRUD operations for customer question statuses",
  "Операции по настройке переходов статусов вопросов от заказчика": "CRUD operations for customer question workflow transitions",
  "Операции по работе с вопросами от заказчика": "CRUD operations for customer questions",
  "CRUD для статусов документов (document_status)": "CRUD operations for document statuses",
  "Типы хранилищ документов (documents_storage_type)": "CRUD operations for document storage types",
  "CRUD для типов документов (document_type)": "CRUD operations for document types",
  "Операции по настройке переходов статусов документов (document_work_flow)": "CRUD operations for document workflow transitions",
  "Операции по работе с документами и их директориями": "Operations for documents and document directories",
  "CRUD для статусов задач (issue_status)": "CRUD operations for issue statuses",
  "CRUD для типов задач (issue_type)": "CRUD operations for issue types",
  "Операции по настройке переходов статусов задач (issue_work_flow)": "CRUD operations for issue workflow transitions",
  "CRUD для должностей": "CRUD operations for job titles",
  "Операции по созданию и удалению связей между сущностями (задачи, документы).": "Operations for creating and deleting entity links (issues, documents)",
  "Привязка разрешений к страницам": "Link permissions to pages",
  "CRUD для страниц меню": "CRUD operations for menu pages",
  "CRUD для специальностей / специализаций документов": "CRUD operations for document specializations",

  // --- Summaries ---
  "Список audit логов": "List audit logs",
  "Вход в систему (по username или email)": "Log in (by username or email)",
  "Время истечения токена": "Token expiration time",
  "Выйти из системы (деактивировать сессию)": "Log out (deactivate session)",
  "Внутренняя ошибка сервера": "Internal server error",
  "Информация о текущем пользователе": "Current user profile",
  "Профиль пользователя": "User profile",
  "Обновить access token": "Refresh access token",
  "Токены обновлены": "Tokens refreshed",
  "Неверный refresh token": "Invalid refresh token",
  "Запрос на восстановление пароля": "Request password reset",
  "Сброс пароля по токену": "Reset password by token",

  // --- Field descriptions ---
  "ID проекта (null = глобальный переход)": "Project ID (null = global transition)",
  "ID проекта (null = глобальный)": "Project ID (null = global)",
  "ID начального статуса вопроса": "Source status ID",
  "ID целевого статуса вопроса": "Target status ID",
  "ID начального статуса документа": "Source status ID",
  "ID целевого статуса документа": "Target status ID",
  "ID начального статуса задачи": "Source status ID",
  "ID целевого статуса задачи": "Target status ID",
  "ID типа задачи": "Issue type ID",
  "ФИО владельца проекта (фамилия имя отчество)": "Project owner full name",
  "Список участников проекта": "Project participants",
  "ФИО пользователя (фамилия, имя, отчество)": "User full name",

  // --- Parameter descriptions ---
  "Email адрес пользователя": "User email address",
  "ID автора/создателя задачи — можно передать несколько значений": "Author/creator ID — multiple values allowed",
  "ID директории": "Directory ID",
  "ID документа": "Document ID",
  "ID должности": "Job title ID",
  "ID задачи": "Issue ID",
  "ID отдела": "Department ID",
  "ID папки/каталога": "Folder/directory ID",
  "ID пользователя": "User ID",
  "ID пользователя для назначения. Может быть целым числом, массивом целых чисел или CSV-строкой (e.g. \"34,55\"). Контроллер поддерживает все три формата.":
    "User ID for assignment. Can be an integer, array of integers, or CSV string (e.g. \"34,55\"). The controller supports all three formats.",
  "ID пользователя, которого нужно отвязать. Может быть целым числом, массивом целых чисел или CSV-строкой (e.g. \"34,55\"). Контроллер поддерживает все три формата.":
    "User ID to unassign. Can be an integer, array of integers, or CSV string (e.g. \"34,55\"). The controller supports all three formats.",
  "ID пользователя, назначенного на задачу — можно передать несколько значений": "Assignee user ID — multiple values allowed",
  "ID пользователя, создавшего документ": "ID of the user who created the document",
  "ID проекта": "Project ID",
  "ID проекта для фильтрации": "Project ID for filtering",
  "ID проекта — можно передать несколько значений (через запятую или повторяя параметр)": "Project ID — multiple values allowed (comma-separated or repeated parameter)",
  "ID роли": "Role ID",
  "ID роли, которую нужно удалить (если указано — удалит только эту роль)": "Role ID to remove (if specified — removes only this role)",
  "ID специализации": "Specialization ID",
  "ID стадии": "Stage ID",
  "ID статуса": "Status ID",
  "ID статуса документа": "Document status ID",
  "ID статуса — можно передать несколько значений (через запятую или повторяя параметр)": "Status ID — multiple values allowed (comma-separated or repeated parameter)",
  "ID типа": "Type ID",
  "ID типа задачи (issue_type)": "Issue type ID",
  "ID типа задачи — можно передать несколько значений": "Issue type ID — multiple values allowed",
  "ID файла в storage": "File ID in storage",
  "ID файла в таблице storage": "File ID in storage table",
  "Фильтр по проекту": "Filter by project",
  "Фильтр по типу вопроса": "Filter by question type",
  "Фильтр по типу документа": "Filter by document type",
  "Фильтр по типу задачи": "Filter by issue type",
  "Фильтр по активности": "Filter by active status",
  "Фильтр по закрытому статусу задачи (true = закрытые, false = не закрытые)": "Filter by closed status (true = closed, false = not closed)",
  "Фильтрация по названию (частичный поиск)": "Filter by title (partial match)",
  "Фильтрация по описанию (частичный поиск)": "Filter by description (partial match)",
  "Общий поиск по title/description": "General search by title/description",
  "Поиск по title/description": "Search by title/description",
  "Поиск по username/email/phone (ILIKE)": "Search by username/email/phone (ILIKE)",
  "Номер страницы": "Page number",
  "Номер страницы (по умолчанию 1)": "Page number (default 1)",
  "Количество записей на страницу": "Records per page",
  "Количество элементов на страницу (по умолчанию 25)": "Items per page (default 25)",
  "Возвращать документы созданные до указанной даты (RFC3339)": "Return documents created before this date (RFC3339)",
  "Возвращать документы созданные после указанной даты (RFC3339)": "Return documents created after this date (RFC3339)",
  "Дата завершения (<=)": "Due date (<=)",
  "Дата завершения (>=)": "Due date (>=)",
  "Начальная дата (<=)": "Start date (<=)",
  "Начальная дата (>=)": "Start date (>=)",
  "Максимум оценочных часов": "Maximum estimated hours",
  "Минимум оценочных часов": "Minimum estimated hours",
  "Оценочные часы (точное совпадение)": "Estimated hours (exact match)",
  "Можно перечислять через запятую для поиска по нескольким значениям": "Multiple values can be separated by commas",
  "Приоритет (внутренний код) — можно передать несколько значений (например low,medium)": "Priority code — multiple values allowed (e.g. low,medium)",
  "Приоритет задачи (low|medium|high or custom code)": "Issue priority (low|medium|high or custom code)",
  "Вернуть только задачи, принадлежащие текущему пользователю (author OR assignee). Значение: true/false":
    "Return only issues belonging to the current user (author OR assignee). Value: true/false",
  "Массив ID ролей для удаления": "Array of role IDs to remove",

  // --- User fields ---
  "Имя пользователя": "User first name",
  "Фамилия пользователя": "User last name",
  "Отчество пользователя": "User middle name",
  "Номер телефона пользователя": "User phone number",
  "Уникальное имя пользователя. Если не указано, будет автоматически взято из части email до символа @ (алиас) и при необходимости дополнено числовым суффиксом для обеспечения уникальности.":
    "Unique username. If not provided, it will be automatically derived from the email prefix (alias) and appended with a numeric suffix if needed for uniqueness.",

  // --- Examples / data values ---
  "Баг": "Bug",
  "В работе": "In progress",
  "Вопрос по продукту": "Product question",
  "Опишите ваш вопрос кратко и ясно": "Describe your question briefly and clearly",
  "Подготовка": "Preparation",
  "Чертеж": "Drawing",

  // --- Response descriptions ---
  "Создано": "Created",
  "Отдел создан": "Department created",
  "Неверный id": "Invalid ID",
  "Неверный ввод": "Invalid input",
  "Требуется аутентификация": "Authentication required",
  "Пользователь найден": "User found",
  "Пользователь обновлён": "User updated",
  "Связь не найдена": "Link not found",
  "Обновлённая задача": "Updated issue",
  "Успешно отвязан пользователь(и)": "User(s) successfully unassigned",
  "Запрещено — отсутствует разрешение links.create": "Forbidden — missing links.create permission",
  "Запрещено — отсутствует разрешение links.delete": "Forbidden — missing links.delete permission",

  // --- Summaries (CRUD) ---
  // customer_question_statuses
  "Создать статус вопроса от заказчика": "Create customer question status",
  "Список статусов вопросов от заказчика": "List customer question statuses",
  "Обновить статус вопроса": "Update customer question status",
  "Удалить статус вопроса": "Delete customer question status",
  "Получить статус вопроса по id": "Get customer question status by ID",
  "Возвращает список всех записей customer_question_status. Требуется разрешение customer_questions.view.":
    "Returns all customer_question_status records. Requires customer_questions.view permission.",

  // customer_question_types
  "Создать тип вопроса от заказчика": "Create customer question type",
  "Список типов вопросов от заказчика": "List customer question types",
  "Обновить тип вопроса": "Update customer question type",
  "Удалить тип вопроса": "Delete customer question type",
  "Получить тип вопроса по id": "Get customer question type by ID",
  "Возвращает список всех записей customer_question_type. Требуется разрешение customer_questions.view.":
    "Returns all customer_question_type records. Requires customer_questions.view permission.",
  "Создаёт новую запись в таблице `customer_question_type`.": "Creates a new customer_question_type record.",
  "Возвращает запись customer_question_type по идентификатору. Требуется разрешение customer_questions.view.":
    "Returns a customer_question_type record by ID. Requires customer_questions.view permission.",

  // customer_question_work_flows
  "Создать переход статусов вопросов": "Create customer question workflow transition",
  "Список переходов статусов вопросов от заказчика": "List customer question workflow transitions",
  "Обновить переход статусов вопросов": "Update customer question workflow transition",
  "Удалить переход статусов вопросов": "Delete customer question workflow transition",
  "Получить переход статусов вопросов по id": "Get customer question workflow transition by ID",
  "Возвращает список переходов customer_question_work_flow. Требуется разрешение customer_questions.view.":
    "Returns customer_question_work_flow records. Requires customer_questions.view permission.",

  // departments
  "Создать новый отдел. Требуется разрешение departments.create.": "Creates a new department. Requires departments.create permission.",
  "Список отделов": "Department list",
  "Обновить существующий отдел. Требуется разрешение departments.update.": "Updates an existing department. Requires departments.update permission.",
  "Удалить (soft-delete) отдел. Требуется разрешение departments.delete.": "Soft-deletes a department. Requires departments.delete permission.",

  // document_statuses
  "Создать статус документа": "Create document status",
  "Список статусов документов": "List document statuses",
  "Обновить статус документа": "Update document status",
  "Удалить статус документа": "Delete document status",
  "Получить статус документа по id": "Get document status by ID",
  "Создаёт новую запись в таблице `document_status`. Требуется разрешение documents.create.":
    "Creates a new document_status record. Requires documents.create permission.",
  "Возвращает список всех записей из таблицы `document_status` со всеми атрибутами. Требуется разрешение documents.view.":
    "Returns all document_status records. Requires documents.view permission.",
  "Обновляет существующую запись document_status. Требуется разрешение documents.update.":
    "Updates a document_status record. Requires documents.update permission.",
  "Удаляет запись document_status (soft/hard depends on DB). Требуется разрешение documents.delete.":
    "Deletes a document_status record. Requires documents.delete permission.",
  "Возвращает запись из `document_status` по идентификатору. Требуется разрешение documents.view.":
    "Returns a document_status record by ID. Requires documents.view permission.",
  "ID статуса": "Status ID",

  // document_storage_types
  "Создать тип хранения документов": "Create document storage type",
  "Список типов хранения для документов": "List document storage types",
  "Обновить тип хранения": "Update document storage type",
  "Удалить тип хранения": "Delete document storage type",
  "Получить тип хранения по id": "Get document storage type by ID",

  // document_types
  "Создать тип документа": "Create document type",
  "Список типов документов": "List document types",
  "Обновить тип документа": "Update document type",
  "Удалить тип документа": "Delete document type",
  "Получить тип документа по id": "Get document type by ID",
  "Создаёт новую запись в таблице `document_type`. Требуется разрешение documents.create.":
    "Creates a new document_type record. Requires documents.create permission.",
  "Возвращает список всех записей из таблицы `document_type` со всеми атрибутами. Требуется разрешение documents.view.":
    "Returns all document_type records. Requires documents.view permission.",
  "Обновляет существующую запись document_type.": "Updates a document_type record.",
  "Возвращает запись из `document_type` по идентификатору.": "Returns a document_type record by ID.",
  "ID типа": "Type ID",

  // document_work_flows
  "Создать переход статуса документа": "Create document workflow transition",
  "Список переходов статусов документов": "List document workflow transitions",
  "Обновить переход статуса документа": "Update document workflow transition",
  "Удалить переход статуса документа": "Delete document workflow transition",
  "Получить переход по id": "Get workflow transition by ID",
  "Создаёт новую запись в document_work_flow.": "Creates a new document_work_flow record.",
  "Возвращает список записей document_work_flow. Можно фильтровать по project_id.":
    "Returns document_work_flow records. Can be filtered by project_id.",

  // documents
  "Создать документ": "Create document",
  "Список документов": "List documents",
  "Получить документ": "Get document",
  "Обновить документ": "Update document",
  "Удалить документ": "Delete document",
  "Создать директорию документов": "Create document directory",
  "Список директорий документов": "List document directories",
  "Обновить директорию документов": "Update document directory",
  "Удалить директорию документов": "Delete document directory",
  "Прикрепить файл к документу": "Attach file to document",
  "Открепить файл от документа": "Detach file from document",
  "Список прикреплённых файлов документа": "List document attachments",
  "Обновить метаданные прикреплённого файла документа": "Update document attachment metadata",
  "Добавить сообщение к документу": "Add message to document",
  "Список сообщений документа": "List document messages",
  "Возвращает список сообщений (комментариев) документа. Требуется разрешение documents.view.":
    "Returns document messages (comments). Requires documents.view permission.",
  "История изменений документа": "Document change history",
  "Возвращает хронологию изменений и действий над документом. Требуется разрешение documents.view.":
    "Returns the document change history timeline. Requires documents.view permission.",

  // equipment
  "Получить оборудование": "Get equipment",
  "Список оборудования": "List equipment",
  "Обновить оборудование": "Update equipment",
  "Удалить оборудование": "Delete equipment",

  // issue_statuses
  "Создать статус задачи": "Create issue status",
  "Список статусов задач": "List issue statuses",
  "Обновить статус задачи": "Update issue status",
  "Удалить статус задачи": "Delete issue status",
  "Получить статус задачи по id": "Get issue status by ID",
  "Создаёт новую запись в таблице `issue_status`.": "Creates a new issue_status record.",
  "Возвращает список всех записей из таблицы `issue_status` со всеми атрибутами. Требуется разрешение issues.view.":
    "Returns all issue_status records. Requires issues.view permission.",

  // issue_types
  "Создать тип задачи": "Create issue type",
  "Список типов задач": "List issue types",
  "Обновить тип задачи": "Update issue type",
  "Удалить тип задачи": "Delete issue type",
  "Получить тип задачи по id": "Get issue type by ID",
  "Создаёт новую запись в таблице `issue_type`.": "Creates a new issue_type record.",
  "Возвращает список всех записей из таблицы `issue_type` со всеми атрибутами. Требуется разрешение issues.view.":
    "Returns all issue_type records. Requires issues.view permission.",
  "Возвращает запись из `issue_type` по идентификатору. Требуется разрешение issues.view.":
    "Returns an issue_type record by ID. Requires issues.view permission.",

  // issue_work_flows
  "Создать переход статуса задачи": "Create issue workflow transition",
  "Список переходов статусов задач": "List issue workflow transitions",
  "Обновить переход статуса задачи": "Update issue workflow transition",
  "Удалить переход статуса задачи": "Delete issue workflow transition",
  "Получить переход задачи по id": "Get issue workflow transition by ID",
  "Создаёт новую запись в issue_work_flow.": "Creates a new issue_work_flow record.",
  "Возвращает список записей issue_work_flow. Можно фильтровать по project_id и issue_type_id.":
    "Returns issue_work_flow records. Can be filtered by project_id and issue_type_id.",

  // issues
  "Создать задачу": "Create issue",
  "Список задач": "List issues",
  "Получить задачу": "Get issue",
  "Обновить задачу": "Update issue",
  "Удалить задачу": "Delete issue",
  "Прикрепить файл к задаче": "Attach file to issue",
  "Открепить файл от задачи": "Detach file from issue",
  "Список прикреплённых файлов задачи": "List issue attachments",
  "Добавить сообщение к задаче": "Add message to issue",
  "Список сообщений задачи": "List issue messages",
  "Возвращает список сообщений (комментариев) задачи. Требуется разрешение issues.view.":
    "Returns issue messages (comments). Requires issues.view permission.",
  "История изменений задачи": "Issue change history",
  "Возвращает хронологию изменений и действий над задачей (timeline). Требуется разрешение issues.view.":
    "Returns the issue change history timeline. Requires issues.view permission.",

  // job_titles
  "Список должностей": "List job titles",
  "Обновляет запись должности по id.": "Updates a job title record by ID.",
  "Удаляет запись должности.": "Deletes a job title record.",
  "Создает новую запись в таблице `job_title`.": "Creates a new job_title record.",
  "Возвращает список всех должностей (id, name). Требуется разрешение job_titles.view.":
    "Returns all job titles (id, name). Requires job_titles.view permission.",

  // links
  "Создать связь между сущностями": "Create entity link",
  "Список связей": "List entity links",
  "Список/поиск связей": "List/search entity links",
  "Удалить связь": "Delete entity link",
  "Создаёт отношение между двумя сущностями (задачи, документы и др.).":
    "Creates a relationship between two entities (issues, documents, etc.).",
  "Возвращает список записей из таблицы `entity_links` по указанным фильтрам.":
    "Returns entity_links records matching the specified filters.",
  "Удаляет ранее созданную связь по её ID.": "Deletes an entity link by ID.",

  // materials
  "Список материалов": "List materials",
  "Получить материал": "Get material",
  "Обновить материал": "Update material",
  "Удалить материал": "Delete material",
  "Получить следующий код склада": "Get next stock code",
  "Получить следующий stock_code": "Get next stock code",
  "Возвращает следующий доступный stock code для материалов.": "Returns the next available stock code for materials.",

  // material_kits
  "Список material kits": "List material kits",
  "Создать material kit": "Create material kit",
  "Получить material kit": "Get material kit",
  "Обновить material kit": "Update material kit",
  "Удалить material kit": "Delete material kit",
  "Применить kit к спецификации": "Apply kit to specification",
  "Список items в kit": "List material kit items",
  "Добавить item в kit": "Add item to material kit",
  "Обновить item": "Update material kit item",
  "Удалить item": "Delete material kit item",

  // notifications
  "Список уведомлений пользователя (центр уведомлений)": "User notifications (notification center)",
  "Возвращает список уведомлений для пользователя. По умолчанию скрытые уведомления не включаются.":
    "Returns user notifications. Hidden notifications are excluded by default.",
  "Возвращает число непрочитанных и не скрытых уведомлений для пользователя.":
    "Returns the count of unread and visible notifications for the user.",
  "Пометить уведомление как прочитанное": "Mark notification as read",
  "Помечает указанное уведомление как прочитанное для пользователя.":
    "Marks the specified notification as read for the user.",
  "Помечает уведомление как скрытое (не отображается в списке по умолчанию).":
    "Marks the notification as hidden (excluded from the default list).",
  "Получить настройки уведомлений пользователя": "Get user notification settings",
  "Возвращает список настроек уведомлений для текущего пользователя. Можно передать project_id в query для фильтрации по проекту.":
    "Returns notification settings for the current user. Pass project_id in query to filter by project.",
  "Создать/обновить настройку уведомлений пользователя": "Create/update user notification setting",
  "Создаёт или обновляет настройку уведомлений (project-specific или global) для пользователя.":
    "Creates or updates a notification setting (project-specific or global) for the user.",
  "Удалить настройку уведомлений пользователя": "Delete user notification setting",
  "Удаляет настройку по composite key (project_id, event_id, method_id). Для глобальной настройки передайте project_id = null.":
    "Deletes a setting by composite key (project_id, event_id, method_id). For global settings pass project_id = null.",
  "Получить список событий уведомлений": "List notification events",
  "Получить событие уведомлений по id": "Get notification event by ID",
  "Создать событие уведомлений": "Create notification event",
  "Обновить событие уведомлений": "Update notification event",
  "Удалить событие уведомлений": "Delete notification event",
  "Получить список методов уведомлений": "List notification methods",
  "Получить метод уведомлений по id": "Get notification method by ID",
  "Создать метод уведомлений": "Create notification method",
  "Обновить метод уведомлений": "Update notification method",
  "Удалить метод уведомлений": "Delete notification method",

  // page_permissions
  "Список разрешений для страниц": "List page permissions",
  "Возвращает список записей из таблицы `page_permissions`. Можно фильтровать по page_id.":
    "Returns page_permissions records. Can be filtered by page_id.",
  "Привязать разрешение к странице": "Link permission to page",
  "Создает запись в `page_permissions`.": "Creates a page_permissions record.",
  "Удалить все привязки разрешений для страницы": "Delete all page permission links for a page",
  "Удаляет все записи из `page_permissions` для указанной страницы и возвращает число удалённых записей.":
    "Deletes all page_permissions records for the specified page and returns the count of deleted records.",

  // pages
  "Список страниц (admin view)": "List pages (admin view)",
  "Возвращает список страниц с агрегированными разрешениями.":
    "Returns pages with aggregated permissions.",
  "Получить страницы меню пользователя": "Get current user menu pages",
  "Возвращает список страниц (menu items) доступных для текущего пользователя на основе его прав и ролей.":
    "Returns menu pages available to the current user based on their permissions and roles.",
  "Создать страницу": "Create page",
  "Создает новую страницу.": "Creates a new page.",
  "Обновить страницу": "Update page",
  "Обновляет страницу по id.": "Updates a page by ID.",
  "Удалить страницу": "Delete page",
  "Удаляет страницу.": "Deletes a page.",

  // permissions
  "Список разрешений": "List permissions",
  "Получить разрешения по role_id": "Get permissions by role ID",
  "Возвращает разрешения для роли по query-параметру role_id (fallback endpoint). Требуется roles.view.":
    "Returns permissions for a role by role_id query parameter (fallback endpoint). Requires roles.view.",
  "Все разрешения (all permissions flat list)": "List all permissions (flat list)",
  "Возвращает все разрешения всех ролей.": "Returns permissions from all roles.",

  // projects
  "Список проектов": "List projects",
  "Получить проект": "Get project",

  // roles
  "Получить разрешения роли": "Get role permissions",
  "Возвращает список разрешений, привязанных к роли. Требуется разрешение roles.view.":
    "Returns permissions linked to a role. Requires roles.view permission.",
  "Получить роль": "Get role",
  "Список назначений": "List assignments",
  "Список назначений для проекта": "List project assignments",

  // specializations
  "Получить список специализаций": "List specializations",
  "Возвращает список специализаций (specializations). Требуется разрешение users.view.":
    "Returns all specializations. Requires users.view permission.",
  "Получить специализацию по ID": "Get specialization by ID",
  "Возвращает одну специализацию по её ID. Требуется разрешение users.view.":
    "Returns a specialization by ID. Requires users.view permission.",
  "Создание новой специализации. Требуется разрешение users.create.":
    "Creates a new specialization. Requires users.create permission.",
  "Обновляет существующую специализацию. Требуется разрешение users.update.":
    "Updates a specialization. Requires users.update permission.",
  "Удаляет специализацию. Требуется разрешение users.delete.":
    "Deletes a specialization. Requires users.delete permission.",

  // specifications
  "Получить спецификацию": "Get specification",
  "Список спецификаций": "List specifications",

  // stages
  "Получить стадию": "Get stage",
  "Список стадий": "List stages",

  // statements
  "Список ведомостей": "List statements",

  // storage
  "Список файлов в хранилище": "List storage files",
  "Получить файл": "Get storage file",
  "Обновить файл": "Update storage file",
  "Удалить файл": "Delete storage file",
  "Скачать файл": "Download file",
  "Скачать несколько файлов в одном ZIP-архиве": "Download multiple files in a ZIP archive",
  "Скачать/стримить файл из хранилища. Для локальных файлов будет stream, для S3 будет редирект на URL.":
    "Download/stream a file from storage. Local files are streamed, S3 files redirect to URL.",

  // users
  "Получить список пользователей": "List users",
  "Получить пользователя по ID": "Get user by ID",
  "Возвращает список пользователей с пагинацией. Требуется разрешение users.view.":
    "Returns a paginated user list. Requires users.view permission.",
  "Возвращает пользователя по его идентификатору. Требуется разрешение users.view.":
    "Returns a user by ID. Requires users.view permission.",
  "Создать нового пользователя": "Create user",
  "Создание нового пользователя в системе": "Create a new user in the system",
  "Частичное обновление пользователя. Требуется разрешение users.update.":
    "Partial user update. Requires users.update permission.",
  "Удалить пользователя (soft-delete)": "Delete user (soft-delete)",
  "Пометить пользователя как неактивного. Требуется разрешение users.delete.":
    "Marks user as inactive. Requires users.delete permission.",
  "Получить связку Rocket.Chat для пользователя": "Get user Rocket.Chat link",
  "Возвращает соответствие пользователя приложения и аккаунта Rocket.Chat. Требуется разрешение users.view.":
    "Returns the mapping between the app user and Rocket.Chat account. Requires users.view permission.",
  "Создать/обновить связку Rocket.Chat для пользователя": "Create/update user Rocket.Chat link",
  "Создаёт или обновляет соответствие между пользователем и аккаунтом Rocket.Chat. Требуется разрешение users.update.":
    "Creates or updates the mapping between a user and a Rocket.Chat account. Requires users.update permission.",
  "Удалить связку Rocket.Chat для пользователя": "Delete user Rocket.Chat link",
  "Удаляет запись соответствия между пользователем и аккаунтом Rocket.Chat. Требуется разрешение users.delete.":
    "Deletes the user-to-Rocket.Chat mapping. Requires users.delete permission.",
  "Отвязать пользователя от проекта": "Unassign user from project",
  "Удаляет назначение пользователя в проекте. Параметры передаются в теле запроса: user_id и необязательное role или roles.":
    "Removes a user assignment from a project. Parameters sent in request body: user_id and optional role or roles.",
  "Возвращает список пользователей, назначенных в проект с их ролями и временем назначения.":
    "Returns users assigned to the project with their roles and assignment dates.",
  "Возвращает список проектов, к которым привязан текущий пользователь. Аутентификация требуется, дополнительных разрешений не требуется.":
    "Returns projects the current user is assigned to. Authentication required, no additional permissions needed.",

  // misc
  "Список связей": "List entity links",
  "Скачать файл(ы)": "Download file(s)",
  "Все хранилища": "List storage entries",
  "Загрузить файл в S3": "Upload file to S3",
  "Загрузить файл локально": "Upload file locally",
  "Загрузить аватар": "Upload avatar",
  "Страницы текущего пользователя (с учётом прав)": "Current user pages (filtered by permissions)",
  "Мои проекты": "My projects",
  "Пригласить пользователя": "Invite user",
  "Сбросить пароль": "Reset password",
  "Создать пользователей": "Create users (batch)",
  "Уведомления пользователя": "User notifications",
  "Количество непрочитанных уведомлений": "Unread notifications count",
  "Скрыть уведомление": "Hide notification",
  "Отметить как прочитанное": "Mark as read",
  "Настройки уведомлений": "Notification settings",
  "Сохранить/обновить настройки уведомлений": "Save/update notification settings",
  "Удалить настройку уведомления": "Delete notification setting",
  "Просмотр записей аудита. Требуется соответствующее право доступа.":
    "View audit log records. Requires appropriate permissions.",
  "Список audit логов": "List audit logs",

  // --- Missing simple CRUD summaries ---
  "Создать отдел": "Create department",
  "Получить список отделов": "List departments",
  "Возвращает список отделов. Требуется разрешение departments.view.": "Returns a list of departments. Requires departments.view permission.",
  "Обновить отдел": "Update department",
  "Удалить отдел": "Delete department",
  "Создать оборудование": "Create equipment",
  "Создать должность": "Create job title",
  "Обновить должность": "Update job title",
  "Удалить должность": "Delete job title",
  "Создать материал": "Create material",
  "Создать разрешение": "Create permission",
  "Обновить разрешение": "Update permission",
  "Удалить разрешение": "Delete permission",
  "Создать проект": "Create project",
  "Обновить проект": "Update project",
  "Удалить проект": "Delete project",
  "Создать роль": "Create role",
  "Список ролей": "List roles",
  "Получить роль по id": "Get role by ID",
  "Обновить роль": "Update role",
  "Удалить роль": "Delete role",
  "Создать специализацию": "Create specialization",
  "Обновить специализацию": "Update specialization",
  "Удалить специализацию": "Delete specialization",
  "Создать спецификацию": "Create specification",
  "Обновить спецификацию": "Update specification",
  "Удалить спецификацию": "Delete specification",
  "Создать стадию": "Create stage",
  "Обновить стадию": "Update stage",
  "Удалить стадию": "Delete stage",
  "Создать ведомость": "Create statement",
  "Все привязки": "List all page-permission links",
  "Добавить привязку": "Create page-permission link",
  "Удалить привязку": "Delete page-permission link",
  "Все разрешения для роли": "List role permissions",
  "Добавить разрешение к роли": "Add permission to role",
  "Удалить разрешение роли": "Remove permission from role",
  "Список всех проектов": "List all projects",
  "Список пользователей": "List users",
  "Получить пользователя по id": "Get user by ID",
  "Обновить пользователя": "Update user",
  "Удалить пользователя": "Delete user",
};

// ============================================================
// Deep translate all string values
// ============================================================
function deepTranslate(obj) {
  if (typeof obj === 'string') {
    return translations[obj] || obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepTranslate);
  }
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = deepTranslate(v);
    }
    return out;
  }
  return obj;
}

// ============================================================
// Apply translations to everything
// ============================================================
swagger.info = deepTranslate(swagger.info);
swagger.components = deepTranslate(swagger.components);
swagger.paths = deepTranslate(swagger.paths);

// ============================================================
// Ensure customer_question_types tag exists
// ============================================================
const existingTagNames = new Set(swagger.tags.map(t => t.name));
if (!existingTagNames.has('customer_question_types')) {
  swagger.tags.push({ name: 'customer_question_types', description: 'CRUD operations for customer question types' });
}

// ============================================================
// Sort tags alphabetically & translate
// ============================================================
swagger.tags = deepTranslate(swagger.tags);
swagger.tags.sort((a, b) => a.name.localeCompare(b.name));

// ============================================================
// Ensure all tags have English descriptions
// ============================================================
const tagDescMap = {
  audit: "View audit log records",
  auth: "Authentication and session management",
  customer_question_statuses: "CRUD operations for customer question statuses",
  customer_question_types: "CRUD operations for customer question types",
  customer_question_work_flow: "CRUD operations for customer question workflow transitions",
  customer_questions: "CRUD operations for customer questions",
  departments: "CRUD operations for departments",
  document_statuses: "CRUD operations for document statuses",
  document_storage_types: "CRUD operations for document storage types",
  document_types: "CRUD operations for document types",
  document_work_flow: "CRUD operations for document workflow transitions",
  documents: "Operations for documents and document directories",
  equipment: "CRUD operations for equipment",
  issue_statuses: "CRUD operations for issue statuses",
  issue_types: "CRUD operations for issue types",
  issue_work_flow: "CRUD operations for issue workflow transitions",
  issues: "CRUD operations for issues",
  job_titles: "CRUD operations for job titles",
  links: "Operations for creating and deleting entity links",
  material_kits: "CRUD operations for material kits",
  materials: "CRUD operations for materials",
  notifications: "Notification events and methods management",
  page_permissions: "Link permissions to pages",
  pages: "CRUD operations for menu pages",
  permissions: "CRUD operations for permissions",
  projects: "CRUD operations for projects and assignments",
  roles: "CRUD operations for roles and role permissions",
  specializations: "CRUD operations for document specializations",
  specifications: "CRUD operations for specifications",
  stages: "CRUD operations for stages",
  statements: "CRUD operations for statements",
  storage: "File storage operations (upload, download, manage)",
  users: "User management, notifications, and settings",
};

for (const tag of swagger.tags) {
  if (tagDescMap[tag.name]) {
    tag.description = tagDescMap[tag.name];
  }
}

// ============================================================
// Sort paths by tag → path → method
// ============================================================
const methodOrder = { get: 0, post: 1, put: 2, patch: 3, delete: 4 };

const pathEntries = [];
for (const [pathKey, methods] of Object.entries(swagger.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    if (typeof op !== 'object' || !op.tags) continue;
    const tag = (op.tags && op.tags[0]) || 'zzz';
    pathEntries.push({ pathKey, method, tag, op });
  }
}

pathEntries.sort((a, b) => {
  const tc = a.tag.localeCompare(b.tag);
  if (tc !== 0) return tc;
  const pc = a.pathKey.localeCompare(b.pathKey);
  if (pc !== 0) return pc;
  return (methodOrder[a.method] || 99) - (methodOrder[b.method] || 99);
});

const sortedPaths = {};
for (const entry of pathEntries) {
  if (!sortedPaths[entry.pathKey]) sortedPaths[entry.pathKey] = {};
  sortedPaths[entry.pathKey][entry.method] = entry.op;
}
swagger.paths = sortedPaths;

// ============================================================
// Capitalize summaries, remove filter defaults
// ============================================================
for (const [pathKey, methods] of Object.entries(swagger.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    if (op.summary && op.summary[0]) {
      op.summary = op.summary[0].toUpperCase() + op.summary.slice(1);
    }

    // Remove defaults from non-pagination query params
    if (op.parameters && Array.isArray(op.parameters)) {
      for (const param of op.parameters) {
        if (param.in === 'query' && param.schema) {
          const isPageParam = ['page', 'limit', 'offset'].includes(param.name);
          if (!isPageParam && param.schema.default !== undefined) {
            delete param.schema.default;
          }
        }
      }
    }
  }
}

// ============================================================
// Wrap response schemas in { data: ... }
// ============================================================
for (const [pathKey, methods] of Object.entries(swagger.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    if (!op.responses) continue;
    if (pathKey.startsWith('/api/auth/')) continue;

    const resp200 = op.responses['200'];
    const resp201 = op.responses['201'];

    if (method === 'get' && resp200 && resp200.content) {
      const ct = resp200.content['application/json'];
      if (ct && ct.schema) {
        const s = ct.schema;
        if (s.type === 'array' && s.items) {
          resp200.content['application/json'].schema = {
            type: 'object',
            properties: { data: { type: 'array', items: s.items } }
          };
        }
        if (s.$ref) {
          resp200.content['application/json'].schema = {
            type: 'object',
            properties: { data: s }
          };
        }
      }
    }

    if (method === 'post' && resp201 && resp201.content) {
      const ct = resp201.content['application/json'];
      if (ct && ct.schema) {
        const s = ct.schema;
        if (s.$ref) {
          resp201.content['application/json'].schema = {
            type: 'object',
            properties: { data: s }
          };
        }
      }
    }

    if ((method === 'put' || method === 'patch') && resp200 && resp200.content) {
      const ct = resp200.content['application/json'];
      if (ct && ct.schema) {
        const s = ct.schema;
        if (s.$ref) {
          resp200.content['application/json'].schema = {
            type: 'object',
            properties: { data: s }
          };
        }
      }
    }
  }
}

// ============================================================
// Sort component schemas alphabetically
// ============================================================
const schemas = swagger.components.schemas;
const sortedSchemas = {};
for (const key of Object.keys(schemas).sort()) {
  sortedSchemas[key] = schemas[key];
}
swagger.components.schemas = sortedSchemas;

// ============================================================
// Final scan: count remaining Cyrillic strings
// ============================================================
const cyrRe = /[\u0400-\u04ff]/;
let cyrCount = 0;
function findCyrillic(obj, path) {
  if (typeof obj === 'string' && cyrRe.test(obj)) {
    cyrCount++;
    if (cyrCount <= 30) console.warn('[WARN] ' + path + ': ' + JSON.stringify(obj).slice(0, 100));
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => findCyrillic(v, path + '[' + i + ']'));
  }
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      findCyrillic(v, path + '.' + k);
    }
  }
}
findCyrillic(swagger, 'root');
console.log('Total remaining Cyrillic strings: ' + cyrCount);

// ============================================================
// Write result
// ============================================================
fs.writeFileSync(filePath, JSON.stringify(swagger, null, 2) + '\n', 'utf-8');
console.log('Done. Swagger updated.');
