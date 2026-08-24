-- ════════════════════════════════════════════════════════════════════════════
-- SOCLE — schéma complet de l'application
-- ════════════════════════════════════════════════════════════════════════════
--
-- Extrait le 2026-08-24 de la base du Foyer des Écoles (pg_dump --schema-only
-- --schema=public --no-owner), après P0. Remplace les 23 patchs successifs,
-- désormais dans archive/ : ils ne créaient que 6 des 24 tables, les 18 autres
-- n'existaient que dans l'interface Supabase.
--
-- Contenu : 24 tables · 50 policies · RLS active partout · 3 fonctions
--           1 trigger · 16 index. Aucune donnée, aucune valeur propre à un foyer.
--
-- Pour monter un foyer neuf :
--   1. ce fichier          2. supabase/seed.sql     3. node scripts/foyer-nouveau.mjs
--
-- Deux retouches par rapport à la sortie brute de pg_dump :
--   · les méta-commandes \restrict / \unrestrict (pg_dump 18) sont retirées :
--     elles ne fonctionnent que dans psql, pas dans l'éditeur SQL de Supabase ;
--   · CREATE SCHEMA public devient IF NOT EXISTS — le schéma existe déjà sur
--     tout projet Supabase neuf.
--
-- Cible : PostgreSQL 17 (SET transaction_timeout n'existe pas avant).

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: basculer_confirmation_evenement(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.basculer_confirmation_evenement(p_event_id bigint) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_user   text := auth.uid()::text;
  v_apres  boolean;
begin
  if v_user is null then
    raise exception 'Utilisateur non authentifié';
  end if;

  update public.evenements
     set confirmations = case
           when coalesce(confirmations, '{}') @> array[v_user]
             then array_remove(confirmations, v_user)
             else array_append(coalesce(confirmations, '{}'), v_user)
         end
   where id = p_event_id
  returning coalesce(confirmations, '{}') @> array[v_user] into v_apres;

  if not found then
    raise exception 'Événement introuvable';
  end if;

  return v_apres; -- true = inscrite, false = retirée
end;
$$;


--
-- Name: mon_niveau(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mon_niveau(p_section text) RETURNS smallint
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select case
    when auth.uid() is null then 0::smallint
    else coalesce(
      (select case
                when r.is_super_admin or r.is_technique then 3::smallint
                else case p_section
                       when 'repas'      then r.niveau_repas
                       when 'evenements' then r.niveau_evenements
                       when 'absences'   then r.niveau_absences
                       when 'comptes'    then r.niveau_comptes
                       when 'infos'      then r.niveau_infos
                     end
              end
         from public.residentes r
        where r.user_id = auth.uid()),
      1::smallint)
  end;
$$;


--
-- Name: residentes_sync_is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.residentes_sync_is_admin() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.is_admin :=
    coalesce(new.is_technique, false)
    or coalesce(new.is_super_admin, false)
    or new.niveau_repas >= 2 or new.niveau_evenements >= 2
    or new.niveau_absences >= 2 or new.niveau_comptes >= 2 or new.niveau_infos >= 2;
  return new;
end $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: absences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.absences (
    id bigint NOT NULL,
    user_id uuid,
    date_absence date NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


--
-- Name: absences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.absences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: absences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.absences_id_seq OWNED BY public.absences.id;


--
-- Name: absences_sejour; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.absences_sejour (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date_debut date NOT NULL,
    date_fin date NOT NULL,
    contact text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    depart_dejeuner boolean DEFAULT true NOT NULL,
    depart_diner boolean DEFAULT false NOT NULL,
    retour_dejeuner boolean DEFAULT false NOT NULL,
    retour_diner boolean DEFAULT true NOT NULL,
    repas_non boolean DEFAULT true NOT NULL,
    CONSTRAINT absences_sejour_dates_check CHECK ((date_fin >= date_debut))
);


--
-- Name: admin_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    type text DEFAULT 'richtext'::text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    visibilite jsonb,
    CONSTRAINT admin_sections_type_chk CHECK ((type = ANY (ARRAY['richtext'::text, 'contacts'::text])))
);


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    id bigint NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    label text
);


--
-- Name: app_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_settings_id_seq OWNED BY public.app_settings.id;


--
-- Name: etages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.etages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    residence text NOT NULL,
    value text NOT NULL,
    label text NOT NULL,
    ordre integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: evenements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evenements (
    id bigint NOT NULL,
    titre text NOT NULL,
    category text,
    couleur text,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    heures text,
    lieu text[],
    visibilite jsonb,
    recurrence text,
    description text,
    visible_invites boolean DEFAULT true,
    demander_confirmation boolean DEFAULT false,
    rappel_event integer,
    confirmations text[] DEFAULT '{}'::text[] NOT NULL,
    dates_event text[]
);


--
-- Name: evenements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.evenements ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.evenements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: groupe_membres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groupe_membres (
    groupe_id uuid NOT NULL,
    user_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: groupes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groupes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    place_id uuid NOT NULL,
    role text DEFAULT 'residente'::text NOT NULL,
    auth_user_id uuid,
    statut text DEFAULT 'envoyee'::text NOT NULL,
    invited_by uuid,
    expires_at timestamp with time zone DEFAULT (now() + '14 days'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invitations_statut_check CHECK ((statut = ANY (ARRAY['envoyee'::text, 'acceptee'::text, 'expiree'::text, 'annulee'::text])))
);


--
-- Name: invitees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invitees (
    id bigint NOT NULL,
    user_id uuid,
    nom text NOT NULL,
    prenom text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    email text,
    residence text
);


--
-- Name: invitees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invitees_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invitees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invitees_id_seq OWNED BY public.invitees.id;


--
-- Name: invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invites (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    nom text,
    prenom text,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: TABLE invites; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.invites IS 'Table d''invités (rempli à partir de invités aux repas)';


--
-- Name: invites_repas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invites_repas (
    id integer NOT NULL,
    nom text NOT NULL,
    prenom text NOT NULL,
    date_repas date NOT NULL,
    type_repas text NOT NULL,
    invite_par uuid,
    created_at timestamp with time zone DEFAULT now(),
    lieu_repas text,
    id_invite bigint,
    option_id uuid,
    compta_residence text
);


--
-- Name: invites_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invites_id_seq OWNED BY public.invites_repas.id;


--
-- Name: invites_id_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.invites ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.invites_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: meal_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meal_audit_log (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    actor_user_id uuid,
    actor_name text,
    action text NOT NULL,
    entity text NOT NULL,
    target_user_id uuid,
    target_name text,
    date_repas date,
    service text,
    option_before text,
    option_after text,
    details jsonb
);


--
-- Name: meal_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.meal_audit_log ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.meal_audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: meal_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meal_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    residence text NOT NULL,
    delai_commande integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    visibilite jsonb
);


--
-- Name: meal_service_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meal_service_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    service text NOT NULL,
    option_id uuid NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    CONSTRAINT meal_service_options_service_chk CHECK ((service = ANY (ARRAY['dejeuner'::text, 'diner'::text])))
);


--
-- Name: pending_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_users (
    id integer NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    nom text,
    prenom text,
    datenaissance text,
    residence text,
    etage text,
    chambre text,
    created_at timestamp with time zone DEFAULT now(),
    "typeInvitee" text,
    CONSTRAINT pending_users_role_check CHECK ((role = ANY (ARRAY['residente'::text, 'invitee'::text])))
);


--
-- Name: pending_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pending_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pending_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pending_users_id_seq OWNED BY public.pending_users.id;


--
-- Name: places; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.places (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    residence text NOT NULL,
    kind text NOT NULL,
    etage text,
    code text NOT NULL,
    label text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT places_kind_check CHECK ((kind = ANY (ARRAY['chambre'::text, 'poste'::text]))),
    CONSTRAINT places_kind_etage_chk CHECK (((kind = 'chambre'::text) OR ((kind = 'poste'::text) AND (etage IS NULL))))
);


--
-- Name: presences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    service text NOT NULL,
    option_id uuid,
    commentaire text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT presences_service_chk CHECK ((service = ANY (ARRAY['dejeuner'::text, 'diner'::text])))
);


--
-- Name: residences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.residences (
    label text NOT NULL,
    value text NOT NULL,
    kind text DEFAULT 'chambre'::text NOT NULL,
    ordre integer DEFAULT 0 NOT NULL,
    couleur text DEFAULT 'blue'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT residences_couleur_check CHECK ((couleur = ANY (ARRAY['amber'::text, 'pink'::text, 'teal'::text, 'blue'::text, 'purple'::text, 'green'::text]))),
    CONSTRAINT residences_kind_check CHECK ((kind = ANY (ARRAY['chambre'::text, 'poste'::text])))
);


--
-- Name: residentes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.residentes (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    nom text NOT NULL,
    prenom text NOT NULL,
    date_naissance text,
    residence text,
    etage text,
    chambre text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    email text,
    is_admin boolean DEFAULT false,
    place_id uuid,
    statut text DEFAULT 'active'::text NOT NULL,
    archived_at timestamp with time zone,
    is_technique boolean DEFAULT false NOT NULL,
    niveau_repas smallint DEFAULT 1 NOT NULL,
    niveau_evenements smallint DEFAULT 1 NOT NULL,
    niveau_absences smallint DEFAULT 1 NOT NULL,
    niveau_comptes smallint DEFAULT 1 NOT NULL,
    niveau_infos smallint DEFAULT 1 NOT NULL,
    is_super_admin boolean DEFAULT false NOT NULL,
    CONSTRAINT residentes_niv_sections_chk CHECK ((((niveau_repas >= 0) AND (niveau_repas <= 3)) AND ((niveau_evenements >= 0) AND (niveau_evenements <= 3)) AND ((niveau_absences >= 0) AND (niveau_absences <= 3)) AND ((niveau_comptes >= 1) AND (niveau_comptes <= 3)) AND ((niveau_infos >= 0) AND (niveau_infos <= 3)))),
    CONSTRAINT residentes_statut_check CHECK ((statut = ANY (ARRAY['active'::text, 'archivee'::text])))
);


--
-- Name: residentes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.residentes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: residentes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.residentes_id_seq OWNED BY public.residentes.id;


--
-- Name: select_options_evenement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.select_options_evenement (
    id bigint NOT NULL,
    category text NOT NULL,
    value text NOT NULL,
    label text NOT NULL,
    is_active boolean DEFAULT true,
    admin_only boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    parent_value text,
    created_by uuid DEFAULT auth.uid(),
    label_category text
);


--
-- Name: select_options_evenement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.select_options_evenement ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.select_options_evenement_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: select_options_rappel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.select_options_rappel (
    id bigint NOT NULL,
    category text NOT NULL,
    value text NOT NULL,
    label text NOT NULL,
    is_active boolean DEFAULT true,
    admin_only boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    parent_value text,
    created_by uuid DEFAULT auth.uid(),
    label_category text
);


--
-- Name: select_options_rappel_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.select_options_rappel ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.select_options_rappel_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: select_options_recurrence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.select_options_recurrence (
    id bigint NOT NULL,
    category text NOT NULL,
    value text NOT NULL,
    label text NOT NULL,
    is_active boolean DEFAULT true,
    admin_only boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    parent_value text,
    created_by uuid DEFAULT auth.uid(),
    label_category text
);


--
-- Name: select_options_recurrence_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.select_options_recurrence ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.select_options_recurrence_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: select_options_residence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.select_options_residence (
    id bigint NOT NULL,
    category text NOT NULL,
    value text NOT NULL,
    label text NOT NULL,
    is_active boolean DEFAULT true,
    admin_only boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    parent_value text,
    created_by uuid DEFAULT auth.uid(),
    label_category text
);


--
-- Name: select_options_residence_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.select_options_residence ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.select_options_residence_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: absences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.absences ALTER COLUMN id SET DEFAULT nextval('public.absences_id_seq'::regclass);


--
-- Name: app_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings ALTER COLUMN id SET DEFAULT nextval('public.app_settings_id_seq'::regclass);


--
-- Name: invitees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitees ALTER COLUMN id SET DEFAULT nextval('public.invitees_id_seq'::regclass);


--
-- Name: invites_repas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites_repas ALTER COLUMN id SET DEFAULT nextval('public.invites_id_seq'::regclass);


--
-- Name: pending_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_users ALTER COLUMN id SET DEFAULT nextval('public.pending_users_id_seq'::regclass);


--
-- Name: residentes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.residentes ALTER COLUMN id SET DEFAULT nextval('public.residentes_id_seq'::regclass);


--
-- Name: absences absences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.absences
    ADD CONSTRAINT absences_pkey PRIMARY KEY (id);


--
-- Name: absences_sejour absences_sejour_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.absences_sejour
    ADD CONSTRAINT absences_sejour_pkey PRIMARY KEY (id);


--
-- Name: absences absences_user_id_date_absence_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.absences
    ADD CONSTRAINT absences_user_id_date_absence_key UNIQUE (user_id, date_absence);


--
-- Name: admin_sections admin_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_sections
    ADD CONSTRAINT admin_sections_pkey PRIMARY KEY (id);


--
-- Name: app_settings app_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_key_key UNIQUE (key);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: etages etages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etages
    ADD CONSTRAINT etages_pkey PRIMARY KEY (id);


--
-- Name: evenements evenements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evenements
    ADD CONSTRAINT evenements_pkey PRIMARY KEY (id);


--
-- Name: groupe_membres groupe_membres_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groupe_membres
    ADD CONSTRAINT groupe_membres_pkey PRIMARY KEY (groupe_id, user_id);


--
-- Name: groupes groupes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groupes
    ADD CONSTRAINT groupes_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: invitees invitees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitees
    ADD CONSTRAINT invitees_pkey PRIMARY KEY (id);


--
-- Name: invites invites_nom_prenom_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_nom_prenom_unique UNIQUE (nom, prenom);


--
-- Name: invites_repas invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites_repas
    ADD CONSTRAINT invites_pkey PRIMARY KEY (id);


--
-- Name: invites invites_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_pkey1 PRIMARY KEY (id);


--
-- Name: meal_audit_log meal_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_audit_log
    ADD CONSTRAINT meal_audit_log_pkey PRIMARY KEY (id);


--
-- Name: meal_options meal_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_options
    ADD CONSTRAINT meal_options_pkey PRIMARY KEY (id);


--
-- Name: meal_service_options meal_service_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_service_options
    ADD CONSTRAINT meal_service_options_pkey PRIMARY KEY (id);


--
-- Name: meal_service_options meal_service_options_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_service_options
    ADD CONSTRAINT meal_service_options_unique UNIQUE (date, service, option_id);


--
-- Name: pending_users pending_users_emailinscription_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_users
    ADD CONSTRAINT pending_users_emailinscription_key UNIQUE (email);


--
-- Name: pending_users pending_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_users
    ADD CONSTRAINT pending_users_pkey PRIMARY KEY (id);


--
-- Name: places places_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.places
    ADD CONSTRAINT places_pkey PRIMARY KEY (id);


--
-- Name: presences presences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presences
    ADD CONSTRAINT presences_pkey PRIMARY KEY (id);


--
-- Name: presences presences_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presences
    ADD CONSTRAINT presences_unique UNIQUE (user_id, date, service);


--
-- Name: residences residences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.residences
    ADD CONSTRAINT residences_pkey PRIMARY KEY (value);


--
-- Name: residentes residentes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.residentes
    ADD CONSTRAINT residentes_pkey PRIMARY KEY (user_id);


--
-- Name: select_options_evenement select_options_evenement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.select_options_evenement
    ADD CONSTRAINT select_options_evenement_pkey PRIMARY KEY (id);


--
-- Name: select_options_rappel select_options_rappel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.select_options_rappel
    ADD CONSTRAINT select_options_rappel_pkey PRIMARY KEY (id);


--
-- Name: select_options_recurrence select_options_recurrence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.select_options_recurrence
    ADD CONSTRAINT select_options_recurrence_pkey PRIMARY KEY (id);


--
-- Name: select_options_residence select_options_residence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.select_options_residence
    ADD CONSTRAINT select_options_residence_pkey PRIMARY KEY (id);


--
-- Name: absences_sejour_dates_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX absences_sejour_dates_idx ON public.absences_sejour USING btree (date_debut, date_fin);


--
-- Name: absences_sejour_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX absences_sejour_user_id_idx ON public.absences_sejour USING btree (user_id);


--
-- Name: absences_user_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX absences_user_date_idx ON public.absences USING btree (user_id, date_absence);


--
-- Name: etages_residence_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX etages_residence_idx ON public.etages USING btree (residence);


--
-- Name: etages_residence_value_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX etages_residence_value_key ON public.etages USING btree (residence, value);


--
-- Name: groupe_membres_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX groupe_membres_user_idx ON public.groupe_membres USING btree (user_id);


--
-- Name: groupes_nom_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX groupes_nom_unique ON public.groupes USING btree (lower(nom));


--
-- Name: invitations_one_pending_per_place; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invitations_one_pending_per_place ON public.invitations USING btree (place_id) WHERE (statut = 'envoyee'::text);


--
-- Name: meal_audit_log_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX meal_audit_log_created_idx ON public.meal_audit_log USING btree (created_at DESC);


--
-- Name: meal_audit_log_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX meal_audit_log_date_idx ON public.meal_audit_log USING btree (date_repas);


--
-- Name: meal_audit_log_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX meal_audit_log_target_idx ON public.meal_audit_log USING btree (target_user_id);


--
-- Name: meal_service_options_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX meal_service_options_date_idx ON public.meal_service_options USING btree (date, service);


--
-- Name: places_residence_kind_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX places_residence_kind_code_key ON public.places USING btree (residence, kind, code);


--
-- Name: presences_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX presences_date_idx ON public.presences USING btree (date, service);


--
-- Name: residences_value_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX residences_value_key ON public.residences USING btree (value);


--
-- Name: residentes_one_active_per_place; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX residentes_one_active_per_place ON public.residentes USING btree (place_id) WHERE ((statut = 'active'::text) AND (place_id IS NOT NULL));


--
-- Name: residentes trg_residentes_sync_is_admin; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_residentes_sync_is_admin BEFORE INSERT OR UPDATE ON public.residentes FOR EACH ROW EXECUTE FUNCTION public.residentes_sync_is_admin();


--
-- Name: absences_sejour absences_sejour_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.absences_sejour
    ADD CONSTRAINT absences_sejour_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: absences absences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.absences
    ADD CONSTRAINT absences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: etages etages_residence_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etages
    ADD CONSTRAINT etages_residence_fkey FOREIGN KEY (residence) REFERENCES public.residences(value) ON UPDATE CASCADE;


--
-- Name: evenements evenements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evenements
    ADD CONSTRAINT evenements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: groupe_membres groupe_membres_groupe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groupe_membres
    ADD CONSTRAINT groupe_membres_groupe_id_fkey FOREIGN KEY (groupe_id) REFERENCES public.groupes(id) ON DELETE CASCADE;


--
-- Name: groupe_membres groupe_membres_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groupe_membres
    ADD CONSTRAINT groupe_membres_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: invitations invitations_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id);


