--
-- PostgreSQL database dump
--

\restrict PV5aJbtKRKtSelYrfJAv9fVekzsehmvQox9zNP8GbPO78TqNXezeoCdgcsBQRnD

-- Dumped from database version 16.11 (Homebrew)
-- Dumped by pg_dump version 16.11 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: can_close_document(integer); Type: FUNCTION; Schema: public; Owner: spiridovich
--

CREATE FUNCTION public.can_close_document(d_id integer) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  cnt INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(blocking_count),0) INTO cnt FROM vw_document_blocking_links WHERE document_id = d_id;
  RETURN cnt = 0;
END;
$$;


ALTER FUNCTION public.can_close_document(d_id integer) OWNER TO spiridovich;

--
-- Name: can_close_issue(integer); Type: FUNCTION; Schema: public; Owner: spiridovich
--

CREATE FUNCTION public.can_close_issue(i_id integer) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  cnt INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(blocking_count),0) INTO cnt FROM vw_issue_blocking_links WHERE issue_id = i_id;
  RETURN cnt = 0;
END;
$$;


ALTER FUNCTION public.can_close_issue(i_id integer) OWNER TO spiridovich;

--
-- Name: user_notification_settings_updated_at_trigger(); Type: FUNCTION; Schema: public; Owner: spiridovich
--

CREATE FUNCTION public.user_notification_settings_updated_at_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.user_notification_settings_updated_at_trigger() OWNER TO spiridovich;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    parent_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categories OWNER TO spiridovich;

