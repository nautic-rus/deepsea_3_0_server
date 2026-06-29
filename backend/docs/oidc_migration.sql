CREATE TABLE IF NOT EXISTS public.oidc_authorization_codes (
    id integer NOT NULL,
    code_hash character varying(128) NOT NULL,
    user_id integer NOT NULL,
    client_id character varying(255) NOT NULL,
    redirect_uri text NOT NULL,
    code_challenge text NOT NULL,
    code_challenge_method character varying(16) NOT NULL DEFAULT 'S256',
    nonce text,
    scope text NOT NULL DEFAULT 'openid',
    issuer text NOT NULL DEFAULT '',
    auth_time timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone NOT NULL,
    consumed_at timestamp without time zone,
    ip_address inet,
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.oidc_authorization_codes
    ADD COLUMN IF NOT EXISTS issuer text NOT NULL DEFAULT '';

CREATE SEQUENCE IF NOT EXISTS public.oidc_authorization_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.oidc_authorization_codes_id_seq OWNED BY public.oidc_authorization_codes.id;

ALTER TABLE ONLY public.oidc_authorization_codes
    ALTER COLUMN id SET DEFAULT nextval('public.oidc_authorization_codes_id_seq'::regclass);

ALTER TABLE ONLY public.oidc_authorization_codes
    ADD CONSTRAINT oidc_authorization_codes_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX IF NOT EXISTS oidc_authorization_codes_code_hash_uq
    ON public.oidc_authorization_codes USING btree (code_hash);

CREATE INDEX IF NOT EXISTS oidc_authorization_codes_user_id_idx
    ON public.oidc_authorization_codes USING btree (user_id);

CREATE INDEX IF NOT EXISTS oidc_authorization_codes_client_id_idx
    ON public.oidc_authorization_codes USING btree (client_id);

CREATE INDEX IF NOT EXISTS oidc_authorization_codes_expires_at_idx
    ON public.oidc_authorization_codes USING btree (expires_at);

ALTER TABLE ONLY public.oidc_authorization_codes
    ADD CONSTRAINT oidc_authorization_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

COMMENT ON TABLE public.oidc_authorization_codes IS 'OIDC authorization codes for authorization_code + PKCE flow';