--
-- Name: invitees invitees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitees
    ADD CONSTRAINT invitees_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: invites_repas invites_invite_par_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites_repas
    ADD CONSTRAINT invites_invite_par_fkey FOREIGN KEY (invite_par) REFERENCES public.residentes(user_id) ON DELETE CASCADE;


--
-- Name: invites_repas invites_repas_id_invite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites_repas
    ADD CONSTRAINT invites_repas_id_invite_fkey FOREIGN KEY (id_invite) REFERENCES public.invites(id);


--
-- Name: invites_repas invites_repas_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites_repas
    ADD CONSTRAINT invites_repas_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.meal_options(id);


--
-- Name: meal_service_options meal_service_options_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_service_options
    ADD CONSTRAINT meal_service_options_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.meal_options(id) ON DELETE CASCADE;


--
-- Name: places places_residence_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.places
    ADD CONSTRAINT places_residence_fkey FOREIGN KEY (residence) REFERENCES public.residences(value) ON UPDATE CASCADE;


--
-- Name: presences presences_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presences
    ADD CONSTRAINT presences_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.meal_options(id) ON DELETE CASCADE;


--
-- Name: presences presences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presences
    ADD CONSTRAINT presences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: residentes residentes_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.residentes
    ADD CONSTRAINT residentes_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id);