--
-- Name: TABLE categories; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.categories IS 'Таблица категорий материалов';


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO spiridovich;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: customer_question_status; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.customer_question_status (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    color character varying(20),
    is_initial boolean DEFAULT false,
    is_final boolean DEFAULT false,
    order_index integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.customer_question_status OWNER TO spiridovich;

--
-- Name: TABLE customer_question_status; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.customer_question_status IS 'Таблица статусов вопросов от заказчика';


--
-- Name: customer_question_status_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.customer_question_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_question_status_id_seq OWNER TO spiridovich;

--
-- Name: customer_question_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.customer_question_status_id_seq OWNED BY public.customer_question_status.id;


--
-- Name: customer_question_work_flow; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.customer_question_work_flow (
    id integer NOT NULL,
    from_status_id integer NOT NULL,
    to_status_id integer NOT NULL,
    name character varying(255),
    description text,
    required_permission character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.customer_question_work_flow OWNER TO spiridovich;

--
-- Name: TABLE customer_question_work_flow; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.customer_question_work_flow IS 'Таблица workflow для вопросов от заказчика (переходы между статусами)';


--
-- Name: customer_question_work_flow_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.customer_question_work_flow_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_question_work_flow_id_seq OWNER TO spiridovich;

--
-- Name: customer_question_work_flow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.customer_question_work_flow_id_seq OWNED BY public.customer_question_work_flow.id;


--
-- Name: customer_questions; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.customer_questions (
    id integer NOT NULL,
    document_id integer NOT NULL,
    project_id integer,
    question_text text NOT NULL,
    answer_text text,
    status character varying(50) DEFAULT 'pending'::character varying,
    priority character varying(50) DEFAULT 'normal'::character varying,
    asked_by integer NOT NULL,
    answered_by integer,
    asked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    answered_at timestamp without time zone,
    due_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.customer_questions OWNER TO spiridovich;

--
-- Name: TABLE customer_questions; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.customer_questions IS 'Таблица вопросов от заказчика, связанных с документами проекта';


--
-- Name: customer_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.customer_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_questions_id_seq OWNER TO spiridovich;

--
-- Name: customer_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.customer_questions_id_seq OWNED BY public.customer_questions.id;


--
-- Name: customer_questions_storage; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.customer_questions_storage (
    id integer NOT NULL,
    customer_question_id integer NOT NULL,
    storage_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.customer_questions_storage OWNER TO spiridovich;

--
-- Name: TABLE customer_questions_storage; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.customer_questions_storage IS 'Связь между вопросами от заказчика и файлами в хранилище';


--
-- Name: customer_questions_storage_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.customer_questions_storage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_questions_storage_id_seq OWNER TO spiridovich;

--
-- Name: customer_questions_storage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.customer_questions_storage_id_seq OWNED BY public.customer_questions_storage.id;


--
-- Name: department; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.department (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    manager_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.department OWNER TO spiridovich;

--
-- Name: TABLE department; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.department IS 'Таблица отделов пользователей';


--
-- Name: department_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.department_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.department_id_seq OWNER TO spiridovich;

--
-- Name: department_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.department_id_seq OWNED BY public.department.id;


--
-- Name: directories; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.directories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    path text,
    parent_id integer,
    description text,
    order_index integer DEFAULT 0,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.directories OWNER TO spiridovich;

--
-- Name: TABLE directories; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.directories IS 'Таблица дерева директорий для хранения материалов';


--
-- Name: directories_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.directories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.directories_id_seq OWNER TO spiridovich;

--
-- Name: directories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.directories_id_seq OWNED BY public.directories.id;


--
-- Name: document_directories; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.document_directories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    path text,
    parent_id integer,
    description text,
    order_index integer DEFAULT 0,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.document_directories OWNER TO spiridovich;

--
-- Name: TABLE document_directories; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.document_directories IS 'Таблица дерева директорий для организации документов';


--
-- Name: document_directories_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.document_directories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_directories_id_seq OWNER TO spiridovich;

--
-- Name: document_directories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.document_directories_id_seq OWNED BY public.document_directories.id;


--
-- Name: document_messages; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.document_messages (
    id integer NOT NULL,
    document_id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.document_messages OWNER TO spiridovich;

--
-- Name: document_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.document_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_messages_id_seq OWNER TO spiridovich;

--
-- Name: document_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.document_messages_id_seq OWNED BY public.document_messages.id;


--
-- Name: document_status; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.document_status (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    color character varying(20),
    is_initial boolean DEFAULT false,
    is_final boolean DEFAULT false,
    order_index integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.document_status OWNER TO spiridovich;

--
-- Name: TABLE document_status; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.document_status IS 'Таблица статусов документов';


--
-- Name: document_status_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.document_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_status_id_seq OWNER TO spiridovich;

--
-- Name: document_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.document_status_id_seq OWNED BY public.document_status.id;


--
-- Name: document_work_flow; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.document_work_flow (
    id integer NOT NULL,
    from_status_id integer NOT NULL,
    to_status_id integer NOT NULL,
    name character varying(255),
    description text,
    required_permission character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.document_work_flow OWNER TO spiridovich;

--
-- Name: TABLE document_work_flow; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.document_work_flow IS 'Таблица workflow для документов (переходы между статусами)';


--
-- Name: document_work_flow_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.document_work_flow_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_work_flow_id_seq OWNER TO spiridovich;

--
-- Name: document_work_flow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.document_work_flow_id_seq OWNED BY public.document_work_flow.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    project_id integer,
    stage_id integer,
    status_id integer,
    specialization_id integer,
    directory_id integer,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.documents OWNER TO spiridovich;

--
-- Name: TABLE documents; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.documents IS 'Таблица документов';


--
-- Name: documents_history; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.documents_history (
    id integer NOT NULL,
    document_id integer NOT NULL,
    field_name character varying(100) NOT NULL,
    old_value text,
    new_value text,
    changed_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.documents_history OWNER TO spiridovich;

--
-- Name: TABLE documents_history; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.documents_history IS 'Таблица истории изменений атрибутов документов';


--
-- Name: documents_history_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.documents_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_history_id_seq OWNER TO spiridovich;

--
-- Name: documents_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.documents_history_id_seq OWNED BY public.documents_history.id;


--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO spiridovich;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: documents_issue; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.documents_issue (
    id integer NOT NULL,
    document_id integer NOT NULL,
    issue_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.documents_issue OWNER TO spiridovich;

--
-- Name: TABLE documents_issue; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.documents_issue IS 'Связь между документами и задачами';


--
-- Name: documents_issue_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.documents_issue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_issue_id_seq OWNER TO spiridovich;

--
-- Name: documents_issue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.documents_issue_id_seq OWNED BY public.documents_issue.id;


--
-- Name: documents_storage; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.documents_storage (
    id integer NOT NULL,
    document_id integer NOT NULL,
    storage_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.documents_storage OWNER TO spiridovich;

--
-- Name: TABLE documents_storage; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.documents_storage IS 'Связь между документами и файлами в хранилище';


--
-- Name: documents_storage_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.documents_storage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_storage_id_seq OWNER TO spiridovich;

--
-- Name: documents_storage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.documents_storage_id_seq OWNED BY public.documents_storage.id;


--
-- Name: entity_links; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.entity_links (
    id integer NOT NULL,
    source_type character varying(32) NOT NULL,
    source_id integer NOT NULL,
    target_type character varying(32) NOT NULL,
    target_id integer NOT NULL,
    relation_type character varying(50) DEFAULT 'relates'::character varying NOT NULL,
    blocks_closure boolean DEFAULT false NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.entity_links OWNER TO spiridovich;

--
-- Name: entity_links_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.entity_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.entity_links_id_seq OWNER TO spiridovich;

--
-- Name: entity_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.entity_links_id_seq OWNED BY public.entity_links.id;


--
-- Name: equipment; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.equipment (
    id integer NOT NULL,
    equipment_code character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    sfi_code_id integer NOT NULL,
    project_id integer,
    supplier_id integer,
    manufacturer character varying(255),
    model character varying(255),
    serial_number character varying(255),
    installation_date date,
    status character varying(50) DEFAULT 'active'::character varying,
    location character varying(255),
    technical_specifications text,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.equipment OWNER TO spiridovich;

--
-- Name: TABLE equipment; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.equipment IS 'Таблица оборудования судна с привязкой к SFI классификации';


--
-- Name: equipment_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.equipment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.equipment_id_seq OWNER TO spiridovich;

--
-- Name: equipment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.equipment_id_seq OWNED BY public.equipment.id;


--
-- Name: equipment_storage; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.equipment_storage (
    id integer NOT NULL,
    equipment_id integer NOT NULL,
    storage_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.equipment_storage OWNER TO spiridovich;

--
-- Name: TABLE equipment_storage; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.equipment_storage IS 'Связь между оборудованием и файлами в хранилище';


--
-- Name: equipment_storage_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.equipment_storage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.equipment_storage_id_seq OWNER TO spiridovich;

--
-- Name: equipment_storage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.equipment_storage_id_seq OWNED BY public.equipment_storage.id;


--
-- Name: file_categories; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.file_categories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    description text,
    parent_id integer,
    order_index integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.file_categories OWNER TO spiridovich;

--
-- Name: TABLE file_categories; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.file_categories IS 'Таблица категорий файлов - иерархическая структура для классификации файлов';


--
-- Name: file_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.file_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.file_categories_id_seq OWNER TO spiridovich;

--
-- Name: file_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.file_categories_id_seq OWNED BY public.file_categories.id;


--
-- Name: issue_history; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.issue_history (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    field_name character varying(100) NOT NULL,
    old_value text,
    new_value text,
    changed_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.issue_history OWNER TO spiridovich;

--
-- Name: TABLE issue_history; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.issue_history IS 'Таблица истории изменений атрибутов задач';


--
-- Name: issue_history_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.issue_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.issue_history_id_seq OWNER TO spiridovich;

--
-- Name: issue_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.issue_history_id_seq OWNED BY public.issue_history.id;


--
-- Name: issues; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.issues (
    id integer NOT NULL,
    project_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status_id integer,
    type_id integer,
    priority character varying(50) DEFAULT 'medium'::character varying,
    estimated_hours numeric(10,2),
    start_date date,
    due_date date,
    assignee_id integer,
    author_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp without time zone,
    closed_at timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.issues OWNER TO spiridovich;

--
-- Name: TABLE issues; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.issues IS 'Таблица задач/проблем (issues)';


--
-- Name: issue_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.issue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.issue_id_seq OWNER TO spiridovich;

--
-- Name: issue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.issue_id_seq OWNED BY public.issues.id;


--
-- Name: issue_messages; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.issue_messages (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.issue_messages OWNER TO spiridovich;

--
-- Name: issue_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.issue_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.issue_messages_id_seq OWNER TO spiridovich;

--
-- Name: issue_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.issue_messages_id_seq OWNED BY public.issue_messages.id;


--
-- Name: issue_status; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.issue_status (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    color character varying(20),
    order_index integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_initial boolean DEFAULT false,
    is_final boolean DEFAULT false
);


ALTER TABLE public.issue_status OWNER TO spiridovich;

--
-- Name: TABLE issue_status; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.issue_status IS 'Таблица статусов задач';


--
-- Name: issue_status_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.issue_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.issue_status_id_seq OWNER TO spiridovich;

--
-- Name: issue_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.issue_status_id_seq OWNED BY public.issue_status.id;


--
-- Name: issue_storage; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.issue_storage (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    storage_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.issue_storage OWNER TO spiridovich;

--
-- Name: TABLE issue_storage; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.issue_storage IS 'Связь между задачами и файлами в хранилище';


--
-- Name: issue_storage_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.issue_storage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.issue_storage_id_seq OWNER TO spiridovich;

--
-- Name: issue_storage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.issue_storage_id_seq OWNED BY public.issue_storage.id;


--
-- Name: issue_type; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.issue_type (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    icon character varying(50),
    color character varying(20),
    order_index integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.issue_type OWNER TO spiridovich;

--
-- Name: TABLE issue_type; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.issue_type IS 'Таблица типов задач';


--
-- Name: issue_type_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.issue_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.issue_type_id_seq OWNER TO spiridovich;

--
-- Name: issue_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.issue_type_id_seq OWNED BY public.issue_type.id;


--
-- Name: issue_work_flow; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.issue_work_flow (
    id integer NOT NULL,
    issue_type_id integer NOT NULL,
    from_status_id integer NOT NULL,
    to_status_id integer NOT NULL,
    name character varying(255),
    description text,
    required_permission character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.issue_work_flow OWNER TO spiridovich;

--
-- Name: TABLE issue_work_flow; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.issue_work_flow IS 'Таблица workflow для задач (переходы между статусами)';


--
-- Name: issue_work_flow_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.issue_work_flow_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.issue_work_flow_id_seq OWNER TO spiridovich;

--
-- Name: issue_work_flow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.issue_work_flow_id_seq OWNED BY public.issue_work_flow.id;


--
-- Name: job_title; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.job_title (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.job_title OWNER TO spiridovich;

--
-- Name: TABLE job_title; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.job_title IS 'Таблица должностей пользователей';


--
-- Name: job_title_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.job_title_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_title_id_seq OWNER TO spiridovich;

--
-- Name: job_title_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.job_title_id_seq OWNED BY public.job_title.id;


--
-- Name: material_kit_items; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.material_kit_items (
    id integer NOT NULL,
    kit_id integer NOT NULL,
    material_id integer,
    quantity numeric(15,3) DEFAULT 1,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.material_kit_items OWNER TO spiridovich;

--
-- Name: material_kit_items_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.material_kit_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.material_kit_items_id_seq OWNER TO spiridovich;

--
-- Name: material_kit_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.material_kit_items_id_seq OWNED BY public.material_kit_items.id;


--
-- Name: material_kits; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.material_kits (
    id integer NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.material_kits OWNER TO spiridovich;

--
-- Name: material_kits_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.material_kits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.material_kits_id_seq OWNER TO spiridovich;

--
-- Name: material_kits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.material_kits_id_seq OWNED BY public.material_kits.id;


--
-- Name: materials; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.materials (
    id integer NOT NULL,
    stock_code character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    directory_id integer,
    unit_id integer,
    category_id integer,
    manufacturer character varying(255),
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.materials OWNER TO spiridovich;

--
-- Name: TABLE materials; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.materials IS 'Таблица материалов для судостроительного проекта';


--
-- Name: materials_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.materials_id_seq OWNER TO spiridovich;

--
-- Name: materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.materials_id_seq OWNED BY public.materials.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    issue_id integer,
    document_id integer,
    parent_id integer,
    content text NOT NULL,
    author_id integer NOT NULL,
    is_edited boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT messages_check CHECK (((issue_id IS NOT NULL) OR (document_id IS NOT NULL)))
);


ALTER TABLE public.messages OWNER TO spiridovich;

--
-- Name: TABLE messages; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.messages IS 'Таблица сообщений (комментарии к задачам и документам)';


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO spiridovich;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: notification_events; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.notification_events (
    id integer NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notification_events OWNER TO spiridovich;

--
-- Name: notification_events_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.notification_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_events_id_seq OWNER TO spiridovich;

--
-- Name: notification_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.notification_events_id_seq OWNED BY public.notification_events.id;


--
-- Name: notification_methods; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.notification_methods (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notification_methods OWNER TO spiridovich;

--
-- Name: notification_methods_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.notification_methods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_methods_id_seq OWNER TO spiridovich;

--
-- Name: notification_methods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.notification_methods_id_seq OWNED BY public.notification_methods.id;


--
-- Name: page_permissions; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.page_permissions (
    id integer NOT NULL,
    page_id integer NOT NULL,
    permission_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.page_permissions OWNER TO spiridovich;

--
-- Name: page_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.page_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.page_permissions_id_seq OWNER TO spiridovich;

--
-- Name: page_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.page_permissions_id_seq OWNED BY public.page_permissions.id;


--
-- Name: pages; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.pages (
    id integer NOT NULL,
    key character varying(200) NOT NULL,
    path character varying(400) NOT NULL,
    title_key character varying(200),
    title_en character varying(255),
    parent_id integer,
    icon character varying(100),
    order_index integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pages OWNER TO spiridovich;

--
-- Name: pages_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.pages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pages_id_seq OWNER TO spiridovich;

--
-- Name: pages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.pages_id_seq OWNED BY public.pages.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(128) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.password_reset_tokens OWNER TO spiridovich;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_tokens_id_seq OWNER TO spiridovich;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(100) NOT NULL,
    description text,
    resource character varying(100),
    action character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.permissions OWNER TO spiridovich;

--
-- Name: TABLE permissions; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.permissions IS 'Таблица разрешений для реализации RBAC принципа';


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO spiridovich;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    code character varying(50),
    status character varying(50) DEFAULT 'active'::character varying,
    owner_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.projects OWNER TO spiridovich;

--
-- Name: TABLE projects; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.projects IS 'Таблица проектов';


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO spiridovich;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_id integer NOT NULL,
    permission_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.role_permissions OWNER TO spiridovich;

--
-- Name: TABLE role_permissions; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.role_permissions IS 'Связь между ролями и разрешениями';


--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_id_seq OWNER TO spiridovich;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.roles OWNER TO spiridovich;

--
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.roles IS 'Таблица ролей для реализации RBAC принципа';


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO spiridovich;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(255) NOT NULL,
    refresh_token character varying(255),
    ip_address inet,
    user_agent text,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_activity timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true
);


ALTER TABLE public.sessions OWNER TO spiridovich;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.sessions IS 'Таблица сессий для авторизации по принципу SBT (Session-Based Token)';


--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sessions_id_seq OWNER TO spiridovich;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: sfi_codes; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.sfi_codes (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    parent_id integer,
    level integer DEFAULT 1,
    order_index integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sfi_codes OWNER TO spiridovich;

--
-- Name: TABLE sfi_codes; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.sfi_codes IS 'Таблица SFI классификации (Ship''s Functional Index) - иерархическая система классификации оборудования на судах';


--
-- Name: sfi_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.sfi_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sfi_codes_id_seq OWNER TO spiridovich;

--
-- Name: sfi_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.sfi_codes_id_seq OWNED BY public.sfi_codes.id;


--
-- Name: specializations; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.specializations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    description text,
    order_index integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.specializations OWNER TO spiridovich;

--
-- Name: TABLE specializations; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.specializations IS 'Таблица справочника специализаций';


--
-- Name: specializations_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.specializations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.specializations_id_seq OWNER TO spiridovich;

--
-- Name: specializations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.specializations_id_seq OWNED BY public.specializations.id;


--
-- Name: specification; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.specification (
    id integer NOT NULL,
    project_id integer NOT NULL,
    document_id integer,
    code character varying(100),
    name character varying(255) NOT NULL,
    description text,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.specification OWNER TO spiridovich;

--
-- Name: TABLE specification; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.specification IS 'Таблица спецификаций (привязана к одному проекту)';


--
-- Name: specification_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.specification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.specification_id_seq OWNER TO spiridovich;

--
-- Name: specification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.specification_id_seq OWNED BY public.specification.id;


--
-- Name: specification_parts; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.specification_parts (
    id integer NOT NULL,
    specification_version_id integer NOT NULL,
    part_code character varying(100),
    stock_code character varying(255),
    name character varying(255) NOT NULL,
    description text,
    quantity numeric(15,3) DEFAULT 1,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    parent_id integer
);


ALTER TABLE public.specification_parts OWNER TO spiridovich;

--
-- Name: specification_parts_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.specification_parts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.specification_parts_id_seq OWNER TO spiridovich;

--
-- Name: specification_parts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.specification_parts_id_seq OWNED BY public.specification_parts.id;


--
-- Name: specification_version; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.specification_version (
    id integer NOT NULL,
    specification_id integer NOT NULL,
    version character varying(50),
    notes text,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.specification_version OWNER TO spiridovich;

--
-- Name: specification_version_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.specification_version_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.specification_version_id_seq OWNER TO spiridovich;

--
-- Name: specification_version_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.specification_version_id_seq OWNED BY public.specification_version.id;


--
-- Name: stages; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.stages (
    id integer NOT NULL,
    project_id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100),
    description text,
    end_date date NOT NULL,
    order_index integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.stages OWNER TO spiridovich;

--
-- Name: TABLE stages; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.stages IS 'Таблица этапов проекта (привязываются к проекту, имеют дату окончания)';


--
-- Name: stages_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.stages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stages_id_seq OWNER TO spiridovich;

--
-- Name: stages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.stages_id_seq OWNED BY public.stages.id;


--
-- Name: statements; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.statements (
    id integer NOT NULL,
    document_id integer NOT NULL,
    code character varying(100),
    name character varying(255) NOT NULL,
    description text,
    version character varying(50),
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.statements OWNER TO spiridovich;

--
-- Name: TABLE statements; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.statements IS 'Таблица ведомостей (объединяют материалы из всех спецификаций)';


--
-- Name: statements_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.statements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.statements_id_seq OWNER TO spiridovich;

--
-- Name: statements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.statements_id_seq OWNED BY public.statements.id;


--
-- Name: statements_specification; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.statements_specification (
    id integer NOT NULL,
    statement_id integer NOT NULL,
    specification_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.statements_specification OWNER TO spiridovich;

--
-- Name: TABLE statements_specification; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.statements_specification IS 'Связь между ведомостями и спецификациями';


--
-- Name: statements_specification_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.statements_specification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.statements_specification_id_seq OWNER TO spiridovich;

--
-- Name: statements_specification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.statements_specification_id_seq OWNED BY public.statements_specification.id;


--
-- Name: storage; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.storage (
    id integer NOT NULL,
    url text NOT NULL,
    bucket_name character varying(255),
    object_key character varying(500),
    file_name character varying(255),
    file_size bigint,
    mime_type character varying(100),
    storage_type character varying(50) DEFAULT 's3'::character varying,
    uploaded_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.storage OWNER TO spiridovich;

--
-- Name: TABLE storage; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.storage IS 'Таблица хранилища файлов (S3) - хранит URL файлов из облачного хранилища';


--
-- Name: storage_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.storage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.storage_id_seq OWNER TO spiridovich;

--
-- Name: storage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.storage_id_seq OWNED BY public.storage.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100),
    description text,
    contact_person character varying(255),
    email character varying(255),
    phone character varying(255),
    address text,
    website character varying(255),
    country character varying(100),
    is_active boolean DEFAULT true,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.suppliers OWNER TO spiridovich;

--
-- Name: TABLE suppliers; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.suppliers IS 'Таблица поставщиков оборудования';


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO spiridovich;

--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: time_logs; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.time_logs (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    user_id integer NOT NULL,
    hours numeric(10,2) NOT NULL,
    date date NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.time_logs OWNER TO spiridovich;

--
-- Name: TABLE time_logs; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.time_logs IS 'Таблица списания часов на задачи';


--
-- Name: time_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.time_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.time_logs_id_seq OWNER TO spiridovich;

--
-- Name: time_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.time_logs_id_seq OWNED BY public.time_logs.id;


--
-- Name: units; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.units (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    symbol character varying(20),
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.units OWNER TO spiridovich;

--
-- Name: TABLE units; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.units IS 'Таблица единиц измерения';


--
-- Name: units_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.units_id_seq OWNER TO spiridovich;

--
-- Name: units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.units_id_seq OWNED BY public.units.id;


--
-- Name: user_notification_settings; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.user_notification_settings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    project_id integer,
    event_id integer NOT NULL,
    method_id integer NOT NULL,
    enabled boolean DEFAULT true,
    config jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_notification_settings OWNER TO spiridovich;

--
-- Name: user_notification_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.user_notification_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_notification_settings_id_seq OWNER TO spiridovich;

--
-- Name: user_notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.user_notification_settings_id_seq OWNED BY public.user_notification_settings.id;


--
-- Name: user_notifications; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.user_notifications (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    event_code text,
    project_id integer,
    data jsonb,
    is_read boolean DEFAULT false NOT NULL,
    is_hidden boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone
);


ALTER TABLE public.user_notifications OWNER TO spiridovich;

--
-- Name: user_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.user_notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_notifications_id_seq OWNER TO spiridovich;

--
-- Name: user_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.user_notifications_id_seq OWNED BY public.user_notifications.id;


--
-- Name: user_rocket_chat; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.user_rocket_chat (
    id integer NOT NULL,
    user_id integer NOT NULL,
    rc_username character varying(255) NOT NULL,
    rc_user_id character varying(255),
    rc_display_name character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_rocket_chat OWNER TO spiridovich;

--
-- Name: user_rocket_chat_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.user_rocket_chat_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_rocket_chat_id_seq OWNER TO spiridovich;

--
-- Name: user_rocket_chat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.user_rocket_chat_id_seq OWNED BY public.user_rocket_chat.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.user_roles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    role_id integer NOT NULL,
    project_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_roles OWNER TO spiridovich;

--
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_roles_id_seq OWNER TO spiridovich;

--
-- Name: user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    middle_name character varying(100),
    department_id integer,
    job_title_id integer,
    is_active boolean DEFAULT true,
    is_verified boolean DEFAULT false,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    avatar_url character varying(500)
);


ALTER TABLE public.users OWNER TO spiridovich;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.users IS 'Таблица пользователей системы';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO spiridovich;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vw_document_blocking_links; Type: VIEW; Schema: public; Owner: spiridovich
--

CREATE VIEW public.vw_document_blocking_links AS
 SELECT el.source_id AS document_id,
    (count(*))::integer AS blocking_count
   FROM ((public.entity_links el
     JOIN public.documents tgt ON ((((el.target_type)::text = 'document'::text) AND (tgt.id = el.target_id))))
     JOIN public.document_status s ON ((tgt.status_id = s.id)))
  WHERE (((el.source_type)::text = 'document'::text) AND (el.blocks_closure = true) AND ((s.is_final = false) OR (s.is_final IS NULL)))
  GROUP BY el.source_id;


ALTER VIEW public.vw_document_blocking_links OWNER TO spiridovich;

--
-- Name: vw_issue_blocking_links; Type: VIEW; Schema: public; Owner: spiridovich
--

CREATE VIEW public.vw_issue_blocking_links AS
 SELECT el.source_id AS issue_id,
    (count(*))::integer AS blocking_count
   FROM ((public.entity_links el
     JOIN public.issues tgt ON ((((el.target_type)::text = 'issue'::text) AND (tgt.id = el.target_id))))
     JOIN public.issue_status s ON ((tgt.status_id = s.id)))
  WHERE (((el.source_type)::text = 'issue'::text) AND (el.blocks_closure = true) AND ((s.is_final = false) OR (s.is_final IS NULL)))
  GROUP BY el.source_id;


ALTER VIEW public.vw_issue_blocking_links OWNER TO spiridovich;

--
-- Name: wiki_articles; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.wiki_articles (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    content text NOT NULL,
    summary text,
    section_id integer NOT NULL,
    is_published boolean DEFAULT false,
    version integer DEFAULT 1,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    published_at timestamp without time zone
);


ALTER TABLE public.wiki_articles OWNER TO spiridovich;

--
-- Name: TABLE wiki_articles; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.wiki_articles IS 'Таблица статей wiki - статьи и инструкции с поддержкой версионирования';


--
-- Name: wiki_articles_history; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.wiki_articles_history (
    id integer NOT NULL,
    article_id integer NOT NULL,
    version integer NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    summary text,
    changed_by integer NOT NULL,
    change_comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.wiki_articles_history OWNER TO spiridovich;

--
-- Name: TABLE wiki_articles_history; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.wiki_articles_history IS 'Таблица истории изменений статей wiki - хранит все версии статей для отслеживания изменений';


--
-- Name: wiki_articles_history_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.wiki_articles_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wiki_articles_history_id_seq OWNER TO spiridovich;

--
-- Name: wiki_articles_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.wiki_articles_history_id_seq OWNED BY public.wiki_articles_history.id;


--
-- Name: wiki_articles_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.wiki_articles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wiki_articles_id_seq OWNER TO spiridovich;

--
-- Name: wiki_articles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.wiki_articles_id_seq OWNED BY public.wiki_articles.id;


--
-- Name: wiki_articles_storage; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.wiki_articles_storage (
    id integer NOT NULL,
    article_id integer NOT NULL,
    storage_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.wiki_articles_storage OWNER TO spiridovich;

--
-- Name: TABLE wiki_articles_storage; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.wiki_articles_storage IS 'Связь между статьями wiki и файлами в хранилище';


--
-- Name: wiki_articles_storage_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.wiki_articles_storage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wiki_articles_storage_id_seq OWNER TO spiridovich;

--
-- Name: wiki_articles_storage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.wiki_articles_storage_id_seq OWNED BY public.wiki_articles_storage.id;


--
-- Name: wiki_sections; Type: TABLE; Schema: public; Owner: spiridovich
--

CREATE TABLE public.wiki_sections (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    parent_id integer,
    order_index integer DEFAULT 0,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.wiki_sections OWNER TO spiridovich;

--
-- Name: TABLE wiki_sections; Type: COMMENT; Schema: public; Owner: spiridovich
--

COMMENT ON TABLE public.wiki_sections IS 'Таблица разделов wiki - иерархическая структура для организации статей и инструкций';


--
-- Name: wiki_sections_id_seq; Type: SEQUENCE; Schema: public; Owner: spiridovich
--

CREATE SEQUENCE public.wiki_sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wiki_sections_id_seq OWNER TO spiridovich;

--
-- Name: wiki_sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spiridovich
--

ALTER SEQUENCE public.wiki_sections_id_seq OWNED BY public.wiki_sections.id;


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: customer_question_status id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_question_status ALTER COLUMN id SET DEFAULT nextval('public.customer_question_status_id_seq'::regclass);


--
-- Name: customer_question_work_flow id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_question_work_flow ALTER COLUMN id SET DEFAULT nextval('public.customer_question_work_flow_id_seq'::regclass);


--
-- Name: customer_questions id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_questions ALTER COLUMN id SET DEFAULT nextval('public.customer_questions_id_seq'::regclass);


--
-- Name: customer_questions_storage id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_questions_storage ALTER COLUMN id SET DEFAULT nextval('public.customer_questions_storage_id_seq'::regclass);


--
-- Name: department id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.department ALTER COLUMN id SET DEFAULT nextval('public.department_id_seq'::regclass);


--
-- Name: directories id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.directories ALTER COLUMN id SET DEFAULT nextval('public.directories_id_seq'::regclass);


--
-- Name: document_directories id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.document_directories ALTER COLUMN id SET DEFAULT nextval('public.document_directories_id_seq'::regclass);


--
-- Name: document_messages id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.document_messages ALTER COLUMN id SET DEFAULT nextval('public.document_messages_id_seq'::regclass);


--
-- Name: document_status id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.document_status ALTER COLUMN id SET DEFAULT nextval('public.document_status_id_seq'::regclass);


--
-- Name: document_work_flow id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.document_work_flow ALTER COLUMN id SET DEFAULT nextval('public.document_work_flow_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: documents_history id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents_history ALTER COLUMN id SET DEFAULT nextval('public.documents_history_id_seq'::regclass);


--
-- Name: documents_issue id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents_issue ALTER COLUMN id SET DEFAULT nextval('public.documents_issue_id_seq'::regclass);


--
-- Name: documents_storage id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents_storage ALTER COLUMN id SET DEFAULT nextval('public.documents_storage_id_seq'::regclass);


--
-- Name: entity_links id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.entity_links ALTER COLUMN id SET DEFAULT nextval('public.entity_links_id_seq'::regclass);


--
-- Name: equipment id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.equipment ALTER COLUMN id SET DEFAULT nextval('public.equipment_id_seq'::regclass);


--
-- Name: equipment_storage id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.equipment_storage ALTER COLUMN id SET DEFAULT nextval('public.equipment_storage_id_seq'::regclass);


--
-- Name: file_categories id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.file_categories ALTER COLUMN id SET DEFAULT nextval('public.file_categories_id_seq'::regclass);


--
-- Name: issue_history id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_history ALTER COLUMN id SET DEFAULT nextval('public.issue_history_id_seq'::regclass);


--
-- Name: issue_messages id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_messages ALTER COLUMN id SET DEFAULT nextval('public.issue_messages_id_seq'::regclass);


--
-- Name: issue_status id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_status ALTER COLUMN id SET DEFAULT nextval('public.issue_status_id_seq'::regclass);


--
-- Name: issue_storage id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_storage ALTER COLUMN id SET DEFAULT nextval('public.issue_storage_id_seq'::regclass);


--
-- Name: issue_type id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_type ALTER COLUMN id SET DEFAULT nextval('public.issue_type_id_seq'::regclass);


--
-- Name: issue_work_flow id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_work_flow ALTER COLUMN id SET DEFAULT nextval('public.issue_work_flow_id_seq'::regclass);


--
-- Name: issues id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issues ALTER COLUMN id SET DEFAULT nextval('public.issue_id_seq'::regclass);


--
-- Name: job_title id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.job_title ALTER COLUMN id SET DEFAULT nextval('public.job_title_id_seq'::regclass);


--
-- Name: material_kit_items id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.material_kit_items ALTER COLUMN id SET DEFAULT nextval('public.material_kit_items_id_seq'::regclass);


--
-- Name: material_kits id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.material_kits ALTER COLUMN id SET DEFAULT nextval('public.material_kits_id_seq'::regclass);


--
-- Name: materials id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.materials ALTER COLUMN id SET DEFAULT nextval('public.materials_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: notification_events id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.notification_events ALTER COLUMN id SET DEFAULT nextval('public.notification_events_id_seq'::regclass);


--
-- Name: notification_methods id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.notification_methods ALTER COLUMN id SET DEFAULT nextval('public.notification_methods_id_seq'::regclass);


--
-- Name: page_permissions id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.page_permissions ALTER COLUMN id SET DEFAULT nextval('public.page_permissions_id_seq'::regclass);


--
-- Name: pages id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.pages ALTER COLUMN id SET DEFAULT nextval('public.pages_id_seq'::regclass);


--
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: sfi_codes id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.sfi_codes ALTER COLUMN id SET DEFAULT nextval('public.sfi_codes_id_seq'::regclass);


--
-- Name: specializations id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specializations ALTER COLUMN id SET DEFAULT nextval('public.specializations_id_seq'::regclass);


--
-- Name: specification id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specification ALTER COLUMN id SET DEFAULT nextval('public.specification_id_seq'::regclass);


--
-- Name: specification_parts id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specification_parts ALTER COLUMN id SET DEFAULT nextval('public.specification_parts_id_seq'::regclass);


--
-- Name: specification_version id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specification_version ALTER COLUMN id SET DEFAULT nextval('public.specification_version_id_seq'::regclass);


--
-- Name: stages id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.stages ALTER COLUMN id SET DEFAULT nextval('public.stages_id_seq'::regclass);


--
-- Name: statements id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.statements ALTER COLUMN id SET DEFAULT nextval('public.statements_id_seq'::regclass);


--
-- Name: statements_specification id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.statements_specification ALTER COLUMN id SET DEFAULT nextval('public.statements_specification_id_seq'::regclass);


--
-- Name: storage id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.storage ALTER COLUMN id SET DEFAULT nextval('public.storage_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: time_logs id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.time_logs ALTER COLUMN id SET DEFAULT nextval('public.time_logs_id_seq'::regclass);


--
-- Name: units id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.units ALTER COLUMN id SET DEFAULT nextval('public.units_id_seq'::regclass);


--
-- Name: user_notification_settings id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.user_notification_settings ALTER COLUMN id SET DEFAULT nextval('public.user_notification_settings_id_seq'::regclass);


--
-- Name: user_notifications id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.user_notifications ALTER COLUMN id SET DEFAULT nextval('public.user_notifications_id_seq'::regclass);


--
-- Name: user_rocket_chat id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.user_rocket_chat ALTER COLUMN id SET DEFAULT nextval('public.user_rocket_chat_id_seq'::regclass);


--
-- Name: user_roles id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: wiki_articles id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_articles ALTER COLUMN id SET DEFAULT nextval('public.wiki_articles_id_seq'::regclass);


--
-- Name: wiki_articles_history id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_articles_history ALTER COLUMN id SET DEFAULT nextval('public.wiki_articles_history_id_seq'::regclass);


--
-- Name: wiki_articles_storage id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_articles_storage ALTER COLUMN id SET DEFAULT nextval('public.wiki_articles_storage_id_seq'::regclass);


--
-- Name: wiki_sections id; Type: DEFAULT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_sections ALTER COLUMN id SET DEFAULT nextval('public.wiki_sections_id_seq'::regclass);


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.categories (id, name, code, description, parent_id, created_at, updated_at) FROM stdin;
1	Металлопрокат	metal	Металлические изделия и прокат	\N	2025-12-24 12:54:43.48626	2025-12-24 12:54:43.48626
2	Крепеж	fasteners	Крепежные элементы	\N	2025-12-24 12:54:43.48626	2025-12-24 12:54:43.48626
3	Трубы и фитинги	pipes	Трубопроводная арматура	\N	2025-12-24 12:54:43.48626	2025-12-24 12:54:43.48626
4	Электрооборудование	electrical	Электротехническое оборудование	\N	2025-12-24 12:54:43.48626	2025-12-24 12:54:43.48626
5	Изоляционные материалы	insulation	Теплоизоляционные материалы	\N	2025-12-24 12:54:43.48626	2025-12-24 12:54:43.48626
\.


--
-- Data for Name: customer_question_status; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.customer_question_status (id, name, code, description, color, is_initial, is_final, order_index, created_at, updated_at) FROM stdin;
1	Ожидает ответа	pending	Вопрос ожидает ответа	#f39c12	t	f	1	2025-12-24 12:54:43.478181	2025-12-24 12:54:43.478181
2	Отвечено	answered	На вопрос дан ответ	#2ecc71	f	f	2	2025-12-24 12:54:43.478181	2025-12-24 12:54:43.478181
3	Закрыт	closed	Вопрос закрыт	#95a5a6	f	t	3	2025-12-24 12:54:43.478181	2025-12-24 12:54:43.478181
\.


--
-- Data for Name: customer_question_work_flow; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.customer_question_work_flow (id, from_status_id, to_status_id, name, description, required_permission, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customer_questions; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.customer_questions (id, document_id, project_id, question_text, answer_text, status, priority, asked_by, answered_by, asked_at, answered_at, due_date, created_at, updated_at) FROM stdin;
1	1	1	Какие материалы используются для корпуса?	Для корпуса используются сталь марки А и алюминиевые сплавы	answered	normal	1	2	2024-01-10 10:00:00	2024-01-10 14:30:00	2024-01-12	2025-12-24 12:54:43.510509	2025-12-24 12:54:43.510509
2	2	1	Когда будет готова полная спецификация?	\N	pending	high	1	\N	2024-01-15 09:00:00	\N	2024-01-20	2025-12-24 12:54:43.510509	2025-12-24 12:54:43.510509
\.


--
-- Data for Name: customer_questions_storage; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.customer_questions_storage (id, customer_question_id, storage_id, created_at) FROM stdin;
\.


--
-- Data for Name: department; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.department (id, name, description, manager_id, created_at, updated_at) FROM stdin;
3	Отдел технологической документации	Разработка технологических процессов	\N	2025-12-24 12:54:43.49447	2025-12-24 12:54:43.49447
5	Отдел качества	Контроль качества документации и работ	\N	2025-12-24 12:54:43.49447	2025-12-24 12:54:43.49447
4	Отдел управления проектами	Координация и управление проектами	1	2025-12-24 12:54:43.49447	2025-12-24 12:54:43.49447
1	Отдел проектирования	Разработка проектной документации	2	2025-12-24 12:54:43.49447	2025-12-24 12:54:43.49447
2	Отдел конструкторской документации	Создание конструкторских чертежей	3	2025-12-24 12:54:43.49447	2025-12-24 12:54:43.49447
6	Auto Dept	\N	\N	2025-12-26 11:50:49.808075	2025-12-26 11:50:49.808075
\.


--
-- Data for Name: directories; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.directories (id, name, path, parent_id, description, order_index, created_by, updated_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: document_directories; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.document_directories (id, name, path, parent_id, description, order_index, created_by, updated_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: document_messages; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.document_messages (id, document_id, user_id, content, created_at) FROM stdin;
\.


--
-- Data for Name: document_status; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.document_status (id, name, code, description, color, is_initial, is_final, order_index, created_at, updated_at) FROM stdin;
1	Черновик	draft	Документ в разработке	#95a5a6	t	f	1	2025-12-24 12:54:43.47541	2025-12-24 12:54:43.47541
2	На согласовании	review	Документ на согласовании	#f39c12	f	f	2	2025-12-24 12:54:43.47541	2025-12-24 12:54:43.47541
3	Утвержден	approved	Документ утвержден	#2ecc71	f	f	3	2025-12-24 12:54:43.47541	2025-12-24 12:54:43.47541
4	Архив	archived	Документ в архиве	#34495e	f	t	4	2025-12-24 12:54:43.47541	2025-12-24 12:54:43.47541
\.


--
-- Data for Name: document_work_flow; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.document_work_flow (id, from_status_id, to_status_id, name, description, required_permission, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.documents (id, title, description, project_id, stage_id, status_id, specialization_id, directory_id, created_by, updated_by, created_at, updated_at, is_active) FROM stdin;
1	Чертеж корпуса - общий вид	Общий вид корпусных конструкций	1	1	2	1	\N	2	\N	2025-12-24 12:54:43.508748	2025-12-24 12:54:43.508748	t
2	Спецификация материалов корпуса	Спецификация материалов для корпусных конструкций	1	1	2	1	\N	2	\N	2025-12-24 12:54:43.508748	2025-12-24 12:54:43.508748	t
3	Схема электрическая принципиальная	Принципиальная схема электрооборудования	2	1	1	3	\N	2	\N	2025-12-24 12:54:43.508748	2025-12-24 12:54:43.508748	t
\.


--
-- Data for Name: documents_history; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.documents_history (id, document_id, field_name, old_value, new_value, changed_by, created_at) FROM stdin;
\.


--
-- Data for Name: documents_issue; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.documents_issue (id, document_id, issue_id, created_at) FROM stdin;
\.


--
-- Data for Name: documents_storage; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.documents_storage (id, document_id, storage_id, created_at) FROM stdin;
\.


--
-- Data for Name: entity_links; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.entity_links (id, source_type, source_id, target_type, target_id, relation_type, blocks_closure, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: equipment; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.equipment (id, equipment_code, name, description, sfi_code_id, project_id, supplier_id, manufacturer, model, serial_number, installation_date, status, location, technical_specifications, created_by, updated_by, created_at, updated_at) FROM stdin;
1	EQ-001	Главный двигатель	Судовой дизельный двигатель	5	1	1	ДвигательЗавод	DM-5000	SN-2024-001	2024-06-01	active	Машинное отделение	Мощность 5000 кВт	2	\N	2025-12-24 12:54:43.519765	2025-12-24 12:54:43.519765
2	EQ-002	Генератор	Судовой генератор переменного тока	6	1	2	ГенЗавод	GEN-300	SN-2024-002	2024-06-15	active	Машинное отделение	Мощность 300 кВт	2	\N	2025-12-24 12:54:43.519765	2025-12-24 12:54:43.519765
\.


--
-- Data for Name: equipment_storage; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.equipment_storage (id, equipment_id, storage_id, created_at) FROM stdin;
\.


--
-- Data for Name: file_categories; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.file_categories (id, name, code, description, parent_id, order_index, created_at, updated_at) FROM stdin;
1	Чертежи	drawings	Конструкторские чертежи	\N	1	2025-12-24 12:54:43.491444	2025-12-24 12:54:43.491444
2	Спецификации	specifications	Технические спецификации	\N	2	2025-12-24 12:54:43.491444	2025-12-24 12:54:43.491444
3	Отчеты	reports	Отчетная документация	\N	3	2025-12-24 12:54:43.491444	2025-12-24 12:54:43.491444
4	Фотографии	photos	Фото материалы	\N	4	2025-12-24 12:54:43.491444	2025-12-24 12:54:43.491444
5	Документы	documents	Прочие документы	\N	5	2025-12-24 12:54:43.491444	2025-12-24 12:54:43.491444
\.


--
-- Data for Name: issue_history; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.issue_history (id, issue_id, field_name, old_value, new_value, changed_by, created_at) FROM stdin;
1	2	updated	{"id":2,"project_id":1,"title":"dsksfkksdf","description":"","status_id":1,"type_id":2,"priority":"medium","estimated_hours":"8.00","start_date":"2024-01-19T21:00:00.000Z","due_date":"2024-01-24T21:00:00.000Z","assignee_id":1,"author_id":2,"created_at":"2025-12-24T09:54:43.505Z"}	{"id":2,"project_id":1,"title":"dsksfkksdf","description":"","status_id":4,"type_id":2,"priority":"medium","estimated_hours":"8.00","start_date":"2024-01-19T21:00:00.000Z","due_date":"2024-01-24T21:00:00.000Z","assignee_id":1,"author_id":2,"created_at":"2025-12-24T09:54:43.505Z"}	1	2026-01-17 17:17:54.100796
2	2	title	dsksfkksdf	аввавпв	1	2026-01-17 17:21:39.920597
3	2	description		ываваыв	1	2026-01-17 17:22:40.980882
4	2	status_id	4	3	1	2026-01-17 17:22:40.985165
\.


--
-- Data for Name: issue_messages; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.issue_messages (id, issue_id, user_id, content, created_at) FROM stdin;
\.


--
-- Data for Name: issue_status; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.issue_status (id, name, code, description, color, order_index, created_at, updated_at, is_initial, is_final) FROM stdin;
2	В работе	in_progress	Задача выполняется	#f39c12	2	2025-12-24 12:54:43.46979	2025-12-24 12:54:43.46979	f	f
3	На проверке	in_review	Задача на проверке	#9b59b6	3	2025-12-24 12:54:43.46979	2025-12-24 12:54:43.46979	f	f
5	Закрыта	closed	Задача закрыта	#95a5a6	5	2025-12-24 12:54:43.46979	2025-12-24 12:54:43.46979	f	t
1	Новый	open	Задача создана и ожидает выполнения	#3498db	1	2025-12-24 12:54:43.46979	2025-12-24 12:54:43.46979	t	f
\.


--
-- Data for Name: issue_storage; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.issue_storage (id, issue_id, storage_id, created_at) FROM stdin;
\.


--
-- Data for Name: issue_type; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.issue_type (id, name, code, description, icon, color, order_index, created_at, updated_at) FROM stdin;
1	Задача	task	Обычная задача	task	#3498db	1	2025-12-24 12:54:43.472915	2025-12-24 12:54:43.472915
2	Ошибка	bug	Обнаруженная ошибка	bug	#e74c3c	2	2025-12-24 12:54:43.472915	2025-12-24 12:54:43.472915
3	Улучшение	improvement	Предложение по улучшению	improvement	#2ecc71	3	2025-12-24 12:54:43.472915	2025-12-24 12:54:43.472915
4	Вопрос	question	Вопрос требующий ответа	question	#9b59b6	4	2025-12-24 12:54:43.472915	2025-12-24 12:54:43.472915
\.


--
-- Data for Name: issue_work_flow; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.issue_work_flow (id, issue_type_id, from_status_id, to_status_id, name, description, required_permission, is_active, created_at, updated_at) FROM stdin;
1	1	1	2	\N	\N	\N	t	2026-01-18 17:33:50.758439	2026-01-18 17:33:50.758439
2	1	2	3	\N	\N	\N	t	2026-01-18 17:33:50.784242	2026-01-18 17:33:50.784242
3	1	2	5	\N	\N	\N	t	2026-01-18 17:33:50.785879	2026-01-18 17:33:50.785879
\.


--
-- Data for Name: issues; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.issues (id, project_id, title, description, status_id, type_id, priority, estimated_hours, start_date, due_date, assignee_id, author_id, created_at, updated_at, resolved_at, closed_at, is_active) FROM stdin;
4	2	Разработать схему подключения	Создать электрическую схему подключения навигационного оборудования	2	1	high	40.00	2024-02-01	2024-02-20	2	5	2025-12-24 12:54:43.505714	2025-12-24 12:54:43.505714	\N	\N	t
1	1	Разработка чертежей корпуса	Создать комплект чертежей корпусных конструкций	2	1	high	120.00	2024-01-15	2024-03-15	1	5	2025-12-24 12:54:43.505714	2025-12-24 12:54:43.505714	\N	\N	t
3	1	Подготовить отчет по проекту	Подготовить ежемесячный отчет о ходе работ	3	1	low	16.00	2024-01-25	2024-01-30	2	5	2025-12-24 12:54:43.505714	2025-12-24 12:54:43.505714	\N	\N	t
2	1	аввавпв	ываваыв	3	2	medium	8.00	2024-01-20	2024-01-25	1	2	2025-12-24 12:54:43.505714	2025-12-24 12:54:43.505714	\N	\N	t
6	1	test	test	1	1	\N	0.00	\N	\N	1	1	2026-01-17 13:03:59.670403	2026-01-17 13:03:59.670403	\N	\N	t
7	1	test	test	1	1	\N	0.00	\N	\N	1	1	2026-01-17 13:18:56.256788	2026-01-17 13:18:56.256788	\N	\N	t
8	1	test	test	1	1	\N	0.00	\N	\N	1	1	2026-01-17 13:19:11.13905	2026-01-17 13:19:11.13905	\N	\N	t
9	1	test	test	1	1	\N	0.00	\N	\N	1	1	2026-01-17 13:31:41.734305	2026-01-17 13:31:41.734305	\N	\N	t
10	1	test	test	1	1	\N	0.00	\N	\N	2	1	2026-01-17 13:45:10.35092	2026-01-17 13:45:10.35092	\N	\N	t
11	1	test	test	1	1	\N	0.00	\N	\N	2	1	2026-01-17 13:53:58.839554	2026-01-17 13:53:58.839554	\N	\N	t
12	1	1	1	1	1	\N	0.00	\N	\N	1	1	2026-01-17 13:58:32.646411	2026-01-17 13:58:32.646411	\N	\N	t
13	1	djflsf		1	1	\N	0.00	\N	\N	1	1	2026-01-17 14:02:17.880331	2026-01-17 14:02:17.880331	\N	\N	t
\.


--
-- Data for Name: job_title; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.job_title (id, name, description, created_at, updated_at) FROM stdin;
1	Главный инженер	Руководитель инженерного отдела	2025-12-24 12:54:43.455286	2025-12-24 12:54:43.455286
2	Инженер-конструктор	Разработка конструкторской документации	2025-12-24 12:54:43.455286	2025-12-24 12:54:43.455286
3	Инженер-технолог	Разработка технологической документации	2025-12-24 12:54:43.455286	2025-12-24 12:54:43.455286
4	Проектировщик	Проектирование систем и оборудования	2025-12-24 12:54:43.455286	2025-12-24 12:54:43.455286
5	Менеджер проекта	Управление проектами	2025-12-24 12:54:43.455286	2025-12-24 12:54:43.455286
6	Специалист по документации	Ведение технической документации	2025-12-24 12:54:43.455286	2025-12-24 12:54:43.455286
7	Тестировщик	Тестирование и проверка качества	2025-12-24 12:54:43.455286	2025-12-24 12:54:43.455286
\.


--
-- Data for Name: material_kit_items; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.material_kit_items (id, kit_id, material_id, quantity, notes, created_at) FROM stdin;
\.


--
-- Data for Name: material_kits; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.material_kits (id, code, name, description, created_by, updated_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: materials; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.materials (id, stock_code, name, description, directory_id, unit_id, category_id, manufacturer, created_by, updated_by, created_at, updated_at) FROM stdin;
1	MAT-001	Сталь листовая А	Листовая сталь марки А, толщина 10мм	\N	2	1	Металлургический завод	2	\N	2025-12-24 12:54:43.515183	2025-12-24 12:54:43.515183
2	MAT-002	Болт М12х50	Болт с гайкой и шайбой М12х50	\N	1	2	Крепежный завод	2	\N	2025-12-24 12:54:43.515183	2025-12-24 12:54:43.515183
3	MAT-003	Кабель ВВГ 3х2.5	Кабель силовой ВВГ 3х2.5	\N	3	4	Кабельный завод	2	\N	2025-12-24 12:54:43.515183	2025-12-24 12:54:43.515183
4	MAT-004	Труба стальная 50мм	Труба стальная бесшовная диаметр 50мм	\N	3	3	Трубный завод	2	\N	2025-12-24 12:54:43.515183	2025-12-24 12:54:43.515183
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.messages (id, issue_id, document_id, parent_id, content, author_id, is_edited, created_at, updated_at) FROM stdin;
1	1	\N	\N	Начал работу над чертежами	2	f	2025-12-24 12:54:43.527213	2025-12-24 12:54:43.527213
2	1	\N	\N	Отлично, жду результатов	5	f	2025-12-24 12:54:43.527213	2025-12-24 12:54:43.527213
3	2	\N	\N	Исправил ошибку в спецификации	3	f	2025-12-24 12:54:43.527213	2025-12-24 12:54:43.527213
4	\N	1	\N	Документ готов к согласованию	2	f	2025-12-24 12:54:43.527213	2025-12-24 12:54:43.527213
\.


--
-- Data for Name: notification_events; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.notification_events (id, code, name, description, created_at) FROM stdin;
1	issue_created	Issue created	A new issue was created in a project	2026-01-17 11:57:47.830063
2	issue_updated	Issue updated	An existing issue was updated	2026-01-17 11:57:47.830063
3	comment_added	Comment added	A comment was added to an issue or document	2026-01-17 11:57:47.830063
4	document_uploaded	Document uploaded	A new document was uploaded to a project	2026-01-17 11:57:47.830063
5	user_mentioned	User mentioned	A user was mentioned in a comment or message	2026-01-17 11:57:47.830063
6	project_invite	Project invite	A user was invited to a project	2026-01-17 11:57:47.830063
7	task_assigned	Task assigned	A task/issue was assigned to a user	2026-01-17 11:57:47.830063
8	status_changed	Status changed	The status of an issue or task changed	2026-01-17 11:57:47.830063
9	deadline_changed	Deadline changed	The due date or deadline of an item was changed	2026-01-17 11:57:47.830063
\.


--
-- Data for Name: notification_methods; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.notification_methods (id, code, name, description, created_at) FROM stdin;
1	rocket_chat	Rocket.Chat	Send notification via Rocket.Chat (chat messages)	2026-01-17 11:57:09.668654
2	email	Email	Send notification via email	2026-01-17 11:57:09.668654
\.


--
-- Data for Name: page_permissions; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.page_permissions (id, page_id, permission_id, created_at) FROM stdin;
2	1	9	2026-01-19 15:47:48.833042
3	3	9	2026-01-19 16:12:05.376559
4	5	5	2026-01-19 16:15:14.445567
6	6	13	2026-01-19 16:15:14.445567
8	8	27	2026-01-19 16:15:14.445567
9	9	31	2026-01-19 16:15:14.445567
10	10	35	2026-01-19 16:15:14.445567
13	13	47	2026-01-19 16:15:14.445567
14	14	1	2026-01-19 16:15:14.445567
15	15	20	2026-01-19 16:15:14.445567
\.


--
-- Data for Name: pages; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.pages (id, key, path, title_key, title_en, parent_id, icon, order_index, created_at, updated_at) FROM stdin;
1	dashbord	/dashbord	Дашборд	Dashbord	\N	pi-home	0	2026-01-19 15:46:22.89524	2026-01-19 15:46:22.89524
3	issues	/issues	menu.issues	Issues	2	pi pi-exclamation-triangle	30	2026-01-19 16:11:10.370706	2026-01-19 16:11:10.370706
6	documents	/documents	menu.documents	Documents	2	pi pi-file	20	2026-01-19 16:15:14.445567	2026-01-19 16:15:14.445567
18	reports	/reports	menu.reports	Reports	2	pi pi-chart-line	140	2026-01-19 16:15:14.445567	2026-01-19 16:15:14.445567
14	users	/users	menu.users	Users	17	pi pi-users	100	2026-01-19 16:15:14.445567	2026-01-19 16:15:14.445567
15	roles	/roles	menu.roles	Roles	17	pi pi-shield	110	2026-01-19 16:15:14.445567	2026-01-19 16:15:14.445567
17	admin-menu		Администрирование	Admin	\N	pi pi-cog	130	2026-01-19 16:15:14.445567	2026-01-19 16:15:14.445567
19	notifications	/notifications	menu.notifications	Notifications	17	pi pi-bell	150	2026-01-19 16:15:14.445567	2026-01-19 16:15:14.445567
8	materials-menu		Материалы	Materials	\N	pi pi-tags	40	2026-01-19 16:15:14.445567	2026-01-19 16:15:14.445567
25	materials	/materials	Материалы	Materials	8	pi pi-tags	40	2026-01-19 16:15:14.445567	2026-01-19 16:15:14.445567
10	specifications	/specifications	menu.specifications	Specifications	8	pi pi-file	60	2026-01-19 16:15:14.445567	2026-01-19 16:15:14.445567
13	statements	/statements	Ведомости	Statements	8	pi pi-list	90	2026-01-19 16:15:14.445567	2026-01-19 16:15:14.445567
9	equipment-menu		menu.equipment	Equipment	\N	pi pi-wrench	50	2026-01-19 16:15:14.445567	2026-01-19 16:15:14.445567
26	equipment	/equipment	Оборудование	Equipment	9	pi pi-wrench	50	2026-01-19 16:15:14.445567	2026-01-19 16:15:14.445567
27	suppliers	/suppliers	Поставщики	Suppliers	9	pi-car	0	2026-01-19 16:24:46.980166	2026-01-19 16:24:46.980166
2	projects-menu		Проекты	Projects	\N	pi-briefcase	0	2026-01-19 16:11:10.324938	2026-01-19 16:11:10.324938
5	projects	/projects	Проекты	Projects	2	pi-briefcase	10	2026-01-19 16:15:14.445567	2026-01-19 16:15:14.445567
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.password_reset_tokens (id, user_id, token, expires_at, used, created_at) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.permissions (id, name, code, description, resource, action, created_at, updated_at) FROM stdin;
1	Просмотр пользователей	users.view	Просмотр списка пользователей	users	view	2025-12-24 12:54:43.460676	2025-12-24 12:54:43.460676
2	Создание пользователей	users.create	Создание новых пользователей	users	create	2025-12-24 12:54:43.460676	2025-12-24 12:54:43.460676
3	Редактирование пользователей	users.update	Редактирование данных пользователей	users	update	2025-12-24 12:54:43.460676	2025-12-24 12:54:43.460676
4	Удаление пользователей	users.delete	Удаление пользователей	users	delete	2025-12-24 12:54:43.460676	2025-12-24 12:54:43.460676
5	Просмотр проектов	projects.view	Просмотр проектов	projects	view	2025-12-24 12:54:43.460676	2025-12-24 12:54:43.460676
6	Создание проектов	projects.create	Создание новых проектов	projects	create	2025-12-24 12:54:43.460676	2025-12-24 12:54:43.460676
7	Редактирование проектов	projects.update	Редактирование проектов	projects	update	2025-12-24 12:54:43.460676	2025-12-24 12:54:43.460676
8	Удаление проектов	projects.delete	Удаление проектов	projects	delete	2025-12-24 12:54:43.460676	2025-12-24 12:54:43.460676
9	Просмотр задач	issues.view	Просмотр задач	issues	view	2025-12-24 12:54:43.460676	2025-12-24 12:54:43.460676
10	Создание задач	issues.create	Создание новых задач	issues	create	2025-12-24 12:54:43.460676	2025-12-24 12:54:43.460676
11	Редактирование задач	issues.update	Редактирование задач	issues	update	2025-12-24 12:54:43.460676	2025-12-24 12:54:43.460676
12	Управление статусами задач	issues.status	Изменение статусов задач	issues	status	2025-12-24 12:54:43.460676	2025-12-24 12:54:43.460676
13	Просмотр документов	documents.view	Просмотр документов	documents	view	2025-12-24 12:54:43.460676	2025-12-24 12:54:43.460676
14	Создание документов	documents.create	Создание новых документов	documents	create	2025-12-24 12:54:43.460676	2025-12-24 12:54:43.460676
15	Редактирование документов	documents.update	Редактирование документов	documents	update	2025-12-24 12:54:43.460676	2025-12-24 12:54:43.460676
16	Список отделов	departments.view	Просмотр списка отделов	\N	\N	2025-12-25 11:32:28.247559	2025-12-25 11:32:28.247559
17	Создать отдел	departments.create	Создать новый отдел	\N	\N	2025-12-25 11:32:28.25791	2025-12-25 11:32:28.25791
18	Обновить отдел	departments.update	Редактирование параметров отдела	\N	\N	2025-12-25 11:32:28.259254	2025-12-25 11:32:28.259254
19	Удалить отдел	departments.delete	Удаление проекта	\N	\N	2025-12-25 11:32:28.260141	2025-12-25 11:32:28.260141
20	View Roles	roles.view	\N	roles	view	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
21	Create Roles	roles.create	\N	roles	create	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
22	Update Roles	roles.update	\N	roles	update	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
23	Delete Roles	roles.delete	\N	roles	delete	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
24	View Permissions	permissions.view	\N	permissions	view	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
25	Delete Issues	issues.delete	\N	issues	delete	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
26	Delete Documents	documents.delete	\N	documents	delete	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
27	View Materials	materials.view	\N	materials	view	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
28	Create Materials	materials.create	\N	materials	create	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
29	Update Materials	materials.update	\N	materials	update	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
30	Delete Materials	materials.delete	\N	materials	delete	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
31	View Equipment	equipment.view	\N	equipment	view	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
32	Create Equipment	equipment.create	\N	equipment	create	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
33	Update Equipment	equipment.update	\N	equipment	update	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
34	Delete Equipment	equipment.delete	\N	equipment	delete	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
35	View Specifications	specifications.view	\N	specifications	view	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
36	Create Specifications	specifications.create	\N	specifications	create	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
37	Update Specifications	specifications.update	\N	specifications	update	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
38	Delete Specifications	specifications.delete	\N	specifications	delete	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
39	View Stages	stages.view	\N	stages	view	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
40	Create Stages	stages.create	\N	stages	create	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
41	Update Stages	stages.update	\N	stages	update	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
42	Delete Stages	stages.delete	\N	stages	delete	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
43	View Storage	storage.view	\N	storage	view	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
44	Create Storage	storage.create	\N	storage	create	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
45	Update Storage	storage.update	\N	storage	update	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
46	Delete Storage	storage.delete	\N	storage	delete	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
47	View Statements	statements.view	\N	statements	view	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
48	Create Statements	statements.create	\N	statements	create	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
49	Update Statements	statements.update	\N	statements	update	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
50	Delete Statements	statements.delete	\N	statements	delete	2025-12-26 11:50:08.180014	2025-12-26 11:50:08.180014
51	Assign projects	projects.assign	Auto-added from swagger: projects.assign	\N	\N	2026-01-04 18:23:21.599403	2026-01-04 18:23:21.599403
52	View auth	auth.view	Auto-added from swagger: auth.view	\N	\N	2026-01-04 18:36:08.70998	2026-01-04 18:36:08.70998
53	Create auth	auth.create	Auto-added from swagger: auth.create	\N	\N	2026-01-04 18:36:08.718216	2026-01-04 18:36:08.718216
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.projects (id, name, description, code, status, owner_id, created_at, updated_at) FROM stdin;
2	Модернизация судна "Океан"	Модернизация систем навигации	SHIP-002	active	5	2025-12-24 12:54:43.50184	2025-12-24 12:54:43.50184
3	Проект катера "Стрела"	Разработка скоростного катера	SHIP-003	planning	5	2025-12-24 12:54:43.50184	2025-12-24 12:54:43.50184
4	Auto Project	Created by tests	\N	active	\N	2025-12-26 12:40:43.720817	2025-12-26 12:40:43.720817
5	Auto efsdfdafdfd	Created by tests	\N	active	\N	2025-12-26 15:03:34.604104	2025-12-26 15:03:34.604104
6	Auto efsdfdafdfd	Created by tests	\N	active	1	2025-12-26 15:08:01.279364	2025-12-26 15:08:01.279364
7	Auto efsdfdafdfd	Created by tests	\N	active	1	2025-12-26 15:08:45.878612	2025-12-26 15:08:45.878612
1	Auto Project Updated	Строительство многоцелевого судна	SHIP-001	active	5	2025-12-24 12:54:43.50184	2025-12-24 12:54:43.50184
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.role_permissions (id, role_id, permission_id, created_at) FROM stdin;
2	1	2	2025-12-24 12:54:43.463169
3	1	3	2025-12-24 12:54:43.463169
4	1	4	2025-12-24 12:54:43.463169
5	1	5	2025-12-24 12:54:43.463169
6	1	6	2025-12-24 12:54:43.463169
7	1	7	2025-12-24 12:54:43.463169
8	1	8	2025-12-24 12:54:43.463169
9	1	9	2025-12-24 12:54:43.463169
10	1	10	2025-12-24 12:54:43.463169
11	1	11	2025-12-24 12:54:43.463169
12	1	12	2025-12-24 12:54:43.463169
13	1	13	2025-12-24 12:54:43.463169
14	1	14	2025-12-24 12:54:43.463169
15	1	15	2025-12-24 12:54:43.463169
51	1	1	2025-12-25 11:00:24.087596
52	1	16	2025-12-26 11:50:08.180014
53	1	17	2025-12-26 11:50:08.180014
54	1	18	2025-12-26 11:50:08.180014
55	1	19	2025-12-26 11:50:08.180014
56	1	20	2025-12-26 11:50:08.180014
57	1	21	2025-12-26 11:50:08.180014
58	1	22	2025-12-26 11:50:08.180014
59	1	23	2025-12-26 11:50:08.180014
60	1	24	2025-12-26 11:50:08.180014
61	1	25	2025-12-26 11:50:08.180014
62	1	26	2025-12-26 11:50:08.180014
63	1	27	2025-12-26 11:50:08.180014
64	1	28	2025-12-26 11:50:08.180014
65	1	29	2025-12-26 11:50:08.180014
66	1	30	2025-12-26 11:50:08.180014
67	1	31	2025-12-26 11:50:08.180014
68	1	32	2025-12-26 11:50:08.180014
69	1	33	2025-12-26 11:50:08.180014
70	1	34	2025-12-26 11:50:08.180014
71	1	35	2025-12-26 11:50:08.180014
72	1	36	2025-12-26 11:50:08.180014
73	1	37	2025-12-26 11:50:08.180014
74	1	38	2025-12-26 11:50:08.180014
75	1	39	2025-12-26 11:50:08.180014
76	1	40	2025-12-26 11:50:08.180014
77	1	41	2025-12-26 11:50:08.180014
78	1	42	2025-12-26 11:50:08.180014
79	1	43	2025-12-26 11:50:08.180014
80	1	44	2025-12-26 11:50:08.180014
81	1	45	2025-12-26 11:50:08.180014
82	1	46	2025-12-26 11:50:08.180014
83	1	47	2025-12-26 11:50:08.180014
84	1	48	2025-12-26 11:50:08.180014
85	1	49	2025-12-26 11:50:08.180014
86	1	50	2025-12-26 11:50:08.180014
87	6	1	2025-12-26 11:50:08.180014
88	6	2	2025-12-26 11:50:08.180014
89	6	3	2025-12-26 11:50:08.180014
90	6	4	2025-12-26 11:50:08.180014
91	6	5	2025-12-26 11:50:08.180014
92	6	6	2025-12-26 11:50:08.180014
93	6	7	2025-12-26 11:50:08.180014
94	6	8	2025-12-26 11:50:08.180014
95	6	9	2025-12-26 11:50:08.180014
96	6	10	2025-12-26 11:50:08.180014
97	6	11	2025-12-26 11:50:08.180014
98	6	13	2025-12-26 11:50:08.180014
99	6	14	2025-12-26 11:50:08.180014
100	6	15	2025-12-26 11:50:08.180014
101	6	16	2025-12-26 11:50:08.180014
102	6	17	2025-12-26 11:50:08.180014
103	6	18	2025-12-26 11:50:08.180014
104	6	19	2025-12-26 11:50:08.180014
105	6	20	2025-12-26 11:50:08.180014
106	6	21	2025-12-26 11:50:08.180014
107	6	22	2025-12-26 11:50:08.180014
108	6	23	2025-12-26 11:50:08.180014
109	6	24	2025-12-26 11:50:08.180014
110	6	25	2025-12-26 11:50:08.180014
111	6	26	2025-12-26 11:50:08.180014
112	6	27	2025-12-26 11:50:08.180014
113	6	28	2025-12-26 11:50:08.180014
114	6	29	2025-12-26 11:50:08.180014
115	6	30	2025-12-26 11:50:08.180014
116	6	31	2025-12-26 11:50:08.180014
117	6	32	2025-12-26 11:50:08.180014
118	6	33	2025-12-26 11:50:08.180014
119	6	34	2025-12-26 11:50:08.180014
120	6	35	2025-12-26 11:50:08.180014
121	6	36	2025-12-26 11:50:08.180014
122	6	37	2025-12-26 11:50:08.180014
123	6	38	2025-12-26 11:50:08.180014
124	6	39	2025-12-26 11:50:08.180014
125	6	40	2025-12-26 11:50:08.180014
126	6	41	2025-12-26 11:50:08.180014
127	6	42	2025-12-26 11:50:08.180014
128	6	43	2025-12-26 11:50:08.180014
129	6	44	2025-12-26 11:50:08.180014
130	6	45	2025-12-26 11:50:08.180014
131	6	46	2025-12-26 11:50:08.180014
132	6	47	2025-12-26 11:50:08.180014
133	6	48	2025-12-26 11:50:08.180014
134	6	49	2025-12-26 11:50:08.180014
135	6	50	2025-12-26 11:50:08.180014
136	1	51	2026-01-04 18:25:41.142997
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.roles (id, name, description, created_at, updated_at) FROM stdin;
2	Руководитель проекта	Управление проектами и командами	2025-12-24 12:54:43.459436	2025-12-24 12:54:43.459436
3	Инженер	Работа с документацией и задачами	2025-12-24 12:54:43.459436	2025-12-24 12:54:43.459436
5	Менеджер	Управление ресурсами и планирование	2025-12-24 12:54:43.459436	2025-12-24 12:54:43.459436
6	admin	System administrator role with all permissions	2025-12-24 15:13:18.650919	2025-12-24 15:13:18.650919
7	auto-role	Created by tests	2025-12-26 11:50:49.836168	2025-12-26 11:50:49.836168
1	Администратор	Полный доступ к системе	2025-12-24 12:54:43.459436	2025-12-24 12:54:43.459436
14	member	Project member	2026-01-05 12:13:28.022692	2026-01-05 12:13:28.022692
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.sessions (id, user_id, token, refresh_token, ip_address, user_agent, expires_at, created_at, last_activity, is_active) FROM stdin;
1	7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NywidXNlcm5hbWUiOiJqb2huX2RvZSIsImVtYWlsIjoiam9obi5kb2VAZXhhbXBsZS5jb20iLCJpYXQiOjE3NjY1Nzc4NDgsImV4cCI6MTc2NjY2NDI0OH0.pnHu3dyXARv3t1a-hmCLhJIgfDUijTu26akqjO4Hj9k	228195a58290194d19e02c6543412f9530d3e2c46130c63d736b63491de386896415f2eb5d35d59b4ce739c429eccc5d1b7a46ea6d2604d0fd7d02c8ba967b95	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-25 15:04:08.567	2025-12-24 15:04:08.569914	2025-12-24 15:04:08.569914	t
3	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjU4MDAxNywiZXhwIjoxNzY2NjY2NDE3fQ.fM-6mv3I9om_s6I7e8BZCtc4v_GjqFeUrOEllezUvZM	d5d8d3030c60db655377091a181a6c64747113f053c63b6d1d09ea2bf173622c85dc1ee467bc65b9d3b075e9a23ca31868d12b72ca503540ea6520bc40a22f35	::1	curl/8.7.1	2025-12-25 15:40:17.647	2025-12-24 15:40:17.647641	2025-12-24 15:40:17.647641	t
4	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjU4MDA0MSwiZXhwIjoxNzY2NjY2NDQxfQ.M4-Dx97nMC1m57-Ge1hscJ5_2T-U7_eMJBU0Icn7JfE	ebc1618c7a66f8904632598e3d69967e82098c4a8ccaacf3e4327dbdcf6d2e7550a19af3ce56b81d9c630c67ab85a870cec96067e1d424b91df11d663c860568	::1	curl/8.7.1	2025-12-25 15:40:41.435	2025-12-24 15:40:41.435385	2025-12-24 15:40:41.435385	t
5	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjU4MDExOCwiZXhwIjoxNzY2NjY2NTE4fQ.vOXLq4Rm1Jup6arDOta4ASEsyWvFGtz1PLJh8bVITxE	9b95474b2191890f87b2601cb7bb2fb34e1d0ea9fb477d8c765594bbacf7b4134f2a615dbf6902680c5ffb18f0c459f60afaae7c835692591db682e0929732fc	::1	curl/8.7.1	2025-12-25 15:41:58.203	2025-12-24 15:41:58.204123	2025-12-24 15:41:58.204123	t
7	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjU4MTUzNSwiZXhwIjoxNzY2NjY3OTM1fQ.Ita0Pt-_Qa40XLJrzCF4ejW-zgPHeNAwVIiEwfEQ9fQ	58d7025e2bbe3f25dd4eaf382b7ceef7fb0a950fe92003317aa2d352c9b97e6ad2c763933797522c20b2d95c2bcebe6bf926d05d4901061d847c5952e279d842	::1	curl/8.7.1	2025-12-25 16:05:35.261	2025-12-24 16:05:35.261768	2025-12-24 16:05:35.261768	t
8	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjU4ODQ3NSwiZXhwIjoxNzY2Njc0ODc1fQ.Zcr1_o0jWuPgXfrsBnlexnAqxtL1TW1mugbZ_yKjdjc	e0925696187e58a29c5d380704fc60881bb3414cbf91b80b3a356163372a5b38ce160753ee2118330bfbb1a72b7906bbe9b97958b82651045388c7287ff51310	::1	curl/8.7.1	2025-12-25 18:01:15.73	2025-12-24 18:01:15.730985	2025-12-24 18:01:15.730985	f
9	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjU4ODY0MSwiZXhwIjoxNzY2Njc1MDQxfQ.fCJ3SPWFFlWBKRw127h6KdHtJOOvsNj71r-bUWAJAp4	8e3b711d687feb29dd32a3c16fbe072ef86f8aa0a24c4c036d7aed2c0687d11f4fa49e1524291015ff7c4a241538449d8bac28eb97207512fdde19b711377789	::1	curl/8.7.1	2025-12-25 18:04:01.826	2025-12-24 18:04:01.826767	2025-12-24 18:04:01.826767	f
35	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjczOTQyMiwiZXhwIjoxNzY2ODI1ODIyfQ.l_OWq-UmnkfNPC36eNZETAZG0iOoZhVTg3oYVzTyZeU	b5ed4ca370e6be63001767de9b2965c7a5aff8c112ba25288f9d14796aaa20299ded0e98419e5cacbf5572b05a42797904bf3c77c922a36223d0632bef0c03be	::1	PostmanRuntime/7.51.0	2025-12-27 11:57:02.628	2025-12-26 11:57:02.629029	2025-12-26 11:57:02.629029	t
2	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjU3ODQ3NSwiZXhwIjoxNzY2NjY0ODc1fQ.qZcC0sd874Qq22exxme8gIyGeCShj0Ev1rFzL8wxbLo	266d79b46fc3f87ffd8816be3bd4555c19809193cfb72a9e4fc160b975253b6280bbf1ce5440453a521330cdba49b25609a15a7266d161bd3665f04f2c8d6ff3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-25 15:14:35.642	2025-12-24 15:14:35.643281	2025-12-24 15:14:35.643281	f
11	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjU5MDQwMCwiZXhwIjoxNzY2Njc2ODAwfQ.RlwwVGEjDCtB3rZuNsSny6LWkK2TmrTyhK2VDczkpZE	6007508cebb35a7936defa9acc1ceda705eddf16abc3a63eeba6b13d2a5c4b50048372b43eaa67228d7e3eab976d230f8a7ddb0f5ee6deb13112e233c5e06c16	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-25 18:33:20.465	2025-12-24 18:33:20.466736	2025-12-24 18:33:20.466736	t
10	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjU5MDMxOCwiZXhwIjoxNzY2Njc2NzE4fQ.VS7OT99_sibcPMOdSeFXYVSbL7dZJWdfB0bEG48lN4M	50cb77a894b9b1bcfc1b14fbbd4034a4bc8fd3cd0740239365627404646f0a80200b98cb6a155826f35bfb6ef056d6d1ac458ab8871dc79034d1872e68f6abbe	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-25 18:31:58.396	2025-12-24 18:31:58.403762	2025-12-24 18:31:58.403762	f
12	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjU5MDc3OCwiZXhwIjoxNzY2Njc3MTc4fQ.WcVVXLMUYPq23EIDQ8Mp_RWM0p1BGNY4ERpJLCBITuU	c28e5355b22588b9c7905cdc90d32ec243d3f1954742813f24761547c7f2f42ee999a51bc4e9ba74245ed7df7f9a56643170b2a2d289ff495663660443a6d1bd	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-25 18:39:38.436	2025-12-24 18:39:38.436742	2025-12-24 18:39:38.436742	t
13	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjU5MDkyNiwiZXhwIjoxNzY2Njc3MzI2fQ.LkoClqFx7LHBqFKH-HSrdSvDTKrR0gnqXx7rL93bDAY	e6f3cb7b7bebe13e2b1b6fd9b74c5ab6bdc3f5399e55c6141e05ca4e9487ec7d1a85a2d2ac97a2bd69840c80744e81072c5cb43db9cdd074ff64572210568d06	::1	curl/8.7.1	2025-12-25 18:42:06.175	2025-12-24 18:42:06.175763	2025-12-24 18:42:06.175763	t
14	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjU5MDkzNCwiZXhwIjoxNzY2Njc3MzM0fQ.LN68Z4yTWlgsq_rVd7icJ0YH7J5xxkUyMcoONgnCbew	fedee8cea6f897db8185c2853fd5cc4a4c4e20c21d4c7e2e507a907baae4fc537855255feaf2d3879afbb260a1ad878b4322c6c31b0c6e30cb301bc1a4fcd9aa	::1	curl/8.7.1	2025-12-25 18:42:14.481	2025-12-24 18:42:14.481482	2025-12-24 18:42:14.481482	t
15	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjY0OTAwNCwiZXhwIjoxNzY2NzM1NDA0fQ.s_fCMV5LfTF5QM9-0sK2bxEJQRh-fyItPJhzdJIhmgo	9a7c5703556bbbd912cbc0c533c4cf9d3897b910bce640328dc70292600f3b22bd1db29caa5e1c17227a18e35cbfd61910cf3fe2a839c6fb6c25b4ea5a27ed4c	::1	curl/8.7.1	2025-12-26 10:50:04.668	2025-12-25 10:50:04.6711	2025-12-25 10:50:04.6711	t
16	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjY0OTAxMywiZXhwIjoxNzY2NzM1NDEzfQ.mJtG9RaPRB_FUJaMpw2ZmbPZRMazkpLdIt6QUZ7ZROk	baa1761018c4a7e0c0e188ea3d05588a78928d99fa25d7f1f38ba0b2393c329a77379e76b8213fcf7a4d5672202a6251edcb159fef3626753f14dafebd07964c	::1	curl/8.7.1	2025-12-26 10:50:13.733	2025-12-25 10:50:13.735261	2025-12-25 10:50:13.735261	t
6	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjU4MTQzMCwiZXhwIjoxNzY2NjY3ODMwfQ.faa-UZ8ax5Fmo5_f37MQw6ycDz-xY5qZrLiM-DNLIbE	9249ec93ff93dedbec0cb72e0c474912939be35dc8ed53d0191aba392671210d1a63262d0ca18aadc8eda2a1182295fa58b6f64c9c49597f0971ff988ab27656	::1	curl/8.7.1	2025-12-25 16:03:50.51	2025-12-24 16:03:50.510983	2025-12-24 16:03:50.510983	t
17	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjcwMTAyMiwiZXhwIjoxNzY2Nzg3NDIyfQ.7vM6OVNIteT5Se_LesSjzEtWKeo2dPbPBnSAd0m96Fw	da6983fc09fe17c8528dca591da1be97d95ddf05bb16fd0fde33713456f27d011bdd3f0975fd01b61ea83a62969009b34c62a692044e7d2555f670dc35651cb6	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	2025-12-27 01:17:02.872	2025-12-26 01:17:02.873189	2025-12-26 01:17:02.873189	t
18	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjcwMTkxMiwiZXhwIjoxNzY2Nzg4MzEyfQ.aBMP8CKpoOY9b_Xwa9_2DeynQcILEn5OrTj-PofkRMo	b9f5dbcf892e0e92bff67a2983e850369a74f5afb8b7dd097c045732e6244994580d20a26f83acd3504f6734872dfeacce3a2e522b464b217139915eb6eb3637	::1	PostmanRuntime/7.51.0	2025-12-27 01:31:52.957	2025-12-26 01:31:52.957634	2025-12-26 01:31:52.957634	f
19	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjcwMjAzOSwiZXhwIjoxNzY2Nzg4NDM5fQ._ljZYCnbZ_I-0nirCbjQQs9hzfisjYPl0q4eG8HB1X0	7a5bbd2dd693828f095574a53db4dfb14151d0c77ff0141f090f0e9e0372e6443356f940c18c361c95082c24a18e934e75e676ac822b7ceb0ec30a9ba6ba1b73	::1	PostmanRuntime/7.51.0	2025-12-27 01:33:59.986	2025-12-26 01:33:59.988257	2025-12-26 01:33:59.988257	f
20	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjcwMjEwMywiZXhwIjoxNzY2Nzg4NTAzfQ.JlGwC7ZHUsyNaix4pjjPJ0e9QUwiJlle1JVY435ArLE	21ab65be33a122db9db2e68cf7cacdc8427965634336a66a324c29c9826cbea0727366cc217a2031dfba706d8c8682fe379f632e71ee3a752cc0d3a4d477d616	::1	PostmanRuntime/7.51.0	2025-12-27 01:35:03.109	2025-12-26 01:35:03.109853	2025-12-26 01:35:03.109853	t
21	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjcwMjE2NSwiZXhwIjoxNzY2Nzg4NTY1fQ.YKGpcDS970wtJRkKfQJHjVZGfMaC466gzO6Ql6CjYnY	8b7fab42a2aeb7df094846982e4cc7cf27839e0043a1475f01ec081a007b2cfa787bd8ca1051a9fcb2dc467b06fa35da9f513721b83ac06069420584b773f4f5	::1	PostmanRuntime/7.51.0	2025-12-27 01:36:05.311	2025-12-26 01:36:05.311583	2025-12-26 01:36:05.311583	f
22	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjcwMjE4OCwiZXhwIjoxNzY2Nzg4NTg4fQ.byLVMo5VzDowWblHFRNuDaYwqGSFTEJ0XuAHFTc5fwQ	efbff63d48d6f2f147d352e9662e170a38bfe61ffa01dd7a7a5c3ae9b42d88d0ce0be6444de6e64332abf29203c25d93553ebfca88fddf0fa92481f8c3ae457f	::1	PostmanRuntime/7.51.0	2025-12-27 01:36:28.472	2025-12-26 01:36:28.474644	2025-12-26 01:36:28.474644	f
23	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjczMzIyOSwiZXhwIjoxNzY2ODE5NjI5fQ.eg_SU-DPBaArm9mzJYBkJYsXUo4yMFhfOMTf5CU7rnM	1446c777de29decd9daa6421fa2c5949d2ebb0060dfeb139aaa75ff9f391aa49c9b945aab3a4cd18bc5645272706c91428c01b9acec6a574201a427d3a9e2b2d	::1	PostmanRuntime/7.51.0	2025-12-27 10:13:49.385	2025-12-26 10:13:49.386414	2025-12-26 10:13:49.386414	t
24	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjczNTk3NSwiZXhwIjoxNzY2ODIyMzc1fQ.AtYPe3YCe3e2ISe_WvzlPMsilTO2wm5cjoMVnYVUzDU	01710bfb2a385ab750b847e593793c9e77e5a29e698fd02772211ef545467d49443b133d89754d4be3c40f25001528dd913c3522c218772f8e7435d6912c4e7e	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	2025-12-27 10:59:35.886	2025-12-26 10:59:35.886398	2025-12-26 10:59:35.886398	t
25	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjczNzc1MywiZXhwIjoxNzY2ODI0MTUzfQ.Onz7V94aD5wtxy_GOiWNn0Q_VJLueGtoMHOr5yyOFyg	68f492a56c2c50591b28b084ec5e591c374c9bbb43728ed1775a303b62b2e920be8dbd910a5d164547d11df007a89c2b5daad6d730789092387bf53946ba9198	::1	PostmanRuntime/7.51.0	2025-12-27 11:29:13.348	2025-12-26 11:29:13.349264	2025-12-26 11:29:13.349264	f
26	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjczNzg2NCwiZXhwIjoxNzY2ODI0MjY0fQ.dbR1aeo_idi4Ws3TYYPZQlb8nkwlGW_C7KGUoQ4Tapk	1c2b04ea75ab05ca276f78f7adec25f9d55637ba74ae64880b27b3c90b2ec4dd89d8a8e0e72368c39df4de8649c68565070e94a0984ce4427395c601ef3aa50d	::1	PostmanRuntime/7.51.0	2025-12-27 11:31:04.187	2025-12-26 11:31:04.190214	2025-12-26 11:31:04.190214	f
27	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjczODExNiwiZXhwIjoxNzY2ODI0NTE2fQ.kRmP0a4mFyOgCOTDV6z7bn9Fw_MwYD_HgzgKOKLranA	f0ac1116acb7d70150608fda8e2a313f01925e20af8c3199d3038ed1750494e4787daa6f8273ceaf1d7179d0feacf62ba00207412c35d424543e8ca948631677	::1	PostmanRuntime/7.51.0	2025-12-27 11:35:16.615	2025-12-26 11:35:16.616093	2025-12-26 11:35:16.616093	f
29	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjczODE4MCwiZXhwIjoxNzY2ODI0NTgwfQ.4C7-4FS5g3oaBTch0HeKDKf6JRew6viy2LSxsgE-xV8	9aa4c32247ddc9c7ca723e691e57a53947a4e7286e042434c7f562c08de114088a0c4dbab2f1bc84059dd49e92aa7c6bd41bc3245bfb0dc8cfd98f2758aa9dd4	::1	PostmanRuntime/7.51.0	2025-12-27 11:36:20.379	2025-12-26 11:36:20.37971	2025-12-26 11:36:20.37971	f
31	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjczODIxNCwiZXhwIjoxNzY2ODI0NjE0fQ.7s_LXBWQwuYJaoRelDJ1uduYcu2bGg1rm508UO1kUBc	000efeab38e74c2150096965cfc52baf215e8a63755e539caf612d9e14b87da1b91e9101c64869410f0d20c9951434a7892595c7c699e0379ddaad2a4a99fd17	::1	PostmanRuntime/7.51.0	2025-12-27 11:36:54.49	2025-12-26 11:36:54.490889	2025-12-26 11:36:54.490889	t
32	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjczODM2MCwiZXhwIjoxNzY2ODI0NzYwfQ.PdfiX-04nSlRD8FCTkIq3y8-55HQaEGVAHWGzCvQjFU	1c570c966967a8f197dcb1ea8c5214d7369fb0abf6dca8502c00c3e6df51d9b78c1fcc41155072bce40b1f34e05b431eb4cc428894f6d3ecd24378b88f625834	::1	PostmanRuntime/7.51.0	2025-12-27 11:39:20.187	2025-12-26 11:39:20.187515	2025-12-26 11:39:20.187515	t
33	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjczODQyMCwiZXhwIjoxNzY2ODI0ODIwfQ.fK8moTh2cQubUhQk6GZTdDV3BBzWImWDtjvpIIaHDVk	43f39b0de49c95db643fe70a42412a5d982750979768027deefb336354ef5123734c219bc71bf9e824640fcb7d495807a3b9463860953b6472e46933a1ea502a	::1	PostmanRuntime/7.51.0	2025-12-27 11:40:20.857	2025-12-26 11:40:20.858162	2025-12-26 11:40:20.858162	t
34	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NjczOTA0OSwiZXhwIjoxNzY2ODI1NDQ5fQ.dlLOr953p4mjRiCd1gvWQQ_f7ZRQqWFbnd8D54e7Co8	432ffcc8f076fc98b3c0076ca520bb9db8cd12a9a8f41091ccf030b54557eae243031976139bb446c8b593de7266d23cc936eeceed11751378ff5940defc26ef	::1	PostmanRuntime/7.51.0	2025-12-27 11:50:49.659	2025-12-26 11:50:49.659466	2025-12-26 11:50:49.659466	t
36	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2Njc0MDc2MSwiZXhwIjoxNzY2ODI3MTYxfQ.RbIkOsQnx9AssHqi_HWnoFSOc6qBsZ3vW8Soy82jv_U	d060ec255b7713b55116f8126f2dcf7f86f4ca709db75365e98caf0f1e8f8b603a5adcd966ade18147058fc3c8db8fe330ea16b7e5144ea55c1ec0c066a331d2	::1	PostmanRuntime/7.51.0	2025-12-27 12:19:21.786	2025-12-26 12:19:21.787013	2025-12-26 12:19:21.787013	f
38	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2Njc0MjA0MywiZXhwIjoxNzY2ODI4NDQzfQ.cWMw7DBtgk9N65UtKA5EPiFN7Dz2qLdR11Wy7eNqqLs	5270e0fcbb38fadd584ad46e665a62f2e777848088f03ffb6be1703ebb1e531bd5bb6d03ffd1b13d6102ad967d0fdaf608a61350fae2d7698b3513ed31d5289e	::1	PostmanRuntime/7.51.0	2025-12-27 12:40:43.363	2025-12-26 12:40:43.36404	2025-12-26 12:40:43.36404	t
39	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2Njc0OTE2NSwiZXhwIjoxNzY2ODM1NTY1fQ.-eXKaGp4pUNuPe5k65H4YRL1Z09nW8euSdYysxJxbFw	13a7e456f57a137855beb3639b5d6949b74582a50e7c801b086337729625a456217016aa1261f6b9a1942e54b16bb4511bb4e7d49d3477af7dc3d45842db9a10	::1	PostmanRuntime/7.51.0	2025-12-27 14:39:25.346	2025-12-26 14:39:25.346765	2025-12-26 14:39:25.346765	t
40	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2Njc1NDcwMCwiZXhwIjoxNzY2ODQxMTAwfQ.6yC-1d9BKR1oWB0uwJ3p-JduPK2AngaeK57YJfkryGA	f41a897c17591ee044e43aa61821943b106859837774d426d4159d9aa018ad05ff9b46e8af3730f52d976623e9a44efe3b52106d098ede13e6f69ec160d0dafa	::1	PostmanRuntime/7.51.0	2025-12-27 16:11:40.27	2025-12-26 16:11:40.270955	2025-12-26 16:11:40.270955	t
41	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzAwMjgwNywiZXhwIjoxNzY3MDg5MjA3fQ.rIWKm8f-8cUohmO7p4mhINh3QE4jk3dWEceVXnZ0m0s	9a6d5b2a7ae93a773831c767358436d13f5dd8c44fb4c3578d036195ca26ca87943276bc00d8569979c7a0c4edf0f68c166dfd2dfa106e22f5a75c32df21f853	::1	PostmanRuntime/7.51.0	2025-12-30 13:06:47.294	2025-12-29 13:06:47.29494	2025-12-29 13:06:47.29494	t
42	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzEyNTI3NCwiZXhwIjoxNzY3MjExNjc0fQ.1sRCBMn5ay03Rjq6qlUeynfXMZECruQDPyyl9oUAkdw	bf1a16d1d38bb3baafbc760de66b17dcaeceb91bc2f6e907182ce3f50fd52497fc494befee0ea5d385cbaad2addc398484e2de0d395a5741fe14f56092a87313	::1	PostmanRuntime/7.51.0	2025-12-31 23:07:54.691	2025-12-30 23:07:54.692333	2025-12-30 23:07:54.692333	t
43	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzUzNjY4NywiZXhwIjoxNzY3NjIzMDg3fQ.LQDOCFBe17tr0YbXeIue4Kn371gZSnYXVaEEW-gpvoc	4e25f5a03020eb8688ee79d20e9f3a828880f3d5b53dcc9cc0dd14d2e0f7a0f4e2aae16a34cf90c6b1b691043b6f78bf3eae17cf62e62ca2e2da2223f2203a6a	::1	PostmanRuntime/7.51.0	2026-01-05 17:24:47.229	2026-01-04 17:24:47.230145	2026-01-04 17:24:47.230145	t
44	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzU0MTIzNSwiZXhwIjoxNzY3NjI3NjM1fQ.z6o2cK08B4cPbp63Ubhkci9Fgba4iKoPtKz4_5a6G9E	7892da1724dc39f5e4be52fb30b6a88f41297f6dab2c0c96c460c253a635edac6bdc740d0e9f871f0e3fb293ba768749a346db00689343f212547a5da9ed8538	::1	PostmanRuntime/7.51.0	2026-01-05 18:40:35.158	2026-01-04 18:40:35.158592	2026-01-04 18:40:35.158592	t
45	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzU0NDMyMiwiZXhwIjoxNzY3NjMwNzIyfQ.VyfEPCxlCONvJt8CKEhYFqOvw2mVH4ViAQwh-uuXasM	6e143a6e708ce4ff0d093ef5c97f66e1a9b2da6a99f6aea6cb0eb323fe96e7a77ba24e4c1b16d56ebd6233ef346532856b2add2efe0d1fc6440e23c85895d003	::1	PostmanRuntime/7.51.0	2026-01-05 19:32:02.488	2026-01-04 19:32:02.488375	2026-01-04 19:32:02.488375	t
46	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzU0NjgyNywiZXhwIjoxNzY3NjMzMjI3fQ.LMK_4eKXlBvO98iuFH7EYlaF3dAs8SQ8SdfiSa4YMK0	99f519e574e37e861e2113239fb8b4f4c7537ac00358357f0394667b774f092ebf842331c1be48c6d408a688476bba104ae891708cb1eb415bcb58f19838187e	::1	PostmanRuntime/7.51.0	2026-01-05 20:13:47.298	2026-01-04 20:13:47.298625	2026-01-04 20:13:47.298625	t
47	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzU0ODU1OSwiZXhwIjoxNzY3NjM0OTU5fQ.KtvoeoEul9N_IhIXgajQHa5XAW5LH5DWYHsofcJ2UJ0	604a002ef3bc5b1ba46e10d3f4c60fc3dc422adb29f7db402d3617b383b5d52de7536778bc892d78d0a9be7421ca6d7990affc025f7e3ead7d665985e7925c73	::1	PostmanRuntime/7.51.0	2026-01-05 20:42:39.517	2026-01-04 20:42:39.517575	2026-01-04 20:42:39.517575	t
48	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzU1NDQ0MSwiZXhwIjoxNzY3NjQwODQxfQ.kFv9aQtV_NsGqG2X6jpR89tdlXXvLAsqoyjx0E5bDQM	e30f70a26c3857e31fa4ac1d279466871eb2e52101ff62b5d6c5eef0222974a8923754f625b2e4ded5b432632a9bcbcf674f8969616dbd1125930ce8680a425e	::1	PostmanRuntime/7.51.0	2026-01-05 22:20:41.693	2026-01-04 22:20:41.693603	2026-01-04 22:20:41.693603	t
49	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzU1NTM0NSwiZXhwIjoxNzY3NjQxNzQ1fQ.TDfIsqOXXZlhtC9A6sSHJEmxerix_IIeg13Xp-VvgJ8	76642b0acf6507f6095c17aea545d3b34709ae638417140898a54dec7a59356bb173c0c219850b4d8fad7a8e9c5ab16c14b0fd044bb5db059111ce3cdcd2c444	::1	PostmanRuntime/7.51.0	2026-01-05 22:35:45.341	2026-01-04 22:35:45.341919	2026-01-04 22:35:45.341919	t
50	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYwMzQ2NCwiZXhwIjoxNzY3Njg5ODY0fQ.ADbR_nyFr-8G5CyjpaLYPsOyy76QLAYie4M1w55kJ8w	f270983eee42f9517c68202159aa6aae06b4650e7b8b337a77fa36d5edecda8b230055dafcd82d0eece8c93e2611504ca752c4fad00b94398d62bd147f8d771e	::1	PostmanRuntime/7.51.0	2026-01-06 11:57:44.04	2026-01-05 11:57:44.040942	2026-01-05 11:57:44.040942	t
51	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYwNTA0NiwiZXhwIjoxNzY3NjkxNDQ2fQ.e88eEzTqdpYy34dDKzEoIDR_-sURbzOxw3lo_zmK-rc	136e3232b2e410f494c8ade80e892f00277d12be72c3f500c67ea20d9d31efacbbc5c589424a307755601beb5ed220931d7230865bb7a957cc6cdf2757ace327	::1	PostmanRuntime/7.51.0	2026-01-06 12:24:06.072	2026-01-05 12:24:06.073085	2026-01-05 12:24:06.073085	t
52	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYwNjM3MCwiZXhwIjoxNzY3NjkyNzcwfQ.tCBak737n1QDP9DmRwaKFUbw9OWln-RVmSgga0tt0k0	b18304c9b399e606a1c472df700d6738fa91747ff447b526899db60f1660b0d4f1db8f8be44320f3ce91be0f5d08cca21d092db86604e9ba17afa5a3c5ca3008	::1	PostmanRuntime/7.51.0	2026-01-06 12:46:10.903	2026-01-05 12:46:10.904256	2026-01-05 12:46:10.904256	t
53	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYwNzM1OCwiZXhwIjoxNzY3NjkzNzU4fQ.m7CmVYbEYIVnnOm1tK2_mLRAdGWtIZMfVNMVI2QhsZU	d1ab35ea0c1211825f61c292cfc8487722ba9f6c3f1a0c65c1e5e84fd8767e1be4e0c5075fc30f6f43ff9bcdcdc1b6f512efc1128e0180c5f2f148334c8a23a0	::1	PostmanRuntime/7.51.0	2026-01-06 13:02:38.241	2026-01-05 13:02:38.242174	2026-01-05 13:02:38.242174	t
54	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYwODQ4MCwiZXhwIjoxNzY3Njk0ODgwfQ.roYQgw0-aILo3oEpDt_6JpwN4WDrZCsGehlPbIaHle0	e95a3a68f5eff0872c8a61f14de9a9bbf5050ca5882fdba9fd35079d4648cc252f4de8640cdae6531a7b13164852956cb5fd75468fd0a2ae7a01278174ce8731	::1	PostmanRuntime/7.51.0	2026-01-06 13:21:20.619	2026-01-05 13:21:20.619468	2026-01-05 13:21:20.619468	t
55	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYwOTI0MywiZXhwIjoxNzY3Njk1NjQzfQ.LsWFqQ48v7opnTMy_XOslt4iHZCnfhdusLT83eKNH0E	8dae211828d9dcd07bb3b1fd5adf6e9b4387149f4449584f310d30fa57a5cbe827a2ece1b23d96dfbd5e21c74f83eba334b5ef3ab7fcc7f5e72489d1f062e6ff	::1	PostmanRuntime/7.51.0	2026-01-06 13:34:04.003	2026-01-05 13:34:04.00408	2026-01-05 13:34:04.00408	t
56	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYxMjE1NiwiZXhwIjoxNzY3Njk4NTU2fQ.mk5OKrwrStrnJd_gbcODa_28wz3oVhU6TLUZFJOwnOU	d8e21a0a649a2c05e2e544e3aab24e1ab21b34485a00d98ed1ecd18850f081b8fd04a24169029fd03753e15a506a375a57ab7ecfe34ee67e0c0d89958632ece0	::1	PostmanRuntime/7.51.0	2026-01-06 14:22:36.616	2026-01-05 14:22:36.616617	2026-01-05 14:22:36.616617	t
57	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYxMjcxNywiZXhwIjoxNzY3Njk5MTE3fQ.waEDRgVn5JCUJtp9utm-1cSTV6KaXKz7eCS44J6LF5I	d5117d42fd69bf5accd374d9c3ed27ab8612acbe1c770c38f5107bc7c4a32850057b2cc0fcc9616cc230a32b65ab59c33fdb4c8a3a49d5c259fc0110e9b5b187	::1	PostmanRuntime/7.51.0	2026-01-06 14:31:57.519	2026-01-05 14:31:57.51972	2026-01-05 14:31:57.51972	t
58	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYxMjk4OCwiZXhwIjoxNzY3Njk5Mzg4fQ.-CPdzWgL3v07JvqLUWHP6e9X3lzagtwYtLmjkF5lAOg	dd1d0adda17b380b9f3c094aa2aedefe3cef896c5df37ad6086610eb6586e63bfe690ca95df2b6e72d1c3c18659ade0d5693076983a6e33ee724b6dbef07c754	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	2026-01-06 14:36:28.438	2026-01-05 14:36:28.439255	2026-01-05 14:36:28.439255	t
59	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYxMzg3OCwiZXhwIjoxNzY3NzAwMjc4fQ.3gXyWYTK0fwxD_93XwGpy9UhnxIIPeRUxRQMl25-yMU	312eb2a2ee6935de3a1cb8d64a2fcdaaa1fddae65b7e4bc7163b1de8bf9b35f7c02645c1db9b3ffd1a196645670d62f6a32a8c438182eedac28e3022c621fe1a	::1	PostmanRuntime/7.51.0	2026-01-06 14:51:18.234	2026-01-05 14:51:18.234634	2026-01-05 14:51:18.234634	t
60	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYxNjQxMCwiZXhwIjoxNzY3NzAyODEwfQ.oQujvHcKLCTHDc8wdLV4XH63UP5kliqbplK8RUHr-e4	6314567ff070aa9a96fbd06e88ac082132475ed71b7df53b7425826c9ae6a75e790ec36014b509e0d9cedad1aff0c13f17b2c69aa5863a412343140b674fcc7c	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	2026-01-06 15:33:30.916	2026-01-05 15:33:30.91672	2026-01-05 15:33:30.91672	t
61	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYxNjQ3NywiZXhwIjoxNzY3NzAyODc3fQ.vZy1XxEmjlD8ylqMV70CpNhv78loruMcA_Ctei0ze4c	2d72dc9f596a85a5d6d31699a895432c98cbd42f14d35563ba142c3617c14e2628fc3dce8a680518bd07c69f0acaa0d01c3e7d26bc291c1a06f48ddba675318d	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1	2026-01-06 15:34:37.516	2026-01-05 15:34:37.517326	2026-01-05 15:34:37.517326	t
62	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYxNjU2MSwiZXhwIjoxNzY3NzAyOTYxfQ.mJQ_f_IYjjid6qXvU5tIRsxZBvuocPYz5vwZ28tHLRo	e8659b2d501783d242ee9f14606e45e36ad8a09cd038515394e9493b75f85b9f1a21e46b921cd0bfc1552bf21ab98c07fdb9ea29b154726cb8c157b68d398f0e	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 15:36:01.914	2026-01-05 15:36:01.914544	2026-01-05 15:36:01.914544	t
63	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYxNzY3NSwiZXhwIjoxNzY3NzA0MDc1fQ.OypX9KQkiC9w48MGzEXyc0O8COeVNS1UJfNjvTp5EoY	70be5a8d8c51d08083549a9c789cbef36d261f91836677f9821b8188914dac3c6669b518bbd52df2ffb4a127336f8a939ef0a2df6451107617b576c3468cda74	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 15:54:35.16	2026-01-05 15:54:35.160932	2026-01-05 15:54:35.160932	t
64	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYxODA1NCwiZXhwIjoxNzY3NzA0NDU0fQ.BKWBDA8nuhNtoMSqLztAkw0__LIormuO7Kly3UJz8NU	fa77d92460e25ad92e2518468787e714dfee7bd5ac0cff069cb6de883556eece31055683bc771f62b02ed33af652272dd668eca51a5ad36076494f4cd83c7519	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 16:00:54.83	2026-01-05 16:00:54.831345	2026-01-05 16:00:54.831345	t
65	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYxODE0NiwiZXhwIjoxNzY3NzA0NTQ2fQ.nsogGtUSXV2HJBs3UnC7XuZl7BkcQkMNsZEqiW1iQp0	5d8d3d23b092cc0150b8ddf335af85a34a201c589e0310a583f65872f595759f60bb45d2ed83b492e06785861301002274ed1c1b835465cab3a1786c1394aa29	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 16:02:26.655	2026-01-05 16:02:26.657975	2026-01-05 16:02:26.657975	t
66	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyMzIzMCwiZXhwIjoxNzY3NzA5NjMwfQ.lRddXAfoEQ_nIPkzZx7L5by45VYNNynwWqX0WF17_FA	ba7ff5baa16a8f0cc9b0378279a08cdf2c4385f258e2e268ecd7e5ef5986713a62016b39fa37e3dfe770ced234caefdab2d2e39fdbc63312f349ef3613878d34	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 17:27:10.301	2026-01-05 17:27:10.302508	2026-01-05 17:27:10.302508	t
67	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyMzMxMCwiZXhwIjoxNzY3NzA5NzEwfQ.z7Gq1alURVXICVzrJkY78z46LuowqKW5FoTArRhj2_4	73d68d2a8bf69a5302e2ae17bab53b4b13901c7ff8bdf9cd2b0f7438faf5f829429942adb2f8d2bc027b971b5d926850fbb63703e2cca4dc08fd300fe865cbf0	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 17:28:30.661	2026-01-05 17:28:30.661903	2026-01-05 17:28:30.661903	t
68	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyNDM2NSwiZXhwIjoxNzY3NzEwNzY1fQ.nt4ZvEE1_4d8FFU0h03h26WYABDDPTnbRr0s0_VRyVw	be23bf007473857563846d15271bdf9dd6b9ff296cde14a4e0576ae3fb06e15c42c8f069eec733969b0682c188328f3f9b824cc0d074d6edfd1f8bb51c51216f	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 17:46:05.125	2026-01-05 17:46:05.125891	2026-01-05 17:46:05.125891	t
69	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyNTI5MSwiZXhwIjoxNzY3NzExNjkxfQ.OsSsYlHRLCtm7EaX98Q3zzx6E1Br8hbaqNi0hF-YEqQ	7af3091fd551f34208ee56683c40e94214bf8c31b9768eebfb146e93c0b858d492998aea2ee6a9b90f759b62f3626b25c3284f8c777ca534c7ac5fc0d6d752dd	::1	PostmanRuntime/7.51.0	2026-01-06 18:01:31.386	2026-01-05 18:01:31.386831	2026-01-05 18:01:31.386831	t
70	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyNTY1NSwiZXhwIjoxNzY3NzEyMDU1fQ.NReZClMACsLUoJh3ogeuJFZCVRCdp4Tlhq02FW3HfAQ	0468df8221388de3bb2e0d3ca80e9a236e026718989ff2a44d615ca9cb8cd1f9c6c2f3f47b8739b1122cf5ec906ee08f7201496bdff7856ecb4c6b8d4d3b4724	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 18:07:35.129	2026-01-05 18:07:35.130304	2026-01-05 18:07:35.130304	t
71	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyNTkyOSwiZXhwIjoxNzY3NzEyMzI5fQ.peiNCywydTkrrrG65hFZ1I7rvn5aD6PaTkv5ws9RqIQ	0c8980966bb0936b4fd316b91c43889317adcf028208e4dac8467fda42ba4fab08b2c129a332a999f7d5e978c0dca3609a0856eaa8d8348ffffc7adf27fbacad	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 18:12:09.197	2026-01-05 18:12:09.197606	2026-01-05 18:12:09.197606	t
72	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyNjAzMCwiZXhwIjoxNzY3NzEyNDMwfQ.ERoGULbwyM64LIVaOFFW8VIhm1Yimuu8HckmhrdC6Jo	c4e2842f4a310b81b03b02eabd85938c902c9d53ae39fc074e4802554998689e2ff607fd6f6acdf263e4f7153eded73f6e5f59c5b5822ede1e7f26ed05aea08e	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-06 18:13:50.74	2026-01-05 18:13:50.740963	2026-01-05 18:13:50.740963	t
73	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyNjE2MSwiZXhwIjoxNzY3NzEyNTYxfQ.u-7RFL1DTHquDCuF12T9dHMBygwskL8ubXkZfeyCagk	db987452ebfbf70937f3d49ef06f163aaa78550dd51b278b28c6c329e417e9939636689cabe483cd5a47bc48e326c818a2fe37d680bfce2a4ac913a08a12dd5f	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 18:16:01.56	2026-01-05 18:16:01.560799	2026-01-05 18:16:01.560799	t
74	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyNjc0NCwiZXhwIjoxNzY3NzEzMTQ0fQ.oA0jGbi2HgPSaZUltn1DiT0VVYCdO-5UD2W2WVWccCE	3ee67d34770091252d8e722430fa1c52f7a289ae4bc6d9c5ce6036086a543e8a983db9f0ef7a7e664237ad9575ca45658ce8ace560c7735e9e822fb869217b43	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-06 18:25:44.296	2026-01-05 18:25:44.296609	2026-01-05 18:25:44.296609	t
75	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyNjc2OCwiZXhwIjoxNzY3NzEzMTY4fQ.54AlR6Khiss-gXrZVy_ejTKEuuLBWGJ0DiYyQYHekwI	d57b06fd66449bee62dfe04cc31c774c8d2b9bccddb213eea63d120093ea2426ad2ff718161b231eecaa9ce9443be611bb06051842150fccaab89b1bf537fd36	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-06 18:26:08.639	2026-01-05 18:26:08.639266	2026-01-05 18:26:08.639266	t
76	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyNjg0MywiZXhwIjoxNzY3NzEzMjQzfQ.3vHyUjI9wAejRf6mGD1iygdfOczXFNitcGJpBIv5bCA	79e8e98957256114ebd9c9e721b88beea0343649a18784fab45b26ff2ad14c7b112ea0666a103881fdeea9202ceb94b4f5f7c57bb71072b2b72fdf41158c963a	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-06 18:27:23.715	2026-01-05 18:27:23.715949	2026-01-05 18:27:23.715949	t
77	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyNjg4NSwiZXhwIjoxNzY3NzEzMjg1fQ.RHbqB7qcB3EVDh4La2f9TORMWqG9tBSXYu88MfcouLo	f22dd4144416cc4d6bae56825b683ae9c46423c787ab5cf3147319b04deeafec7d750c63970d9ee4a1384160c3c766f291b7081707203c45a80acade3e45a0c6	::1	PostmanRuntime/7.51.0	2026-01-06 18:28:05.977	2026-01-05 18:28:05.978719	2026-01-05 18:28:05.978719	t
78	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyNjkwMiwiZXhwIjoxNzY3NzEzMzAyfQ._LhPYaZCPUWWKiP6EXVY5EV7zWeTuXM4fYnUrbs1AHI	214af4b5b88ff28de558c2c21133b741b369e29a24dce2ef434c91e86409bf43ef239ceab2944c28283b5844c1d854fee8a10ab8916062e07a6b8bd6dca100be	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-06 18:28:22.583	2026-01-05 18:28:22.583643	2026-01-05 18:28:22.583643	t
79	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyNzAxNCwiZXhwIjoxNzY3NzEzNDE0fQ.U7p2lVma-4f_Nk8WcAzyroXgFHRmyP-1AYqiLfdHV3M	80bf6d0fef87d9f833597c24adfc89242bbaafd6f3f6d5832001f0a5f578df1c3815ce3a9e7e32e373293bd123b8ae5d7817712f6b7bda69a94de60cc767db66	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-06 18:30:14.975	2026-01-05 18:30:14.975844	2026-01-05 18:30:14.975844	t
80	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyNzEyOCwiZXhwIjoxNzY3NzEzNTI4fQ.mWylYVIj80tZg8hpSpQkrZAACiAwoxKUIaS3WGLJ4lk	b7c4a280de2e960e678a46d7f964e5db9dd7fbc95f28d2867028b65f3b61f21b7d3effaeb910bdc3b2984b8701ac65ac5e9e7ebd0b8678121dda99a7e24f1f2d	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-06 18:32:08.848	2026-01-05 18:32:08.84912	2026-01-05 18:32:08.84912	t
81	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyODA4NiwiZXhwIjoxNzY3NzE0NDg2fQ.JFem5fOB3qAjmf2fOXYXA7Rto3MC-ErsA_JKWeOmg3E	229f56977cf908a2aa5ab0ba5fbec0f55844b5f2dc706fc99332b24e5eaf10582e05484919df746629607867d0eab20144ae6fa30acf65956a19c71de2139561	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 18:48:06.054	2026-01-05 18:48:06.054939	2026-01-05 18:48:06.054939	t
82	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyODExNywiZXhwIjoxNzY3NzE0NTE3fQ.sj4c7Vj_FiHx0QgA5X59o1A-PzCtkfWNFyHOb8PyGSU	862ad9dea5630b7ed187e4cc6f4d23adfebb0aca1f59922fb87475ab29c079ccb1bab33c40867838a7e6756ae9d03ac52ccd49a96396acf05da8a4e4c39f3ff5	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 18:48:37.413	2026-01-05 18:48:37.413818	2026-01-05 18:48:37.413818	t
83	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyODIwNSwiZXhwIjoxNzY3NzE0NjA1fQ.IkoweGGs5aW6Pe4PWH5_4-mCiBq55VCFjuo9UhNrxMw	1ee1ac1c6e9b014af2553c6b7a9e4ad8248767cf6460e4bf44329e3fba947ec743581b5ea48ff5053f93bc4e42c351b47fdb415cd8929bb78e4b35eb3f8f7ef6	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 18:50:05.575	2026-01-05 18:50:05.575357	2026-01-05 18:50:05.575357	t
84	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyODI3NCwiZXhwIjoxNzY3NzE0Njc0fQ.VYenjOemol8UjjNVeU-i36lpREhNKEbr01eYlxOOB_4	74ae80258962ecf2ae670815ba09968d2f657fdb8f2105723805761beccede148739546a26878152018809a765ca044456f2d4fd20db6e9da032aa1406f85ebf	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-06 18:51:14.173	2026-01-05 18:51:14.174497	2026-01-05 18:51:14.174497	t
85	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyODI4NSwiZXhwIjoxNzY3NzE0Njg1fQ.exzqsbeYAmPhtbUnYV3ttFuLzaEo3yZyidUYXhVyfZo	4cb727f780f0ab8264afeb9f3b72436176f85d2ae1d1fef7a3e93cc0230af05cae9ab0a1f4bf9fffa3c8cd64b359c8d7b50fdf02381f3ba6d92d5ca4c6bea851	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-06 18:51:25.906	2026-01-05 18:51:25.907246	2026-01-05 18:51:25.907246	t
86	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyODM5MSwiZXhwIjoxNzY3NzE0NzkxfQ.7aRNo7tvCOemc3Pr3rOloRF5LtdG4emzCkXwjueE-5M	1d9569fe01beb9d3934d941dc772bd65e306375e7d6fc38faed4f6cb47f79efc6d6ee1bdc0997217f3b3b17c3c4a5a6b2d0894e7689a32a4d3d2e62ca877a344	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-06 18:53:11.143	2026-01-05 18:53:11.143673	2026-01-05 18:53:11.143673	t
88	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYyOTIxNywiZXhwIjoxNzY3NzE1NjE3fQ.W8ajh4zNd2prI2gF6F1rHBt9Uit2zftq2Pfs8Cdt8Bw	8bf00be6d57c11dc86db016c91569ff952aa33ad0aad88a4a4940b339522ac1e2739bb422ec406034a1ba671c440efd0e4f8fcf18bd97009b220d141fe3bf8ae	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 19:06:57.511	2026-01-05 19:06:57.511661	2026-01-05 19:06:57.511661	t
89	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYzMDc4OCwiZXhwIjoxNzY3NzE3MTg4fQ.j1QNK5IuPmZZBUun14GWZKec1wyNQ6xnk7dnIb50Z5Q	005c67e906bbae7a8878d582679e602417df608a1d9a8ca84df585d44b9b18bb0d4d40ab664ea9b34ebdb5588463974639d364962300c364e0d9737d4d28b54e	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 19:33:08.96	2026-01-05 19:33:08.962305	2026-01-05 19:33:08.962305	t
91	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2Nzk4MjIyOSwiZXhwIjoxNzY4MDY4NjI5fQ.6yIMjTBocL_H--Y7d4RRqH7fGlBdYvHdWkyMQypUkFA	bdf98da80453a0e0c60268cb33593c0049de70f3c5ce002afa7e4573130d7450ed1269cbc37dcd799d2695fe1fa63c1f12dbc54bc805664af212f70d5c57f4c2	::1	PostmanRuntime/7.51.0	2026-01-10 21:10:29.441	2026-01-09 21:10:29.442306	2026-01-09 21:10:29.442306	t
92	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2Nzk4MjkyNiwiZXhwIjoxNzY4MDY5MzI2fQ.d0oskOmLERrVXfGLPDYRA7cS8HbzpI9ZTbwQ8aLJTqw	199b75573f5b7fbee7d2528e8a3273af6a62994259354cecabbbe6eb78c0c575d685fd88ff9cf505d3621539146c8fa6b07918a49fd0f1a4cea9a668752d98b6	::1	PostmanRuntime/7.51.0	2026-01-10 21:22:06.28	2026-01-09 21:22:06.281813	2026-01-09 21:22:06.281813	t
90	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2NzYzMjM5OCwiZXhwIjoxNzY3NzE4Nzk4fQ.padJ5x8KuKv1CZzWV90wp1gKdlRh1O9aH-oVZULmfNw	f555fe6cd3ed53055d386befe4747394485523918ea976826a7f32e05a0590d8f36be1d318dc676faea99fd82f3378af4ba95a937d50654c1a600ce9c0b5aabc	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 19:59:58.834	2026-01-05 19:59:58.834992	2026-01-05 19:59:58.834992	f
93	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2Nzk4MzY2NCwiZXhwIjoxNzY4MDcwMDY0fQ.gM5S9pqtHN2UD5SXIiPXiPVOojAQ9wNUgRizs8TUy54	6f4204adcc8fe16ac3eeb509692f9009255e57bab6b3a2e35b1ca9e0339e7a9b77583f9b8a24ec00e85c72b4c1f570a03c6b01712f5d57f5e95dc8e989cb478c	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-10 21:34:24.5	2026-01-09 21:34:24.505461	2026-01-09 21:34:24.505461	t
94	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2Nzk4Mzg4NywiZXhwIjoxNzY4MDcwMjg3fQ.ihiky80xZc5lKB2n4Xb9wXBv5yjbvRj6TDMvD164VfY	9143b23a521560902e8e50cee6d7d6311f84065138faa1847948237c5f823d5224b92519bdef30fc3314668e5d5c9ebcc266025aaf0d8002760943c2d961202c	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-10 21:38:07.733	2026-01-09 21:38:07.733241	2026-01-09 21:38:07.733241	t
95	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODA0NDIzMywiZXhwIjoxNzY4MTMwNjMzfQ.Kzwta_DTeQrHsXkn5e2l2oZ8y7T8SWPdPqhoGr6DMEk	5e38a4a833d6eb69c9b67daf7c4df35254c519bfac38dc4523f003ed7d7249e567b279950b681f086dc215f940654109fb79e21bfa376e22f19e468ffe0de43c	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	2026-01-11 14:23:53.68	2026-01-10 14:23:53.680459	2026-01-10 14:23:53.680459	t
96	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODA2OTMzNCwiZXhwIjoxNzY4MTU1NzM0fQ.q9dCAVTsYQfO0Dg02wmrEUajOQvtePz0QYajXpYlGVw	72a897b66354c8187ca8109fde2a9882dfc0e9266d72e12e7d08a24cfc2f24815cfe1f1db4f8a6e2438fda3f6f25ba061cb3f826d565daf1b9a6d5cd005209ac	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15	2026-01-11 21:22:14.926	2026-01-10 21:22:14.927067	2026-01-10 21:22:14.927067	f
97	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODA3MDQ2OCwiZXhwIjoxNzY4MTU2ODY4fQ.ZFl24Qglr0Yx9_4rGuATxDDCkbVFyOVpZVRn0jVtSqE	b24eec4b59496fab1d1d72f995b97b787c947fc8ff1bfd71a6eb5e3052de7def76d3892ba44bbfb85bdc153a841a1f5e11b230f5f0e8cbcac1f1ae75b8188f4c	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15	2026-01-11 21:41:08.955	2026-01-10 21:41:08.955847	2026-01-10 21:41:08.955847	f
98	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODA3MTc5MiwiZXhwIjoxNzY4MTU4MTkyfQ.eXVDeyg1q-0YydPqDroTNp_97WyK-oL8u3IfvbvjqOY	00c4bbb977514d200c8ddb06a313d730fed36199d9ff29cf912d769b181d8a1b83150f039e8b43cbac6d9434584723dc995dd60b2c03e6d2518eb68cfce14fa7	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15	2026-01-11 22:03:12.915	2026-01-10 22:03:12.915417	2026-01-10 22:03:12.915417	t
99	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODI4NjkyMiwiZXhwIjoxNzY4MzczMzIyfQ.pBQ4dZkcK0t_6GSekwNczR7_QB4FoVBnieHiaL1HiS0	c9f8e6217f2dea558eebf85864e03375a65ee9565772a86cf91b8ab03d76d919f6e18eb124f403e51ab4eaaef3a0895e757b2d80a707cbb691620ab0cc63f594	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15	2026-01-14 09:48:42.392	2026-01-13 09:48:42.392979	2026-01-13 09:48:42.392979	t
100	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODI4NjkzMSwiZXhwIjoxNzY4MzczMzMxfQ.2Pvq0yW-xhZWSlgNZPziWo15TBjGVdJuv9LdKKLExtg	c7bd99ea47cc7be9708017fe3f84b3ab31d5ea0ac8afbd04d664f96e7cd137fbf0c4bbcfd8a040e0a9b7e54b7238b0b0cd56bd1fe116327b4330762033161cec	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15	2026-01-14 09:48:51.827	2026-01-13 09:48:51.827569	2026-01-13 09:48:51.827569	t
101	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODMyNDQ0MywiZXhwIjoxNzY4NDEwODQzfQ.AFSiQncu3uN_0vLNUWWF-Hv1TK5ZHy5UHwVUMmy1j8M	40f947a7702c26b94208db2ef66a1023e95d97e8ef75aedb17dcd1e37eab74e23533bcff8e50fff5e781faa029c3fe573b94db3b6bc70685312e5b0ab2c0ec58	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15	2026-01-14 20:14:03.674	2026-01-13 20:14:03.675427	2026-01-13 20:14:03.675427	t
102	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODMyNDU4MywiZXhwIjoxNzY4NDEwOTgzfQ.H6Rn981Q2Q-PEcjQbm1fmUt8CpS4lpikYxUYfowDvWM	537fe7389f476aa640c3f5dc284de96018246244964a4bf656a2ce855dab124ae688c159c23a5f1f2ef66a407051be9464e92526dce8fd9dff2a28caca0885f5	::1	PostmanRuntime/7.51.0	2026-01-14 20:16:23.266	2026-01-13 20:16:23.266581	2026-01-13 20:16:23.266581	t
103	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODMyNTU5OSwiZXhwIjoxNzY4NDExOTk5fQ.LI9ay5_9uja3mPOzFWVmZ6xb7tx0Lkg9pQIU5MboLx8	b2e294c19b05338ca7b230b79e0e5cf8c58986fb0bc275ded244eecd694d5c24d1bb90c631e7424734baca82e6ce02a966b6fe76d785f21568c383d346d00960	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15	2026-01-14 20:33:19.018	2026-01-13 20:33:19.019127	2026-01-13 20:33:19.019127	t
104	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODMyNzA3MCwiZXhwIjoxNzY4NDEzNDcwfQ.Aqw3R3SgPp7CvLDl66r1ziVEBIAcfkK2giea4X2torA	8d0fcb57b842ffe7be23ff173570baa35b0bca97f50ee892f7a4e55ba3858d4f906a0d37dbc55100f25972d42a51975187a60eb203aaa8e9a50ecde6d225faca	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15	2026-01-14 20:57:50.19	2026-01-13 20:57:50.191349	2026-01-13 20:57:50.191349	t
105	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODM3MDY1OCwiZXhwIjoxNzY4NDU3MDU4fQ.cIP97gh2kxrGJ_xVYpZq1UASxo_u81glsZWwjZCVyaU	3435bd26b4c977e4f71796e67756233bf2468b4084b2986939c206294e2cafd8382a36fb90422280ebb9a0b128b7ea0b8cfc2d27318f5508b26d62c8c9946d1a	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-15 09:04:18.77	2026-01-14 09:04:18.771284	2026-01-14 09:04:18.771284	t
106	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODM3NDI4MSwiZXhwIjoxNzY4NDYwNjgxfQ.xG1I4HpTR872huYIs1WjMFQ3OjdLolnhKZKV1n2NsP0	bd6ec9623b7d5e9a4d31fa9bbc5650fbab0402c4f0fc9bfd137d895dc0958f5fa06a1b78b71c3dd67c4c697942259feba1bb06b8032109ce3b6dd98cb16eb161	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-15 10:04:41.485	2026-01-14 10:04:41.486399	2026-01-14 10:04:41.486399	t
107	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODU1MDk5NSwiZXhwIjoxNzY4NjM3Mzk1fQ.u7BdLlF8Ww_0oJqA4Myfx_JLNZnIpweVx0Wre7t1hC8	52eb3f7071edb1afc2027435c09fbd7f1de556a8a8f0a798433b85fac1c95b9078abb91d9201801fd4ef9d34c4620148f80fe874c54f1ccfca478251cc4d6058	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-17 11:09:55.53	2026-01-16 11:09:55.530662	2026-01-16 11:09:55.530662	t
108	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODU1MjU3MCwiZXhwIjoxNzY4NjM4OTcwfQ.bCSbQh8o4SZvw7d_dn_HgTJy7qfQfLJvy0EywLvuh9U	069066d0d6c033f6a0cc244fd2ee49c6ace4274e838af5b00424896ca29dea98937f6c4d3e3c3f0f7385054ff87842c05cffb960ba3789653aabc6c7e2733cde	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-17 11:36:10.986	2026-01-16 11:36:10.986863	2026-01-16 11:36:10.986863	t
109	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODU1Njc1NSwiZXhwIjoxNzY4NjQzMTU1fQ.J3zdpO1ZFMoRkVqSXwCU_0LIlQUbX18HLS_j3jsdDeQ	54cb874903214ac4078aa1d0fce606119406f0a9715f569f1b6a2a51512e5120918bbd086160097b7e2611a4bd259dce6d6902b5e32cddccf6b4f3d10f5df458	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-17 12:45:55.075	2026-01-16 12:45:55.075705	2026-01-16 12:45:55.075705	t
110	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODYzODk2NSwiZXhwIjoxNzY4NzI1MzY1fQ.cYvtzEcomPO06_7Sg8tMoySKDCECFLeMtN-FqYyhiqs	17ccd58ee1ec83356683f81a2a422c4a59e1924414efcc8b16aa91101dff1bfbb229bc5805fe46ac7a411ee18b2352adde839ec1116b9bff80bd4e71bdb03cb3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-18 11:36:05.314	2026-01-17 11:36:05.314771	2026-01-17 11:36:05.314771	t
111	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODY0NDA2MywiZXhwIjoxNzY4NzMwNDYzfQ.aCfds0S3opPSz3PbVQUthjHI83h3SmfTD7UdcYQDYz8	d3daf08f2aecca95d43989367dad0188fd92f241b9712e252a0ec498c68bac90006d532f5836ac09b8d781976ca14488abcf5a976cb57c0fedd86f86cd7f6642	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-18 13:01:03.225	2026-01-17 13:01:03.225339	2026-01-17 13:01:03.225339	t
112	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODY0NjY0NywiZXhwIjoxNzY4NzMzMDQ3fQ.iENLdnR5Oz8C12gYaaFIfWkTmP-vMaIJmTriDY-Lvno	775c8f0b3a99426233d4b0f1ca0c22365e30abc5e5657fe30ab936b4700bd7f2608afa88bfbdcf0638ef2b398c0d38d489553f068002c9d51b4b74e6090497c8	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-18 13:44:07.176	2026-01-17 13:44:07.177052	2026-01-17 13:44:07.177052	t
113	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODY0NzQ2OSwiZXhwIjoxNzY4NzMzODY5fQ.TNipLed7xV_K1bgBq9XTZWeZ6pRzDpQI-TQdn6UQVrc	3bd68bfc30432d50d6afb7ea6a60c15a66541cb54817528ab58097ce5e031187d1cb684a183ffdfdee6d2c1b21ebfd0ff88fc8f6abdf09dca99d6d3bce3fb9e9	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-18 13:57:49.22	2026-01-17 13:57:49.220326	2026-01-17 13:57:49.220326	t
114	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODY0NzcwMSwiZXhwIjoxNzY4Njc2NTAxfQ.faZ_5Uk-04fK6dPWG0Ao30ZVE2tUAtLcVpZPAk2dt5I	2e891f1cc36e211fdbdb1a8c4c86cd8d1239a010040d153036cc2d389efd8f164d0622a2a1a4aab8198073fefe748c8bc91af66a50b367843d2cc1c41a5f416c	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-17 22:01:41.749	2026-01-17 14:01:41.749564	2026-01-17 14:01:41.749564	t
115	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODY0OTE3NiwiZXhwIjoxNzY4Njc3OTc2fQ.v5y1UtfI70d1bAbRQ12k-dpFDlxx8bkxmgAlYbitds8	f850ed53132fe7a66ad04149c9b4d64cd0d3b0622184441968cd2f2b9f110bc2e50ef3a9a102a4f8760726fcdc679242560cd7a525075a62136d377940814dc8	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-17 22:26:16.876	2026-01-17 14:26:16.877134	2026-01-17 14:26:16.877134	t
116	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODY1NzY3OSwiZXhwIjoxNzY4Njg2NDc5fQ.qjnmL0Z_KsX5CLRg6KhXVxp8EkQr7lqMDHj8jPExtnY	7e4f74c4ccedc782cb4bad3b8b6d6cc5d9df7ed1d43bf8437afc0e80b2ccc24864b45bbdfb7b82dec9518f2a08d9621c1fc98fe37684e1f6706e4d4486dc6a58	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-18 00:47:59.776	2026-01-17 16:47:59.777045	2026-01-17 16:47:59.777045	t
117	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODc0NTQ3NSwiZXhwIjoxNzY4Nzc0Mjc1fQ.MVukHVjQlvu9yvLVw5AfU0fblLEvlnBvuOd_1-PtauE	8c054a37a3c6c5b33c73bada7097f3d68ea58a80c48523fb7c8fb5f895e526d1dd57c9622616460c1300c808aea067de194beaa9840182aec119923f69354c72	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-19 01:11:15.386	2026-01-18 17:11:15.386831	2026-01-18 17:11:15.386831	t
118	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODc0NzE4OSwiZXhwIjoxNzY4Nzc1OTg5fQ.w4uZq7G6YR2F5btCG1NqNemBNVHHFTJYfQdgDQ9vXKA	748c3df6cef60fa683a17de8ecc4549d1b3798dc71dffdd72c4810ca1e08cb3f65b33bf19e90c635763ad1c77d70ca6d1bedae12dbef4def195d396df5b2a800	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-19 01:39:49.931	2026-01-18 17:39:49.9317	2026-01-18 17:39:49.9317	t
119	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODc0NzkzOCwiZXhwIjoxNzY4Nzc2NzM4fQ.19JNqXo24Gk97mT5-HKytFQK8ioPNvbIq7J2O5EWnkw	26246e1c7a1e7ee7504e096ebe39b67fda61a626233221ef9d663ae1b15d7a52dac2f6fe1ab481916f4f99466b58820886c1e35a67c881d2fb85a8b738efe0c4	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-19 01:52:18.702	2026-01-18 17:52:18.702417	2026-01-18 17:52:18.702417	t
120	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODc2MTA3OCwiZXhwIjoxNzY4Nzg5ODc4fQ.izNXpg9rtqqm0ZhJmFPlz50QHEmhPe2ey03thzNBORI	b21a849018670a390ed194beca302f010f8f7925b5924770ef3e2a46bcd79ff7e74c588cd970f6efaa9d1ff0774dcddbf1a0dac20b6b85547ef397e3372ffddb	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-19 05:31:18.266	2026-01-18 21:31:18.266421	2026-01-18 21:31:18.266421	t
121	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyMjU3OSwiZXhwIjoxNzY4ODUxMzc5fQ.q23P5Uxq5uPQaiXWLkC48Pm_lEFCKOF4iJ9RAsGXxZg	69fa6d3554f9e98ac53ad1b2bd2f915c5eeb848932d64c801f618ff86af980f8eb1a8685e5e6f443a6e587c9c6aada7f8a3c5803bb06d946d8231467b388b2e3	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-19 22:36:19.812	2026-01-19 14:36:19.812852	2026-01-19 14:36:19.812852	t
122	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyMjY2NSwiZXhwIjoxNzY4ODUxNDY1fQ.nU8BnIFJov9KVVtJJlPrCFi3MsRg-jH6wxQyTUK6Xkk	8b8851e9a321398ab6f9d2f83d64ed1f2e40c22b93edc954187ae64813f5bfc1e6ccdfc4209d6db044cd44b84fe456cf5e0529ec81d05c9a93c26569b0947100	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-19 22:37:45.249	2026-01-19 14:37:45.249569	2026-01-19 14:37:45.249569	t
123	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyMjcxNywiZXhwIjoxNzY4ODUxNTE3fQ.BsFTtzv9u1XT5TEJfJejkvba7LGEXTFxiI-IuknZSVc	36e92ff38484bad756b115fb5b2dc55ae535fb884822d086f63f692c85066d53453106ed51c616f45660d47f87e5a87255d0655780990ae0711b507a79ca16e3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-19 22:38:37.891	2026-01-19 14:38:37.891271	2026-01-19 14:38:37.891271	t
124	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyMjc1NSwiZXhwIjoxNzY4ODUxNTU1fQ.z-BM7bVkBx-ZGhvKBXShI4CdCf4JG2F-QZiDtWSfVr8	4c607b198bf75b94eb7e8faf250fc0b19c01c160cf2dfa432add2a7edb9a0de6bca87e8dc54259d966c815fd90007031aff6ac12493fd271119af0aa63a58591	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-19 22:39:15.323	2026-01-19 14:39:15.324608	2026-01-19 14:39:15.324608	t
125	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyMzE2MywiZXhwIjoxNzY4ODUxOTYzfQ.4CiwgvVXgm7r2cqns2YvUewpcw8Fa8621oGIZOAFLDQ	5535fc3d3b1649ae1016fdab612863909382beb46ec7604791cb2ff4d17fd9e7039bc46d8629cc3eb6493281e474c689c41326726c0e1fd28492250e8124a1dd	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-19 22:46:03.533	2026-01-19 14:46:03.534211	2026-01-19 14:46:03.534211	t
126	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyMzMyNiwiZXhwIjoxNzY4ODUyMTI2fQ.JdqPdljJzVZMz65KC-nsCuOmqiS2eACHsU50dR00OLw	65eaa800246cc7bdbcb533ae445a1f761184207f0af29298292522b75d401a23fb0fb9f43ed18ecf1c3720ec7dc3ad2e81bb8c1dfc1ae84786b7e4d88d4b8e66	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-19 22:48:46.182	2026-01-19 14:48:46.183104	2026-01-19 14:48:46.183104	t
127	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyNDQ5MywiZXhwIjoxNzY4ODUzMjkzfQ.mccr5GJKaK-TLRqNXJDpowU15oWPJkNKyvisEEj89HI	9ad4f3e0ab5af8de7aa8fdfd55eef1dec604b71e8e019359ad913ec0285aeabe75e1507f657fb7b2c4d567eba7bbb29fb0a63494b32ccc567b57e3843c0a87bf	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-19 23:08:13.661	2026-01-19 15:08:13.661665	2026-01-19 15:08:13.661665	t
128	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyNDg1NCwiZXhwIjoxNzY4ODUzNjU0fQ.d13dlLu4RWU5zeDbnuwhTuUwlTa_KMdyVvpQN89Ux_Y	f32b6b6dd9c9194595ea06342490f428e4525e3a3a4237378089774102eb7fdd256985d7416ecb22a885bb95cfb89d173e22816e1757264e2741a01b413d2171	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-19 23:14:14.297	2026-01-19 15:14:14.298058	2026-01-19 15:14:14.298058	t
129	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyNTA0MywiZXhwIjoxNzY4ODUzODQzfQ.Z_hfIQmFSMJKOHmfkyY-aKoNOzueFsx3FVepDWa26qI	7a70e107863119a3c907ed71bdae294008910c856d2434a911ee39729b611673563943a70791dc8f2899f0056e8ec39e67db7fa633e1c653404a3c8ca3903ea5	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-19 23:17:23.029	2026-01-19 15:17:23.030119	2026-01-19 15:17:23.030119	t
130	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyNTEzMywiZXhwIjoxNzY4ODUzOTMzfQ.amSL8hLh3DVO0q-Zrv-9sBuTe9rE1jzAFTV3PHrtjd0	f389e45dce20b3e40378fff8629254a6277ab3da7d6ba50859ff07ff21b876b1887cf716728ef8beba926463f1e0f16bec832e6135f6d8044a369748a4e34361	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-19 23:18:53.848	2026-01-19 15:18:53.849024	2026-01-19 15:18:53.849024	t
131	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyNTQ4NiwiZXhwIjoxNzY4ODU0Mjg2fQ.71pMzYYYLhm6oDkMlD7tx2KmNTlkl5gbIAvEUzno7Fs	1980c89753641eb7beab20a699411d969251e29e66654863cdb2dfbd0c3a436de4a80ab68dcf60a9d50839dd2ba8d22553306ea270f219c8f8b14fb9e8339404	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-19 23:24:46.644	2026-01-19 15:24:46.645019	2026-01-19 15:24:46.645019	t
132	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyNTYwOCwiZXhwIjoxNzY4ODU0NDA4fQ.j8WeBUD3mq-7hfkfDaOROZ5mwTAlItXZcfa--lqI8tw	e81aaf7dd0e97b35299f884b6fe15827533a42e361c8479ea9df54474278d16bd71ec2ac76ffc426b4b56df74b9768ed392cc28aea48b518c711d59c72b7d988	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-19 23:26:48.017	2026-01-19 15:26:48.017934	2026-01-19 15:26:48.017934	t
133	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyNjAwNywiZXhwIjoxNzY4ODU0ODA3fQ.aG2zYtJvD7aVa3WR-rO-_mFgH4Dh4JS6XoHkBs2mwY0	aa82f1fcfd98b1262009c0fb57c94f7d0936822af41f98c2c1cb498186b87f7cdded8340ac070b4cea8f637d67179d244ac03381400e6d2a53514216b03883cf	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-19 23:33:27.383	2026-01-19 15:33:27.383461	2026-01-19 15:33:27.383461	t
134	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyNjAxNCwiZXhwIjoxNzY4ODU0ODE0fQ.gtwmvwT1IDAnrpcez6PZAW7YNgjqou-iP43Thbrheyc	1c971e18ce4795a8621d612fa9f61d69e4dac96466ae7b1a1339f67c3d596583bc72fc6834fc4812535a3c541ec34eb135be9c0f552bdef548c23ce87eff8b5a	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-19 23:33:34.658	2026-01-19 15:33:34.658971	2026-01-19 15:33:34.658971	t
135	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyNjAzOSwiZXhwIjoxNzY4ODU0ODM5fQ.9HOIKJmv574VdV2-qzdqjs5w9eBBDZPqvoQzR-X04ng	372023044abb031c2b6f1965cef6041a94612b8473ffa395c3583cc7632be4f42cba635e3cf5a3e28030b5db19473f9dd65ca4b947767ce9ab172737ed4949a9	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-19 23:33:59.905	2026-01-19 15:33:59.905275	2026-01-19 15:33:59.905275	t
136	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyNjA1NywiZXhwIjoxNzY4ODU0ODU3fQ.BSG4cRK9Kph2OaToU1tcXiiUBFRrJCu1i91Dc-z7bP4	76712948a3dbd2ca3141d5b86533af19fa7f2db7c5b9629c8d6f2448b31792899a4e567baf7dc358c603f13d755af31680eb69640bba6f979cdc5962ba1c3ac8	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-19 23:34:17.788	2026-01-19 15:34:17.788966	2026-01-19 15:34:17.788966	t
137	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyNjYyMSwiZXhwIjoxNzY4ODU1NDIxfQ.LI5-omgp13CQK_9g8hDaam-A_5GABEmIicJ4xurnKVU	35074e9913a58ed0db64d0a064c906e15ed3fc9cec9a10e31d4c58d09d9cbae38cf71201ea8e736b98030457506d65417ff784d00a2b509bd38d362f226e8e57	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-19 23:43:41.771	2026-01-19 15:43:41.772061	2026-01-19 15:43:41.772061	t
138	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyNjkwNywiZXhwIjoxNzY4ODU1NzA3fQ.vpZTN7aVmcizghxJ1B4KThQL4IzpAiSksJHln69yEWg	704bb10e3c6cd3a12555f509bf3a97b3b94f79c1d51dfe2521372b9c326693defb0e231823306fb401b012631b89472f139987be2ad95f5f6aa33b26a7b2f090	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-19 23:48:27.989	2026-01-19 15:48:27.989872	2026-01-19 15:48:27.989872	t
139	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyNjk2OSwiZXhwIjoxNzY4ODU1NzY5fQ.QYAia7OTyV5Yxy49X7ezWKb7NG_MyJav4WkgeUBPA8Q	61886669848df25c2c2cd47cac1983ccd9e482f97625a3993570cc91678a47bc124228d5908ba2e36ff9afe98cf7fffb04fceac70b471f198b7bec7523846a1a	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-19 23:49:29.07	2026-01-19 15:49:29.070715	2026-01-19 15:49:29.070715	t
140	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyNzI2OSwiZXhwIjoxNzY4ODU2MDY5fQ.ou5mPwQxUDK34FZW3zB7TFQ5VrsrrOPA68ZSniv0ZF0	181980be1e4df6739acb8f27c31f2ba76da0dfb3c5400a05a6bf33bfa6421efdb09c911f13bdcc45224e51be792534eadf5ae490888a7f5ac74cd8baaecee774	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-19 23:54:29.621	2026-01-19 15:54:29.621408	2026-01-19 15:54:29.621408	t
141	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyNzU0MywiZXhwIjoxNzY4ODU2MzQzfQ.5VeNmNmOUT_ko2256JNLnEK2LStYyyf3wZnQUwkQZSc	f908beb3820a7cf9538b29a424b144c97cc62193ab9b8f8fef3d719c6f9597502a0695fd11fc3c209ac28c826d9f1662b9a3c300c27535bf5f2555bfb33cfb53	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-19 23:59:03.474	2026-01-19 15:59:03.474427	2026-01-19 15:59:03.474427	t
142	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyNzg1OSwiZXhwIjoxNzY4ODU2NjU5fQ.DN9l2JkYHqMXUdQ1W2W_fQ9dNHcrFem4b9x3t7P5-Bo	87227294ebea05dee9b451634db78fc3943188a888dd6633d0de608a1810dc9c23d13262ba0da69e80eaa3147abbc2f93900f94324c8aa9619ddd9cd8e5e81b8	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-20 00:04:19.882	2026-01-19 16:04:19.882385	2026-01-19 16:04:19.882385	t
143	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgyODA3NSwiZXhwIjoxNzY4ODU2ODc1fQ.9CQsYPrsj6eMKryDFFEDO76VujrX2NwG0A4SlgVAtK8	75a3a5751f01f18d09125117da69df87ede5aca40f5b7808077c4c6c321005ada2c94223b945f5be9b97b74844907e24e6f9f3961003563f070a5cd60497c046	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 00:07:55.731	2026-01-19 16:07:55.731276	2026-01-19 16:07:55.731276	f
144	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODgzMDEzNiwiZXhwIjoxNzY4ODU4OTM2fQ.Vxavv2A5sODHLQ_FPKScABp96frIX_LAWeJTJT8KLJ8	2d110c3de5d5d5de63f91eb36524192e01b704c16420f62843abb12b90d06eaebc0314025f564ebf8ad2fab7ed24e8306d6a91da2a53c76317f4f9e446486031	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 00:42:16.797	2026-01-19 16:42:16.797987	2026-01-19 16:42:16.797987	t
145	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg0MzA4MiwiZXhwIjoxNzY4ODcxODgyfQ.Huaa6LirITGfTyPcxMIaNGsKP0l9yhVg3U2phPms2D0	114e03737c7e9f06a7ae598ce1d79c27d0e1564a538739433bcb93f58f37f431c861c7c37572d442fea16f9e701b2cdf027ee830f8b02c79676de8ba3e821df2	::ffff:127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15	2026-01-20 04:18:02.729	2026-01-19 20:18:02.729853	2026-01-19 20:18:02.729853	f
146	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg0MzE5MSwiZXhwIjoxNzY4ODcxOTkxfQ.dzKQIBqjF-M6x1LbXEteyBlcOLGth9b341I9TDY5U9Y	6773bbd2e0544943f14cbb1fe226ac8cde1c2f806c52946fcd6312e615d9e960fadef2c5a45227f521b234175295d526a14a4326d11e4e32242ee7f0dd29ce67	::ffff:127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15	2026-01-20 04:19:51.314	2026-01-19 20:19:51.314742	2026-01-19 20:19:51.314742	t
147	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg0MzQ4NywiZXhwIjoxNzY4ODcyMjg3fQ.ob4PGz4rEojANq3xhoauwuANNYKMBSTpLuhXBYZVpCk	9d867fff9510b929ff238fd7510ea29737ccf182e062455cc235431eb3eadcd5c5e44d8bf81871ffc57812963d7d2861eac4252d0b4dd8dbfa3bcb20ec83f7e0	::ffff:127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 04:24:47.013	2026-01-19 20:24:47.05909	2026-01-19 20:24:47.05909	f
148	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg0MzYxNSwiZXhwIjoxNzY4ODcyNDE1fQ.yMVHUk0iSCwqukLyWyoLUQeSYC9ZYHJO-qTFJcpd1eg	6d01cdfcf6ce1455eeaf325beed14a32c56383a981128f55ef20bf56074608ef96207f43faf76b7040eb9cb81635002333c71b9ba382be0b4b9170b019674aba	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 04:26:55.726	2026-01-19 20:26:55.727234	2026-01-19 20:26:55.727234	t
150	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg0NTM5NywiZXhwIjoxNzY4ODc0MTk3fQ.sKNfXuIrBcLq_3GCqfDSISGOVIfVJWw0OH-FMYAu8HM	340c8970ff780aade6297d578277e7bc51a3693799030cd3bd9598e8701552c0c182f5e87e89e96e858799db80d1741ca238b1d1d9431c2e311dd2501d2c6291	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 04:56:37.148	2026-01-19 20:56:37.148372	2026-01-19 20:56:37.148372	f
151	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg0NzQ2NywiZXhwIjoxNzY4ODc2MjY3fQ.2GyVudP1x9Etll2VnnJsa_Nhxp_jnyEG6JuFsz1Gjv0	889a883cd7fc44fa26659fd66b83e3ac91c83ea7be214e30c5f578692efbf0f29d21e599802ac758827de9398d9de57333b33943cbda72ab1ee4fa4bc6b32c92	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 05:31:07.608	2026-01-19 21:31:07.608788	2026-01-19 21:31:07.608788	t
152	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5MTUyMywiZXhwIjoxNzY4OTIwMzIzfQ.qxgbQCLS6v57ev_oKK0VArK4qTU90fgml-B3c_TXePY	dfffdbeb8eae737fa9af63496546d1e869797a15b74927971ca21a5ca42f74c355f7abc95be9c9c52e1c3a71194f8db2d63311aecd41892e3388c0edcac6aa19	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 17:45:23.371	2026-01-20 09:45:23.371491	2026-01-20 09:45:23.371491	t
153	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5MTc4NCwiZXhwIjoxNzY4OTIwNTg0fQ.NXKvLqg4HPb2hiu-AXmeFYeCC3wX7vNVD96gR7snp3k	5c99f45013dfb23896ca38c4fc56c3d3c4accc6b1256dde3e3394e405c2d4e0a9d6a80f4f7dbe9c8cfdab3d796a4e41fed0ad159dc324af23361600fac1249de	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 17:49:44.375	2026-01-20 09:49:44.37625	2026-01-20 09:49:44.37625	t
154	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5MTc5NywiZXhwIjoxNzY4OTIwNTk3fQ.wX8k8fStIgoxF5Qz-9BL8uKPTOeosaqUzBj4lS03FoA	8e3765f8cca0d0b2ec565f0f3f2580b0d204ab609869fe037b9c2b0583816ea43ab66e0ae8f35ddac47dbe269e7083d9460c0e2847a69e2da86b2e9b1a17a6b6	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 17:49:57.211	2026-01-20 09:49:57.211508	2026-01-20 09:49:57.211508	t
155	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5MTgzMCwiZXhwIjoxNzY4OTIwNjMwfQ.sdWTHflcxm0gZu7eF6wJpJ5dGsNfVZyVB0qUrnTHYTk	e8a9dd4b4bc4a0700b675069302d71e169f4a166d195ef1f196848972a310be7aef1886f8c5618fa1a59427384ac24e5b0e116b456beed2dd74593e62dfdb72f	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 17:50:30.539	2026-01-20 09:50:30.539487	2026-01-20 09:50:30.539487	f
156	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5MTg0MSwiZXhwIjoxNzY4OTIwNjQxfQ.Bg_MdlIb0uE__zawvNUkRfRCndyMY_F8QJUo4jvwfc4	f4d8aacec5280f964da7601a2515be9e4c6e2a773fa098ed9a0974db3a171f36a7b919cf59b69e96b031b063a1de2456a1d50c2d4ed7f54c2646e5c943212802	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 17:50:41.447	2026-01-20 09:50:41.447163	2026-01-20 09:50:41.447163	f
157	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5MTg4NywiZXhwIjoxNzY4OTIwNjg3fQ.s5N2MDjXcTHruATDXFKXFGO_cKhltnnB6YKs2IzJUJs	8034028a2b5f9af7e199487583e15aace77f6689cedffdb9a6498ea45b6e779aa7eadf8dd9d941e71abce7835f3748fa7dec08e2dd517886b945cbaac6982ce7	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 17:51:27.598	2026-01-20 09:51:27.599107	2026-01-20 09:51:27.599107	t
158	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5NDMzMSwiZXhwIjoxNzY4OTIzMTMxfQ.m1Tbz90KSwLrX6BZprg3WDMQ8LrJSsKlgmkvWxbSoP0	21ce2694a5d47ec8e9e0bff849bf872f4fde3f46bcde2217042e01687dc503f4271015ce3d556bbd094b2872361d70d2ffc3caeaa766d6533d06ca3d5f0910a6	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 18:32:11.392	2026-01-20 10:32:11.393612	2026-01-20 10:32:11.393612	t
159	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5NDY3NiwiZXhwIjoxNzY4OTIzNDc2fQ.T2r-JuqtBbJUYgkDvr5_qB0XAXaSVaAe-5UOdTHACA8	f7be0ef02266a5549deb150e448eaacb27a99b8f1541cef86f1ef7383b5b3e9fe048846022417ea2a13dfa1c4b63fdf5cc8dec74072c6629565947c4219508e1	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 18:37:56.855	2026-01-20 10:37:56.856056	2026-01-20 10:37:56.856056	t
160	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5NDgwNCwiZXhwIjoxNzY4OTIzNjA0fQ.V4aQmlsPDbZ68AyDwk6UoghQ83UQ_VEGBypWU9p9XdY	557261385e5e0930b061a158d250a2d0aff7682e72b47b6ae4e8385efd6f43ce8e142072cdb1816643e8b4e77e7bd733689ac8c8148821fcc41cc6802c31f53e	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 18:40:04.106	2026-01-20 10:40:04.106274	2026-01-20 10:40:04.106274	t
161	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5NTY1NywiZXhwIjoxNzY4OTI0NDU3fQ.pz0EE361Q9mDjQ9WxlEHFYVA-YUJHVksDVB-avThGsw	0c716a52d7e97d93964ef6e1b98f485383b6314b0de8a6516a6a3d2b510d1da02b964951ae6e375a7c17b1fbeabd6e67b780a041eb7083ca428176e64723d992	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-20 18:54:17.494	2026-01-20 10:54:17.494836	2026-01-20 10:54:17.494836	t
162	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5NTc3NiwiZXhwIjoxNzY4OTI0NTc2fQ.u9VvkShLf4jurZx7SnGzb4FuCtOkurRKSN6hzeu4UNc	0fac84a627aacb0356cab757e48adc6368fd6f2dbeb56c6c99164a48b64cc46ce2a1bfb6c32a3cc585e0ad029d3b1989ef5cbfad10f06ce1696e56356a30c017	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 18:56:16.747	2026-01-20 10:56:16.748219	2026-01-20 10:56:16.748219	t
163	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5NTc4MCwiZXhwIjoxNzY4OTI0NTgwfQ.UV84GsfKRkMNwKiOs14Oae2rl5GaMJ-vQ89OsIGBXoM	726353bd05054014b108507af0c45d9f8d112a21e8bda119c515a5059a07bd901705b3fba3896c89bf0b4e8b99d041e17a13766773e335b9e05018304b58b904	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 18:56:20.55	2026-01-20 10:56:20.551154	2026-01-20 10:56:20.551154	t
164	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5NTc4NywiZXhwIjoxNzY4OTI0NTg3fQ.rKWcsEQ4rRJ5dmZ2Tawy5vVuWXxQhx7IFjB5n7MPfrQ	eae020be049aea98f7f7d7e6ae814268bdceaec46b3f8e3b93b725ada681fffbb547eab3a23b3c11b0daf300b5ab6d9e4381d9ebd71f0e34d499152dc2b594ef	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 18:56:27.819	2026-01-20 10:56:27.824878	2026-01-20 10:56:27.824878	t
165	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5NTg3MiwiZXhwIjoxNzY4OTI0NjcyfQ.F60QvBdbTiDquLGwhN7Kr1Zfo15k_zR2H7238XrNVcs	a23758d1af9a101ea1d8bca266a38fa523849ff23a2fb480bb3176b2a462fba064d9b23573af42e1649a66adfd6fe7f388275b9b0e29894a132c67e2f331b7f8	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 18:57:52.707	2026-01-20 10:57:52.708508	2026-01-20 10:57:52.708508	t
166	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5Njk5NiwiZXhwIjoxNzY4OTI1Nzk2fQ.D1EmeA-2GDjtVbz0hGKUHZnJQaImpXVTI5j1ZYjR7c8	758d7aecdffeac6449a9680ae5fe31a7652e988f002cb63f0087fc6f646721db3bb350e5f65dc0f2e375cf8e06a50c346d7aa1c5d4c982e1fecf5c57882d013f	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.104.2 Chrome/138.0.7204.235 Electron/37.3.1 Safari/537.36	2026-01-20 19:16:36.775	2026-01-20 11:16:36.775863	2026-01-20 11:16:36.775863	t
167	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5NzAzMywiZXhwIjoxNzY4OTI1ODMzfQ.VsVyxNzu88V7rKMN-FYnlqM0p0O_ahNVbbymyuYYN_k	5521ed6c3454e0a67433773f61e1c9436a69e34361cdd20ca7b774c6ca23507421615e83790b2d6d258157a6029bfa1b0ec8ad3323af5d1c2ea879068ae8e4d2	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 19:17:13.117	2026-01-20 11:17:13.11845	2026-01-20 11:17:13.11845	t
168	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5NzM5NiwiZXhwIjoxNzY4OTI2MTk2fQ.lKW5Hz-Y5QOH9bKaRgZxI_2su7zMyP2Ev4hG89IgVoQ	e6d9ae23c105ed733a581c81b3f27dd5669f1bea700739b05748be1a233f458b7fe3609f5667b7b9a7b36403016779ba91985919cd035e985c0d79d4e72af5ca	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15	2026-01-20 19:23:16.927	2026-01-20 11:23:16.927787	2026-01-20 11:23:16.927787	t
169	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5NzQ3NiwiZXhwIjoxNzY4OTI2Mjc2fQ.fwA2Eq-1Xhcx7rdMKFGFb-2y3azeNGdRl-xHpcs0LH8	77c98df11587c9a24333b534c9e17e5c8a12c4f68daa7a8011266064337c5d855842f33a9dc06aed5855bd99471965998121c7b4683722f2135ec588f039d169	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 19:24:36.353	2026-01-20 11:24:36.353658	2026-01-20 11:24:36.353658	t
170	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5NzQ5MSwiZXhwIjoxNzY4OTI2MjkxfQ.6f6k5LTJ4OHpR-Olen1TpsqE_wwmmtIuWS-szb6COEY	4cd5c06a3f4083aec065105c9019e1f1a53f429c2c7f413871325a3bcd0d3bddeca8893f8bde17b16bb3dcd44c46bf881505d42550672ae0d58bd5182f3f300b	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 19:24:51.467	2026-01-20 11:24:51.46798	2026-01-20 11:24:51.46798	t
171	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5ODg4NiwiZXhwIjoxNzY4OTI3Njg2fQ.zY6OeYc0elx-MJhfboxWiE8w1I6H7rlXnP2RI1ujzq4	6bcd9a4acccf68a788a7e0e7ed60389ad78a6a404051c329ae5d8397ad774795ade811c96cb4582793908d95de890ad8f747c91569d180672996bc804a74e579	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 19:48:06.885	2026-01-20 11:48:06.885464	2026-01-20 11:48:06.885464	t
172	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODg5OTU1MiwiZXhwIjoxNzY4OTI4MzUyfQ._PF84Nx4hmAInCBHvLOtXHGkTr0g_SWxCbgX1rwpe2I	710228b9a37936e7300d5e180bfddb5fb98f537e167c9cf9e27b95ace84aaa324adb8cedb34497a7d605a65ab608ab0c27f317eafd0834eea0d39b068721c954	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 19:59:12.385	2026-01-20 11:59:12.386907	2026-01-20 11:59:12.386907	t
173	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODkwMDM1MiwiZXhwIjoxNzY4OTI5MTUyfQ.l8ffinw3IDFCSvos-96LLQIty74cOZt-V3bLATA07Zg	f593914468792df9662c2a7832d4c4c9be6e9b9ca99d10c33637a54ff0e9b75acb4373a57120ff9768f75f239b98c0f85587da61b7462c1455aa76e7e21f0561	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 20:12:32.252	2026-01-20 12:12:32.252688	2026-01-20 12:12:32.252688	t
174	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODkwNzU5MywiZXhwIjoxNzY4OTM2MzkzfQ.SK7h-ClWzQ3ZiQ1nu-5_OaSBmJtDng1dIaRfC7Am9dc	6772ec3dcd07f8942d9827a3a10471f5d2001e7f3908d996441c2bab6c0bc904cc99ab4973760427c3b31252e8bbd86b7fe5c08c531882ef3f225f94ba98a30a	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 22:13:13.272	2026-01-20 14:13:13.27262	2026-01-20 14:13:13.27262	t
175	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVlcHNlYS5sb2NhbCIsImlhdCI6MTc2ODkwODY3MCwiZXhwIjoxNzY4OTM3NDcwfQ.vPOEG-ixgci9drxdVOc-XvFl5xfc52C2K3GJ7jNok5Q	cb7f7f9a2068c5c894888ab32de585f0e74f5ce1ff9057984f9c7d797466485ff0353103213a812452bac0b1a4977b031c564df761c1b0b3229b973772d80a3b	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-20 22:31:10.825	2026-01-20 14:31:10.826059	2026-01-20 14:31:10.826059	t
\.


--
-- Data for Name: sfi_codes; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.sfi_codes (id, code, name, description, parent_id, level, order_index, created_at, updated_at) FROM stdin;
1	100	Корпус	Корпусные конструкции судна	\N	1	1	2025-12-24 12:54:43.488338	2025-12-24 12:54:43.488338
2	200	Механика	Механические системы	\N	1	2	2025-12-24 12:54:43.488338	2025-12-24 12:54:43.488338
3	300	Электрика	Электрооборудование	\N	1	3	2025-12-24 12:54:43.488338	2025-12-24 12:54:43.488338
4	100.10	Наружная обшивка	Наружная обшивка корпуса	\N	2	1	2025-12-24 12:54:43.488338	2025-12-24 12:54:43.488338
5	200.10	Главный двигатель	Главный судовой двигатель	\N	2	1	2025-12-24 12:54:43.488338	2025-12-24 12:54:43.488338
6	300.10	Генератор	Судовой генератор	\N	2	1	2025-12-24 12:54:43.488338	2025-12-24 12:54:43.488338
\.


--
-- Data for Name: specializations; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.specializations (id, name, code, description, order_index, created_at, updated_at) FROM stdin;
1	Корпус	hull	Корпусные конструкции	1	2025-12-24 12:54:43.480442	2025-12-24 12:54:43.480442
2	Механика	mechanics	Механические системы	2	2025-12-24 12:54:43.480442	2025-12-24 12:54:43.480442
3	Электрика	electrical	Электрооборудование и системы	3	2025-12-24 12:54:43.480442	2025-12-24 12:54:43.480442
4	Автоматика	automation	Системы автоматизации	4	2025-12-24 12:54:43.480442	2025-12-24 12:54:43.480442
5	Судовождение	navigation	Навигационное оборудование	5	2025-12-24 12:54:43.480442	2025-12-24 12:54:43.480442
6	Безопасность	safety	Системы безопасности	6	2025-12-24 12:54:43.480442	2025-12-24 12:54:43.480442
\.


--
-- Data for Name: specification; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.specification (id, project_id, document_id, code, name, description, created_by, updated_by, created_at, updated_at) FROM stdin;
1	1	2	SPEC-001	Спецификация материалов корпуса	Материалы для корпусных конструкций	2	\N	2025-12-24 12:54:43.5226	2025-12-24 12:54:43.5226
2	1	\N	SPEC-002	Спецификация крепежа	Крепежные элементы для корпуса	2	\N	2025-12-24 12:54:43.5226	2025-12-24 12:54:43.5226
\.


--
-- Data for Name: specification_parts; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.specification_parts (id, specification_version_id, part_code, stock_code, name, description, quantity, created_by, created_at, parent_id) FROM stdin;
\.


--
-- Data for Name: specification_version; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.specification_version (id, specification_id, version, notes, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: stages; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.stages (id, project_id, name, code, description, end_date, order_index, created_at, updated_at) FROM stdin;
1	1	Проектирование	DESIGN	Этап проектирования	2024-06-30	1	2025-12-24 12:54:43.503163	2025-12-24 12:54:43.503163
2	1	Изготовление	BUILD	Этап изготовления	2024-12-31	2	2025-12-24 12:54:43.503163	2025-12-24 12:54:43.503163
3	1	Испытания	TEST	Этап испытаний	2025-03-31	3	2025-12-24 12:54:43.503163	2025-12-24 12:54:43.503163
4	2	Проектирование	DESIGN	Этап проектирования модернизации	2024-05-31	1	2025-12-24 12:54:43.503163	2025-12-24 12:54:43.503163
5	2	Установка	INSTALL	Установка оборудования	2024-08-31	2	2025-12-24 12:54:43.503163	2025-12-24 12:54:43.503163
\.


--
-- Data for Name: statements; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.statements (id, document_id, code, name, description, version, created_by, updated_by, created_at, updated_at) FROM stdin;
1	2	STMT-001	Сводная ведомость материалов	Объединенная ведомость материалов проекта	1.0	2	\N	2025-12-24 12:54:43.525136	2025-12-24 12:54:43.525136
\.


--
-- Data for Name: statements_specification; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.statements_specification (id, statement_id, specification_id, created_at) FROM stdin;
1	1	1	2025-12-24 12:54:43.526047
2	1	2	2025-12-24 12:54:43.526047
\.


--
-- Data for Name: storage; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.storage (id, url, bucket_name, object_key, file_name, file_size, mime_type, storage_type, uploaded_by, created_at, updated_at) FROM stdin;
2	/backend/uploads/other/1768761263033-Deep_Sea_3.docx	\N	backend/uploads/other/1768761263033-Deep_Sea_3.docx	Deep Sea 3.docx	24744	application/vnd.openxmlformats-officedocument.wordprocessingml.document	local	1	2026-01-18 21:34:23.035201	2026-01-18 21:34:23.035201
3	/backend/uploads/other/1768761864672-Deep_Sea_3.pdf	\N	uploads/other/1768761864672-Deep_Sea_3.pdf	Deep Sea 3.pdf	92075	application/pdf	local	1	2026-01-18 21:44:24.675676	2026-01-18 21:44:24.675676
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.suppliers (id, name, code, description, contact_person, email, phone, address, website, country, is_active, created_by, updated_by, created_at, updated_at) FROM stdin;
1	ООО "МеталлСнаб"	METAL-001	Поставщик металлопроката	Иванов И.И.	info@metalsnab.ru	+7-495-123-4567	Москва, ул. Металлистов, 1	www.metalsnab.ru	Россия	t	1	\N	2025-12-24 12:54:43.518146	2025-12-24 12:54:43.518146
2	ЗАО "Электротехника"	ELEC-001	Поставщик электрооборудования	Петров П.П.	sales@electrotech.ru	+7-812-234-5678	Санкт-Петербург, пр. Энергетиков, 10	www.electrotech.ru	Россия	t	1	\N	2025-12-24 12:54:43.518146	2025-12-24 12:54:43.518146
\.


--
-- Data for Name: time_logs; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.time_logs (id, issue_id, user_id, hours, date, description, created_at, updated_at) FROM stdin;
1	1	2	8.00	2024-01-15	Работа над чертежами корпуса	2025-12-24 12:54:43.529952	2025-12-24 12:54:43.529952
2	1	2	6.00	2024-01-16	Продолжение работы над чертежами	2025-12-24 12:54:43.529952	2025-12-24 12:54:43.529952
3	2	3	4.00	2024-01-20	Исправление ошибки в спецификации	2025-12-24 12:54:43.529952	2025-12-24 12:54:43.529952
4	3	4	8.00	2024-01-25	Подготовка отчета	2025-12-24 12:54:43.529952	2025-12-24 12:54:43.529952
\.


--
-- Data for Name: units; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.units (id, name, code, symbol, description, created_at, updated_at) FROM stdin;
1	Штука	pcs	шт	Единица измерения количества	2025-12-24 12:54:43.483475	2025-12-24 12:54:43.483475
2	Килограмм	kg	кг	Единица измерения массы	2025-12-24 12:54:43.483475	2025-12-24 12:54:43.483475
3	Метр	m	м	Единица измерения длины	2025-12-24 12:54:43.483475	2025-12-24 12:54:43.483475
4	Квадратный метр	m2	м²	Единица измерения площади	2025-12-24 12:54:43.483475	2025-12-24 12:54:43.483475
5	Кубический метр	m3	м³	Единица измерения объема	2025-12-24 12:54:43.483475	2025-12-24 12:54:43.483475
6	Литр	l	л	Единица измерения объема жидкости	2025-12-24 12:54:43.483475	2025-12-24 12:54:43.483475
\.


--
-- Data for Name: user_notification_settings; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.user_notification_settings (id, user_id, project_id, event_id, method_id, enabled, config, created_at, updated_at) FROM stdin;
1	1	1	1	1	t	\N	2026-01-17 12:19:23.900656	2026-01-17 12:19:23.900656
2	1	1	7	1	t	\N	2026-01-17 14:28:39.75029	2026-01-17 14:28:39.75029
\.


--
-- Data for Name: user_notifications; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.user_notifications (id, user_id, event_code, project_id, data, is_read, is_hidden, created_at, read_at) FROM stdin;
1	1	issue_created	1	{"via": "rocket_chat", "issue": {"id": 6, "title": "test", "type_id": null, "due_date": null, "priority": null, "author_id": 1, "status_id": null, "created_at": "2026-01-17T10:03:59.670Z", "project_id": 1, "start_date": null, "assignee_id": 1, "description": "test", "estimated_hours": "0.00"}, "recipient": {"user_id": 1}}	f	f	2026-01-17 13:03:59.71692+03	\N
2	1	issue_created	1	{"via": "rocket_chat", "issue": {"id": 7, "title": "test", "type_id": null, "due_date": null, "priority": null, "author_id": 1, "status_id": null, "created_at": "2026-01-17T10:18:56.256Z", "project_id": 1, "start_date": null, "assignee_id": 1, "description": "test", "estimated_hours": "0.00"}, "recipient": {"user_id": 1}}	f	f	2026-01-17 13:18:56.301574+03	\N
3	1	issue_created	1	{"via": "rocket_chat", "issue": {"id": 8, "title": "test", "type_id": null, "due_date": null, "priority": null, "author_id": 1, "status_id": null, "created_at": "2026-01-17T10:19:11.139Z", "project_id": 1, "start_date": null, "assignee_id": 1, "description": "test", "estimated_hours": "0.00"}, "recipient": {"user_id": 1}}	f	f	2026-01-17 13:19:11.143672+03	\N
4	1	issue_created	1	{"via": "rocket_chat", "issue": {"id": 9, "title": "test", "type_id": null, "due_date": null, "priority": null, "author_id": 1, "status_id": null, "created_at": "2026-01-17T10:31:41.734Z", "project_id": 1, "start_date": null, "assignee_id": 1, "description": "test", "estimated_hours": "0.00"}, "recipient": {"user_id": 1}}	f	f	2026-01-17 13:31:41.777494+03	\N
5	1	issue_created	1	{"via": "rocket_chat", "issue": {"id": 584157, "title": "Simulated issue from script", "project_id": 1, "description": "This is a test issue generated by simulate_issue_notifications.js"}}	f	f	2026-01-17 13:42:35.729132+03	\N
6	1	issue_created	1	{"via": "rocket_chat", "issue": {"id": 10, "title": "test", "type_id": null, "due_date": null, "priority": null, "author_id": 1, "status_id": null, "created_at": "2026-01-17T10:45:10.350Z", "project_id": 1, "start_date": null, "assignee_id": 2, "description": "test", "estimated_hours": "0.00"}, "recipient": {"user_id": 1}}	f	f	2026-01-17 13:45:10.395755+03	\N
7	1	issue_created	1	{"via": "rocket_chat", "issue": {"id": 11, "title": "test", "type_id": null, "due_date": null, "priority": null, "author_id": 1, "status_id": null, "created_at": "2026-01-17T10:53:58.839Z", "project_id": 1, "start_date": null, "assignee_id": 2, "description": "test", "estimated_hours": "0.00"}, "recipient": {"user_id": 1}}	f	f	2026-01-17 13:53:58.883348+03	\N
8	1	issue_created	1	{"via": "rocket_chat", "issue": {"id": 12, "title": "1", "type_id": null, "due_date": null, "priority": null, "author_id": 1, "status_id": null, "created_at": "2026-01-17T10:58:32.646Z", "project_id": 1, "start_date": null, "assignee_id": 1, "description": "1", "estimated_hours": "0.00"}, "recipient": {"user_id": 1}}	f	f	2026-01-17 13:58:32.681059+03	\N
9	1	issue_created	1	{"via": "rocket_chat", "issue": {"id": 13, "title": "djflsf", "type_id": null, "due_date": null, "priority": null, "author_id": 1, "status_id": null, "created_at": "2026-01-17T11:02:17.880Z", "project_id": 1, "start_date": null, "assignee_id": 1, "description": "", "estimated_hours": "0.00"}, "recipient": {"user_id": 1}}	f	f	2026-01-17 14:02:17.929988+03	\N
10	1	task_assigned	1	{"issue": {"id": 1, "title": "Разработка чертежей корпуса", "type_id": 1, "due_date": "2024-03-14T21:00:00.000Z", "priority": "high", "author_id": 5, "status_id": 2, "created_at": "2025-12-24T09:54:43.505Z", "project_id": 1, "start_date": "2024-01-14T21:00:00.000Z", "assignee_id": 1, "description": "Создать комплект чертежей корпусных конструкций", "estimated_hours": "120.00"}, "assigned_by": 1}	f	f	2026-01-17 14:27:18.759392+03	\N
11	1	task_assigned	1	{"via": "rocket_chat", "issue": {"id": 2, "title": "Исправить ошибку в спецификации", "type_id": 2, "due_date": "2024-01-24T21:00:00.000Z", "priority": "medium", "author_id": 2, "status_id": 1, "created_at": "2025-12-24T09:54:43.505Z", "project_id": 1, "start_date": "2024-01-19T21:00:00.000Z", "assignee_id": 1, "description": "Обнаружена ошибка в спецификации материалов", "estimated_hours": "8.00"}, "recipient": {"user_id": 1}, "assigned_by": 1}	f	f	2026-01-17 14:30:24.921856+03	\N
12	1	task_assigned	1	{"via": "rocket_chat", "issue": {"id": 3, "title": "Подготовить отчет по проекту", "type_id": 1, "due_date": "2024-01-29T21:00:00.000Z", "priority": "low", "author_id": 5, "status_id": 3, "created_at": "2025-12-24T09:54:43.505Z", "project_id": 1, "start_date": "2024-01-24T21:00:00.000Z", "assignee_id": 1, "description": "Подготовить ежемесячный отчет о ходе работ", "estimated_hours": "16.00"}, "recipient": {"user_id": 1}, "assigned_by": 1}	f	f	2026-01-17 14:32:33.832484+03	\N
13	1	task_assigned	1	{"via": "rocket_chat", "issue": {"id": 3, "title": "Подготовить отчет по проекту", "type_id": 1, "due_date": "2024-01-29T21:00:00.000Z", "priority": "low", "author_id": 5, "status_id": 3, "created_at": "2025-12-24T09:54:43.505Z", "project_id": 1, "start_date": "2024-01-24T21:00:00.000Z", "assignee_id": 1, "description": "Подготовить ежемесячный отчет о ходе работ", "estimated_hours": "16.00"}, "message": {"html": "<html>\\n  <head>\\n    <meta charset=\\"utf-8\\" />\\n    <title>Task assigned</title>\\n  </head>\\n  <body>\\n    <div style=\\"font-family: Arial, Helvetica, sans-serif; color: #222;\\">\\n        <!-- Header with inline logo -->\\n        <div style=\\"display:flex;align-items:center;padding:12px 0;border-bottom:1px solid #e6e6e6;margin-bottom:12px\\">\\n          <div style=\\"width:48px;height:48px;flex:0 0 48px;margin-right:12px\\">\\n            <!-- simple inline SVG logo to avoid external dependencies -->\\n            <svg width=\\"48\\" height=\\"48\\" viewBox=\\"0 0 48 48\\" fill=\\"none\\" xmlns=\\"http://www.w3.org/2000/svg\\" role=\\"img\\" aria-label=\\"DeepSea logo\\">\\n              <rect width=\\"48\\" height=\\"48\\" rx=\\"6\\" fill=\\"#007bff\\" />\\n              <path d=\\"M12 30c6-8 18-8 24 0\\" stroke=\\"#fff\\" stroke-width=\\"2\\" stroke-linecap=\\"round\\" stroke-linejoin=\\"round\\" fill=\\"none\\" />\\n              <circle cx=\\"16\\" cy=\\"20\\" r=\\"3\\" fill=\\"#fff\\" />\\n            </svg>\\n          </div>\\n          <div>\\n            <div style=\\"font-size:16px;font-weight:600;color:#007bff\\">DeepSea</div>\\n            <div style=\\"font-size:12px;color:#666\\">Project: Auto Project Updated</div>\\n          </div>\\n        </div>\\n\\n        <h2 style=\\"margin-top:8px\\">Task assignment</h2>\\n      <p><strong>Task</strong>: #3 — Подготовить отчет по проекту</p>\\n      <p><strong>Assigned by</strong>: admin@deepsea.local</p>\\n      <p><strong>Assignee</strong>: 1</p>\\n      <hr />\\n      <p>Подготовить ежемесячный отчет о ходе работ</p>\\n      <p>\\n        <a href=\\"\\" style=\\"background:#007bff;color:#fff;padding:8px 12px;border-radius:4px;text-decoration:none;\\">Open task in app</a>\\n      </p>\\n      <p style=\\"color:#888;font-size:12px\\">This is an automated notification from DeepSea.</p>\\n    </div>\\n  </body>\\n</html>\\n", "text": "\\nDeepSea — Project: Auto Project Updated\\n\\nTask assignment\\nTask: #3 - Подготовить отчет по проекту\\nAssigned by: admin@deepsea.local\\nAssignee: 1\\n\\nПодготовить ежемесячный отчет о ходе работ\\n\\nOpen: \\n\\nThis is an automated notification from DeepSea.\\n", "subject": "Notification: task_assigned"}, "recipient": {"user_id": 1}, "assigned_by": 1}	f	f	2026-01-17 16:50:44.298142+03	\N
14	1	task_assigned	1	{"via": "rocket_chat", "issue": {"id": 3, "title": "Подготовить отчет по проекту", "type_id": 1, "due_date": "2024-01-29T21:00:00.000Z", "priority": "low", "author_id": 5, "status_id": 3, "created_at": "2025-12-24T09:54:43.505Z", "project_id": 1, "start_date": "2024-01-24T21:00:00.000Z", "assignee_id": 2, "description": "Подготовить ежемесячный отчет о ходе работ", "estimated_hours": "16.00"}, "recipient": {"user_id": 1}, "assigned_by": 1}	f	f	2026-01-17 17:06:06.435199+03	\N
\.


--
-- Data for Name: user_rocket_chat; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.user_rocket_chat (id, user_id, rc_username, rc_user_id, rc_display_name, created_at, updated_at) FROM stdin;
1	1	spiridovich	\N	\N	2026-01-17 11:37:46.109442	2026-01-17 11:38:18.989769
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.user_roles (id, user_id, role_id, project_id, created_at) FROM stdin;
2	2	3	1	2025-12-24 12:55:34.107305
3	3	3	1	2025-12-24 12:55:34.107305
4	4	3	1	2025-12-24 12:55:34.107305
5	5	2	1	2025-12-24 12:55:34.107305
1	1	1	2	2025-12-24 12:55:34.107305
9	1	14	3	2026-01-05 12:14:02.173448
11	2	14	3	2026-01-05 12:14:31.03491
13	1	1	1	2025-12-24 12:55:34.107305
14	1	1	3	2025-12-24 12:55:34.107305
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.users (id, username, email, phone, password_hash, first_name, last_name, middle_name, department_id, job_title_id, is_active, is_verified, last_login, created_at, updated_at, avatar_url) FROM stdin;
2	ivanov	ivanov@deepsea.local	+7-900-000-0002	$2b$10$rOzJ8K8K8K8K8K8K8K8K8eK8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K	Иван	Иванов	Иванович	1	2	t	t	\N	2025-12-24 12:54:43.496473	2025-12-24 12:54:43.496473	\N
3	petrov	petrov@deepsea.local	+7-900-000-0003	$2b$10$rOzJ8K8K8K8K8K8K8K8K8eK8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K	Петр	Петров	Петрович	2	3	t	t	\N	2025-12-24 12:54:43.496473	2025-12-24 12:54:43.496473	\N
4	sidorov	sidorov@deepsea.local	+7-900-000-0004	$2b$10$rOzJ8K8K8K8K8K8K8K8K8eK8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K	Сидор	Сидоров	Сидорович	3	4	t	t	\N	2025-12-24 12:54:43.496473	2025-12-24 12:54:43.496473	\N
5	manager1	manager1@deepsea.local	+7-900-000-0005	$2b$10$rOzJ8K8K8K8K8K8K8K8K8eK8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K	Менеджер	Проектов	Первый	4	5	t	t	\N	2025-12-24 12:54:43.496473	2025-12-24 12:54:43.496473	\N
8	john_do	john.doe@examle.com	+123456780	$2b$10$P1qfHIuXdBfwcgEJkV6fiuSRy.jHg.5Fon0v5RJxfN.7AuBKYRJsy	John	Doe	Michael	1	1	t	f	\N	2025-12-24 15:01:58.764395	2025-12-24 15:01:58.764395	\N
7	john_doe	john.doe@example.com	+1234567890	$2b$10$gydaIfU5lPSgIeLjRFCWM.qU4e6YQV3hz7YAIJGKiZc9mFH/adCEe	John	Doe	Michael	1	1	t	f	2025-12-24 15:04:08.520625	2025-12-24 14:58:33.934596	2025-12-24 14:58:33.934596	\N
9	joвыа	john.doe@exdfdgple.com	+1234567dfg890	$2b$10$CPEewetDvtUst13iq3XQ8eKEKzMHZFM32Vr/koKzkJ/pi03rm7Mwi	John	Doe	Michael	1	1	t	f	\N	2025-12-24 15:17:05.404684	2025-12-24 15:17:05.404684	\N
11	auto.user{{_$randomInt}}	auto.user{{_$randomInt}}@example.com	+10000000000	$2b$10$Q9AsCQurjMAdxFGcNBzUL.zwI0btKXBsvMwG93vjS.RSlgWaxMNBO	\N	\N	\N	\N	\N	t	f	\N	2025-12-26 11:40:20.977743	2025-12-26 11:40:20.977743	\N
12	isaev	isaev@deepsea.ru	+7999999999	$2b$10$4x9i7qAZzTSOjW7TRV2QnO4X3I8TVOC4PB.0.HBaetf4pVIGKtWla	Исаев	Богдан	\N	3	\N	t	f	\N	2026-01-05 14:33:38.848167	2026-01-05 14:59:00.322092	\N
1	admin	admin@deepsea.local	+7-900-000-0001	$2b$10$V/WHlf1qOLs01TDZHw61B.iQm.E5SdS6ne7AIxYxwv6XRgV3vmBJG	Updated	User	\N	4	1	t	t	2026-01-20 14:31:10.815829	2025-12-24 12:54:43.496473	2025-12-26 12:40:43.489914	\N
\.


--
-- Data for Name: wiki_articles; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.wiki_articles (id, title, slug, content, summary, section_id, is_published, version, created_by, updated_by, created_at, updated_at, published_at) FROM stdin;
1	Как создать задачу	how-to-create-issue	Подробная инструкция по созданию задач в системе...	Инструкция по созданию задач	2	t	1	1	\N	2025-12-24 12:54:43.534647	2025-12-24 12:54:43.534647	2024-01-01 10:00:00
2	Стандарты оформления чертежей	drawing-standards	Требования к оформлению конструкторских чертежей...	Стандарты оформления	4	t	1	1	\N	2025-12-24 12:54:43.534647	2025-12-24 12:54:43.534647	2024-01-01 10:00:00
\.


--
-- Data for Name: wiki_articles_history; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.wiki_articles_history (id, article_id, version, title, content, summary, changed_by, change_comment, created_at) FROM stdin;
\.


--
-- Data for Name: wiki_articles_storage; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.wiki_articles_storage (id, article_id, storage_id, created_at) FROM stdin;
\.


--
-- Data for Name: wiki_sections; Type: TABLE DATA; Schema: public; Owner: spiridovich
--

COPY public.wiki_sections (id, name, slug, description, parent_id, order_index, created_by, updated_by, created_at, updated_at) FROM stdin;
1	Документация	documentation	Общая документация по системе	\N	1	1	\N	2025-12-24 12:54:43.532211	2025-12-24 12:54:43.532211
2	Инструкции	instructions	Инструкции по работе	\N	2	1	\N	2025-12-24 12:54:43.532211	2025-12-24 12:54:43.532211
3	Стандарты	standards	Стандарты и нормы	\N	3	1	\N	2025-12-24 12:54:43.532211	2025-12-24 12:54:43.532211
4	Чертежи	drawings	Стандарты оформления чертежей	3	1	1	\N	2025-12-24 12:54:43.532211	2025-12-24 12:54:43.532211
\.


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.categories_id_seq', 5, true);


--
-- Name: customer_question_status_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.customer_question_status_id_seq', 3, true);


--
-- Name: customer_question_work_flow_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.customer_question_work_flow_id_seq', 1, false);


--
-- Name: customer_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.customer_questions_id_seq', 2, true);


--
-- Name: customer_questions_storage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.customer_questions_storage_id_seq', 1, false);


--
-- Name: department_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.department_id_seq', 8, true);


--
-- Name: directories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.directories_id_seq', 1, false);


--
-- Name: document_directories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.document_directories_id_seq', 1, false);


--
-- Name: document_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.document_messages_id_seq', 1, false);


--
-- Name: document_status_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.document_status_id_seq', 4, true);


--
-- Name: document_work_flow_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.document_work_flow_id_seq', 1, false);


--
-- Name: documents_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.documents_history_id_seq', 1, false);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.documents_id_seq', 9, true);


--
-- Name: documents_issue_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.documents_issue_id_seq', 1, false);


--
-- Name: documents_storage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.documents_storage_id_seq', 1, false);


--
-- Name: entity_links_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.entity_links_id_seq', 1, false);


--
-- Name: equipment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.equipment_id_seq', 2, true);


--
-- Name: equipment_storage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.equipment_storage_id_seq', 1, false);


--
-- Name: file_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.file_categories_id_seq', 5, true);


--
-- Name: issue_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.issue_history_id_seq', 4, true);


--
-- Name: issue_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.issue_id_seq', 13, true);


--
-- Name: issue_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.issue_messages_id_seq', 1, false);


--
-- Name: issue_status_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.issue_status_id_seq', 5, true);


--
-- Name: issue_storage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.issue_storage_id_seq', 1, false);


--
-- Name: issue_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.issue_type_id_seq', 4, true);


--
-- Name: issue_work_flow_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.issue_work_flow_id_seq', 3, true);


--
-- Name: job_title_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.job_title_id_seq', 7, true);


--
-- Name: material_kit_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.material_kit_items_id_seq', 1, false);


--
-- Name: material_kits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.material_kits_id_seq', 1, false);


--
-- Name: materials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.materials_id_seq', 4, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.messages_id_seq', 4, true);


--
-- Name: notification_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.notification_events_id_seq', 18, true);


--
-- Name: notification_methods_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.notification_methods_id_seq', 2, true);


--
-- Name: page_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.page_permissions_id_seq', 16, true);


--
-- Name: pages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.pages_id_seq', 27, true);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 1, false);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.permissions_id_seq', 53, true);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.projects_id_seq', 7, true);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.role_permissions_id_seq', 136, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.roles_id_seq', 14, true);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.sessions_id_seq', 175, true);


--
-- Name: sfi_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.sfi_codes_id_seq', 6, true);


--
-- Name: specializations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.specializations_id_seq', 6, true);


--
-- Name: specification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.specification_id_seq', 2, true);


--
-- Name: specification_parts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.specification_parts_id_seq', 1, false);


--
-- Name: specification_version_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.specification_version_id_seq', 1, false);


--
-- Name: stages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.stages_id_seq', 5, true);


--
-- Name: statements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.statements_id_seq', 1, true);


--
-- Name: statements_specification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.statements_specification_id_seq', 2, true);


--
-- Name: storage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.storage_id_seq', 3, true);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 2, true);


--
-- Name: time_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.time_logs_id_seq', 4, true);


--
-- Name: units_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.units_id_seq', 6, true);


--
-- Name: user_notification_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.user_notification_settings_id_seq', 2, true);


--
-- Name: user_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.user_notifications_id_seq', 14, true);


--
-- Name: user_rocket_chat_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.user_rocket_chat_id_seq', 1, true);


--
-- Name: user_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.user_roles_id_seq', 14, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.users_id_seq', 12, true);


--
-- Name: wiki_articles_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.wiki_articles_history_id_seq', 1, false);


--
-- Name: wiki_articles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.wiki_articles_id_seq', 2, true);


--
-- Name: wiki_articles_storage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.wiki_articles_storage_id_seq', 1, false);


--
-- Name: wiki_sections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spiridovich
--

SELECT pg_catalog.setval('public.wiki_sections_id_seq', 4, true);


--
-- Name: categories categories_code_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_code_key UNIQUE (code);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: customer_question_status customer_question_status_code_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_question_status
    ADD CONSTRAINT customer_question_status_code_key UNIQUE (code);


--
-- Name: customer_question_status customer_question_status_name_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_question_status
    ADD CONSTRAINT customer_question_status_name_key UNIQUE (name);


--
-- Name: customer_question_status customer_question_status_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_question_status
    ADD CONSTRAINT customer_question_status_pkey PRIMARY KEY (id);


--
-- Name: customer_question_work_flow customer_question_work_flow_from_status_id_to_status_id_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_question_work_flow
    ADD CONSTRAINT customer_question_work_flow_from_status_id_to_status_id_key UNIQUE (from_status_id, to_status_id);


--
-- Name: customer_question_work_flow customer_question_work_flow_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_question_work_flow
    ADD CONSTRAINT customer_question_work_flow_pkey PRIMARY KEY (id);


--
-- Name: customer_questions customer_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_questions
    ADD CONSTRAINT customer_questions_pkey PRIMARY KEY (id);


--
-- Name: customer_questions_storage customer_questions_storage_customer_question_id_storage_id_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_questions_storage
    ADD CONSTRAINT customer_questions_storage_customer_question_id_storage_id_key UNIQUE (customer_question_id, storage_id);


--
-- Name: customer_questions_storage customer_questions_storage_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_questions_storage
    ADD CONSTRAINT customer_questions_storage_pkey PRIMARY KEY (id);


--
-- Name: department department_name_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.department
    ADD CONSTRAINT department_name_key UNIQUE (name);


--
-- Name: department department_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.department
    ADD CONSTRAINT department_pkey PRIMARY KEY (id);


--
-- Name: directories directories_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.directories
    ADD CONSTRAINT directories_pkey PRIMARY KEY (id);


--
-- Name: document_directories document_directories_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.document_directories
    ADD CONSTRAINT document_directories_pkey PRIMARY KEY (id);


--
-- Name: document_messages document_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.document_messages
    ADD CONSTRAINT document_messages_pkey PRIMARY KEY (id);


--
-- Name: document_status document_status_code_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.document_status
    ADD CONSTRAINT document_status_code_key UNIQUE (code);


--
-- Name: document_status document_status_name_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.document_status
    ADD CONSTRAINT document_status_name_key UNIQUE (name);


--
-- Name: document_status document_status_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.document_status
    ADD CONSTRAINT document_status_pkey PRIMARY KEY (id);


--
-- Name: document_work_flow document_work_flow_from_status_id_to_status_id_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.document_work_flow
    ADD CONSTRAINT document_work_flow_from_status_id_to_status_id_key UNIQUE (from_status_id, to_status_id);


--
-- Name: document_work_flow document_work_flow_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.document_work_flow
    ADD CONSTRAINT document_work_flow_pkey PRIMARY KEY (id);


--
-- Name: documents_history documents_history_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents_history
    ADD CONSTRAINT documents_history_pkey PRIMARY KEY (id);


--
-- Name: documents_issue documents_issue_document_id_issue_id_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents_issue
    ADD CONSTRAINT documents_issue_document_id_issue_id_key UNIQUE (document_id, issue_id);


--
-- Name: documents_issue documents_issue_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents_issue
    ADD CONSTRAINT documents_issue_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: documents_storage documents_storage_document_id_storage_id_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents_storage
    ADD CONSTRAINT documents_storage_document_id_storage_id_key UNIQUE (document_id, storage_id);


--
-- Name: documents_storage documents_storage_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents_storage
    ADD CONSTRAINT documents_storage_pkey PRIMARY KEY (id);


--
-- Name: entity_links entity_links_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.entity_links
    ADD CONSTRAINT entity_links_pkey PRIMARY KEY (id);


--
-- Name: entity_links entity_links_source_type_source_id_target_type_target_id_re_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.entity_links
    ADD CONSTRAINT entity_links_source_type_source_id_target_type_target_id_re_key UNIQUE (source_type, source_id, target_type, target_id, relation_type);


--
-- Name: equipment equipment_equipment_code_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_equipment_code_key UNIQUE (equipment_code);


--
-- Name: equipment equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_pkey PRIMARY KEY (id);


--
-- Name: equipment_storage equipment_storage_equipment_id_storage_id_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.equipment_storage
    ADD CONSTRAINT equipment_storage_equipment_id_storage_id_key UNIQUE (equipment_id, storage_id);


--
-- Name: equipment_storage equipment_storage_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.equipment_storage
    ADD CONSTRAINT equipment_storage_pkey PRIMARY KEY (id);


--
-- Name: file_categories file_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.file_categories
    ADD CONSTRAINT file_categories_code_key UNIQUE (code);


--
-- Name: file_categories file_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.file_categories
    ADD CONSTRAINT file_categories_name_key UNIQUE (name);


--
-- Name: file_categories file_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.file_categories
    ADD CONSTRAINT file_categories_pkey PRIMARY KEY (id);


--
-- Name: issue_history issue_history_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_history
    ADD CONSTRAINT issue_history_pkey PRIMARY KEY (id);


--
-- Name: issue_messages issue_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_messages
    ADD CONSTRAINT issue_messages_pkey PRIMARY KEY (id);


--
-- Name: issues issue_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issue_pkey PRIMARY KEY (id);


--
-- Name: issue_status issue_status_code_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_status
    ADD CONSTRAINT issue_status_code_key UNIQUE (code);


--
-- Name: issue_status issue_status_name_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_status
    ADD CONSTRAINT issue_status_name_key UNIQUE (name);


--
-- Name: issue_status issue_status_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_status
    ADD CONSTRAINT issue_status_pkey PRIMARY KEY (id);


--
-- Name: issue_storage issue_storage_issue_id_storage_id_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_storage
    ADD CONSTRAINT issue_storage_issue_id_storage_id_key UNIQUE (issue_id, storage_id);


--
-- Name: issue_storage issue_storage_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_storage
    ADD CONSTRAINT issue_storage_pkey PRIMARY KEY (id);


--
-- Name: issue_type issue_type_code_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_type
    ADD CONSTRAINT issue_type_code_key UNIQUE (code);


--
-- Name: issue_type issue_type_name_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_type
    ADD CONSTRAINT issue_type_name_key UNIQUE (name);


--
-- Name: issue_type issue_type_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_type
    ADD CONSTRAINT issue_type_pkey PRIMARY KEY (id);


--
-- Name: issue_work_flow issue_work_flow_issue_type_id_from_status_id_to_status_id_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_work_flow
    ADD CONSTRAINT issue_work_flow_issue_type_id_from_status_id_to_status_id_key UNIQUE (issue_type_id, from_status_id, to_status_id);


--
-- Name: issue_work_flow issue_work_flow_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_work_flow
    ADD CONSTRAINT issue_work_flow_pkey PRIMARY KEY (id);


--
-- Name: job_title job_title_name_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.job_title
    ADD CONSTRAINT job_title_name_key UNIQUE (name);


--
-- Name: job_title job_title_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.job_title
    ADD CONSTRAINT job_title_pkey PRIMARY KEY (id);


--
-- Name: material_kit_items material_kit_items_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.material_kit_items
    ADD CONSTRAINT material_kit_items_pkey PRIMARY KEY (id);


--
-- Name: material_kits material_kits_code_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.material_kits
    ADD CONSTRAINT material_kits_code_key UNIQUE (code);


--
-- Name: material_kits material_kits_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.material_kits
    ADD CONSTRAINT material_kits_pkey PRIMARY KEY (id);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: materials materials_stock_code_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_stock_code_key UNIQUE (stock_code);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notification_events notification_events_code_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.notification_events
    ADD CONSTRAINT notification_events_code_key UNIQUE (code);


--
-- Name: notification_events notification_events_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.notification_events
    ADD CONSTRAINT notification_events_pkey PRIMARY KEY (id);


--
-- Name: notification_methods notification_methods_code_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.notification_methods
    ADD CONSTRAINT notification_methods_code_key UNIQUE (code);


--
-- Name: notification_methods notification_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.notification_methods
    ADD CONSTRAINT notification_methods_pkey PRIMARY KEY (id);


--
-- Name: page_permissions page_permissions_page_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.page_permissions
    ADD CONSTRAINT page_permissions_page_id_permission_id_key UNIQUE (page_id, permission_id);


--
-- Name: page_permissions page_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.page_permissions
    ADD CONSTRAINT page_permissions_pkey PRIMARY KEY (id);


--
-- Name: pages pages_key_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_key_key UNIQUE (key);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: permissions permissions_code_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: projects projects_code_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_code_key UNIQUE (code);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_key UNIQUE (token);


--
-- Name: sfi_codes sfi_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.sfi_codes
    ADD CONSTRAINT sfi_codes_code_key UNIQUE (code);


--
-- Name: sfi_codes sfi_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.sfi_codes
    ADD CONSTRAINT sfi_codes_pkey PRIMARY KEY (id);


--
-- Name: specializations specializations_code_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specializations
    ADD CONSTRAINT specializations_code_key UNIQUE (code);


--
-- Name: specializations specializations_name_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specializations
    ADD CONSTRAINT specializations_name_key UNIQUE (name);


--
-- Name: specializations specializations_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specializations
    ADD CONSTRAINT specializations_pkey PRIMARY KEY (id);


--
-- Name: specification_parts specification_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specification_parts
    ADD CONSTRAINT specification_parts_pkey PRIMARY KEY (id);


--
-- Name: specification specification_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specification
    ADD CONSTRAINT specification_pkey PRIMARY KEY (id);


--
-- Name: specification_version specification_version_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specification_version
    ADD CONSTRAINT specification_version_pkey PRIMARY KEY (id);


--
-- Name: stages stages_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.stages
    ADD CONSTRAINT stages_pkey PRIMARY KEY (id);


--
-- Name: statements statements_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.statements
    ADD CONSTRAINT statements_pkey PRIMARY KEY (id);


--
-- Name: statements_specification statements_specification_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.statements_specification
    ADD CONSTRAINT statements_specification_pkey PRIMARY KEY (id);


--
-- Name: statements_specification statements_specification_statement_id_specification_id_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.statements_specification
    ADD CONSTRAINT statements_specification_statement_id_specification_id_key UNIQUE (statement_id, specification_id);


--
-- Name: storage storage_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.storage
    ADD CONSTRAINT storage_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_code_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_code_key UNIQUE (code);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: time_logs time_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT time_logs_pkey PRIMARY KEY (id);


--
-- Name: units units_code_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_code_key UNIQUE (code);


--
-- Name: units units_name_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_name_key UNIQUE (name);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: user_notification_settings user_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_pkey PRIMARY KEY (id);


--
-- Name: user_notifications user_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_pkey PRIMARY KEY (id);


--
-- Name: user_rocket_chat user_rocket_chat_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.user_rocket_chat
    ADD CONSTRAINT user_rocket_chat_pkey PRIMARY KEY (id);


--
-- Name: user_rocket_chat user_rocket_chat_rc_username_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.user_rocket_chat
    ADD CONSTRAINT user_rocket_chat_rc_username_key UNIQUE (rc_username);


--
-- Name: user_rocket_chat user_rocket_chat_user_id_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.user_rocket_chat
    ADD CONSTRAINT user_rocket_chat_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_id_project_id_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_id_project_id_key UNIQUE (user_id, role_id, project_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: wiki_articles_history wiki_articles_history_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_articles_history
    ADD CONSTRAINT wiki_articles_history_pkey PRIMARY KEY (id);


--
-- Name: wiki_articles wiki_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_articles
    ADD CONSTRAINT wiki_articles_pkey PRIMARY KEY (id);


--
-- Name: wiki_articles wiki_articles_section_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_articles
    ADD CONSTRAINT wiki_articles_section_id_slug_key UNIQUE (section_id, slug);


--
-- Name: wiki_articles_storage wiki_articles_storage_article_id_storage_id_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_articles_storage
    ADD CONSTRAINT wiki_articles_storage_article_id_storage_id_key UNIQUE (article_id, storage_id);


--
-- Name: wiki_articles_storage wiki_articles_storage_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_articles_storage
    ADD CONSTRAINT wiki_articles_storage_pkey PRIMARY KEY (id);


--
-- Name: wiki_sections wiki_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_sections
    ADD CONSTRAINT wiki_sections_pkey PRIMARY KEY (id);


--
-- Name: wiki_sections wiki_sections_slug_key; Type: CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_sections
    ADD CONSTRAINT wiki_sections_slug_key UNIQUE (slug);


--
-- Name: idx_categories_code; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_categories_code ON public.categories USING btree (code);


--
-- Name: idx_categories_parent_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);


--
-- Name: idx_customer_question_status_code; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_customer_question_status_code ON public.customer_question_status USING btree (code);


--
-- Name: idx_customer_question_status_order; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_customer_question_status_order ON public.customer_question_status USING btree (order_index);


--
-- Name: idx_customer_question_work_flow_active; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_customer_question_work_flow_active ON public.customer_question_work_flow USING btree (is_active);


--
-- Name: idx_customer_question_work_flow_from_status; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_customer_question_work_flow_from_status ON public.customer_question_work_flow USING btree (from_status_id);


--
-- Name: idx_customer_question_work_flow_to_status; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_customer_question_work_flow_to_status ON public.customer_question_work_flow USING btree (to_status_id);


--
-- Name: idx_customer_questions_answered_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_customer_questions_answered_by ON public.customer_questions USING btree (answered_by);


--
-- Name: idx_customer_questions_asked_at; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_customer_questions_asked_at ON public.customer_questions USING btree (asked_at);


--
-- Name: idx_customer_questions_asked_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_customer_questions_asked_by ON public.customer_questions USING btree (asked_by);


--
-- Name: idx_customer_questions_document_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_customer_questions_document_id ON public.customer_questions USING btree (document_id);


--
-- Name: idx_customer_questions_due_date; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_customer_questions_due_date ON public.customer_questions USING btree (due_date);


--
-- Name: idx_customer_questions_priority; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_customer_questions_priority ON public.customer_questions USING btree (priority);


--
-- Name: idx_customer_questions_project_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_customer_questions_project_id ON public.customer_questions USING btree (project_id);


--
-- Name: idx_customer_questions_status; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_customer_questions_status ON public.customer_questions USING btree (status);


--
-- Name: idx_customer_questions_storage_customer_question_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_customer_questions_storage_customer_question_id ON public.customer_questions_storage USING btree (customer_question_id);


--
-- Name: idx_customer_questions_storage_storage_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_customer_questions_storage_storage_id ON public.customer_questions_storage USING btree (storage_id);


--
-- Name: idx_department_manager_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_department_manager_id ON public.department USING btree (manager_id);


--
-- Name: idx_directories_created_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_directories_created_by ON public.directories USING btree (created_by);


--
-- Name: idx_directories_order_index; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_directories_order_index ON public.directories USING btree (order_index);


--
-- Name: idx_directories_parent_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_directories_parent_id ON public.directories USING btree (parent_id);


--
-- Name: idx_directories_path; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_directories_path ON public.directories USING btree (path);


--
-- Name: idx_directories_updated_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_directories_updated_by ON public.directories USING btree (updated_by);


--
-- Name: idx_document_directories_created_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_document_directories_created_by ON public.document_directories USING btree (created_by);


--
-- Name: idx_document_directories_order_index; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_document_directories_order_index ON public.document_directories USING btree (order_index);


--
-- Name: idx_document_directories_parent_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_document_directories_parent_id ON public.document_directories USING btree (parent_id);


--
-- Name: idx_document_directories_path; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_document_directories_path ON public.document_directories USING btree (path);


--
-- Name: idx_document_directories_updated_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_document_directories_updated_by ON public.document_directories USING btree (updated_by);


--
-- Name: idx_document_messages_document_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_document_messages_document_id ON public.document_messages USING btree (document_id);


--
-- Name: idx_document_status_code; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_document_status_code ON public.document_status USING btree (code);


--
-- Name: idx_document_status_order; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_document_status_order ON public.document_status USING btree (order_index);


--
-- Name: idx_document_work_flow_active; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_document_work_flow_active ON public.document_work_flow USING btree (is_active);


--
-- Name: idx_document_work_flow_from_status; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_document_work_flow_from_status ON public.document_work_flow USING btree (from_status_id);


--
-- Name: idx_document_work_flow_to_status; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_document_work_flow_to_status ON public.document_work_flow USING btree (to_status_id);


--
-- Name: idx_documents_created_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_documents_created_by ON public.documents USING btree (created_by);


--
-- Name: idx_documents_directory_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_documents_directory_id ON public.documents USING btree (directory_id);


--
-- Name: idx_documents_history_changed_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_documents_history_changed_by ON public.documents_history USING btree (changed_by);


--
-- Name: idx_documents_history_created_at; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_documents_history_created_at ON public.documents_history USING btree (created_at);


--
-- Name: idx_documents_history_document_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_documents_history_document_id ON public.documents_history USING btree (document_id);


--
-- Name: idx_documents_history_field_name; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_documents_history_field_name ON public.documents_history USING btree (field_name);


--
-- Name: idx_documents_issue_document_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_documents_issue_document_id ON public.documents_issue USING btree (document_id);


--
-- Name: idx_documents_issue_issue_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_documents_issue_issue_id ON public.documents_issue USING btree (issue_id);


--
-- Name: idx_documents_project_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_documents_project_id ON public.documents USING btree (project_id);


--
-- Name: idx_documents_specialization_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_documents_specialization_id ON public.documents USING btree (specialization_id);


--
-- Name: idx_documents_stage_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_documents_stage_id ON public.documents USING btree (stage_id);


--
-- Name: idx_documents_status_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_documents_status_id ON public.documents USING btree (status_id);


--
-- Name: idx_documents_storage_document_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_documents_storage_document_id ON public.documents_storage USING btree (document_id);


--
-- Name: idx_documents_storage_storage_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_documents_storage_storage_id ON public.documents_storage USING btree (storage_id);


--
-- Name: idx_documents_updated_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_documents_updated_by ON public.documents USING btree (updated_by);


--
-- Name: idx_entity_links_blocks; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_entity_links_blocks ON public.entity_links USING btree (blocks_closure);


--
-- Name: idx_entity_links_source; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_entity_links_source ON public.entity_links USING btree (source_type, source_id);


--
-- Name: idx_entity_links_target; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_entity_links_target ON public.entity_links USING btree (target_type, target_id);


--
-- Name: idx_equipment_created_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_equipment_created_by ON public.equipment USING btree (created_by);


--
-- Name: idx_equipment_equipment_code; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_equipment_equipment_code ON public.equipment USING btree (equipment_code);


--
-- Name: idx_equipment_manufacturer; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_equipment_manufacturer ON public.equipment USING btree (manufacturer);


--
-- Name: idx_equipment_project_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_equipment_project_id ON public.equipment USING btree (project_id);


--
-- Name: idx_equipment_sfi_code_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_equipment_sfi_code_id ON public.equipment USING btree (sfi_code_id);


--
-- Name: idx_equipment_status; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_equipment_status ON public.equipment USING btree (status);


--
-- Name: idx_equipment_storage_equipment_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_equipment_storage_equipment_id ON public.equipment_storage USING btree (equipment_id);


--
-- Name: idx_equipment_storage_storage_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_equipment_storage_storage_id ON public.equipment_storage USING btree (storage_id);


--
-- Name: idx_equipment_supplier_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_equipment_supplier_id ON public.equipment USING btree (supplier_id);


--
-- Name: idx_equipment_updated_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_equipment_updated_by ON public.equipment USING btree (updated_by);


--
-- Name: idx_file_categories_code; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_file_categories_code ON public.file_categories USING btree (code);


--
-- Name: idx_file_categories_order_index; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_file_categories_order_index ON public.file_categories USING btree (order_index);


--
-- Name: idx_file_categories_parent_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_file_categories_parent_id ON public.file_categories USING btree (parent_id);


--
-- Name: idx_issue_assignee_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_assignee_id ON public.issues USING btree (assignee_id);


--
-- Name: idx_issue_due_date; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_due_date ON public.issues USING btree (due_date);


--
-- Name: idx_issue_history_changed_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_history_changed_by ON public.issue_history USING btree (changed_by);


--
-- Name: idx_issue_history_created_at; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_history_created_at ON public.issue_history USING btree (created_at);


--
-- Name: idx_issue_history_field_name; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_history_field_name ON public.issue_history USING btree (field_name);


--
-- Name: idx_issue_history_issue_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_history_issue_id ON public.issue_history USING btree (issue_id);


--
-- Name: idx_issue_messages_issue_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_messages_issue_id ON public.issue_messages USING btree (issue_id);


--
-- Name: idx_issue_priority; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_priority ON public.issues USING btree (priority);


--
-- Name: idx_issue_project_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_project_id ON public.issues USING btree (project_id);


--
-- Name: idx_issue_reporter_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_reporter_id ON public.issues USING btree (author_id);


--
-- Name: idx_issue_start_date; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_start_date ON public.issues USING btree (start_date);


--
-- Name: idx_issue_status_code; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_status_code ON public.issue_status USING btree (code);


--
-- Name: idx_issue_status_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_status_id ON public.issues USING btree (status_id);


--
-- Name: idx_issue_status_order; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_status_order ON public.issue_status USING btree (order_index);


--
-- Name: idx_issue_storage_issue_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_storage_issue_id ON public.issue_storage USING btree (issue_id);


--
-- Name: idx_issue_storage_storage_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_storage_storage_id ON public.issue_storage USING btree (storage_id);


--
-- Name: idx_issue_type_code; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_type_code ON public.issue_type USING btree (code);


--
-- Name: idx_issue_type_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_type_id ON public.issues USING btree (type_id);


--
-- Name: idx_issue_type_order; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_type_order ON public.issue_type USING btree (order_index);


--
-- Name: idx_issue_work_flow_active; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_work_flow_active ON public.issue_work_flow USING btree (is_active);


--
-- Name: idx_issue_work_flow_from_status; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_work_flow_from_status ON public.issue_work_flow USING btree (from_status_id);


--
-- Name: idx_issue_work_flow_issue_type; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_work_flow_issue_type ON public.issue_work_flow USING btree (issue_type_id);


--
-- Name: idx_issue_work_flow_to_status; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_issue_work_flow_to_status ON public.issue_work_flow USING btree (to_status_id);


--
-- Name: idx_materials_category_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_materials_category_id ON public.materials USING btree (category_id);


--
-- Name: idx_materials_created_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_materials_created_by ON public.materials USING btree (created_by);


--
-- Name: idx_materials_directory_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_materials_directory_id ON public.materials USING btree (directory_id);


--
-- Name: idx_materials_stock_code; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_materials_stock_code ON public.materials USING btree (stock_code);


--
-- Name: idx_materials_unit_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_materials_unit_id ON public.materials USING btree (unit_id);


--
-- Name: idx_materials_updated_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_materials_updated_by ON public.materials USING btree (updated_by);


--
-- Name: idx_messages_author_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_messages_author_id ON public.messages USING btree (author_id);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at);


--
-- Name: idx_messages_document_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_messages_document_id ON public.messages USING btree (document_id);


--
-- Name: idx_messages_issue_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_messages_issue_id ON public.messages USING btree (issue_id);


--
-- Name: idx_messages_parent_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_messages_parent_id ON public.messages USING btree (parent_id);


--
-- Name: idx_password_reset_tokens_token; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_projects_code; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_projects_code ON public.projects USING btree (code);


--
-- Name: idx_projects_owner_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_projects_owner_id ON public.projects USING btree (owner_id);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);


--
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- Name: idx_sessions_token; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_sessions_token ON public.sessions USING btree (token);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: idx_sfi_codes_code; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_sfi_codes_code ON public.sfi_codes USING btree (code);


--
-- Name: idx_sfi_codes_level; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_sfi_codes_level ON public.sfi_codes USING btree (level);


--
-- Name: idx_sfi_codes_order_index; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_sfi_codes_order_index ON public.sfi_codes USING btree (order_index);


--
-- Name: idx_sfi_codes_parent_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_sfi_codes_parent_id ON public.sfi_codes USING btree (parent_id);


--
-- Name: idx_specializations_code; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_specializations_code ON public.specializations USING btree (code);


--
-- Name: idx_specializations_order; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_specializations_order ON public.specializations USING btree (order_index);


--
-- Name: idx_specification_code; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_specification_code ON public.specification USING btree (code);


--
-- Name: idx_specification_created_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_specification_created_by ON public.specification USING btree (created_by);


--
-- Name: idx_specification_document_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_specification_document_id ON public.specification USING btree (document_id);


--
-- Name: idx_specification_project_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_specification_project_id ON public.specification USING btree (project_id);


--
-- Name: idx_specification_updated_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_specification_updated_by ON public.specification USING btree (updated_by);


--
-- Name: idx_stages_end_date; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_stages_end_date ON public.stages USING btree (end_date);


--
-- Name: idx_stages_order_index; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_stages_order_index ON public.stages USING btree (order_index);


--
-- Name: idx_stages_project_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_stages_project_id ON public.stages USING btree (project_id);


--
-- Name: idx_statements_code; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_statements_code ON public.statements USING btree (code);


--
-- Name: idx_statements_created_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_statements_created_by ON public.statements USING btree (created_by);


--
-- Name: idx_statements_document_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_statements_document_id ON public.statements USING btree (document_id);


--
-- Name: idx_statements_specification_specification_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_statements_specification_specification_id ON public.statements_specification USING btree (specification_id);


--
-- Name: idx_statements_specification_statement_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_statements_specification_statement_id ON public.statements_specification USING btree (statement_id);


--
-- Name: idx_statements_updated_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_statements_updated_by ON public.statements USING btree (updated_by);


--
-- Name: idx_storage_bucket_name; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_storage_bucket_name ON public.storage USING btree (bucket_name);


--
-- Name: idx_storage_object_key; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_storage_object_key ON public.storage USING btree (object_key);


--
-- Name: idx_storage_storage_type; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_storage_storage_type ON public.storage USING btree (storage_type);


--
-- Name: idx_storage_uploaded_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_storage_uploaded_by ON public.storage USING btree (uploaded_by);


--
-- Name: idx_suppliers_code; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_suppliers_code ON public.suppliers USING btree (code);


--
-- Name: idx_suppliers_created_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_suppliers_created_by ON public.suppliers USING btree (created_by);


--
-- Name: idx_suppliers_is_active; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_suppliers_is_active ON public.suppliers USING btree (is_active);


--
-- Name: idx_suppliers_name; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_suppliers_name ON public.suppliers USING btree (name);


--
-- Name: idx_suppliers_updated_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_suppliers_updated_by ON public.suppliers USING btree (updated_by);


--
-- Name: idx_time_logs_date; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_time_logs_date ON public.time_logs USING btree (date);


--
-- Name: idx_time_logs_issue_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_time_logs_issue_id ON public.time_logs USING btree (issue_id);


--
-- Name: idx_time_logs_user_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_time_logs_user_id ON public.time_logs USING btree (user_id);


--
-- Name: idx_units_code; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_units_code ON public.units USING btree (code);


--
-- Name: idx_user_notification_settings_event; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_user_notification_settings_event ON public.user_notification_settings USING btree (event_id);


--
-- Name: idx_user_notification_settings_project; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_user_notification_settings_project ON public.user_notification_settings USING btree (project_id);


--
-- Name: idx_user_notification_settings_user; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_user_notification_settings_user ON public.user_notification_settings USING btree (user_id);


--
-- Name: idx_user_notifications_user_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_user_notifications_user_id ON public.user_notifications USING btree (user_id);


--
-- Name: idx_user_notifications_user_id_is_hidden; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_user_notifications_user_id_is_hidden ON public.user_notifications USING btree (user_id, is_hidden);


--
-- Name: idx_user_notifications_user_id_is_read; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_user_notifications_user_id_is_read ON public.user_notifications USING btree (user_id, is_read);


--
-- Name: idx_users_department_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_users_department_id ON public.users USING btree (department_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_job_title_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_users_job_title_id ON public.users USING btree (job_title_id);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: idx_wiki_articles_created_at; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_wiki_articles_created_at ON public.wiki_articles USING btree (created_at);


--
-- Name: idx_wiki_articles_created_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_wiki_articles_created_by ON public.wiki_articles USING btree (created_by);


--
-- Name: idx_wiki_articles_history_article_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_wiki_articles_history_article_id ON public.wiki_articles_history USING btree (article_id);


--
-- Name: idx_wiki_articles_history_changed_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_wiki_articles_history_changed_by ON public.wiki_articles_history USING btree (changed_by);


--
-- Name: idx_wiki_articles_history_created_at; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_wiki_articles_history_created_at ON public.wiki_articles_history USING btree (created_at);


--
-- Name: idx_wiki_articles_history_version; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_wiki_articles_history_version ON public.wiki_articles_history USING btree (version);


--
-- Name: idx_wiki_articles_is_published; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_wiki_articles_is_published ON public.wiki_articles USING btree (is_published);


--
-- Name: idx_wiki_articles_published_at; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_wiki_articles_published_at ON public.wiki_articles USING btree (published_at);


--
-- Name: idx_wiki_articles_section_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_wiki_articles_section_id ON public.wiki_articles USING btree (section_id);


--
-- Name: idx_wiki_articles_slug; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_wiki_articles_slug ON public.wiki_articles USING btree (slug);


--
-- Name: idx_wiki_articles_storage_article_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_wiki_articles_storage_article_id ON public.wiki_articles_storage USING btree (article_id);


--
-- Name: idx_wiki_articles_storage_storage_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_wiki_articles_storage_storage_id ON public.wiki_articles_storage USING btree (storage_id);


--
-- Name: idx_wiki_articles_updated_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_wiki_articles_updated_by ON public.wiki_articles USING btree (updated_by);


--
-- Name: idx_wiki_sections_created_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_wiki_sections_created_by ON public.wiki_sections USING btree (created_by);


--
-- Name: idx_wiki_sections_order_index; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_wiki_sections_order_index ON public.wiki_sections USING btree (order_index);


--
-- Name: idx_wiki_sections_parent_id; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_wiki_sections_parent_id ON public.wiki_sections USING btree (parent_id);


--
-- Name: idx_wiki_sections_slug; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_wiki_sections_slug ON public.wiki_sections USING btree (slug);


--
-- Name: idx_wiki_sections_updated_by; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE INDEX idx_wiki_sections_updated_by ON public.wiki_sections USING btree (updated_by);


--
-- Name: ux_user_notification_settings_unique; Type: INDEX; Schema: public; Owner: spiridovich
--

CREATE UNIQUE INDEX ux_user_notification_settings_unique ON public.user_notification_settings USING btree (user_id, project_id, event_id, method_id);


--
-- Name: user_notification_settings tg_user_notification_settings_updated_at; Type: TRIGGER; Schema: public; Owner: spiridovich
--

CREATE TRIGGER tg_user_notification_settings_updated_at BEFORE UPDATE ON public.user_notification_settings FOR EACH ROW EXECUTE FUNCTION public.user_notification_settings_updated_at_trigger();


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: customer_question_work_flow customer_question_work_flow_from_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_question_work_flow
    ADD CONSTRAINT customer_question_work_flow_from_status_id_fkey FOREIGN KEY (from_status_id) REFERENCES public.customer_question_status(id) ON DELETE CASCADE;


--
-- Name: customer_question_work_flow customer_question_work_flow_to_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_question_work_flow
    ADD CONSTRAINT customer_question_work_flow_to_status_id_fkey FOREIGN KEY (to_status_id) REFERENCES public.customer_question_status(id) ON DELETE CASCADE;


--
-- Name: customer_questions customer_questions_answered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_questions
    ADD CONSTRAINT customer_questions_answered_by_fkey FOREIGN KEY (answered_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: customer_questions customer_questions_asked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_questions
    ADD CONSTRAINT customer_questions_asked_by_fkey FOREIGN KEY (asked_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: customer_questions customer_questions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_questions
    ADD CONSTRAINT customer_questions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: customer_questions customer_questions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_questions
    ADD CONSTRAINT customer_questions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: customer_questions_storage customer_questions_storage_customer_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_questions_storage
    ADD CONSTRAINT customer_questions_storage_customer_question_id_fkey FOREIGN KEY (customer_question_id) REFERENCES public.customer_questions(id) ON DELETE CASCADE;


--
-- Name: customer_questions_storage customer_questions_storage_storage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.customer_questions_storage
    ADD CONSTRAINT customer_questions_storage_storage_id_fkey FOREIGN KEY (storage_id) REFERENCES public.storage(id) ON DELETE CASCADE;


--
-- Name: directories directories_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.directories
    ADD CONSTRAINT directories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: directories directories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.directories
    ADD CONSTRAINT directories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.directories(id) ON DELETE CASCADE;


--
-- Name: directories directories_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.directories
    ADD CONSTRAINT directories_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: document_directories document_directories_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.document_directories
    ADD CONSTRAINT document_directories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: document_directories document_directories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.document_directories
    ADD CONSTRAINT document_directories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.document_directories(id) ON DELETE CASCADE;


--
-- Name: document_directories document_directories_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.document_directories
    ADD CONSTRAINT document_directories_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: document_messages document_messages_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.document_messages
    ADD CONSTRAINT document_messages_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: document_messages document_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.document_messages
    ADD CONSTRAINT document_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: document_work_flow document_work_flow_from_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.document_work_flow
    ADD CONSTRAINT document_work_flow_from_status_id_fkey FOREIGN KEY (from_status_id) REFERENCES public.document_status(id) ON DELETE CASCADE;


--
-- Name: document_work_flow document_work_flow_to_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.document_work_flow
    ADD CONSTRAINT document_work_flow_to_status_id_fkey FOREIGN KEY (to_status_id) REFERENCES public.document_status(id) ON DELETE CASCADE;


--
-- Name: documents documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: documents documents_directory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_directory_id_fkey FOREIGN KEY (directory_id) REFERENCES public.document_directories(id) ON DELETE SET NULL;


--
-- Name: documents_history documents_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents_history
    ADD CONSTRAINT documents_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: documents_history documents_history_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents_history
    ADD CONSTRAINT documents_history_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: documents_issue documents_issue_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents_issue
    ADD CONSTRAINT documents_issue_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: documents_issue documents_issue_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents_issue
    ADD CONSTRAINT documents_issue_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: documents documents_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: documents documents_specialization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_specialization_id_fkey FOREIGN KEY (specialization_id) REFERENCES public.specializations(id) ON DELETE SET NULL;


--
-- Name: documents documents_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.stages(id) ON DELETE SET NULL;


--
-- Name: documents documents_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.document_status(id) ON DELETE SET NULL;


--
-- Name: documents_storage documents_storage_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents_storage
    ADD CONSTRAINT documents_storage_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: documents_storage documents_storage_storage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents_storage
    ADD CONSTRAINT documents_storage_storage_id_fkey FOREIGN KEY (storage_id) REFERENCES public.storage(id) ON DELETE CASCADE;


--
-- Name: documents documents_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: entity_links entity_links_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.entity_links
    ADD CONSTRAINT entity_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: equipment equipment_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: equipment equipment_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: equipment equipment_sfi_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_sfi_code_id_fkey FOREIGN KEY (sfi_code_id) REFERENCES public.sfi_codes(id) ON DELETE RESTRICT;


--
-- Name: equipment_storage equipment_storage_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.equipment_storage
    ADD CONSTRAINT equipment_storage_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE CASCADE;


--
-- Name: equipment_storage equipment_storage_storage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.equipment_storage
    ADD CONSTRAINT equipment_storage_storage_id_fkey FOREIGN KEY (storage_id) REFERENCES public.storage(id) ON DELETE CASCADE;


--
-- Name: equipment equipment_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: equipment equipment_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: file_categories file_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.file_categories
    ADD CONSTRAINT file_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.file_categories(id) ON DELETE SET NULL;


--
-- Name: department fk_department_manager; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.department
    ADD CONSTRAINT fk_department_manager FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: users fk_users_department; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES public.department(id) ON DELETE SET NULL;


--
-- Name: users fk_users_job_title; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_job_title FOREIGN KEY (job_title_id) REFERENCES public.job_title(id) ON DELETE SET NULL;


--
-- Name: issues issue_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issue_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: issue_history issue_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_history
    ADD CONSTRAINT issue_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: issue_history issue_history_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_history
    ADD CONSTRAINT issue_history_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: issue_messages issue_messages_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_messages
    ADD CONSTRAINT issue_messages_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: issue_messages issue_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_messages
    ADD CONSTRAINT issue_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: issues issue_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issue_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: issues issue_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issue_reporter_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: issues issue_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issue_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.issue_status(id) ON DELETE SET NULL;


--
-- Name: issue_storage issue_storage_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_storage
    ADD CONSTRAINT issue_storage_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: issue_storage issue_storage_storage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_storage
    ADD CONSTRAINT issue_storage_storage_id_fkey FOREIGN KEY (storage_id) REFERENCES public.storage(id) ON DELETE CASCADE;


--
-- Name: issues issue_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issue_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.issue_type(id) ON DELETE SET NULL;


--
-- Name: issue_work_flow issue_work_flow_from_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_work_flow
    ADD CONSTRAINT issue_work_flow_from_status_id_fkey FOREIGN KEY (from_status_id) REFERENCES public.issue_status(id) ON DELETE CASCADE;


--
-- Name: issue_work_flow issue_work_flow_issue_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_work_flow
    ADD CONSTRAINT issue_work_flow_issue_type_id_fkey FOREIGN KEY (issue_type_id) REFERENCES public.issue_type(id) ON DELETE CASCADE;


--
-- Name: issue_work_flow issue_work_flow_to_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.issue_work_flow
    ADD CONSTRAINT issue_work_flow_to_status_id_fkey FOREIGN KEY (to_status_id) REFERENCES public.issue_status(id) ON DELETE CASCADE;


--
-- Name: material_kit_items material_kit_items_kit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.material_kit_items
    ADD CONSTRAINT material_kit_items_kit_id_fkey FOREIGN KEY (kit_id) REFERENCES public.material_kits(id) ON DELETE CASCADE;


--
-- Name: material_kit_items material_kit_items_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.material_kit_items
    ADD CONSTRAINT material_kit_items_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE SET NULL;


--
-- Name: material_kits material_kits_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.material_kits
    ADD CONSTRAINT material_kits_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: material_kits material_kits_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.material_kits
    ADD CONSTRAINT material_kits_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: materials materials_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: materials materials_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: materials materials_directory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_directory_id_fkey FOREIGN KEY (directory_id) REFERENCES public.directories(id) ON DELETE SET NULL;


--
-- Name: materials materials_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;


--
-- Name: materials materials_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: messages messages_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: messages messages_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: messages messages_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: messages messages_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: page_permissions page_permissions_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.page_permissions
    ADD CONSTRAINT page_permissions_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.pages(id) ON DELETE CASCADE;


--
-- Name: page_permissions page_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.page_permissions
    ADD CONSTRAINT page_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: pages pages_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.pages(id) ON DELETE SET NULL;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: projects projects_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sfi_codes sfi_codes_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.sfi_codes
    ADD CONSTRAINT sfi_codes_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.sfi_codes(id) ON DELETE SET NULL;


--
-- Name: specification specification_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specification
    ADD CONSTRAINT specification_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: specification specification_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specification
    ADD CONSTRAINT specification_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: specification_parts specification_parts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specification_parts
    ADD CONSTRAINT specification_parts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: specification_parts specification_parts_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specification_parts
    ADD CONSTRAINT specification_parts_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.specification_parts(id) ON DELETE SET NULL;


--
-- Name: specification_parts specification_parts_specification_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specification_parts
    ADD CONSTRAINT specification_parts_specification_version_id_fkey FOREIGN KEY (specification_version_id) REFERENCES public.specification_version(id) ON DELETE CASCADE;


--
-- Name: specification_parts specification_parts_stock_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specification_parts
    ADD CONSTRAINT specification_parts_stock_code_fkey FOREIGN KEY (stock_code) REFERENCES public.materials(stock_code) ON DELETE SET NULL;


--
-- Name: specification specification_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specification
    ADD CONSTRAINT specification_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: specification specification_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specification
    ADD CONSTRAINT specification_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: specification_version specification_version_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specification_version
    ADD CONSTRAINT specification_version_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: specification_version specification_version_specification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.specification_version
    ADD CONSTRAINT specification_version_specification_id_fkey FOREIGN KEY (specification_id) REFERENCES public.specification(id) ON DELETE CASCADE;


--
-- Name: stages stages_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.stages
    ADD CONSTRAINT stages_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: statements statements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.statements
    ADD CONSTRAINT statements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: statements statements_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.statements
    ADD CONSTRAINT statements_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: statements_specification statements_specification_specification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.statements_specification
    ADD CONSTRAINT statements_specification_specification_id_fkey FOREIGN KEY (specification_id) REFERENCES public.specification(id) ON DELETE CASCADE;


--
-- Name: statements_specification statements_specification_statement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.statements_specification
    ADD CONSTRAINT statements_specification_statement_id_fkey FOREIGN KEY (statement_id) REFERENCES public.statements(id) ON DELETE CASCADE;


--
-- Name: statements statements_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.statements
    ADD CONSTRAINT statements_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: storage storage_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.storage
    ADD CONSTRAINT storage_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: suppliers suppliers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: suppliers suppliers_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: time_logs time_logs_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT time_logs_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: time_logs time_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT time_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: user_notification_settings user_notification_settings_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.notification_events(id) ON DELETE CASCADE;


--
-- Name: user_notification_settings user_notification_settings_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.notification_methods(id) ON DELETE CASCADE;


--
-- Name: user_notification_settings user_notification_settings_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: user_notification_settings user_notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_rocket_chat user_rocket_chat_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.user_rocket_chat
    ADD CONSTRAINT user_rocket_chat_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: wiki_articles wiki_articles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_articles
    ADD CONSTRAINT wiki_articles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: wiki_articles_history wiki_articles_history_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_articles_history
    ADD CONSTRAINT wiki_articles_history_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.wiki_articles(id) ON DELETE CASCADE;


--
-- Name: wiki_articles_history wiki_articles_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_articles_history
    ADD CONSTRAINT wiki_articles_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: wiki_articles wiki_articles_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_articles
    ADD CONSTRAINT wiki_articles_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.wiki_sections(id) ON DELETE CASCADE;


--
-- Name: wiki_articles_storage wiki_articles_storage_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_articles_storage
    ADD CONSTRAINT wiki_articles_storage_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.wiki_articles(id) ON DELETE CASCADE;


--
-- Name: wiki_articles_storage wiki_articles_storage_storage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_articles_storage
    ADD CONSTRAINT wiki_articles_storage_storage_id_fkey FOREIGN KEY (storage_id) REFERENCES public.storage(id) ON DELETE CASCADE;


--
-- Name: wiki_articles wiki_articles_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_articles
    ADD CONSTRAINT wiki_articles_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: wiki_sections wiki_sections_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_sections
    ADD CONSTRAINT wiki_sections_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: wiki_sections wiki_sections_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_sections
    ADD CONSTRAINT wiki_sections_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.wiki_sections(id) ON DELETE CASCADE;


--
-- Name: wiki_sections wiki_sections_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spiridovich
--

ALTER TABLE ONLY public.wiki_sections
    ADD CONSTRAINT wiki_sections_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict PV5aJbtKRKtSelYrfJAv9fVekzsehmvQox9zNP8GbPO78TqNXezeoCdgcsBQRnD

