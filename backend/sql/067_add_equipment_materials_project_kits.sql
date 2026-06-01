-- Migration: add kits linked to material-project bindings.

CREATE TABLE IF NOT EXISTS public.equipment_materials_project_kits (
    id integer NOT NULL,
    material_project_id integer NOT NULL,
    material_kit_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE IF NOT EXISTS public.equipment_materials_project_kits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.equipment_materials_project_kits_id_seq OWNED BY public.equipment_materials_project_kits.id;

ALTER TABLE ONLY public.equipment_materials_project_kits
    ALTER COLUMN id SET DEFAULT nextval('public.equipment_materials_project_kits_id_seq'::regclass);

ALTER TABLE ONLY public.equipment_materials_project_kits
    ADD CONSTRAINT equipment_materials_project_kits_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.equipment_materials_project_kits
    ADD CONSTRAINT equipment_materials_project_kits_unique UNIQUE (material_project_id, material_kit_id);

ALTER TABLE ONLY public.equipment_materials_project_kits
    ADD CONSTRAINT equipment_materials_project_kits_material_project_id_fkey FOREIGN KEY (material_project_id) REFERENCES public.equipment_materials_projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.equipment_materials_project_kits
    ADD CONSTRAINT equipment_materials_project_kits_material_kit_id_fkey FOREIGN KEY (material_kit_id) REFERENCES public.equipment_material_kits(id) ON DELETE CASCADE;