--
-- Name: residentes residentes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.residentes
    ADD CONSTRAINT residentes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: absences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;

--
-- Name: absences absences: lecture intendance absences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "absences: lecture intendance absences" ON public.absences FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (public.mon_niveau('absences'::text) >= 2)));


--
-- Name: absences_sejour; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.absences_sejour ENABLE ROW LEVEL SECURITY;

--
-- Name: absences_sejour absences_sejour: declarer les siens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "absences_sejour: declarer les siens" ON public.absences_sejour FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (public.mon_niveau('absences'::text) >= 1)) OR (public.mon_niveau('absences'::text) >= 3)));


--
-- Name: absences_sejour absences_sejour: les siens ou consultation intendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "absences_sejour: les siens ou consultation intendance" ON public.absences_sejour FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (public.mon_niveau('absences'::text) >= 2)));


--
-- Name: absences_sejour absences_sejour: modifier les siens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "absences_sejour: modifier les siens" ON public.absences_sejour FOR UPDATE TO authenticated USING ((((user_id = auth.uid()) AND (public.mon_niveau('absences'::text) >= 1)) OR (public.mon_niveau('absences'::text) >= 3))) WITH CHECK ((((user_id = auth.uid()) AND (public.mon_niveau('absences'::text) >= 1)) OR (public.mon_niveau('absences'::text) >= 3)));


