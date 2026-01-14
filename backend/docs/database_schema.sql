-- Структура базы данных PostgreSQL для системы DeepSea 3.0
-- Создание таблиц для пользователей, отделов, должностей, сессий и RBAC

-- Таблица отделов
CREATE TABLE department (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица должностей
CREATE TABLE job_title (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица пользователей системы
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    middle_name VARCHAR(100),
    department_id INTEGER REFERENCES department(id) ON DELETE SET NULL,
    job_title_id INTEGER REFERENCES job_title(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица ролей для RBAC
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, project_id)
);

-- Таблица разрешений для RBAC
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(100),
    action VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Связь многие-ко-многим между ролями и разрешениями
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- Таблица страниц (pages) для выдачи меню на клиент
CREATE TABLE pages (
    id SERIAL PRIMARY KEY,
    key VARCHAR(200) NOT NULL UNIQUE,
    path VARCHAR(400) NOT NULL,
    title_key VARCHAR(200),
    parent_id INTEGER REFERENCES pages(id) ON DELETE SET NULL,
    icon VARCHAR(100),
    order_index INTEGER DEFAULT 0,
    feature_flag VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Связь страницы -> требуемые разрешения
CREATE TABLE page_permissions (
    id SERIAL PRIMARY KEY,
    page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(page_id, permission_id)
);

-- Связь многие-ко-многим между пользователями и ролями
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id, project_id)
);

-- Таблица назначения пользователей к проектам (user_projects)
CREATE TABLE user_projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role VARCHAR(100),
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, project_id)
);

-- Таблица сессий для авторизации по принципу SBT (Session-Based Token)
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Таблица проектов
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    code VARCHAR(50) UNIQUE,
    status VARCHAR(50) DEFAULT 'active',
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица статусов задач
CREATE TABLE issue_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(20),
    is_initial BOOLEAN DEFAULT FALSE,
    is_final BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица типов задач
CREATE TABLE issue_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица workflow для задач (переходы между статусами)
CREATE TABLE issue_work_flow (
    id SERIAL PRIMARY KEY,
    issue_type_id INTEGER NOT NULL REFERENCES issue_type(id) ON DELETE CASCADE,
    from_status_id INTEGER NOT NULL REFERENCES issue_status(id) ON DELETE CASCADE,
    to_status_id INTEGER NOT NULL REFERENCES issue_status(id) ON DELETE CASCADE,
    name VARCHAR(255),
    description TEXT,
    required_permission VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(issue_type_id, from_status_id, to_status_id)
);

-- Таблица задач/проблем (issues)
CREATE TABLE issues (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status_id INTEGER REFERENCES issue_status(id) ON DELETE SET NULL,
    type_id INTEGER REFERENCES issue_type(id) ON DELETE SET NULL,
    priority VARCHAR(50) DEFAULT 'medium',
    estimated_hours DECIMAL(10, 2),
    start_date DATE,
    due_date DATE,
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP
);

-- Таблица истории изменений атрибутов задач
CREATE TABLE issue_history (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица статусов документов
CREATE TABLE document_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(20),
    is_initial BOOLEAN DEFAULT FALSE,
    is_final BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица workflow для документов (переходы между статусами)
CREATE TABLE document_work_flow (
    id SERIAL PRIMARY KEY,
    from_status_id INTEGER NOT NULL REFERENCES document_status(id) ON DELETE CASCADE,
    to_status_id INTEGER NOT NULL REFERENCES document_status(id) ON DELETE CASCADE,
    name VARCHAR(255),
    description TEXT,
    required_permission VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_status_id, to_status_id)
);

-- Таблица статусов вопросов от заказчика
CREATE TABLE customer_question_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(20),
    is_initial BOOLEAN DEFAULT FALSE,
    is_final BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица workflow для вопросов от заказчика (переходы между статусами)
