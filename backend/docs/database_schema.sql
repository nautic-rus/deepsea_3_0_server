--
-- PostgreSQL database dump
--

\restrict 6aK5tSXrfySs5rzS3W2ybWmoqMPB5ZeRE5ZgjuRGjUhuzlvrRo7wgtY3qjxC511

-- Dumped from database version 16.13 (Debian 16.13-1.pgdg13+1)
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
-- Name: can_close_document(integer); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.can_close_document(d_id integer) OWNER TO postgres;

--
-- Name: can_close_issue(integer); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.can_close_issue(i_id integer) OWNER TO postgres;

--
-- Name: prevent_delete_if_protected(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_delete_if_protected() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.is_protected IS TRUE THEN
    RAISE EXCEPTION 'Cannot delete protected row from %', TG_TABLE_NAME;
  END IF;
  RETURN OLD;
END;
$$;


ALTER FUNCTION public.prevent_delete_if_protected() OWNER TO postgres;

--
-- Name: user_notification_settings_updated_at_trigger(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_notification_settings_updated_at_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.user_notification_settings_updated_at_trigger() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    actor_id integer NOT NULL,
    entity text NOT NULL,
    entity_id integer,
    action text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: customer_question_histories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_question_histories (
    id integer NOT NULL,
    question_id integer NOT NULL,
    changed_by integer,
    field_name text NOT NULL,
    old_value text,
    new_value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.customer_question_histories OWNER TO postgres;

--
-- Name: customer_question_histories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_question_histories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_question_histories_id_seq OWNER TO postgres;

--
-- Name: customer_question_histories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_question_histories_id_seq OWNED BY public.customer_question_histories.id;


--
-- Name: customer_question_history; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.customer_question_history AS
 SELECT id,
    question_id,
    changed_by,
    field_name,
    old_value,
    new_value,
    created_at
   FROM public.customer_question_histories;


ALTER VIEW public.customer_question_history OWNER TO postgres;

--
-- Name: customer_question_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_question_messages (
    id integer NOT NULL,
    customer_question_id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    parent_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.customer_question_messages OWNER TO postgres;

--
-- Name: customer_question_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_question_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_question_messages_id_seq OWNER TO postgres;

--
-- Name: customer_question_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_question_messages_id_seq OWNED BY public.customer_question_messages.id;


--
-- Name: customer_question_status; Type: TABLE; Schema: public; Owner: postgres
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_protected boolean DEFAULT false NOT NULL
);


ALTER TABLE public.customer_question_status OWNER TO postgres;

--
-- Name: TABLE customer_question_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.customer_question_status IS 'Таблица статусов вопросов от заказчика';


--
-- Name: customer_question_status_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_question_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_question_status_id_seq OWNER TO postgres;

--
-- Name: customer_question_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_question_status_id_seq OWNED BY public.customer_question_status.id;


--
-- Name: customer_question_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_question_type (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(255),
    description text,
    color character varying(32),
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_protected boolean DEFAULT false NOT NULL
);


ALTER TABLE public.customer_question_type OWNER TO postgres;

--
-- Name: customer_question_type_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_question_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_question_type_id_seq OWNER TO postgres;

--
-- Name: customer_question_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_question_type_id_seq OWNED BY public.customer_question_type.id;


--
-- Name: customer_question_work_flow; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_question_work_flow (
    id integer NOT NULL,
    from_status_id integer NOT NULL,
    to_status_id integer NOT NULL,
    name character varying(255),
    description text,
    required_permission character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    project_id integer NOT NULL,
    customer_question_type_id integer NOT NULL
);


ALTER TABLE public.customer_question_work_flow OWNER TO postgres;

--
-- Name: TABLE customer_question_work_flow; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.customer_question_work_flow IS 'Таблица workflow для вопросов от заказчика (переходы между статусами)';


--
-- Name: customer_question_work_flow_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_question_work_flow_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_question_work_flow_id_seq OWNER TO postgres;

--
-- Name: customer_question_work_flow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_question_work_flow_id_seq OWNED BY public.customer_question_work_flow.id;


--
-- Name: customer_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_questions (
    id integer NOT NULL,
    question_text text NOT NULL,
    answer_text text,
    priority character varying(50) DEFAULT 'medium'::character varying,
    asked_by integer NOT NULL,
    answered_by integer,
    answered_at timestamp without time zone,
    due_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status_id integer DEFAULT 1 NOT NULL,
    question_title text,
    type_id integer,
    project_id integer,
    is_active boolean DEFAULT true,
    comment text,
    specialization_id integer
);


ALTER TABLE public.customer_questions OWNER TO postgres;

--
-- Name: TABLE customer_questions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.customer_questions IS 'Таблица вопросов от заказчика, связанных с документами проекта';


--
-- Name: customer_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_questions_id_seq OWNER TO postgres;

--
-- Name: customer_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_questions_id_seq OWNED BY public.customer_questions.id;


--
-- Name: customer_questions_storage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_questions_storage (
    id integer NOT NULL,
    customer_question_id integer NOT NULL,
    storage_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.customer_questions_storage OWNER TO postgres;

--
-- Name: TABLE customer_questions_storage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.customer_questions_storage IS 'Связь между вопросами от заказчика и файлами в хранилище';


--
-- Name: customer_questions_storage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_questions_storage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_questions_storage_id_seq OWNER TO postgres;

--
-- Name: customer_questions_storage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_questions_storage_id_seq OWNED BY public.customer_questions_storage.id;


--
-- Name: department; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.department (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    manager_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.department OWNER TO postgres;

--
-- Name: TABLE department; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.department IS 'Таблица отделов пользователей';


--
-- Name: department_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.department_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.department_id_seq OWNER TO postgres;

--
-- Name: department_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.department_id_seq OWNED BY public.department.id;


--
-- Name: document_directories; Type: TABLE; Schema: public; Owner: postgres
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    project_id integer
);


ALTER TABLE public.document_directories OWNER TO postgres;

--
-- Name: TABLE document_directories; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.document_directories IS 'Таблица дерева директорий для организации документов';


--
-- Name: document_directories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_directories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_directories_id_seq OWNER TO postgres;

--
-- Name: document_directories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_directories_id_seq OWNED BY public.document_directories.id;


--
-- Name: document_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_messages (
    id integer NOT NULL,
    document_id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    parent_id integer
);


ALTER TABLE public.document_messages OWNER TO postgres;

--
-- Name: document_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_messages_id_seq OWNER TO postgres;

--
-- Name: document_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_messages_id_seq OWNED BY public.document_messages.id;


--
-- Name: document_status; Type: TABLE; Schema: public; Owner: postgres
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_protected boolean DEFAULT false NOT NULL
);


ALTER TABLE public.document_status OWNER TO postgres;

--
-- Name: TABLE document_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.document_status IS 'Таблица статусов документов';


--
-- Name: document_status_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_status_id_seq OWNER TO postgres;

--
-- Name: document_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_status_id_seq OWNED BY public.document_status.id;


--
-- Name: document_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_type (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    icon character varying(50),
    color character varying(20),
    order_index integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_protected boolean DEFAULT false NOT NULL
);


ALTER TABLE public.document_type OWNER TO postgres;

--
-- Name: document_type_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_type_id_seq OWNER TO postgres;

--
-- Name: document_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_type_id_seq OWNED BY public.document_type.id;


--
-- Name: document_work_flow; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_work_flow (
    id integer NOT NULL,
    from_status_id integer NOT NULL,
    to_status_id integer NOT NULL,
    name character varying(255),
    description text,
    required_permission character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    document_type_id integer NOT NULL,
    project_id integer NOT NULL
);


ALTER TABLE public.document_work_flow OWNER TO postgres;

--
-- Name: TABLE document_work_flow; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.document_work_flow IS 'Таблица workflow для документов (переходы между статусами)';


--
-- Name: document_work_flow_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_work_flow_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_work_flow_id_seq OWNER TO postgres;

--
-- Name: document_work_flow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_work_flow_id_seq OWNED BY public.document_work_flow.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    project_id integer,
    stage_id integer,
    status_id integer DEFAULT 1,
    specialization_id integer,
    directory_id integer,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true NOT NULL,
    assigne_to integer,
    code character varying(255),
    type_id integer,
    priority character varying(50) DEFAULT 'medium'::character varying,
    due_date timestamp without time zone,
    estimated_hours integer,
    comment character varying(40),
    responsible_id integer,
    sfi_code_id integer
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- Name: TABLE documents; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.documents IS 'Таблица документов';


--
-- Name: COLUMN documents.comment; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documents.comment IS 'Короткий комментарий к документу, до 40 символов';


--
-- Name: documents_history; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.documents_history OWNER TO postgres;

--
-- Name: TABLE documents_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.documents_history IS 'Таблица истории изменений атрибутов документов';


--
-- Name: documents_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_history_id_seq OWNER TO postgres;

--
-- Name: documents_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_history_id_seq OWNED BY public.documents_history.id;


--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: documents_storage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents_storage (
    id integer NOT NULL,
    document_id integer NOT NULL,
    storage_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    type_id integer,
    rev integer,
    user_id integer,
    archive boolean DEFAULT false,
    archive_data timestamp without time zone
);


ALTER TABLE public.documents_storage OWNER TO postgres;

--
-- Name: TABLE documents_storage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.documents_storage IS 'Связь между документами и файлами в хранилище';


--
-- Name: documents_storage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_storage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_storage_id_seq OWNER TO postgres;

--
-- Name: documents_storage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_storage_id_seq OWNED BY public.documents_storage.id;


--
-- Name: documents_storage_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents_storage_type (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100),
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    project_id integer
);


ALTER TABLE public.documents_storage_type OWNER TO postgres;

--
-- Name: documents_storage_type_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_storage_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_storage_type_id_seq OWNER TO postgres;

--
-- Name: documents_storage_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_storage_type_id_seq OWNED BY public.documents_storage_type.id;


--
-- Name: entity_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_links (
    id integer NOT NULL,
    active_type character varying(32) NOT NULL,
    active_id integer NOT NULL,
    passive_type character varying(32) NOT NULL,
    passive_id integer NOT NULL,
    relation_type character varying(50) DEFAULT 'relates'::character varying NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.entity_links OWNER TO postgres;

--
-- Name: entity_links_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.entity_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.entity_links_id_seq OWNER TO postgres;

--
-- Name: entity_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.entity_links_id_seq OWNED BY public.entity_links.id;


--
-- Name: equipment_materials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipment_materials (
    id integer NOT NULL,
    stock_code character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    directory_id integer NOT NULL,
    unit_id integer,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    weight integer DEFAULT 0,
    sfi_code_id integer,
    status character varying(50) DEFAULT 'active'::character varying
);


ALTER TABLE public.equipment_materials OWNER TO postgres;

--
-- Name: TABLE equipment_materials; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.equipment_materials IS 'Таблица материалов для судостроительного проекта';


--
-- Name: equipment_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.equipment_materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.equipment_materials_id_seq OWNER TO postgres;

--
-- Name: equipment_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.equipment_materials_id_seq OWNED BY public.equipment_materials.id;


--
-- Name: equipment_materials_projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipment_materials_projects (
    id integer NOT NULL,
    equipment_material_id integer NOT NULL,
    project_id integer NOT NULL,
    statement_id integer,
    supplier_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.equipment_materials_projects OWNER TO postgres;

--
-- Name: equipment_materials_projects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.equipment_materials_projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.equipment_materials_projects_id_seq OWNER TO postgres;

--
-- Name: equipment_materials_projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.equipment_materials_projects_id_seq OWNED BY public.equipment_materials_projects.id;


--
-- Name: file_categories; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.file_categories OWNER TO postgres;

--
-- Name: TABLE file_categories; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.file_categories IS 'Таблица категорий файлов - иерархическая структура для классификации файлов';


--
-- Name: file_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.file_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.file_categories_id_seq OWNER TO postgres;

--
-- Name: file_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.file_categories_id_seq OWNED BY public.file_categories.id;


--
-- Name: groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.groups (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.groups OWNER TO postgres;

--
-- Name: groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.groups_id_seq OWNER TO postgres;

--
-- Name: groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.groups_id_seq OWNED BY public.groups.id;


--
-- Name: issue_history; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.issue_history OWNER TO postgres;

--
-- Name: TABLE issue_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.issue_history IS 'Таблица истории изменений атрибутов задач';


--
-- Name: issue_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.issue_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.issue_history_id_seq OWNER TO postgres;

--
-- Name: issue_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.issue_history_id_seq OWNED BY public.issue_history.id;


--
-- Name: issues; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.issues (
    id integer NOT NULL,
    project_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status_id integer DEFAULT 1,
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
    is_active boolean DEFAULT true NOT NULL,
    comment text
);


ALTER TABLE public.issues OWNER TO postgres;

--
-- Name: TABLE issues; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.issues IS 'Таблица задач/проблем (issues)';


--
-- Name: issue_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.issue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.issue_id_seq OWNER TO postgres;

--
-- Name: issue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.issue_id_seq OWNED BY public.issues.id;


--
-- Name: issue_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.issue_messages (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    parent_id integer
);


ALTER TABLE public.issue_messages OWNER TO postgres;

--
-- Name: issue_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.issue_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.issue_messages_id_seq OWNER TO postgres;

--
-- Name: issue_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.issue_messages_id_seq OWNED BY public.issue_messages.id;


--
-- Name: issue_status; Type: TABLE; Schema: public; Owner: postgres
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
    is_final boolean DEFAULT false,
    is_protected boolean DEFAULT false NOT NULL
);


ALTER TABLE public.issue_status OWNER TO postgres;

--
-- Name: TABLE issue_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.issue_status IS 'Таблица статусов задач';


--
-- Name: issue_status_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.issue_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.issue_status_id_seq OWNER TO postgres;

--
-- Name: issue_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.issue_status_id_seq OWNED BY public.issue_status.id;


--
-- Name: issue_storage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.issue_storage (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    storage_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.issue_storage OWNER TO postgres;

--
-- Name: TABLE issue_storage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.issue_storage IS 'Связь между задачами и файлами в хранилище';


--
-- Name: issue_storage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.issue_storage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.issue_storage_id_seq OWNER TO postgres;

--
-- Name: issue_storage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.issue_storage_id_seq OWNED BY public.issue_storage.id;


--
-- Name: issue_type; Type: TABLE; Schema: public; Owner: postgres
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_protected boolean DEFAULT false NOT NULL
);


ALTER TABLE public.issue_type OWNER TO postgres;

--
-- Name: TABLE issue_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.issue_type IS 'Таблица типов задач';


--
-- Name: issue_type_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.issue_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.issue_type_id_seq OWNER TO postgres;

--
-- Name: issue_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.issue_type_id_seq OWNED BY public.issue_type.id;


--
-- Name: issue_work_flow; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.issue_work_flow (
    id integer NOT NULL,
    issue_type_id integer NOT NULL,
    from_status_id integer NOT NULL,
    to_status_id integer NOT NULL,
    name character varying(255),
    description text,
    required_permission character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    project_id integer NOT NULL
);


ALTER TABLE public.issue_work_flow OWNER TO postgres;

--
-- Name: TABLE issue_work_flow; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.issue_work_flow IS 'Таблица workflow для задач (переходы между статусами)';


--
-- Name: issue_work_flow_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.issue_work_flow_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.issue_work_flow_id_seq OWNER TO postgres;

--
-- Name: issue_work_flow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.issue_work_flow_id_seq OWNED BY public.issue_work_flow.id;


--
-- Name: job_title; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_title (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.job_title OWNER TO postgres;

--
-- Name: TABLE job_title; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.job_title IS 'Таблица должностей пользователей';


--
-- Name: job_title_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_title_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_title_id_seq OWNER TO postgres;

--
-- Name: job_title_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_title_id_seq OWNED BY public.job_title.id;


--
-- Name: material_kit_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.material_kit_items (
    id integer NOT NULL,
    kit_id integer NOT NULL,
    material_id integer,
    quantity numeric(15,3) DEFAULT 1,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.material_kit_items OWNER TO postgres;

--
-- Name: material_kit_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.material_kit_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.material_kit_items_id_seq OWNER TO postgres;

--
-- Name: material_kit_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.material_kit_items_id_seq OWNED BY public.material_kit_items.id;


--
-- Name: material_kits; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.material_kits OWNER TO postgres;

--
-- Name: material_kits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.material_kits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.material_kits_id_seq OWNER TO postgres;

--
-- Name: material_kits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.material_kits_id_seq OWNED BY public.material_kits.id;


--
-- Name: materials_directories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.materials_directories (
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


ALTER TABLE public.materials_directories OWNER TO postgres;

--
-- Name: TABLE materials_directories; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.materials_directories IS 'Таблица дерева директорий для хранения материалов';


--
-- Name: materials_directories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.materials_directories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.materials_directories_id_seq OWNER TO postgres;

--
-- Name: materials_directories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.materials_directories_id_seq OWNED BY public.materials_directories.id;


--
-- Name: notification_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_events (
    id integer NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status boolean DEFAULT true NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_protected boolean DEFAULT false NOT NULL
);


ALTER TABLE public.notification_events OWNER TO postgres;

--
-- Name: notification_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_events_id_seq OWNER TO postgres;

--
-- Name: notification_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_events_id_seq OWNED BY public.notification_events.id;


--
-- Name: notification_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_methods (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status boolean DEFAULT true NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_protected boolean DEFAULT false NOT NULL
);


ALTER TABLE public.notification_methods OWNER TO postgres;

--
-- Name: notification_methods_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_methods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_methods_id_seq OWNER TO postgres;

--
-- Name: notification_methods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_methods_id_seq OWNED BY public.notification_methods.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255),
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organizations_id_seq OWNER TO postgres;

--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: page_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.page_permissions (
    id integer NOT NULL,
    page_id integer NOT NULL,
    permission_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.page_permissions OWNER TO postgres;

--
-- Name: page_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.page_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.page_permissions_id_seq OWNER TO postgres;

--
-- Name: page_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.page_permissions_id_seq OWNED BY public.page_permissions.id;


--
-- Name: pages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pages (
    id integer NOT NULL,
    key character varying(200) NOT NULL,
    path character varying(400) NOT NULL,
    parent_id integer,
    icon character varying(100),
    order_index integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    main_menu boolean,
    status boolean DEFAULT true,
    is_protected boolean DEFAULT false NOT NULL
);


ALTER TABLE public.pages OWNER TO postgres;

--
-- Name: pages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pages_id_seq OWNER TO postgres;

--
-- Name: pages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pages_id_seq OWNED BY public.pages.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(128) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_tokens_id_seq OWNER TO postgres;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(100) NOT NULL,
    description text,
    resource character varying(100),
    action character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_protected boolean DEFAULT false NOT NULL
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: TABLE permissions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.permissions IS 'Таблица разрешений для реализации RBAC принципа';


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: TABLE projects; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.projects IS 'Таблица проектов';


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_id integer NOT NULL,
    permission_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: TABLE role_permissions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.role_permissions IS 'Связь между ролями и разрешениями';


--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_id_seq OWNER TO postgres;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_protected boolean DEFAULT false NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.roles IS 'Таблица ролей для реализации RBAC принципа';


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sessions IS 'Таблица сессий для авторизации по принципу SBT (Session-Based Token)';


--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sessions_id_seq OWNER TO postgres;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: sfi_codes; Type: TABLE; Schema: public; Owner: postgres
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    name_ru character varying(255),
    name_en character varying(255),
    description_ru text,
    description_en text
);


ALTER TABLE public.sfi_codes OWNER TO postgres;

--
-- Name: TABLE sfi_codes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sfi_codes IS 'Таблица SFI классификации (Ship''s Functional Index) - иерархическая система классификации оборудования на судах';


--
-- Name: sfi_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sfi_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sfi_codes_id_seq OWNER TO postgres;

--
-- Name: sfi_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sfi_codes_id_seq OWNED BY public.sfi_codes.id;


--
-- Name: shipments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipments (
    id integer NOT NULL,
    supplier_id integer,
    equipment_id integer,
    code character varying(150),
    received_at timestamp without time zone,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.shipments OWNER TO postgres;

--
-- Name: shipments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shipments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shipments_id_seq OWNER TO postgres;

--
-- Name: shipments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shipments_id_seq OWNED BY public.shipments.id;


--
-- Name: specializations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.specializations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    description text,
    order_index integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_protected boolean DEFAULT false NOT NULL
);


ALTER TABLE public.specializations OWNER TO postgres;

--
-- Name: TABLE specializations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.specializations IS 'Таблица справочника специализаций';


--
-- Name: specializations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.specializations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.specializations_id_seq OWNER TO postgres;

--
-- Name: specializations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.specializations_id_seq OWNED BY public.specializations.id;


--
-- Name: specification; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.specification OWNER TO postgres;

--
-- Name: TABLE specification; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.specification IS 'Таблица спецификаций (привязана к одному проекту)';


--
-- Name: specification_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.specification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.specification_id_seq OWNER TO postgres;

--
-- Name: specification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.specification_id_seq OWNED BY public.specification.id;


--
-- Name: specification_parts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.specification_parts (
    id integer NOT NULL,
    specification_version_id integer NOT NULL,
    part_code character varying(100),
    quantity numeric(15,3) DEFAULT 1,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    parent_id integer,
    material_id integer,
    source character varying(20) DEFAULT 'manual'::character varying,
    CONSTRAINT specification_parts_source_check CHECK (((source)::text = ANY ((ARRAY['import'::character varying, 'manual'::character varying])::text[])))
);


ALTER TABLE public.specification_parts OWNER TO postgres;

--
-- Name: specification_parts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.specification_parts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.specification_parts_id_seq OWNER TO postgres;

--
-- Name: specification_parts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.specification_parts_id_seq OWNED BY public.specification_parts.id;


--
-- Name: specification_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.specification_version (
    id integer NOT NULL,
    specification_id integer NOT NULL,
    version character varying(50),
    notes text,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.specification_version OWNER TO postgres;

--
-- Name: specification_version_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.specification_version_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.specification_version_id_seq OWNER TO postgres;

--
-- Name: specification_version_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.specification_version_id_seq OWNED BY public.specification_version.id;


--
-- Name: stages; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.stages OWNER TO postgres;

--
-- Name: TABLE stages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.stages IS 'Таблица этапов проекта (привязываются к проекту, имеют дату окончания)';


--
-- Name: stages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stages_id_seq OWNER TO postgres;

--
-- Name: stages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stages_id_seq OWNED BY public.stages.id;


--
-- Name: statement_materials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.statement_materials (
    id integer NOT NULL,
    statement_id integer NOT NULL,
    material_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.statement_materials OWNER TO postgres;

--
-- Name: statement_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.statement_materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.statement_materials_id_seq OWNER TO postgres;

--
-- Name: statement_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.statement_materials_id_seq OWNED BY public.statement_materials.id;


--
-- Name: statements; Type: TABLE; Schema: public; Owner: postgres
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    parent_id integer,
    project_id integer
);


ALTER TABLE public.statements OWNER TO postgres;

--
-- Name: TABLE statements; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.statements IS 'Таблица ведомостей (объединяют материалы из всех спецификаций)';


--
-- Name: statements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.statements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.statements_id_seq OWNER TO postgres;

--
-- Name: statements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.statements_id_seq OWNED BY public.statements.id;


--
-- Name: statements_parts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.statements_parts (
    id integer NOT NULL,
    statements_version_id integer NOT NULL,
    parent_id integer,
    specification_part_id integer,
    part_code character varying(100),
    stock_code character varying(255),
    name character varying(255) NOT NULL,
    description text,
    quantity numeric(15,3) DEFAULT 1,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.statements_parts OWNER TO postgres;

--
-- Name: statements_parts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.statements_parts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.statements_parts_id_seq OWNER TO postgres;

--
-- Name: statements_parts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.statements_parts_id_seq OWNED BY public.statements_parts.id;


--
-- Name: statements_specification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.statements_specification (
    id integer NOT NULL,
    statement_id integer NOT NULL,
    specification_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.statements_specification OWNER TO postgres;

--
-- Name: TABLE statements_specification; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.statements_specification IS 'Связь между ведомостями и спецификациями';


--
-- Name: statements_specification_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.statements_specification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.statements_specification_id_seq OWNER TO postgres;

--
-- Name: statements_specification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.statements_specification_id_seq OWNED BY public.statements_specification.id;


--
-- Name: statements_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.statements_version (
    id integer NOT NULL,
    statement_id integer NOT NULL,
    version character varying(50),
    notes text,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.statements_version OWNER TO postgres;

--
-- Name: statements_version_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.statements_version_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.statements_version_id_seq OWNER TO postgres;

--
-- Name: statements_version_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.statements_version_id_seq OWNED BY public.statements_version.id;


--
-- Name: storage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.storage (
    id integer NOT NULL,
    url text,
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


ALTER TABLE public.storage OWNER TO postgres;

--
-- Name: TABLE storage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.storage IS 'Таблица хранилища файлов (S3) - хранит URL файлов из облачного хранилища';


--
-- Name: storage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.storage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.storage_id_seq OWNER TO postgres;

--
-- Name: storage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.storage_id_seq OWNED BY public.storage.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- Name: TABLE suppliers; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.suppliers IS 'Таблица поставщиков оборудования';


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: time_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.time_logs OWNER TO postgres;

--
-- Name: TABLE time_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.time_logs IS 'Таблица списания часов на задачи';


--
-- Name: time_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.time_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.time_logs_id_seq OWNER TO postgres;

--
-- Name: time_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.time_logs_id_seq OWNED BY public.time_logs.id;


--
-- Name: units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.units (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    symbol character varying(20),
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_protected boolean DEFAULT false NOT NULL,
    kei integer
);


ALTER TABLE public.units OWNER TO postgres;

--
-- Name: TABLE units; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.units IS 'Таблица единиц измерения';


--
-- Name: COLUMN units.kei; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.units.kei IS 'КЕИ — дополнительное целочисленное поле (КЕИ)';


--
-- Name: units_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.units_id_seq OWNER TO postgres;

--
-- Name: units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.units_id_seq OWNED BY public.units.id;


--
-- Name: user_notification_settings; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_notification_settings OWNER TO postgres;

--
-- Name: user_notification_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_notification_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_notification_settings_id_seq OWNER TO postgres;

--
-- Name: user_notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_notification_settings_id_seq OWNED BY public.user_notification_settings.id;


--
-- Name: user_notifications; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_notifications OWNER TO postgres;

--
-- Name: user_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_notifications_id_seq OWNER TO postgres;

--
-- Name: user_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_notifications_id_seq OWNED BY public.user_notifications.id;


--
-- Name: user_rocket_chat; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_rocket_chat OWNER TO postgres;

--
-- Name: user_rocket_chat_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_rocket_chat_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_rocket_chat_id_seq OWNER TO postgres;

--
-- Name: user_rocket_chat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_rocket_chat_id_seq OWNED BY public.user_rocket_chat.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    role_id integer NOT NULL,
    project_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_roles_id_seq OWNER TO postgres;

--
-- Name: user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
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
    avatar_id integer,
    group_id integer,
    organization_id integer
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users IS 'Таблица пользователей системы';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: wiki_articles; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.wiki_articles OWNER TO postgres;

--
-- Name: TABLE wiki_articles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.wiki_articles IS 'Таблица статей wiki - статьи и инструкции с поддержкой версионирования';


--
-- Name: wiki_articles_history; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.wiki_articles_history OWNER TO postgres;

--
-- Name: TABLE wiki_articles_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.wiki_articles_history IS 'Таблица истории изменений статей wiki - хранит все версии статей для отслеживания изменений';


--
-- Name: wiki_articles_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wiki_articles_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wiki_articles_history_id_seq OWNER TO postgres;

--
-- Name: wiki_articles_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wiki_articles_history_id_seq OWNED BY public.wiki_articles_history.id;


--
-- Name: wiki_articles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wiki_articles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wiki_articles_id_seq OWNER TO postgres;

--
-- Name: wiki_articles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wiki_articles_id_seq OWNED BY public.wiki_articles.id;


--
-- Name: wiki_articles_storage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wiki_articles_storage (
    id integer NOT NULL,
    article_id integer NOT NULL,
    storage_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.wiki_articles_storage OWNER TO postgres;

--
-- Name: TABLE wiki_articles_storage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.wiki_articles_storage IS 'Связь между статьями wiki и файлами в хранилище';


--
-- Name: wiki_articles_storage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wiki_articles_storage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wiki_articles_storage_id_seq OWNER TO postgres;

--
-- Name: wiki_articles_storage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wiki_articles_storage_id_seq OWNED BY public.wiki_articles_storage.id;


--
-- Name: wiki_sections; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.wiki_sections OWNER TO postgres;

--
-- Name: TABLE wiki_sections; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.wiki_sections IS 'Таблица разделов wiki - иерархическая структура для организации статей и инструкций';


--
-- Name: wiki_sections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wiki_sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wiki_sections_id_seq OWNER TO postgres;

--
-- Name: wiki_sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wiki_sections_id_seq OWNED BY public.wiki_sections.id;


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: customer_question_histories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_question_histories ALTER COLUMN id SET DEFAULT nextval('public.customer_question_histories_id_seq'::regclass);


--
-- Name: customer_question_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_question_messages ALTER COLUMN id SET DEFAULT nextval('public.customer_question_messages_id_seq'::regclass);


--
-- Name: customer_question_status id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_question_status ALTER COLUMN id SET DEFAULT nextval('public.customer_question_status_id_seq'::regclass);


--
-- Name: customer_question_type id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_question_type ALTER COLUMN id SET DEFAULT nextval('public.customer_question_type_id_seq'::regclass);


--
-- Name: customer_question_work_flow id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_question_work_flow ALTER COLUMN id SET DEFAULT nextval('public.customer_question_work_flow_id_seq'::regclass);


--
-- Name: customer_questions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_questions ALTER COLUMN id SET DEFAULT nextval('public.customer_questions_id_seq'::regclass);


--
-- Name: customer_questions_storage id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_questions_storage ALTER COLUMN id SET DEFAULT nextval('public.customer_questions_storage_id_seq'::regclass);


--
-- Name: department id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department ALTER COLUMN id SET DEFAULT nextval('public.department_id_seq'::regclass);


--
-- Name: document_directories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_directories ALTER COLUMN id SET DEFAULT nextval('public.document_directories_id_seq'::regclass);


--
-- Name: document_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_messages ALTER COLUMN id SET DEFAULT nextval('public.document_messages_id_seq'::regclass);


--
-- Name: document_status id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_status ALTER COLUMN id SET DEFAULT nextval('public.document_status_id_seq'::regclass);


--
-- Name: document_type id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_type ALTER COLUMN id SET DEFAULT nextval('public.document_type_id_seq'::regclass);


--
-- Name: document_work_flow id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_work_flow ALTER COLUMN id SET DEFAULT nextval('public.document_work_flow_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: documents_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_history ALTER COLUMN id SET DEFAULT nextval('public.documents_history_id_seq'::regclass);


--
-- Name: documents_storage id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_storage ALTER COLUMN id SET DEFAULT nextval('public.documents_storage_id_seq'::regclass);


--
-- Name: documents_storage_type id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_storage_type ALTER COLUMN id SET DEFAULT nextval('public.documents_storage_type_id_seq'::regclass);


--
-- Name: entity_links id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_links ALTER COLUMN id SET DEFAULT nextval('public.entity_links_id_seq'::regclass);


--
-- Name: equipment_materials id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_materials ALTER COLUMN id SET DEFAULT nextval('public.equipment_materials_id_seq'::regclass);


--
-- Name: equipment_materials_projects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_materials_projects ALTER COLUMN id SET DEFAULT nextval('public.equipment_materials_projects_id_seq'::regclass);


--
-- Name: file_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_categories ALTER COLUMN id SET DEFAULT nextval('public.file_categories_id_seq'::regclass);


--
-- Name: groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups ALTER COLUMN id SET DEFAULT nextval('public.groups_id_seq'::regclass);


--
-- Name: issue_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_history ALTER COLUMN id SET DEFAULT nextval('public.issue_history_id_seq'::regclass);


--
-- Name: issue_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_messages ALTER COLUMN id SET DEFAULT nextval('public.issue_messages_id_seq'::regclass);


--
-- Name: issue_status id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_status ALTER COLUMN id SET DEFAULT nextval('public.issue_status_id_seq'::regclass);


--
-- Name: issue_storage id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_storage ALTER COLUMN id SET DEFAULT nextval('public.issue_storage_id_seq'::regclass);


--
-- Name: issue_type id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_type ALTER COLUMN id SET DEFAULT nextval('public.issue_type_id_seq'::regclass);


--
-- Name: issue_work_flow id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_work_flow ALTER COLUMN id SET DEFAULT nextval('public.issue_work_flow_id_seq'::regclass);


--
-- Name: issues id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issues ALTER COLUMN id SET DEFAULT nextval('public.issue_id_seq'::regclass);


--
-- Name: job_title id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title ALTER COLUMN id SET DEFAULT nextval('public.job_title_id_seq'::regclass);


--
-- Name: material_kit_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_kit_items ALTER COLUMN id SET DEFAULT nextval('public.material_kit_items_id_seq'::regclass);


--
-- Name: material_kits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_kits ALTER COLUMN id SET DEFAULT nextval('public.material_kits_id_seq'::regclass);


--
-- Name: materials_directories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials_directories ALTER COLUMN id SET DEFAULT nextval('public.materials_directories_id_seq'::regclass);


--
-- Name: notification_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_events ALTER COLUMN id SET DEFAULT nextval('public.notification_events_id_seq'::regclass);


--
-- Name: notification_methods id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_methods ALTER COLUMN id SET DEFAULT nextval('public.notification_methods_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: page_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_permissions ALTER COLUMN id SET DEFAULT nextval('public.page_permissions_id_seq'::regclass);


--
-- Name: pages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages ALTER COLUMN id SET DEFAULT nextval('public.pages_id_seq'::regclass);


--
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: sfi_codes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sfi_codes ALTER COLUMN id SET DEFAULT nextval('public.sfi_codes_id_seq'::regclass);


--
-- Name: shipments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipments ALTER COLUMN id SET DEFAULT nextval('public.shipments_id_seq'::regclass);


--
-- Name: specializations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specializations ALTER COLUMN id SET DEFAULT nextval('public.specializations_id_seq'::regclass);


--
-- Name: specification id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specification ALTER COLUMN id SET DEFAULT nextval('public.specification_id_seq'::regclass);


--
-- Name: specification_parts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specification_parts ALTER COLUMN id SET DEFAULT nextval('public.specification_parts_id_seq'::regclass);


--
-- Name: specification_version id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specification_version ALTER COLUMN id SET DEFAULT nextval('public.specification_version_id_seq'::regclass);


--
-- Name: stages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stages ALTER COLUMN id SET DEFAULT nextval('public.stages_id_seq'::regclass);


--
-- Name: statement_materials id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statement_materials ALTER COLUMN id SET DEFAULT nextval('public.statement_materials_id_seq'::regclass);


--
-- Name: statements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements ALTER COLUMN id SET DEFAULT nextval('public.statements_id_seq'::regclass);


--
-- Name: statements_parts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements_parts ALTER COLUMN id SET DEFAULT nextval('public.statements_parts_id_seq'::regclass);


--
-- Name: statements_specification id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements_specification ALTER COLUMN id SET DEFAULT nextval('public.statements_specification_id_seq'::regclass);


--
-- Name: statements_version id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements_version ALTER COLUMN id SET DEFAULT nextval('public.statements_version_id_seq'::regclass);


--
-- Name: storage id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage ALTER COLUMN id SET DEFAULT nextval('public.storage_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: time_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_logs ALTER COLUMN id SET DEFAULT nextval('public.time_logs_id_seq'::regclass);


--
-- Name: units id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units ALTER COLUMN id SET DEFAULT nextval('public.units_id_seq'::regclass);


--
-- Name: user_notification_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings ALTER COLUMN id SET DEFAULT nextval('public.user_notification_settings_id_seq'::regclass);


--
-- Name: user_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notifications ALTER COLUMN id SET DEFAULT nextval('public.user_notifications_id_seq'::regclass);


--
-- Name: user_rocket_chat id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_rocket_chat ALTER COLUMN id SET DEFAULT nextval('public.user_rocket_chat_id_seq'::regclass);


--
-- Name: user_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: wiki_articles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_articles ALTER COLUMN id SET DEFAULT nextval('public.wiki_articles_id_seq'::regclass);


--
-- Name: wiki_articles_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_articles_history ALTER COLUMN id SET DEFAULT nextval('public.wiki_articles_history_id_seq'::regclass);


--
-- Name: wiki_articles_storage id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_articles_storage ALTER COLUMN id SET DEFAULT nextval('public.wiki_articles_storage_id_seq'::regclass);


--
-- Name: wiki_sections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_sections ALTER COLUMN id SET DEFAULT nextval('public.wiki_sections_id_seq'::regclass);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: customer_question_histories customer_question_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_question_histories
    ADD CONSTRAINT customer_question_histories_pkey PRIMARY KEY (id);


--
-- Name: customer_question_messages customer_question_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_question_messages
    ADD CONSTRAINT customer_question_messages_pkey PRIMARY KEY (id);


--
-- Name: customer_question_status customer_question_status_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_question_status
    ADD CONSTRAINT customer_question_status_code_key UNIQUE (code);


--
-- Name: customer_question_status customer_question_status_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_question_status
    ADD CONSTRAINT customer_question_status_name_key UNIQUE (name);


--
-- Name: customer_question_status customer_question_status_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_question_status
    ADD CONSTRAINT customer_question_status_pkey PRIMARY KEY (id);


--
-- Name: customer_question_type customer_question_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_question_type
    ADD CONSTRAINT customer_question_type_pkey PRIMARY KEY (id);


--
-- Name: customer_question_work_flow customer_question_work_flow_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_question_work_flow
    ADD CONSTRAINT customer_question_work_flow_pkey PRIMARY KEY (id);


--
-- Name: customer_questions customer_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_questions
    ADD CONSTRAINT customer_questions_pkey PRIMARY KEY (id);


--
-- Name: customer_questions_storage customer_questions_storage_customer_question_id_storage_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_questions_storage
    ADD CONSTRAINT customer_questions_storage_customer_question_id_storage_id_key UNIQUE (customer_question_id, storage_id);


--
-- Name: customer_questions_storage customer_questions_storage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_questions_storage
    ADD CONSTRAINT customer_questions_storage_pkey PRIMARY KEY (id);


--
-- Name: department department_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department
    ADD CONSTRAINT department_name_key UNIQUE (name);


--
-- Name: department department_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department
    ADD CONSTRAINT department_pkey PRIMARY KEY (id);


--
-- Name: materials_directories directories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials_directories
    ADD CONSTRAINT directories_pkey PRIMARY KEY (id);


--
-- Name: document_directories document_directories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_directories
    ADD CONSTRAINT document_directories_pkey PRIMARY KEY (id);


--
-- Name: document_messages document_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_messages
    ADD CONSTRAINT document_messages_pkey PRIMARY KEY (id);


--
-- Name: document_status document_status_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_status
    ADD CONSTRAINT document_status_code_key UNIQUE (code);


--
-- Name: document_status document_status_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_status
    ADD CONSTRAINT document_status_name_key UNIQUE (name);


--
-- Name: document_status document_status_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_status
    ADD CONSTRAINT document_status_pkey PRIMARY KEY (id);


--
-- Name: document_type document_type_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_type
    ADD CONSTRAINT document_type_code_key UNIQUE (code);


--
-- Name: document_type document_type_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_type
    ADD CONSTRAINT document_type_name_key UNIQUE (name);


--
-- Name: document_type document_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_type
    ADD CONSTRAINT document_type_pkey PRIMARY KEY (id);


--
-- Name: document_work_flow document_work_flow_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_work_flow
    ADD CONSTRAINT document_work_flow_pkey PRIMARY KEY (id);


--
-- Name: documents_history documents_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_history
    ADD CONSTRAINT documents_history_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: documents_storage documents_storage_document_id_storage_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_storage
    ADD CONSTRAINT documents_storage_document_id_storage_id_key UNIQUE (document_id, storage_id);


--
-- Name: documents_storage documents_storage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_storage
    ADD CONSTRAINT documents_storage_pkey PRIMARY KEY (id);


--
-- Name: documents_storage_type documents_storage_type_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_storage_type
    ADD CONSTRAINT documents_storage_type_code_key UNIQUE (code);


--
-- Name: documents_storage_type documents_storage_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_storage_type
    ADD CONSTRAINT documents_storage_type_pkey PRIMARY KEY (id);


--
-- Name: entity_links entity_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_links
    ADD CONSTRAINT entity_links_pkey PRIMARY KEY (id);


--
-- Name: entity_links entity_links_source_type_source_id_target_type_target_id_re_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_links
    ADD CONSTRAINT entity_links_source_type_source_id_target_type_target_id_re_key UNIQUE (active_type, active_id, passive_type, passive_id, relation_type);


--
-- Name: equipment_materials_projects equipment_materials_projects_equipment_material_id_project__key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_materials_projects
    ADD CONSTRAINT equipment_materials_projects_equipment_material_id_project__key UNIQUE (equipment_material_id, project_id, statement_id);


--
-- Name: equipment_materials_projects equipment_materials_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_materials_projects
    ADD CONSTRAINT equipment_materials_projects_pkey PRIMARY KEY (id);


--
-- Name: file_categories file_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_categories
    ADD CONSTRAINT file_categories_code_key UNIQUE (code);


--
-- Name: file_categories file_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_categories
    ADD CONSTRAINT file_categories_name_key UNIQUE (name);


--
-- Name: file_categories file_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_categories
    ADD CONSTRAINT file_categories_pkey PRIMARY KEY (id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: issue_history issue_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_history
    ADD CONSTRAINT issue_history_pkey PRIMARY KEY (id);


--
-- Name: issue_messages issue_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_messages
    ADD CONSTRAINT issue_messages_pkey PRIMARY KEY (id);


--
-- Name: issues issue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issue_pkey PRIMARY KEY (id);


--
-- Name: issue_status issue_status_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_status
    ADD CONSTRAINT issue_status_code_key UNIQUE (code);


--
-- Name: issue_status issue_status_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_status
    ADD CONSTRAINT issue_status_name_key UNIQUE (name);


--
-- Name: issue_status issue_status_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_status
    ADD CONSTRAINT issue_status_pkey PRIMARY KEY (id);


--
-- Name: issue_storage issue_storage_issue_id_storage_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_storage
    ADD CONSTRAINT issue_storage_issue_id_storage_id_key UNIQUE (issue_id, storage_id);


--
-- Name: issue_storage issue_storage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_storage
    ADD CONSTRAINT issue_storage_pkey PRIMARY KEY (id);


--
-- Name: issue_type issue_type_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_type
    ADD CONSTRAINT issue_type_code_key UNIQUE (code);


--
-- Name: issue_type issue_type_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_type
    ADD CONSTRAINT issue_type_name_key UNIQUE (name);


--
-- Name: issue_type issue_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_type
    ADD CONSTRAINT issue_type_pkey PRIMARY KEY (id);


--
-- Name: issue_work_flow issue_work_flow_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_work_flow
    ADD CONSTRAINT issue_work_flow_pkey PRIMARY KEY (id);


--
-- Name: job_title job_title_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title
    ADD CONSTRAINT job_title_name_key UNIQUE (name);


--
-- Name: job_title job_title_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title
    ADD CONSTRAINT job_title_pkey PRIMARY KEY (id);


--
-- Name: material_kit_items material_kit_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_kit_items
    ADD CONSTRAINT material_kit_items_pkey PRIMARY KEY (id);


--
-- Name: material_kits material_kits_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_kits
    ADD CONSTRAINT material_kits_code_key UNIQUE (code);


--
-- Name: material_kits material_kits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_kits
    ADD CONSTRAINT material_kits_pkey PRIMARY KEY (id);


--
-- Name: equipment_materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: equipment_materials materials_stock_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_materials
    ADD CONSTRAINT materials_stock_code_key UNIQUE (stock_code);


--
-- Name: notification_events notification_events_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_events
    ADD CONSTRAINT notification_events_code_key UNIQUE (code);


--
-- Name: notification_events notification_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_events
    ADD CONSTRAINT notification_events_pkey PRIMARY KEY (id);


--
-- Name: notification_methods notification_methods_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_methods
    ADD CONSTRAINT notification_methods_code_key UNIQUE (code);


--
-- Name: notification_methods notification_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_methods
    ADD CONSTRAINT notification_methods_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: page_permissions page_permissions_page_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_permissions
    ADD CONSTRAINT page_permissions_page_id_permission_id_key UNIQUE (page_id, permission_id);


--
-- Name: page_permissions page_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_permissions
    ADD CONSTRAINT page_permissions_pkey PRIMARY KEY (id);


--
-- Name: pages pages_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_key_key UNIQUE (key);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: permissions permissions_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: projects projects_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_code_key UNIQUE (code);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_key UNIQUE (token);


--
-- Name: sfi_codes sfi_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sfi_codes
    ADD CONSTRAINT sfi_codes_code_key UNIQUE (code);


--
-- Name: sfi_codes sfi_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sfi_codes
    ADD CONSTRAINT sfi_codes_pkey PRIMARY KEY (id);


--
-- Name: shipments shipments_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_code_key UNIQUE (code);


--
-- Name: shipments shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);


--
-- Name: specializations specializations_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specializations
    ADD CONSTRAINT specializations_code_key UNIQUE (code);


--
-- Name: specializations specializations_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specializations
    ADD CONSTRAINT specializations_name_key UNIQUE (name);


--
-- Name: specializations specializations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specializations
    ADD CONSTRAINT specializations_pkey PRIMARY KEY (id);


--
-- Name: specification_parts specification_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specification_parts
    ADD CONSTRAINT specification_parts_pkey PRIMARY KEY (id);


--
-- Name: specification specification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specification
    ADD CONSTRAINT specification_pkey PRIMARY KEY (id);


--
-- Name: specification_version specification_version_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specification_version
    ADD CONSTRAINT specification_version_pkey PRIMARY KEY (id);


--
-- Name: stages stages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stages
    ADD CONSTRAINT stages_pkey PRIMARY KEY (id);


--
-- Name: statement_materials statement_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statement_materials
    ADD CONSTRAINT statement_materials_pkey PRIMARY KEY (id);


--
-- Name: statement_materials statement_materials_statement_id_material_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statement_materials
    ADD CONSTRAINT statement_materials_statement_id_material_id_key UNIQUE (statement_id, material_id);


--
-- Name: statements_parts statements_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements_parts
    ADD CONSTRAINT statements_parts_pkey PRIMARY KEY (id);


--
-- Name: statements statements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements
    ADD CONSTRAINT statements_pkey PRIMARY KEY (id);


--
-- Name: statements_specification statements_specification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements_specification
    ADD CONSTRAINT statements_specification_pkey PRIMARY KEY (id);


--
-- Name: statements_specification statements_specification_statement_id_specification_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements_specification
    ADD CONSTRAINT statements_specification_statement_id_specification_id_key UNIQUE (statement_id, specification_id);


--
-- Name: statements_version statements_version_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements_version
    ADD CONSTRAINT statements_version_pkey PRIMARY KEY (id);


--
-- Name: storage storage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage
    ADD CONSTRAINT storage_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_code_key UNIQUE (code);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: time_logs time_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT time_logs_pkey PRIMARY KEY (id);


--
-- Name: units units_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_code_key UNIQUE (code);


--
-- Name: units units_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_name_key UNIQUE (name);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: user_notification_settings user_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_pkey PRIMARY KEY (id);


--
-- Name: user_notifications user_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_pkey PRIMARY KEY (id);


--
-- Name: user_rocket_chat user_rocket_chat_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_rocket_chat
    ADD CONSTRAINT user_rocket_chat_pkey PRIMARY KEY (id);


--
-- Name: user_rocket_chat user_rocket_chat_rc_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_rocket_chat
    ADD CONSTRAINT user_rocket_chat_rc_username_key UNIQUE (rc_username);


--
-- Name: user_rocket_chat user_rocket_chat_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_rocket_chat
    ADD CONSTRAINT user_rocket_chat_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_id_project_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_id_project_id_key UNIQUE (user_id, role_id, project_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: wiki_articles_history wiki_articles_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_articles_history
    ADD CONSTRAINT wiki_articles_history_pkey PRIMARY KEY (id);


--
-- Name: wiki_articles wiki_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_articles
    ADD CONSTRAINT wiki_articles_pkey PRIMARY KEY (id);


--
-- Name: wiki_articles wiki_articles_section_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_articles
    ADD CONSTRAINT wiki_articles_section_id_slug_key UNIQUE (section_id, slug);


--
-- Name: wiki_articles_storage wiki_articles_storage_article_id_storage_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_articles_storage
    ADD CONSTRAINT wiki_articles_storage_article_id_storage_id_key UNIQUE (article_id, storage_id);


--
-- Name: wiki_articles_storage wiki_articles_storage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_articles_storage
    ADD CONSTRAINT wiki_articles_storage_pkey PRIMARY KEY (id);


--
-- Name: wiki_sections wiki_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_sections
    ADD CONSTRAINT wiki_sections_pkey PRIMARY KEY (id);


--
-- Name: wiki_sections wiki_sections_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_sections
    ADD CONSTRAINT wiki_sections_slug_key UNIQUE (slug);


--
-- Name: audit_logs_actor_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_actor_idx ON public.audit_logs USING btree (actor_id);


--
-- Name: audit_logs_entity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_entity_idx ON public.audit_logs USING btree (entity, entity_id);


--
-- Name: idx_customer_question_histories_changed_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_question_histories_changed_by ON public.customer_question_histories USING btree (changed_by);


--
-- Name: idx_customer_question_histories_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_question_histories_created_at ON public.customer_question_histories USING btree (created_at);


--
-- Name: idx_customer_question_histories_question_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_question_histories_question_id ON public.customer_question_histories USING btree (question_id);


--
-- Name: idx_customer_question_messages_question_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_question_messages_question_id ON public.customer_question_messages USING btree (customer_question_id);


--
-- Name: idx_customer_question_messages_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_question_messages_user_id ON public.customer_question_messages USING btree (user_id);


--
-- Name: idx_customer_question_status_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_question_status_code ON public.customer_question_status USING btree (code);


--
-- Name: idx_customer_question_status_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_question_status_order ON public.customer_question_status USING btree (order_index);


--
-- Name: idx_customer_question_work_flow_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_question_work_flow_active ON public.customer_question_work_flow USING btree (is_active);


--
-- Name: idx_customer_question_work_flow_from_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_question_work_flow_from_status ON public.customer_question_work_flow USING btree (from_status_id);


--
-- Name: idx_customer_question_work_flow_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_question_work_flow_project_id ON public.customer_question_work_flow USING btree (project_id);


--
-- Name: idx_customer_question_work_flow_to_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_question_work_flow_to_status ON public.customer_question_work_flow USING btree (to_status_id);


--
-- Name: idx_customer_questions_answered_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_questions_answered_by ON public.customer_questions USING btree (answered_by);


--
-- Name: idx_customer_questions_asked_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_questions_asked_by ON public.customer_questions USING btree (asked_by);


--
-- Name: idx_customer_questions_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_questions_due_date ON public.customer_questions USING btree (due_date);


--
-- Name: idx_customer_questions_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_questions_is_active ON public.customer_questions USING btree (is_active);


--
-- Name: idx_customer_questions_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_questions_priority ON public.customer_questions USING btree (priority);


--
-- Name: idx_customer_questions_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_questions_project_id ON public.customer_questions USING btree (project_id);


--
-- Name: idx_customer_questions_storage_customer_question_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_questions_storage_customer_question_id ON public.customer_questions_storage USING btree (customer_question_id);


--
-- Name: idx_customer_questions_storage_storage_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_questions_storage_storage_id ON public.customer_questions_storage USING btree (storage_id);


--
-- Name: idx_department_manager_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_department_manager_id ON public.department USING btree (manager_id);


--
-- Name: idx_directories_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_directories_created_by ON public.materials_directories USING btree (created_by);


--
-- Name: idx_directories_order_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_directories_order_index ON public.materials_directories USING btree (order_index);


--
-- Name: idx_directories_path; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_directories_path ON public.materials_directories USING btree (path);


--
-- Name: idx_directories_updated_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_directories_updated_by ON public.materials_directories USING btree (updated_by);


--
-- Name: idx_document_directories_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_directories_created_by ON public.document_directories USING btree (created_by);


--
-- Name: idx_document_directories_order_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_directories_order_index ON public.document_directories USING btree (order_index);


--
-- Name: idx_document_directories_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_directories_parent_id ON public.document_directories USING btree (parent_id);


--
-- Name: idx_document_directories_path; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_directories_path ON public.document_directories USING btree (path);


--
-- Name: idx_document_directories_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_directories_project_id ON public.document_directories USING btree (project_id);


--
-- Name: idx_document_directories_updated_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_directories_updated_by ON public.document_directories USING btree (updated_by);


--
-- Name: idx_document_messages_document_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_messages_document_id ON public.document_messages USING btree (document_id);


--
-- Name: idx_document_messages_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_messages_parent_id ON public.document_messages USING btree (parent_id);


--
-- Name: idx_document_status_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_status_code ON public.document_status USING btree (code);


--
-- Name: idx_document_status_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_status_order ON public.document_status USING btree (order_index);


--
-- Name: idx_document_type_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_type_code ON public.document_type USING btree (code);


--
-- Name: idx_document_work_flow_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_work_flow_active ON public.document_work_flow USING btree (is_active);


--
-- Name: idx_document_work_flow_from_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_work_flow_from_status ON public.document_work_flow USING btree (from_status_id);


--
-- Name: idx_document_work_flow_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_work_flow_project_id ON public.document_work_flow USING btree (project_id);


--
-- Name: idx_document_work_flow_to_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_work_flow_to_status ON public.document_work_flow USING btree (to_status_id);


--
-- Name: idx_document_work_flow_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_work_flow_type ON public.document_work_flow USING btree (document_type_id);


--
-- Name: idx_documents_assigne_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_assigne_to ON public.documents USING btree (assigne_to);


--
-- Name: idx_documents_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_code ON public.documents USING btree (code);


--
-- Name: idx_documents_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_created_by ON public.documents USING btree (created_by);


--
-- Name: idx_documents_directory_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_directory_id ON public.documents USING btree (directory_id);


--
-- Name: idx_documents_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_due_date ON public.documents USING btree (due_date);


--
-- Name: idx_documents_estimated_hours; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_estimated_hours ON public.documents USING btree (estimated_hours);


--
-- Name: idx_documents_history_changed_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_history_changed_by ON public.documents_history USING btree (changed_by);


--
-- Name: idx_documents_history_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_history_created_at ON public.documents_history USING btree (created_at);


--
-- Name: idx_documents_history_document_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_history_document_id ON public.documents_history USING btree (document_id);


--
-- Name: idx_documents_history_field_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_history_field_name ON public.documents_history USING btree (field_name);


--
-- Name: idx_documents_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_priority ON public.documents USING btree (priority);


--
-- Name: idx_documents_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_project_id ON public.documents USING btree (project_id);


--
-- Name: idx_documents_specialization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_specialization_id ON public.documents USING btree (specialization_id);


--
-- Name: idx_documents_stage_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_stage_id ON public.documents USING btree (stage_id);


--
-- Name: idx_documents_status_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_status_id ON public.documents USING btree (status_id);


--
-- Name: idx_documents_storage_archive; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_storage_archive ON public.documents_storage USING btree (archive);


--
-- Name: idx_documents_storage_document_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_storage_document_id ON public.documents_storage USING btree (document_id);


--
-- Name: idx_documents_storage_storage_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_storage_storage_id ON public.documents_storage USING btree (storage_id);


--
-- Name: idx_documents_storage_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_storage_type_id ON public.documents_storage USING btree (type_id);


--
-- Name: idx_documents_storage_type_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_storage_type_project_id ON public.documents_storage_type USING btree (project_id);


--
-- Name: idx_documents_storage_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_storage_user_id ON public.documents_storage USING btree (user_id);


--
-- Name: idx_documents_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_type_id ON public.documents USING btree (type_id);


--
-- Name: idx_documents_updated_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_updated_by ON public.documents USING btree (updated_by);


--
-- Name: idx_entity_links_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_links_source ON public.entity_links USING btree (active_type, active_id);


--
-- Name: idx_entity_links_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_links_target ON public.entity_links USING btree (passive_type, passive_id);


--
-- Name: idx_file_categories_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_categories_code ON public.file_categories USING btree (code);


--
-- Name: idx_file_categories_order_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_categories_order_index ON public.file_categories USING btree (order_index);


--
-- Name: idx_file_categories_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_categories_parent_id ON public.file_categories USING btree (parent_id);


--
-- Name: idx_issue_assignee_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_assignee_id ON public.issues USING btree (assignee_id);


--
-- Name: idx_issue_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_due_date ON public.issues USING btree (due_date);


--
-- Name: idx_issue_history_changed_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_history_changed_by ON public.issue_history USING btree (changed_by);


--
-- Name: idx_issue_history_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_history_created_at ON public.issue_history USING btree (created_at);


--
-- Name: idx_issue_history_field_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_history_field_name ON public.issue_history USING btree (field_name);


--
-- Name: idx_issue_history_issue_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_history_issue_id ON public.issue_history USING btree (issue_id);


--
-- Name: idx_issue_messages_issue_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_messages_issue_id ON public.issue_messages USING btree (issue_id);


--
-- Name: idx_issue_messages_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_messages_parent ON public.issue_messages USING btree (parent_id);


--
-- Name: idx_issue_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_priority ON public.issues USING btree (priority);


--
-- Name: idx_issue_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_project_id ON public.issues USING btree (project_id);


--
-- Name: idx_issue_reporter_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_reporter_id ON public.issues USING btree (author_id);


--
-- Name: idx_issue_start_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_start_date ON public.issues USING btree (start_date);


--
-- Name: idx_issue_status_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_status_code ON public.issue_status USING btree (code);


--
-- Name: idx_issue_status_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_status_id ON public.issues USING btree (status_id);


--
-- Name: idx_issue_status_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_status_order ON public.issue_status USING btree (order_index);


--
-- Name: idx_issue_storage_issue_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_storage_issue_id ON public.issue_storage USING btree (issue_id);


--
-- Name: idx_issue_storage_storage_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_storage_storage_id ON public.issue_storage USING btree (storage_id);


--
-- Name: idx_issue_type_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_type_code ON public.issue_type USING btree (code);


--
-- Name: idx_issue_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_type_id ON public.issues USING btree (type_id);


--
-- Name: idx_issue_type_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_type_order ON public.issue_type USING btree (order_index);


--
-- Name: idx_issue_work_flow_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_work_flow_active ON public.issue_work_flow USING btree (is_active);


--
-- Name: idx_issue_work_flow_from_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_work_flow_from_status ON public.issue_work_flow USING btree (from_status_id);


--
-- Name: idx_issue_work_flow_issue_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_work_flow_issue_type ON public.issue_work_flow USING btree (issue_type_id);


--
-- Name: idx_issue_work_flow_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_work_flow_project_id ON public.issue_work_flow USING btree (project_id);


--
-- Name: idx_issue_work_flow_to_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_work_flow_to_status ON public.issue_work_flow USING btree (to_status_id);


--
-- Name: idx_materials_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_materials_created_by ON public.equipment_materials USING btree (created_by);


--
-- Name: idx_materials_directories_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_materials_directories_parent_id ON public.materials_directories USING btree (parent_id);


--
-- Name: idx_materials_directory_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_materials_directory_id ON public.equipment_materials USING btree (directory_id);


--
-- Name: idx_materials_stock_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_materials_stock_code ON public.equipment_materials USING btree (stock_code);


--
-- Name: idx_materials_unit_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_materials_unit_id ON public.equipment_materials USING btree (unit_id);


--
-- Name: idx_materials_updated_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_materials_updated_by ON public.equipment_materials USING btree (updated_by);


--
-- Name: idx_password_reset_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_projects_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_code ON public.projects USING btree (code);


--
-- Name: idx_projects_owner_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_owner_id ON public.projects USING btree (owner_id);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);


--
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- Name: idx_sessions_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_token ON public.sessions USING btree (token);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: idx_sfi_codes_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sfi_codes_code ON public.sfi_codes USING btree (code);


--
-- Name: idx_sfi_codes_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sfi_codes_level ON public.sfi_codes USING btree (level);


--
-- Name: idx_sfi_codes_order_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sfi_codes_order_index ON public.sfi_codes USING btree (order_index);


--
-- Name: idx_sfi_codes_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sfi_codes_parent_id ON public.sfi_codes USING btree (parent_id);


--
-- Name: idx_shipments_supplier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shipments_supplier_id ON public.shipments USING btree (supplier_id);


--
-- Name: idx_specializations_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_specializations_code ON public.specializations USING btree (code);


--
-- Name: idx_specializations_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_specializations_order ON public.specializations USING btree (order_index);


--
-- Name: idx_specification_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_specification_code ON public.specification USING btree (code);


--
-- Name: idx_specification_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_specification_created_by ON public.specification USING btree (created_by);


--
-- Name: idx_specification_document_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_specification_document_id ON public.specification USING btree (document_id);


--
-- Name: idx_specification_parts_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_specification_parts_source ON public.specification_parts USING btree (source);


--
-- Name: idx_specification_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_specification_project_id ON public.specification USING btree (project_id);


--
-- Name: idx_specification_updated_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_specification_updated_by ON public.specification USING btree (updated_by);


--
-- Name: idx_stages_end_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stages_end_date ON public.stages USING btree (end_date);


--
-- Name: idx_stages_order_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stages_order_index ON public.stages USING btree (order_index);


--
-- Name: idx_stages_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stages_project_id ON public.stages USING btree (project_id);


--
-- Name: idx_statements_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_statements_code ON public.statements USING btree (code);


--
-- Name: idx_statements_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_statements_created_by ON public.statements USING btree (created_by);


--
-- Name: idx_statements_document_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_statements_document_id ON public.statements USING btree (document_id);


--
-- Name: idx_statements_parts_specification_part_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_statements_parts_specification_part_id ON public.statements_parts USING btree (specification_part_id);


--
-- Name: idx_statements_parts_statements_version_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_statements_parts_statements_version_id ON public.statements_parts USING btree (statements_version_id);


--
-- Name: idx_statements_specification_specification_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_statements_specification_specification_id ON public.statements_specification USING btree (specification_id);


--
-- Name: idx_statements_specification_statement_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_statements_specification_statement_id ON public.statements_specification USING btree (statement_id);


--
-- Name: idx_statements_updated_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_statements_updated_by ON public.statements USING btree (updated_by);


--
-- Name: idx_statements_version_statement_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_statements_version_statement_id ON public.statements_version USING btree (statement_id);


--
-- Name: idx_storage_bucket_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_storage_bucket_name ON public.storage USING btree (bucket_name);


--
-- Name: idx_storage_object_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_storage_object_key ON public.storage USING btree (object_key);


--
-- Name: idx_storage_storage_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_storage_storage_type ON public.storage USING btree (storage_type);


--
-- Name: idx_storage_uploaded_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_storage_uploaded_by ON public.storage USING btree (uploaded_by);


--
-- Name: idx_suppliers_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_suppliers_code ON public.suppliers USING btree (code);


--
-- Name: idx_suppliers_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_suppliers_created_by ON public.suppliers USING btree (created_by);


--
-- Name: idx_suppliers_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_suppliers_is_active ON public.suppliers USING btree (is_active);


--
-- Name: idx_suppliers_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_suppliers_name ON public.suppliers USING btree (name);


--
-- Name: idx_suppliers_updated_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_suppliers_updated_by ON public.suppliers USING btree (updated_by);


--
-- Name: idx_time_logs_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_logs_date ON public.time_logs USING btree (date);


--
-- Name: idx_time_logs_issue_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_logs_issue_id ON public.time_logs USING btree (issue_id);


--
-- Name: idx_time_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_logs_user_id ON public.time_logs USING btree (user_id);


--
-- Name: idx_units_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_units_code ON public.units USING btree (code);


--
-- Name: idx_user_notification_settings_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notification_settings_event ON public.user_notification_settings USING btree (event_id);


--
-- Name: idx_user_notification_settings_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notification_settings_project ON public.user_notification_settings USING btree (project_id);


--
-- Name: idx_user_notification_settings_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notification_settings_user ON public.user_notification_settings USING btree (user_id);


--
-- Name: idx_user_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notifications_user_id ON public.user_notifications USING btree (user_id);


--
-- Name: idx_user_notifications_user_id_is_hidden; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notifications_user_id_is_hidden ON public.user_notifications USING btree (user_id, is_hidden);


--
-- Name: idx_user_notifications_user_id_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notifications_user_id_is_read ON public.user_notifications USING btree (user_id, is_read);


--
-- Name: idx_users_department_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_department_id ON public.users USING btree (department_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_group_id ON public.users USING btree (group_id);


--
-- Name: idx_users_job_title_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_job_title_id ON public.users USING btree (job_title_id);


--
-- Name: idx_users_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_organization_id ON public.users USING btree (organization_id);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: idx_wiki_articles_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wiki_articles_created_at ON public.wiki_articles USING btree (created_at);


--
-- Name: idx_wiki_articles_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wiki_articles_created_by ON public.wiki_articles USING btree (created_by);


--
-- Name: idx_wiki_articles_history_article_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wiki_articles_history_article_id ON public.wiki_articles_history USING btree (article_id);


--
-- Name: idx_wiki_articles_history_changed_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wiki_articles_history_changed_by ON public.wiki_articles_history USING btree (changed_by);


--
-- Name: idx_wiki_articles_history_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wiki_articles_history_created_at ON public.wiki_articles_history USING btree (created_at);


--
-- Name: idx_wiki_articles_history_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wiki_articles_history_version ON public.wiki_articles_history USING btree (version);


--
-- Name: idx_wiki_articles_is_published; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wiki_articles_is_published ON public.wiki_articles USING btree (is_published);


--
-- Name: idx_wiki_articles_published_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wiki_articles_published_at ON public.wiki_articles USING btree (published_at);


--
-- Name: idx_wiki_articles_section_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wiki_articles_section_id ON public.wiki_articles USING btree (section_id);


--
-- Name: idx_wiki_articles_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wiki_articles_slug ON public.wiki_articles USING btree (slug);


--
-- Name: idx_wiki_articles_storage_article_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wiki_articles_storage_article_id ON public.wiki_articles_storage USING btree (article_id);


--
-- Name: idx_wiki_articles_storage_storage_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wiki_articles_storage_storage_id ON public.wiki_articles_storage USING btree (storage_id);


--
-- Name: idx_wiki_articles_updated_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wiki_articles_updated_by ON public.wiki_articles USING btree (updated_by);


--
-- Name: idx_wiki_sections_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wiki_sections_created_by ON public.wiki_sections USING btree (created_by);


--
-- Name: idx_wiki_sections_order_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wiki_sections_order_index ON public.wiki_sections USING btree (order_index);


--
-- Name: idx_wiki_sections_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wiki_sections_parent_id ON public.wiki_sections USING btree (parent_id);


--
-- Name: idx_wiki_sections_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wiki_sections_slug ON public.wiki_sections USING btree (slug);


--
-- Name: idx_wiki_sections_updated_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wiki_sections_updated_by ON public.wiki_sections USING btree (updated_by);


--
-- Name: statements_parent_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX statements_parent_id_idx ON public.statements USING btree (parent_id);


--
-- Name: statements_project_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX statements_project_id_idx ON public.statements USING btree (project_id);


--
-- Name: ux_user_notification_settings_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ux_user_notification_settings_unique ON public.user_notification_settings USING btree (user_id, project_id, event_id, method_id);


--
-- Name: user_notification_settings tg_user_notification_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_user_notification_settings_updated_at BEFORE UPDATE ON public.user_notification_settings FOR EACH ROW EXECUTE FUNCTION public.user_notification_settings_updated_at_trigger();


--
-- Name: customer_question_status trg_prevent_delete_if_protected; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_delete_if_protected BEFORE DELETE ON public.customer_question_status FOR EACH ROW WHEN ((old.is_protected IS TRUE)) EXECUTE FUNCTION public.prevent_delete_if_protected();


--
-- Name: customer_question_type trg_prevent_delete_if_protected; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_delete_if_protected BEFORE DELETE ON public.customer_question_type FOR EACH ROW WHEN ((old.is_protected IS TRUE)) EXECUTE FUNCTION public.prevent_delete_if_protected();


--
-- Name: document_status trg_prevent_delete_if_protected; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_delete_if_protected BEFORE DELETE ON public.document_status FOR EACH ROW WHEN ((old.is_protected IS TRUE)) EXECUTE FUNCTION public.prevent_delete_if_protected();


--
-- Name: document_type trg_prevent_delete_if_protected; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_delete_if_protected BEFORE DELETE ON public.document_type FOR EACH ROW WHEN ((old.is_protected IS TRUE)) EXECUTE FUNCTION public.prevent_delete_if_protected();


--
-- Name: issue_status trg_prevent_delete_if_protected; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_delete_if_protected BEFORE DELETE ON public.issue_status FOR EACH ROW WHEN ((old.is_protected IS TRUE)) EXECUTE FUNCTION public.prevent_delete_if_protected();


--
-- Name: issue_type trg_prevent_delete_if_protected; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_delete_if_protected BEFORE DELETE ON public.issue_type FOR EACH ROW WHEN ((old.is_protected IS TRUE)) EXECUTE FUNCTION public.prevent_delete_if_protected();


--
-- Name: notification_events trg_prevent_delete_if_protected; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_delete_if_protected BEFORE DELETE ON public.notification_events FOR EACH ROW WHEN ((old.is_protected IS TRUE)) EXECUTE FUNCTION public.prevent_delete_if_protected();


--
-- Name: notification_methods trg_prevent_delete_if_protected; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_delete_if_protected BEFORE DELETE ON public.notification_methods FOR EACH ROW WHEN ((old.is_protected IS TRUE)) EXECUTE FUNCTION public.prevent_delete_if_protected();


--
-- Name: pages trg_prevent_delete_if_protected; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_delete_if_protected BEFORE DELETE ON public.pages FOR EACH ROW WHEN ((old.is_protected IS TRUE)) EXECUTE FUNCTION public.prevent_delete_if_protected();


--
-- Name: permissions trg_prevent_delete_if_protected; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_delete_if_protected BEFORE DELETE ON public.permissions FOR EACH ROW WHEN ((old.is_protected IS TRUE)) EXECUTE FUNCTION public.prevent_delete_if_protected();


--
-- Name: roles trg_prevent_delete_if_protected; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_delete_if_protected BEFORE DELETE ON public.roles FOR EACH ROW WHEN ((old.is_protected IS TRUE)) EXECUTE FUNCTION public.prevent_delete_if_protected();


--
-- Name: specializations trg_prevent_delete_if_protected; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_delete_if_protected BEFORE DELETE ON public.specializations FOR EACH ROW WHEN ((old.is_protected IS TRUE)) EXECUTE FUNCTION public.prevent_delete_if_protected();


--
-- Name: units trg_prevent_delete_if_protected; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_delete_if_protected BEFORE DELETE ON public.units FOR EACH ROW WHEN ((old.is_protected IS TRUE)) EXECUTE FUNCTION public.prevent_delete_if_protected();


--
-- Name: customer_question_histories customer_question_histories_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_question_histories
    ADD CONSTRAINT customer_question_histories_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: customer_question_histories customer_question_histories_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_question_histories
    ADD CONSTRAINT customer_question_histories_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.customer_questions(id) ON DELETE CASCADE;


--
-- Name: customer_question_work_flow customer_question_work_flow_from_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_question_work_flow
    ADD CONSTRAINT customer_question_work_flow_from_status_id_fkey FOREIGN KEY (from_status_id) REFERENCES public.customer_question_status(id) ON DELETE CASCADE;


--
-- Name: customer_question_work_flow customer_question_work_flow_to_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_question_work_flow
    ADD CONSTRAINT customer_question_work_flow_to_status_id_fkey FOREIGN KEY (to_status_id) REFERENCES public.customer_question_status(id) ON DELETE CASCADE;


--
-- Name: customer_questions customer_questions_answered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_questions
    ADD CONSTRAINT customer_questions_answered_by_fkey FOREIGN KEY (answered_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: customer_questions customer_questions_asked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_questions
    ADD CONSTRAINT customer_questions_asked_by_fkey FOREIGN KEY (asked_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: customer_questions_storage customer_questions_storage_customer_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_questions_storage
    ADD CONSTRAINT customer_questions_storage_customer_question_id_fkey FOREIGN KEY (customer_question_id) REFERENCES public.customer_questions(id) ON DELETE CASCADE;


--
-- Name: customer_questions_storage customer_questions_storage_storage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_questions_storage
    ADD CONSTRAINT customer_questions_storage_storage_id_fkey FOREIGN KEY (storage_id) REFERENCES public.storage(id) ON DELETE CASCADE;


--
-- Name: materials_directories directories_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials_directories
    ADD CONSTRAINT directories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: materials_directories directories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials_directories
    ADD CONSTRAINT directories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.materials_directories(id) ON DELETE CASCADE;


--
-- Name: materials_directories directories_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials_directories
    ADD CONSTRAINT directories_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: document_directories document_directories_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_directories
    ADD CONSTRAINT document_directories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: document_directories document_directories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_directories
    ADD CONSTRAINT document_directories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.document_directories(id) ON DELETE CASCADE;


--
-- Name: document_directories document_directories_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_directories
    ADD CONSTRAINT document_directories_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: document_directories document_directories_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_directories
    ADD CONSTRAINT document_directories_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: document_messages document_messages_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_messages
    ADD CONSTRAINT document_messages_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: document_messages document_messages_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_messages
    ADD CONSTRAINT document_messages_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.document_messages(id) ON DELETE SET NULL;


--
-- Name: document_messages document_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_messages
    ADD CONSTRAINT document_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: document_work_flow document_work_flow_document_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_work_flow
    ADD CONSTRAINT document_work_flow_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_type(id) ON DELETE CASCADE;


--
-- Name: document_work_flow document_work_flow_from_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_work_flow
    ADD CONSTRAINT document_work_flow_from_status_id_fkey FOREIGN KEY (from_status_id) REFERENCES public.document_status(id) ON DELETE CASCADE;


--
-- Name: document_work_flow document_work_flow_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_work_flow
    ADD CONSTRAINT document_work_flow_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: document_work_flow document_work_flow_to_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_work_flow
    ADD CONSTRAINT document_work_flow_to_status_id_fkey FOREIGN KEY (to_status_id) REFERENCES public.document_status(id) ON DELETE CASCADE;


--
-- Name: documents documents_assigne_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_assigne_to_fkey FOREIGN KEY (assigne_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: documents documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: documents documents_directory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_directory_id_fkey FOREIGN KEY (directory_id) REFERENCES public.document_directories(id) ON DELETE SET NULL;


--
-- Name: documents_history documents_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_history
    ADD CONSTRAINT documents_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: documents_history documents_history_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_history
    ADD CONSTRAINT documents_history_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: documents documents_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE RESTRICT;


--
-- Name: documents documents_responsible_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_responsible_id_fkey FOREIGN KEY (responsible_id) REFERENCES public.users(id);


--
-- Name: documents documents_specialization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_specialization_id_fkey FOREIGN KEY (specialization_id) REFERENCES public.specializations(id) ON DELETE SET NULL;


--
-- Name: documents documents_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.stages(id) ON DELETE SET NULL;


--
-- Name: documents documents_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.document_status(id) ON DELETE SET NULL;


--
-- Name: documents_storage documents_storage_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_storage
    ADD CONSTRAINT documents_storage_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: documents_storage documents_storage_storage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_storage
    ADD CONSTRAINT documents_storage_storage_id_fkey FOREIGN KEY (storage_id) REFERENCES public.storage(id) ON DELETE CASCADE;


--
-- Name: documents_storage documents_storage_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_storage
    ADD CONSTRAINT documents_storage_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.documents_storage_type(id) ON DELETE SET NULL;


--
-- Name: documents_storage_type documents_storage_type_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_storage_type
    ADD CONSTRAINT documents_storage_type_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: documents_storage documents_storage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_storage
    ADD CONSTRAINT documents_storage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: documents documents_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.document_type(id) ON DELETE SET NULL;


--
-- Name: documents documents_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: entity_links entity_links_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_links
    ADD CONSTRAINT entity_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: equipment_materials_projects equipment_materials_projects_equipment_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_materials_projects
    ADD CONSTRAINT equipment_materials_projects_equipment_material_id_fkey FOREIGN KEY (equipment_material_id) REFERENCES public.equipment_materials(id) ON DELETE CASCADE;


--
-- Name: equipment_materials_projects equipment_materials_projects_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_materials_projects
    ADD CONSTRAINT equipment_materials_projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: equipment_materials_projects equipment_materials_projects_statement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_materials_projects
    ADD CONSTRAINT equipment_materials_projects_statement_id_fkey FOREIGN KEY (statement_id) REFERENCES public.statements(id) ON DELETE SET NULL;


--
-- Name: equipment_materials_projects equipment_materials_projects_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_materials_projects
    ADD CONSTRAINT equipment_materials_projects_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: file_categories file_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_categories
    ADD CONSTRAINT file_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.file_categories(id) ON DELETE SET NULL;


--
-- Name: customer_question_work_flow fk_customer_question_work_flow_type; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_question_work_flow
    ADD CONSTRAINT fk_customer_question_work_flow_type FOREIGN KEY (customer_question_type_id) REFERENCES public.customer_question_type(id) ON DELETE SET NULL;


--
-- Name: customer_questions fk_customer_questions_project; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_questions
    ADD CONSTRAINT fk_customer_questions_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE RESTRICT;


--
-- Name: customer_questions fk_customer_questions_status_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_questions
    ADD CONSTRAINT fk_customer_questions_status_id FOREIGN KEY (status_id) REFERENCES public.customer_question_status(id) ON DELETE SET NULL;


--
-- Name: customer_questions fk_customer_questions_type; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_questions
    ADD CONSTRAINT fk_customer_questions_type FOREIGN KEY (type_id) REFERENCES public.customer_question_type(id) ON DELETE SET NULL;


--
-- Name: department fk_department_manager; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department
    ADD CONSTRAINT fk_department_manager FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: documents fk_documents_sfi_code; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT fk_documents_sfi_code FOREIGN KEY (sfi_code_id) REFERENCES public.sfi_codes(id) ON DELETE SET NULL;


--
-- Name: customer_questions fk_specializations_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_questions
    ADD CONSTRAINT fk_specializations_fk FOREIGN KEY (specialization_id) REFERENCES public.specializations(id);


--
-- Name: users fk_users_department; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES public.department(id) ON DELETE SET NULL;


--
-- Name: users fk_users_group; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_group FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL;


--
-- Name: users fk_users_job_title; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_job_title FOREIGN KEY (job_title_id) REFERENCES public.job_title(id) ON DELETE SET NULL;


--
-- Name: users fk_users_organization; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: issues issue_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issue_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: issue_history issue_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_history
    ADD CONSTRAINT issue_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: issue_history issue_history_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_history
    ADD CONSTRAINT issue_history_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: issue_messages issue_messages_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_messages
    ADD CONSTRAINT issue_messages_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: issue_messages issue_messages_parent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_messages
    ADD CONSTRAINT issue_messages_parent_fkey FOREIGN KEY (parent_id) REFERENCES public.issue_messages(id) ON DELETE CASCADE;


--
-- Name: issue_messages issue_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_messages
    ADD CONSTRAINT issue_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: issues issue_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issue_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE RESTRICT;


--
-- Name: issues issue_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issue_reporter_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: issues issue_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issue_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.issue_status(id) ON DELETE SET NULL;


--
-- Name: issue_storage issue_storage_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_storage
    ADD CONSTRAINT issue_storage_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: issue_storage issue_storage_storage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_storage
    ADD CONSTRAINT issue_storage_storage_id_fkey FOREIGN KEY (storage_id) REFERENCES public.storage(id) ON DELETE CASCADE;


--
-- Name: issues issue_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issue_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.issue_type(id) ON DELETE SET NULL;


--
-- Name: issue_work_flow issue_work_flow_from_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_work_flow
    ADD CONSTRAINT issue_work_flow_from_status_id_fkey FOREIGN KEY (from_status_id) REFERENCES public.issue_status(id) ON DELETE CASCADE;


--
-- Name: issue_work_flow issue_work_flow_issue_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_work_flow
    ADD CONSTRAINT issue_work_flow_issue_type_id_fkey FOREIGN KEY (issue_type_id) REFERENCES public.issue_type(id) ON DELETE CASCADE;


--
-- Name: issue_work_flow issue_work_flow_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_work_flow
    ADD CONSTRAINT issue_work_flow_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: issue_work_flow issue_work_flow_to_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_work_flow
    ADD CONSTRAINT issue_work_flow_to_status_id_fkey FOREIGN KEY (to_status_id) REFERENCES public.issue_status(id) ON DELETE CASCADE;


--
-- Name: material_kit_items material_kit_items_kit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_kit_items
    ADD CONSTRAINT material_kit_items_kit_id_fkey FOREIGN KEY (kit_id) REFERENCES public.material_kits(id) ON DELETE CASCADE;


--
-- Name: material_kit_items material_kit_items_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_kit_items
    ADD CONSTRAINT material_kit_items_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.equipment_materials(id) ON DELETE SET NULL;


--
-- Name: material_kits material_kits_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_kits
    ADD CONSTRAINT material_kits_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: material_kits material_kits_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_kits
    ADD CONSTRAINT material_kits_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: equipment_materials materials_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_materials
    ADD CONSTRAINT materials_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: equipment_materials materials_directory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_materials
    ADD CONSTRAINT materials_directory_id_fkey FOREIGN KEY (directory_id) REFERENCES public.materials_directories(id) ON DELETE SET NULL;


--
-- Name: equipment_materials materials_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_materials
    ADD CONSTRAINT materials_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;


--
-- Name: equipment_materials materials_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_materials
    ADD CONSTRAINT materials_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: page_permissions page_permissions_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_permissions
    ADD CONSTRAINT page_permissions_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.pages(id) ON DELETE CASCADE;


--
-- Name: page_permissions page_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_permissions
    ADD CONSTRAINT page_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: pages pages_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.pages(id) ON DELETE SET NULL;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: projects projects_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sfi_codes sfi_codes_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sfi_codes
    ADD CONSTRAINT sfi_codes_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.sfi_codes(id) ON DELETE SET NULL;


--
-- Name: shipments shipments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: shipments shipments_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: specification specification_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specification
    ADD CONSTRAINT specification_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: specification specification_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specification
    ADD CONSTRAINT specification_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: specification_parts specification_parts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specification_parts
    ADD CONSTRAINT specification_parts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: specification_parts specification_parts_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specification_parts
    ADD CONSTRAINT specification_parts_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.equipment_materials(id) ON DELETE SET NULL;


--
-- Name: specification_parts specification_parts_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specification_parts
    ADD CONSTRAINT specification_parts_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.specification_parts(id) ON DELETE SET NULL;


--
-- Name: specification_parts specification_parts_specification_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specification_parts
    ADD CONSTRAINT specification_parts_specification_version_id_fkey FOREIGN KEY (specification_version_id) REFERENCES public.specification_version(id) ON DELETE CASCADE;


--
-- Name: specification specification_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specification
    ADD CONSTRAINT specification_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE RESTRICT;


--
-- Name: specification specification_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specification
    ADD CONSTRAINT specification_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: specification_version specification_version_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specification_version
    ADD CONSTRAINT specification_version_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: specification_version specification_version_specification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specification_version
    ADD CONSTRAINT specification_version_specification_id_fkey FOREIGN KEY (specification_id) REFERENCES public.specification(id) ON DELETE CASCADE;


--
-- Name: stages stages_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stages
    ADD CONSTRAINT stages_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: statement_materials statement_materials_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statement_materials
    ADD CONSTRAINT statement_materials_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.equipment_materials(id) ON DELETE CASCADE;


--
-- Name: statement_materials statement_materials_statement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statement_materials
    ADD CONSTRAINT statement_materials_statement_id_fkey FOREIGN KEY (statement_id) REFERENCES public.statements(id) ON DELETE CASCADE;


--
-- Name: statements statements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements
    ADD CONSTRAINT statements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: statements statements_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements
    ADD CONSTRAINT statements_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: statements statements_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements
    ADD CONSTRAINT statements_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.statements(id) ON DELETE SET NULL;


--
-- Name: statements_parts statements_parts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements_parts
    ADD CONSTRAINT statements_parts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: statements_parts statements_parts_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements_parts
    ADD CONSTRAINT statements_parts_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.statements_parts(id) ON DELETE SET NULL;


--
-- Name: statements_parts statements_parts_specification_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements_parts
    ADD CONSTRAINT statements_parts_specification_part_id_fkey FOREIGN KEY (specification_part_id) REFERENCES public.specification_parts(id) ON DELETE SET NULL;


--
-- Name: statements_parts statements_parts_statements_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements_parts
    ADD CONSTRAINT statements_parts_statements_version_id_fkey FOREIGN KEY (statements_version_id) REFERENCES public.statements_version(id) ON DELETE CASCADE;


--
-- Name: statements_parts statements_parts_stock_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements_parts
    ADD CONSTRAINT statements_parts_stock_code_fkey FOREIGN KEY (stock_code) REFERENCES public.equipment_materials(stock_code) ON DELETE SET NULL;


--
-- Name: statements statements_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements
    ADD CONSTRAINT statements_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: statements_specification statements_specification_specification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements_specification
    ADD CONSTRAINT statements_specification_specification_id_fkey FOREIGN KEY (specification_id) REFERENCES public.specification(id) ON DELETE CASCADE;


--
-- Name: statements_specification statements_specification_statement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements_specification
    ADD CONSTRAINT statements_specification_statement_id_fkey FOREIGN KEY (statement_id) REFERENCES public.statements(id) ON DELETE CASCADE;


--
-- Name: statements statements_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements
    ADD CONSTRAINT statements_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: statements_version statements_version_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements_version
    ADD CONSTRAINT statements_version_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: statements_version statements_version_statement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statements_version
    ADD CONSTRAINT statements_version_statement_id_fkey FOREIGN KEY (statement_id) REFERENCES public.statements(id) ON DELETE CASCADE;


--
-- Name: storage storage_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage
    ADD CONSTRAINT storage_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: suppliers suppliers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: suppliers suppliers_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: time_logs time_logs_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT time_logs_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: time_logs time_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT time_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: user_notification_settings user_notification_settings_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.notification_events(id) ON DELETE CASCADE;


--
-- Name: user_notification_settings user_notification_settings_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.notification_methods(id) ON DELETE CASCADE;


--
-- Name: user_notification_settings user_notification_settings_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: user_notification_settings user_notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_rocket_chat user_rocket_chat_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_rocket_chat
    ADD CONSTRAINT user_rocket_chat_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_storage_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_storage_fk FOREIGN KEY (avatar_id) REFERENCES public.storage(id);


--
-- Name: wiki_articles wiki_articles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_articles
    ADD CONSTRAINT wiki_articles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: wiki_articles_history wiki_articles_history_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_articles_history
    ADD CONSTRAINT wiki_articles_history_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.wiki_articles(id) ON DELETE CASCADE;


--
-- Name: wiki_articles_history wiki_articles_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_articles_history
    ADD CONSTRAINT wiki_articles_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: wiki_articles wiki_articles_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_articles
    ADD CONSTRAINT wiki_articles_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.wiki_sections(id) ON DELETE CASCADE;


--
-- Name: wiki_articles_storage wiki_articles_storage_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_articles_storage
    ADD CONSTRAINT wiki_articles_storage_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.wiki_articles(id) ON DELETE CASCADE;


--
-- Name: wiki_articles_storage wiki_articles_storage_storage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_articles_storage
    ADD CONSTRAINT wiki_articles_storage_storage_id_fkey FOREIGN KEY (storage_id) REFERENCES public.storage(id) ON DELETE CASCADE;


--
-- Name: wiki_articles wiki_articles_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_articles
    ADD CONSTRAINT wiki_articles_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: wiki_sections wiki_sections_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_sections
    ADD CONSTRAINT wiki_sections_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: wiki_sections wiki_sections_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_sections
    ADD CONSTRAINT wiki_sections_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.wiki_sections(id) ON DELETE CASCADE;


--
-- Name: wiki_sections wiki_sections_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wiki_sections
    ADD CONSTRAINT wiki_sections_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 6aK5tSXrfySs5rzS3W2ybWmoqMPB5ZeRE5ZgjuRGjUhuzlvrRo7wgtY3qjxC511