--
-- Name: absences_sejour absences_sejour: supprimer les siens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "absences_sejour: supprimer les siens" ON public.absences_sejour FOR DELETE TO authenticated USING ((((user_id = auth.uid()) AND (public.mon_niveau('absences'::text) >= 1)) OR (public.mon_niveau('absences'::text) >= 3)));


--
-- Name: admin_sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_sections ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_sections admin_sections: ecriture gestion infos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin_sections: ecriture gestion infos" ON public.admin_sections TO authenticated USING ((public.mon_niveau('infos'::text) >= 3)) WITH CHECK ((public.mon_niveau('infos'::text) >= 3));


--
-- Name: admin_sections admin_sections: lecture section infos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin_sections: lecture section infos" ON public.admin_sections FOR SELECT TO authenticated USING ((public.mon_niveau('infos'::text) >= 1));


--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings app_settings: ecriture gestion; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "app_settings: ecriture gestion" ON public.app_settings TO authenticated USING (((public.mon_niveau('repas'::text) >= 3) OR (public.mon_niveau('absences'::text) >= 3) OR (public.mon_niveau('comptes'::text) >= 3))) WITH CHECK (((public.mon_niveau('repas'::text) >= 3) OR (public.mon_niveau('absences'::text) >= 3) OR (public.mon_niveau('comptes'::text) >= 3)));