CREATE TABLE customer_question_work_flow (
    id SERIAL PRIMARY KEY,
    from_status_id INTEGER NOT NULL REFERENCES customer_question_status(id) ON DELETE CASCADE,
    to_status_id INTEGER NOT NULL REFERENCES customer_question_status(id) ON DELETE CASCADE,
    name VARCHAR(255),
    description TEXT,
    required_permission VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_status_id, to_status_id)
);

-- Таблица справочника специализаций
CREATE TABLE specializations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица этапов проекта
CREATE TABLE stages (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    description TEXT,
    end_date DATE NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица директорий для документов
CREATE TABLE document_directories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    path TEXT,
    parent_id INTEGER REFERENCES document_directories(id) ON DELETE CASCADE,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица документов
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    stage_id INTEGER REFERENCES stages(id) ON DELETE SET NULL,
    status_id INTEGER REFERENCES document_status(id) ON DELETE SET NULL,
    specialization_id INTEGER REFERENCES specializations(id) ON DELETE SET NULL,
    directory_id INTEGER REFERENCES document_directories(id) ON DELETE SET NULL,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Таблица истории изменений атрибутов документов
CREATE TABLE documents_history (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица вопросов от заказчика
CREATE TABLE customer_questions (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    answer_text TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(50) DEFAULT 'normal',
    asked_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    answered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    asked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answered_at TIMESTAMP,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица сообщений (комментарии к задачам и документам)
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK ((issue_id IS NOT NULL) OR (document_id IS NOT NULL))
);

-- Таблица уведомлений пользователей
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    specialization_id INTEGER REFERENCES specializations(id) ON DELETE SET NULL,
    method VARCHAR(100)
);

-- Таблица списания часов на задачи
CREATE TABLE time_logs (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    hours DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица категорий файлов
CREATE TABLE file_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id INTEGER REFERENCES file_categories(id) ON DELETE SET NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица хранилища файлов (S3)
CREATE TABLE storage (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    bucket_name VARCHAR(255),
    object_key VARCHAR(500),
    file_name VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(100),
    storage_type VARCHAR(50) DEFAULT 's3',
    file_category_id INTEGER REFERENCES file_categories(id) ON DELETE SET NULL,
    uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица единиц измерения
CREATE TABLE units (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    symbol VARCHAR(20),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица категорий материалов
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица дерева директорий для хранения материалов
CREATE TABLE directories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    path TEXT,
    parent_id INTEGER REFERENCES directories(id) ON DELETE CASCADE,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица материалов для судостроительного проекта
CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    stock_code VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    directory_id INTEGER REFERENCES directories(id) ON DELETE SET NULL,
    unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    manufacturer VARCHAR(255),
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица SFI классификации (Ship's Functional Index)
CREATE TABLE sfi_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES sfi_codes(id) ON DELETE SET NULL,
    level INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица поставщиков оборудования
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE,
    description TEXT,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(255),
    address TEXT,
    website VARCHAR(255),
    country VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица оборудования
CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    equipment_code VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sfi_code_id INTEGER NOT NULL REFERENCES sfi_codes(id) ON DELETE RESTRICT,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    installation_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    location VARCHAR(255),
    technical_specifications TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица спецификаций
CREATE TABLE specification (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    code VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50),
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица версий спецификаций (история версий каждой спецификации)
CREATE TABLE specification_version (
    id SERIAL PRIMARY KEY,
    specification_id INTEGER NOT NULL REFERENCES specification(id) ON DELETE CASCADE,
    version VARCHAR(50),
    notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица частей спецификации (позиции / части, привязанные к конкретной версии спецификации)
CREATE TABLE specification_parts (
    id SERIAL PRIMARY KEY,
    specification_version_id INTEGER NOT NULL REFERENCES specification_version(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES specification_parts(id) ON DELETE SET NULL,
    part_code VARCHAR(100),
    stock_code VARCHAR(255) REFERENCES materials(stock_code) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity DECIMAL(15,3) DEFAULT 1,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица комплектов материалов (наборы/комплекты, которые можно добавлять в спецификацию)
CREATE TABLE material_kits (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Элементы комплекта: ссылка на материал и количество
CREATE TABLE material_kit_items (
    id SERIAL PRIMARY KEY,
    kit_id INTEGER NOT NULL REFERENCES material_kits(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
    quantity DECIMAL(15,3) DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Таблица ведомостей (объединяют материалы из всех спецификаций)
CREATE TABLE statements (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    code VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50),
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Связь многие-ко-многим между документами и задачами
CREATE TABLE documents_issue (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, issue_id)
);

-- Связь многие-ко-многим между документами и файлами в хранилище
CREATE TABLE documents_storage (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    storage_id INTEGER NOT NULL REFERENCES storage(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, storage_id)
);

-- Связь многие-ко-многим между задачами и файлами в хранилище
CREATE TABLE issue_storage (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    storage_id INTEGER NOT NULL REFERENCES storage(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(issue_id, storage_id)
);

-- Связь многие-ко-многим между оборудованием и файлами в хранилище
CREATE TABLE equipment_storage (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    storage_id INTEGER NOT NULL REFERENCES storage(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(equipment_id, storage_id)
);

-- Связь многие-ко-многим между вопросами от заказчика и файлами в хранилище
CREATE TABLE customer_questions_storage (
    id SERIAL PRIMARY KEY,
    customer_question_id INTEGER NOT NULL REFERENCES customer_questions(id) ON DELETE CASCADE,
    storage_id INTEGER NOT NULL REFERENCES storage(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_question_id, storage_id)
);

-- Связь многие-ко-многим между ведомостями и спецификациями
CREATE TABLE statements_specification (
    id SERIAL PRIMARY KEY,
    statement_id INTEGER NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
    specification_id INTEGER NOT NULL REFERENCES specification(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(statement_id, specification_id)
);

-- Таблица разделов wiki (иерархическая структура)
CREATE TABLE wiki_sections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    parent_id INTEGER REFERENCES wiki_sections(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица статей wiki
CREATE TABLE wiki_articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    section_id INTEGER NOT NULL REFERENCES wiki_sections(id) ON DELETE CASCADE,
    is_published BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    UNIQUE(section_id, slug)
);

-- Таблица истории изменений статей wiki
CREATE TABLE wiki_articles_history (
    id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES wiki_articles(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    changed_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    change_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Связь многие-ко-многим между статьями wiki и файлами в хранилище
CREATE TABLE wiki_articles_storage (
    id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES wiki_articles(id) ON DELETE CASCADE,
    storage_id INTEGER NOT NULL REFERENCES storage(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(article_id, storage_id)
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_department_manager_id ON department(manager_id);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_job_title_id ON users(job_title_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_roles_project_id ON user_roles(project_id);
CREATE INDEX idx_user_projects_user_id ON user_projects(user_id);
CREATE INDEX idx_user_projects_project_id ON user_projects(project_id);
CREATE INDEX idx_user_projects_assigned_by ON user_projects(assigned_by);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_code ON projects(code);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_issue_project_id ON issues(project_id);
CREATE INDEX idx_issue_assignee_id ON issues(assignee_id);
CREATE INDEX idx_issue_author_id ON issues(author_id);
CREATE INDEX idx_issue_status_id ON issues(status_id);
CREATE INDEX idx_issue_type_id ON issues(type_id);
CREATE INDEX idx_issue_priority ON issues(priority);
CREATE INDEX idx_issue_start_date ON issues(start_date);
CREATE INDEX idx_issue_due_date ON issues(due_date);
CREATE INDEX idx_issue_history_issue_id ON issue_history(issue_id);
CREATE INDEX idx_issue_history_field_name ON issue_history(field_name);
CREATE INDEX idx_issue_history_changed_by ON issue_history(changed_by);
CREATE INDEX idx_issue_history_created_at ON issue_history(created_at);
CREATE INDEX idx_issue_status_code ON issue_status(code);
CREATE INDEX idx_issue_status_order ON issue_status(order_index);
CREATE INDEX idx_issue_type_code ON issue_type(code);
CREATE INDEX idx_issue_type_order ON issue_type(order_index);
CREATE INDEX idx_issue_work_flow_issue_type ON issue_work_flow(issue_type_id);
CREATE INDEX idx_issue_work_flow_from_status ON issue_work_flow(from_status_id);
CREATE INDEX idx_issue_work_flow_to_status ON issue_work_flow(to_status_id);
CREATE INDEX idx_issue_work_flow_active ON issue_work_flow(is_active);
CREATE INDEX idx_document_status_code ON document_status(code);
CREATE INDEX idx_document_status_order ON document_status(order_index);
CREATE INDEX idx_document_work_flow_from_status ON document_work_flow(from_status_id);
CREATE INDEX idx_document_work_flow_to_status ON document_work_flow(to_status_id);
CREATE INDEX idx_document_work_flow_active ON document_work_flow(is_active);
CREATE INDEX idx_customer_question_status_code ON customer_question_status(code);
CREATE INDEX idx_customer_question_status_order ON customer_question_status(order_index);
CREATE INDEX idx_customer_question_work_flow_from_status ON customer_question_work_flow(from_status_id);
CREATE INDEX idx_customer_question_work_flow_to_status ON customer_question_work_flow(to_status_id);
CREATE INDEX idx_customer_question_work_flow_active ON customer_question_work_flow(is_active);
CREATE INDEX idx_specializations_code ON specializations(code);
CREATE INDEX idx_specializations_order ON specializations(order_index);
CREATE INDEX idx_documents_status_id ON documents(status_id);
CREATE INDEX idx_stages_project_id ON stages(project_id);
CREATE INDEX idx_stages_end_date ON stages(end_date);
CREATE INDEX idx_stages_order_index ON stages(order_index);
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_stage_id ON documents(stage_id);
CREATE INDEX idx_documents_specialization_id ON documents(specialization_id);
CREATE INDEX idx_documents_directory_id ON documents(directory_id);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_updated_by ON documents(updated_by);
CREATE INDEX idx_document_directories_parent_id ON document_directories(parent_id);
CREATE INDEX idx_document_directories_path ON document_directories(path);
CREATE INDEX idx_document_directories_order_index ON document_directories(order_index);
CREATE INDEX idx_document_directories_created_by ON document_directories(created_by);
CREATE INDEX idx_document_directories_updated_by ON document_directories(updated_by);
CREATE INDEX idx_documents_history_document_id ON documents_history(document_id);
CREATE INDEX idx_documents_history_field_name ON documents_history(field_name);
CREATE INDEX idx_documents_history_changed_by ON documents_history(changed_by);
CREATE INDEX idx_documents_history_created_at ON documents_history(created_at);
CREATE INDEX idx_documents_issue_document_id ON documents_issue(document_id);
CREATE INDEX idx_documents_issue_issue_id ON documents_issue(issue_id);
CREATE INDEX idx_documents_storage_document_id ON documents_storage(document_id);
CREATE INDEX idx_documents_storage_storage_id ON documents_storage(storage_id);
CREATE INDEX idx_issue_storage_issue_id ON issue_storage(issue_id);
CREATE INDEX idx_issue_storage_storage_id ON issue_storage(storage_id);
CREATE INDEX idx_equipment_storage_equipment_id ON equipment_storage(equipment_id);
CREATE INDEX idx_equipment_storage_storage_id ON equipment_storage(storage_id);
CREATE INDEX idx_customer_questions_document_id ON customer_questions(document_id);
CREATE INDEX idx_customer_questions_project_id ON customer_questions(project_id);
CREATE INDEX idx_customer_questions_status ON customer_questions(status);
CREATE INDEX idx_customer_questions_priority ON customer_questions(priority);
CREATE INDEX idx_customer_questions_asked_by ON customer_questions(asked_by);
CREATE INDEX idx_customer_questions_answered_by ON customer_questions(answered_by);
CREATE INDEX idx_customer_questions_asked_at ON customer_questions(asked_at);
CREATE INDEX idx_customer_questions_due_date ON customer_questions(due_date);
CREATE INDEX idx_customer_questions_storage_customer_question_id ON customer_questions_storage(customer_question_id);
CREATE INDEX idx_customer_questions_storage_storage_id ON customer_questions_storage(storage_id);
CREATE INDEX idx_messages_issue_id ON messages(issue_id);
CREATE INDEX idx_messages_document_id ON messages(document_id);
CREATE INDEX idx_messages_parent_id ON messages(parent_id);
CREATE INDEX idx_messages_author_id ON messages(author_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_project_id ON notifications(project_id);
CREATE INDEX idx_notifications_specialization_id ON notifications(specialization_id);
CREATE INDEX idx_notifications_method ON notifications(method);
CREATE INDEX idx_time_logs_issue_id ON time_logs(issue_id);
CREATE INDEX idx_time_logs_user_id ON time_logs(user_id);
CREATE INDEX idx_time_logs_date ON time_logs(date);
CREATE INDEX idx_storage_uploaded_by ON storage(uploaded_by);
CREATE INDEX idx_storage_bucket_name ON storage(bucket_name);
CREATE INDEX idx_storage_object_key ON storage(object_key);
CREATE INDEX idx_storage_storage_type ON storage(storage_type);
CREATE INDEX idx_storage_file_category_id ON storage(file_category_id);
CREATE INDEX idx_file_categories_code ON file_categories(code);
CREATE INDEX idx_file_categories_parent_id ON file_categories(parent_id);
CREATE INDEX idx_file_categories_order_index ON file_categories(order_index);
CREATE INDEX idx_units_code ON units(code);
CREATE INDEX idx_categories_code ON categories(code);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_directories_parent_id ON directories(parent_id);
CREATE INDEX idx_directories_path ON directories(path);
CREATE INDEX idx_directories_order_index ON directories(order_index);
CREATE INDEX idx_directories_created_by ON directories(created_by);
CREATE INDEX idx_directories_updated_by ON directories(updated_by);
CREATE INDEX idx_materials_stock_code ON materials(stock_code);
CREATE INDEX idx_materials_directory_id ON materials(directory_id);
CREATE INDEX idx_materials_unit_id ON materials(unit_id);
CREATE INDEX idx_materials_category_id ON materials(category_id);
CREATE INDEX idx_materials_created_by ON materials(created_by);
CREATE INDEX idx_materials_updated_by ON materials(updated_by);
CREATE INDEX idx_sfi_codes_code ON sfi_codes(code);
CREATE INDEX idx_sfi_codes_parent_id ON sfi_codes(parent_id);
CREATE INDEX idx_sfi_codes_level ON sfi_codes(level);
CREATE INDEX idx_sfi_codes_order_index ON sfi_codes(order_index);
CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);
CREATE INDEX idx_suppliers_created_by ON suppliers(created_by);
CREATE INDEX idx_suppliers_updated_by ON suppliers(updated_by);
CREATE INDEX idx_equipment_equipment_code ON equipment(equipment_code);
CREATE INDEX idx_equipment_sfi_code_id ON equipment(sfi_code_id);
CREATE INDEX idx_equipment_project_id ON equipment(project_id);
CREATE INDEX idx_equipment_supplier_id ON equipment(supplier_id);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_manufacturer ON equipment(manufacturer);
CREATE INDEX idx_equipment_created_by ON equipment(created_by);
CREATE INDEX idx_equipment_updated_by ON equipment(updated_by);
CREATE INDEX idx_specification_project_id ON specification(project_id);
CREATE INDEX idx_specification_document_id ON specification(document_id);
CREATE INDEX idx_specification_code ON specification(code);
CREATE INDEX idx_specification_created_by ON specification(created_by);
CREATE INDEX idx_specification_updated_by ON specification(updated_by);
CREATE INDEX idx_specification_parts_specification_version_id ON specification_parts(specification_version_id);
CREATE INDEX idx_specification_parts_stock_code ON specification_parts(stock_code);
CREATE INDEX idx_specification_parts_parent_id ON specification_parts(parent_id);
CREATE INDEX idx_specification_parts_created_by ON specification_parts(created_by);
CREATE INDEX idx_material_kits_code ON material_kits(code);
CREATE INDEX idx_material_kit_items_kit_id ON material_kit_items(kit_id);
CREATE INDEX idx_material_kit_items_material_id ON material_kit_items(material_id);
-- specification_kits removed; indexes not required
CREATE INDEX idx_statements_document_id ON statements(document_id);
CREATE INDEX idx_statements_code ON statements(code);
CREATE INDEX idx_statements_created_by ON statements(created_by);
CREATE INDEX idx_statements_updated_by ON statements(updated_by);
CREATE INDEX idx_specification_materials_specification_id ON specification_materials(specification_id);
CREATE INDEX idx_specification_materials_material_id ON specification_materials(material_id);
CREATE INDEX idx_statements_specification_statement_id ON statements_specification(statement_id);
CREATE INDEX idx_statements_specification_specification_id ON statements_specification(specification_id);
CREATE INDEX idx_wiki_sections_parent_id ON wiki_sections(parent_id);
CREATE INDEX idx_wiki_sections_slug ON wiki_sections(slug);
CREATE INDEX idx_wiki_sections_order_index ON wiki_sections(order_index);
CREATE INDEX idx_wiki_sections_created_by ON wiki_sections(created_by);
CREATE INDEX idx_wiki_sections_updated_by ON wiki_sections(updated_by);
CREATE INDEX idx_wiki_articles_section_id ON wiki_articles(section_id);
CREATE INDEX idx_wiki_articles_slug ON wiki_articles(slug);
CREATE INDEX idx_wiki_articles_is_published ON wiki_articles(is_published);
CREATE INDEX idx_wiki_articles_created_by ON wiki_articles(created_by);
CREATE INDEX idx_wiki_articles_updated_by ON wiki_articles(updated_by);
CREATE INDEX idx_wiki_articles_published_at ON wiki_articles(published_at);
CREATE INDEX idx_wiki_articles_created_at ON wiki_articles(created_at);
CREATE INDEX idx_wiki_articles_history_article_id ON wiki_articles_history(article_id);
CREATE INDEX idx_wiki_articles_history_version ON wiki_articles_history(version);
CREATE INDEX idx_wiki_articles_history_changed_by ON wiki_articles_history(changed_by);
CREATE INDEX idx_wiki_articles_history_created_at ON wiki_articles_history(created_at);
CREATE INDEX idx_wiki_articles_storage_article_id ON wiki_articles_storage(article_id);
CREATE INDEX idx_wiki_articles_storage_storage_id ON wiki_articles_storage(storage_id);

-- Комментарии к таблицам
COMMENT ON TABLE users IS 'Таблица пользователей системы';
COMMENT ON TABLE department IS 'Таблица отделов пользователей';
COMMENT ON TABLE job_title IS 'Таблица должностей пользователей';
COMMENT ON TABLE sessions IS 'Таблица сессий для авторизации по принципу SBT (Session-Based Token)';
COMMENT ON TABLE permissions IS 'Таблица разрешений для реализации RBAC принципа';
COMMENT ON TABLE roles IS 'Таблица ролей для реализации RBAC принципа';
COMMENT ON TABLE role_permissions IS 'Связь между ролями и разрешениями';
COMMENT ON TABLE user_roles IS 'Связь между пользователями и ролями (может быть привязана к проекту)';
COMMENT ON TABLE projects IS 'Таблица проектов';
COMMENT ON TABLE issue_status IS 'Таблица статусов задач';
COMMENT ON TABLE issue_type IS 'Таблица типов задач';
COMMENT ON TABLE issue_work_flow IS 'Таблица workflow для задач (переходы между статусами)';
COMMENT ON TABLE issue IS 'Таблица задач/проблем (issues)';
COMMENT ON TABLE issue_history IS 'Таблица истории изменений атрибутов задач';
COMMENT ON TABLE document_status IS 'Таблица статусов документов';
COMMENT ON TABLE document_work_flow IS 'Таблица workflow для документов (переходы между статусами)';
COMMENT ON TABLE customer_question_status IS 'Таблица статусов вопросов от заказчика';
COMMENT ON TABLE customer_question_work_flow IS 'Таблица workflow для вопросов от заказчика (переходы между статусами)';
COMMENT ON TABLE specializations IS 'Таблица справочника специализаций';
COMMENT ON TABLE stages IS 'Таблица этапов проекта (привязываются к проекту, имеют дату окончания)';
COMMENT ON TABLE document_directories IS 'Таблица дерева директорий для организации документов';
COMMENT ON TABLE documents IS 'Таблица документов';
COMMENT ON TABLE documents_history IS 'Таблица истории изменений атрибутов документов';
COMMENT ON TABLE customer_questions IS 'Таблица вопросов от заказчика, связанных с документами проекта';
COMMENT ON TABLE messages IS 'Таблица сообщений (комментарии к задачам и документам)';
COMMENT ON TABLE notifications IS 'Таблица уведомлений пользователей (email, rocket_chat, sms, push, internal)';
COMMENT ON TABLE time_logs IS 'Таблица списания часов на задачи';
COMMENT ON TABLE storage IS 'Таблица хранилища файлов (S3) - хранит URL файлов из облачного хранилища';
COMMENT ON TABLE file_categories IS 'Таблица категорий файлов - иерархическая структура для классификации файлов';
COMMENT ON TABLE documents_issue IS 'Связь между документами и задачами';
COMMENT ON TABLE documents_storage IS 'Связь между документами и файлами в хранилище';
COMMENT ON TABLE issue_storage IS 'Связь между задачами и файлами в хранилище';
COMMENT ON TABLE equipment_storage IS 'Связь между оборудованием и файлами в хранилище';
COMMENT ON TABLE customer_questions_storage IS 'Связь между вопросами от заказчика и файлами в хранилище';
COMMENT ON TABLE units IS 'Таблица единиц измерения';
COMMENT ON TABLE categories IS 'Таблица категорий материалов';
COMMENT ON TABLE directories IS 'Таблица дерева директорий для хранения материалов';
COMMENT ON TABLE materials IS 'Таблица материалов для судостроительного проекта';
COMMENT ON TABLE sfi_codes IS 'Таблица SFI классификации (Ship''s Functional Index) - иерархическая система классификации оборудования на судах';
COMMENT ON TABLE suppliers IS 'Таблица поставщиков оборудования';
COMMENT ON TABLE equipment IS 'Таблица оборудования судна с привязкой к SFI классификации';
COMMENT ON TABLE specification IS 'Таблица спецификаций (привязана к одному проекту)';
COMMENT ON TABLE specification_parts IS 'Таблица частей/позиций спецификации, привязана к версии спецификации (specification_version)';
COMMENT ON TABLE material_kits IS 'Таблица комплектов материалов (наборы/комплекты), которые можно переиспользовать и добавлять в спецификации';
COMMENT ON TABLE material_kit_items IS 'Элементы комплекта материалов: ссылка на материал, количество и единица измерения';
-- specification_kits removed
COMMENT ON TABLE statements IS 'Таблица ведомостей (объединяют материалы из всех спецификаций)';
COMMENT ON TABLE specification_materials IS 'Связь между спецификациями и материалами';
COMMENT ON TABLE statements_specification IS 'Связь между ведомостями и спецификациями';
COMMENT ON TABLE wiki_sections IS 'Таблица разделов wiki - иерархическая структура для организации статей и инструкций';
COMMENT ON TABLE wiki_articles IS 'Таблица статей wiki - статьи и инструкции с поддержкой версионирования';
COMMENT ON TABLE wiki_articles_history IS 'Таблица истории изменений статей wiki - хранит все версии статей для отслеживания изменений';
COMMENT ON TABLE wiki_articles_storage IS 'Связь между статьями wiki и файлами в хранилище';