--
-- Name: app_settings app_settings: lecture connectees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "app_settings: lecture connectees" ON public.app_settings FOR SELECT TO authenticated USING (true);


--
-- Name: etages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.etages ENABLE ROW LEVEL SECURITY;

--
-- Name: etages etages: ecriture gestion comptes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "etages: ecriture gestion comptes" ON public.etages TO authenticated USING ((public.mon_niveau('comptes'::text) >= 3)) WITH CHECK ((public.mon_niveau('comptes'::text) >= 3));


--
-- Name: etages etages: lecture publique; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "etages: lecture publique" ON public.etages FOR SELECT TO authenticated, anon USING (true);


--
-- Name: evenements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.evenements ENABLE ROW LEVEL SECURITY;

--
-- Name: evenements evenements: ecriture gestion evenements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "evenements: ecriture gestion evenements" ON public.evenements TO authenticated USING ((public.mon_niveau('evenements'::text) >= 3)) WITH CHECK ((public.mon_niveau('evenements'::text) >= 3));


--
-- Name: evenements evenements: lecture section evenements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "evenements: lecture section evenements" ON public.evenements FOR SELECT TO authenticated USING ((public.mon_niveau('evenements'::text) >= 1));


--
-- Name: groupe_membres; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.groupe_membres ENABLE ROW LEVEL SECURITY;

--
-- Name: groupe_membres groupe_membres: ecriture gestion comptes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "groupe_membres: ecriture gestion comptes" ON public.groupe_membres TO authenticated USING ((public.mon_niveau('comptes'::text) >= 3)) WITH CHECK ((public.mon_niveau('comptes'::text) >= 3));


--
-- Name: groupe_membres groupe_membres: mes appartenances ou consultation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "groupe_membres: mes appartenances ou consultation" ON public.groupe_membres FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (public.mon_niveau('comptes'::text) >= 2)));


--
-- Name: groupes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.groupes ENABLE ROW LEVEL SECURITY;

--
-- Name: groupes groupes: ecriture gestion comptes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "groupes: ecriture gestion comptes" ON public.groupes TO authenticated USING ((public.mon_niveau('comptes'::text) >= 3)) WITH CHECK ((public.mon_niveau('comptes'::text) >= 3));


--
-- Name: groupes groupes: lecture connectees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "groupes: lecture connectees" ON public.groupes FOR SELECT TO authenticated USING (true);


--
-- Name: invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: invitations invitations: ecriture gestion comptes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invitations: ecriture gestion comptes" ON public.invitations TO authenticated USING ((public.mon_niveau('comptes'::text) >= 3)) WITH CHECK ((public.mon_niveau('comptes'::text) >= 3));


--
-- Name: invitations invitations: lecture gestion comptes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invitations: lecture gestion comptes" ON public.invitations FOR SELECT TO authenticated USING ((public.mon_niveau('comptes'::text) >= 2));


--
-- Name: invitees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invitees ENABLE ROW LEVEL SECURITY;

--
-- Name: invitees invitees: creation de sa propre ligne; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invitees: creation de sa propre ligne" ON public.invitees FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: invitees invitees: lecture connectees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invitees: lecture connectees" ON public.invitees FOR SELECT TO authenticated USING (true);


--
-- Name: invitees invitees: modification de sa ligne ou gestion; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invitees: modification de sa ligne ou gestion" ON public.invitees FOR UPDATE TO authenticated USING (((user_id = auth.uid()) OR (public.mon_niveau('comptes'::text) >= 3))) WITH CHECK (((user_id = auth.uid()) OR (public.mon_niveau('comptes'::text) >= 3)));


--
-- Name: invitees invitees: suppression par la gestion; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invitees: suppression par la gestion" ON public.invitees FOR DELETE TO authenticated USING ((public.mon_niveau('comptes'::text) >= 3));


--
-- Name: invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

--
-- Name: invites invites: creation par les habitantes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invites: creation par les habitantes" ON public.invites FOR INSERT TO authenticated WITH CHECK ((public.mon_niveau('repas'::text) >= 1));


--
-- Name: invites invites: lecture section repas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invites: lecture section repas" ON public.invites FOR SELECT TO authenticated USING ((public.mon_niveau('repas'::text) >= 1));


--
-- Name: invites invites: modification par les habitantes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invites: modification par les habitantes" ON public.invites FOR UPDATE TO authenticated USING ((public.mon_niveau('repas'::text) >= 1)) WITH CHECK ((public.mon_niveau('repas'::text) >= 1));


--
-- Name: invites invites: suppression gestion repas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invites: suppression gestion repas" ON public.invites FOR DELETE TO authenticated USING ((public.mon_niveau('repas'::text) >= 3));


--
-- Name: invites_repas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invites_repas ENABLE ROW LEVEL SECURITY;

--
-- Name: invites_repas invites_repas: inviter; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invites_repas: inviter" ON public.invites_repas FOR INSERT TO authenticated WITH CHECK ((((invite_par = auth.uid()) AND (public.mon_niveau('repas'::text) >= 1)) OR (public.mon_niveau('repas'::text) >= 3)));


--
-- Name: invites_repas invites_repas: lecture section repas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invites_repas: lecture section repas" ON public.invites_repas FOR SELECT TO authenticated USING ((public.mon_niveau('repas'::text) >= 1));


--
-- Name: invites_repas invites_repas: modifier ses invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invites_repas: modifier ses invites" ON public.invites_repas FOR UPDATE TO authenticated USING ((((invite_par = auth.uid()) AND (public.mon_niveau('repas'::text) >= 1)) OR (public.mon_niveau('repas'::text) >= 3))) WITH CHECK ((((invite_par = auth.uid()) AND (public.mon_niveau('repas'::text) >= 1)) OR (public.mon_niveau('repas'::text) >= 3)));


--
-- Name: invites_repas invites_repas: retirer ses invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invites_repas: retirer ses invites" ON public.invites_repas FOR DELETE TO authenticated USING ((((invite_par = auth.uid()) AND (public.mon_niveau('repas'::text) >= 1)) OR (public.mon_niveau('repas'::text) >= 3)));


--
-- Name: meal_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meal_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: meal_audit_log meal_audit_log: lecture intendance repas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "meal_audit_log: lecture intendance repas" ON public.meal_audit_log FOR SELECT TO authenticated USING ((public.mon_niveau('repas'::text) >= 2));


--
-- Name: meal_options; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meal_options ENABLE ROW LEVEL SECURITY;

--
-- Name: meal_options meal_options: ecriture gestion repas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "meal_options: ecriture gestion repas" ON public.meal_options TO authenticated USING ((public.mon_niveau('repas'::text) >= 3)) WITH CHECK ((public.mon_niveau('repas'::text) >= 3));


--
-- Name: meal_options meal_options: lecture section repas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "meal_options: lecture section repas" ON public.meal_options FOR SELECT TO authenticated USING ((public.mon_niveau('repas'::text) >= 1));


--
-- Name: meal_service_options; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meal_service_options ENABLE ROW LEVEL SECURITY;

--
-- Name: meal_service_options meal_service_options: ecriture gestion repas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "meal_service_options: ecriture gestion repas" ON public.meal_service_options TO authenticated USING ((public.mon_niveau('repas'::text) >= 3)) WITH CHECK ((public.mon_niveau('repas'::text) >= 3));


--
-- Name: meal_service_options meal_service_options: lecture section repas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "meal_service_options: lecture section repas" ON public.meal_service_options FOR SELECT TO authenticated USING ((public.mon_niveau('repas'::text) >= 1));


--
-- Name: pending_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

--
-- Name: pending_users pending_users: creation avant compte; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "pending_users: creation avant compte" ON public.pending_users FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: pending_users pending_users: lecture de sa propre ligne; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "pending_users: lecture de sa propre ligne" ON public.pending_users FOR SELECT TO authenticated USING ((email = (auth.jwt() ->> 'email'::text)));


--
-- Name: pending_users pending_users: suppression rollback inscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "pending_users: suppression rollback inscription" ON public.pending_users FOR DELETE TO authenticated, anon USING (true);


--
-- Name: places; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

--
-- Name: places places: ecriture gestion comptes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "places: ecriture gestion comptes" ON public.places TO authenticated USING ((public.mon_niveau('comptes'::text) >= 3)) WITH CHECK ((public.mon_niveau('comptes'::text) >= 3));


--
-- Name: places places: lecture connectees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "places: lecture connectees" ON public.places FOR SELECT TO authenticated USING (true);


--
-- Name: presences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.presences ENABLE ROW LEVEL SECURITY;

--
-- Name: presences presences: inscrire les siens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "presences: inscrire les siens" ON public.presences FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (public.mon_niveau('repas'::text) >= 1)) OR (public.mon_niveau('repas'::text) >= 3)));


--
-- Name: presences presences: les siennes ou consultation intendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "presences: les siennes ou consultation intendance" ON public.presences FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (public.mon_niveau('repas'::text) >= 2)));


--
-- Name: presences presences: modifier les siens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "presences: modifier les siens" ON public.presences FOR UPDATE TO authenticated USING ((((user_id = auth.uid()) AND (public.mon_niveau('repas'::text) >= 1)) OR (public.mon_niveau('repas'::text) >= 3))) WITH CHECK ((((user_id = auth.uid()) AND (public.mon_niveau('repas'::text) >= 1)) OR (public.mon_niveau('repas'::text) >= 3)));


--
-- Name: presences presences: retirer les siens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "presences: retirer les siens" ON public.presences FOR DELETE TO authenticated USING ((((user_id = auth.uid()) AND (public.mon_niveau('repas'::text) >= 1)) OR (public.mon_niveau('repas'::text) >= 3)));


--
-- Name: residences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.residences ENABLE ROW LEVEL SECURITY;

--
-- Name: residences residences: ecriture gestion comptes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "residences: ecriture gestion comptes" ON public.residences TO authenticated USING ((public.mon_niveau('comptes'::text) >= 3)) WITH CHECK ((public.mon_niveau('comptes'::text) >= 3));


--
-- Name: residences residences: lecture publique; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "residences: lecture publique" ON public.residences FOR SELECT TO authenticated, anon USING (true);


--
-- Name: residentes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.residentes ENABLE ROW LEVEL SECURITY;

--
-- Name: residentes residentes: lecture connectees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "residentes: lecture connectees" ON public.residentes FOR SELECT TO authenticated USING (true);


--
-- Name: select_options_evenement; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.select_options_evenement ENABLE ROW LEVEL SECURITY;

--
-- Name: select_options_rappel; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.select_options_rappel ENABLE ROW LEVEL SECURITY;

--
-- Name: select_options_recurrence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.select_options_recurrence ENABLE ROW LEVEL SECURITY;

--
-- Name: select_options_residence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.select_options_residence ENABLE ROW LEVEL SECURITY;

--
-- Name: select_options_residence select_options_residence: ecriture gestion comptes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "select_options_residence: ecriture gestion comptes" ON public.select_options_residence TO authenticated USING ((public.mon_niveau('comptes'::text) >= 3)) WITH CHECK ((public.mon_niveau('comptes'::text) >= 3));


--
-- Name: select_options_residence select_options_residence: lecture connectees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "select_options_residence: lecture connectees" ON public.select_options_residence FOR SELECT TO authenticated USING (true);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION basculer_confirmation_evenement(p_event_id bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.basculer_confirmation_evenement(p_event_id bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.basculer_confirmation_evenement(p_event_id bigint) TO anon;
GRANT ALL ON FUNCTION public.basculer_confirmation_evenement(p_event_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.basculer_confirmation_evenement(p_event_id bigint) TO service_role;


--
-- Name: FUNCTION mon_niveau(p_section text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.mon_niveau(p_section text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.mon_niveau(p_section text) TO anon;
GRANT ALL ON FUNCTION public.mon_niveau(p_section text) TO authenticated;
GRANT ALL ON FUNCTION public.mon_niveau(p_section text) TO service_role;


--
-- Name: FUNCTION residentes_sync_is_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.residentes_sync_is_admin() TO anon;
GRANT ALL ON FUNCTION public.residentes_sync_is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.residentes_sync_is_admin() TO service_role;


--
-- Name: TABLE absences; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.absences TO anon;
GRANT ALL ON TABLE public.absences TO authenticated;
GRANT ALL ON TABLE public.absences TO service_role;


--
-- Name: SEQUENCE absences_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.absences_id_seq TO anon;
GRANT ALL ON SEQUENCE public.absences_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.absences_id_seq TO service_role;


--
-- Name: TABLE absences_sejour; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.absences_sejour TO anon;
GRANT ALL ON TABLE public.absences_sejour TO authenticated;
GRANT ALL ON TABLE public.absences_sejour TO service_role;


--
-- Name: TABLE admin_sections; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.admin_sections TO anon;
GRANT ALL ON TABLE public.admin_sections TO authenticated;
GRANT ALL ON TABLE public.admin_sections TO service_role;


--
-- Name: TABLE app_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_settings TO anon;
GRANT ALL ON TABLE public.app_settings TO authenticated;
GRANT ALL ON TABLE public.app_settings TO service_role;


--
-- Name: SEQUENCE app_settings_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.app_settings_id_seq TO anon;
GRANT ALL ON SEQUENCE public.app_settings_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.app_settings_id_seq TO service_role;


--
-- Name: TABLE etages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.etages TO anon;
GRANT ALL ON TABLE public.etages TO authenticated;
GRANT ALL ON TABLE public.etages TO service_role;


--
-- Name: TABLE evenements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.evenements TO anon;
GRANT ALL ON TABLE public.evenements TO authenticated;
GRANT ALL ON TABLE public.evenements TO service_role;


--
-- Name: SEQUENCE evenements_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.evenements_id_seq TO anon;
GRANT ALL ON SEQUENCE public.evenements_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.evenements_id_seq TO service_role;


--
-- Name: TABLE groupe_membres; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.groupe_membres TO anon;
GRANT ALL ON TABLE public.groupe_membres TO authenticated;
GRANT ALL ON TABLE public.groupe_membres TO service_role;


--
-- Name: TABLE groupes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.groupes TO anon;
GRANT ALL ON TABLE public.groupes TO authenticated;
GRANT ALL ON TABLE public.groupes TO service_role;


--
-- Name: TABLE invitations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.invitations TO anon;
GRANT ALL ON TABLE public.invitations TO authenticated;
GRANT ALL ON TABLE public.invitations TO service_role;


--
-- Name: TABLE invitees; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.invitees TO anon;
GRANT ALL ON TABLE public.invitees TO authenticated;
GRANT ALL ON TABLE public.invitees TO service_role;


--
-- Name: SEQUENCE invitees_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.invitees_id_seq TO anon;
GRANT ALL ON SEQUENCE public.invitees_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.invitees_id_seq TO service_role;


--
-- Name: TABLE invites; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.invites TO anon;
GRANT ALL ON TABLE public.invites TO authenticated;
GRANT ALL ON TABLE public.invites TO service_role;


--
-- Name: TABLE invites_repas; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.invites_repas TO anon;
GRANT ALL ON TABLE public.invites_repas TO authenticated;
GRANT ALL ON TABLE public.invites_repas TO service_role;


--
-- Name: SEQUENCE invites_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.invites_id_seq TO anon;
GRANT ALL ON SEQUENCE public.invites_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.invites_id_seq TO service_role;


--
-- Name: SEQUENCE invites_id_seq1; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.invites_id_seq1 TO anon;
GRANT ALL ON SEQUENCE public.invites_id_seq1 TO authenticated;
GRANT ALL ON SEQUENCE public.invites_id_seq1 TO service_role;


--
-- Name: TABLE meal_audit_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.meal_audit_log TO anon;
GRANT ALL ON TABLE public.meal_audit_log TO authenticated;
GRANT ALL ON TABLE public.meal_audit_log TO service_role;


--
-- Name: SEQUENCE meal_audit_log_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.meal_audit_log_id_seq TO anon;
GRANT ALL ON SEQUENCE public.meal_audit_log_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.meal_audit_log_id_seq TO service_role;


--
-- Name: TABLE meal_options; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.meal_options TO anon;
GRANT ALL ON TABLE public.meal_options TO authenticated;
GRANT ALL ON TABLE public.meal_options TO service_role;


--
-- Name: TABLE meal_service_options; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.meal_service_options TO anon;
GRANT ALL ON TABLE public.meal_service_options TO authenticated;
GRANT ALL ON TABLE public.meal_service_options TO service_role;


--
-- Name: TABLE pending_users; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pending_users TO anon;
GRANT ALL ON TABLE public.pending_users TO authenticated;
GRANT ALL ON TABLE public.pending_users TO service_role;


--
-- Name: SEQUENCE pending_users_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.pending_users_id_seq TO anon;
GRANT ALL ON SEQUENCE public.pending_users_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.pending_users_id_seq TO service_role;


--
-- Name: TABLE places; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.places TO anon;
GRANT ALL ON TABLE public.places TO authenticated;
GRANT ALL ON TABLE public.places TO service_role;


--
-- Name: TABLE presences; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.presences TO anon;
GRANT ALL ON TABLE public.presences TO authenticated;
GRANT ALL ON TABLE public.presences TO service_role;


--
-- Name: TABLE residences; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.residences TO anon;
GRANT ALL ON TABLE public.residences TO authenticated;
GRANT ALL ON TABLE public.residences TO service_role;


--
-- Name: TABLE residentes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.residentes TO anon;
GRANT ALL ON TABLE public.residentes TO authenticated;
GRANT ALL ON TABLE public.residentes TO service_role;


--
-- Name: SEQUENCE residentes_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.residentes_id_seq TO anon;
GRANT ALL ON SEQUENCE public.residentes_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.residentes_id_seq TO service_role;


--
-- Name: TABLE select_options_evenement; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.select_options_evenement TO anon;
GRANT ALL ON TABLE public.select_options_evenement TO authenticated;
GRANT ALL ON TABLE public.select_options_evenement TO service_role;


--
-- Name: SEQUENCE select_options_evenement_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.select_options_evenement_id_seq TO anon;
GRANT ALL ON SEQUENCE public.select_options_evenement_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.select_options_evenement_id_seq TO service_role;


--
-- Name: TABLE select_options_rappel; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.select_options_rappel TO anon;
GRANT ALL ON TABLE public.select_options_rappel TO authenticated;
GRANT ALL ON TABLE public.select_options_rappel TO service_role;


--
-- Name: SEQUENCE select_options_rappel_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.select_options_rappel_id_seq TO anon;
GRANT ALL ON SEQUENCE public.select_options_rappel_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.select_options_rappel_id_seq TO service_role;


--
-- Name: TABLE select_options_recurrence; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.select_options_recurrence TO anon;
GRANT ALL ON TABLE public.select_options_recurrence TO authenticated;
GRANT ALL ON TABLE public.select_options_recurrence TO service_role;


--
-- Name: SEQUENCE select_options_recurrence_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.select_options_recurrence_id_seq TO anon;
GRANT ALL ON SEQUENCE public.select_options_recurrence_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.select_options_recurrence_id_seq TO service_role;


--
-- Name: TABLE select_options_residence; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.select_options_residence TO anon;
GRANT ALL ON TABLE public.select_options_residence TO authenticated;
GRANT ALL ON TABLE public.select_options_residence TO service_role;


--
-- Name: SEQUENCE select_options_residence_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.select_options_residence_id_seq TO anon;
GRANT ALL ON SEQUENCE public.select_options_residence_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.select_options_residence_id_seq TO service_role;


--
-- Bloc DEFAULT ACL retiré du dump.
--
-- pg_dump émettait ici 24 `ALTER DEFAULT PRIVILEGES FOR ROLE postgres|supabase_admin`.
-- L'éditeur SQL de Supabase tourne en tant que `postgres`, qui ne peut pas modifier
-- les privilèges par défaut de `supabase_admin` : ERROR 42501, permission denied to
-- change default privileges.
--
-- Ces instructions sont de toute façon redondantes : Supabase configure exactement
-- ces privilèges par défaut sur tout projet neuf. Les retirer ne change rien au
-- résultat, et rend le socle exécutable d'un seul tenant dans l'éditeur SQL.
--
