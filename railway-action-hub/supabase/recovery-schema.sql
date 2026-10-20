-- One-time schema snapshot for restoring into an empty database. Do not rerun on the live database.
--
-- PostgreSQL database dump
--


-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA hb_action_hub;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA hb_action_hub IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_auth; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE hb_action_hub.admin_auth (
    email text NOT NULL,
    password_hash text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: app_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE hb_action_hub.app_migrations (
    migration_key text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE hb_action_hub.app_settings (
    id text DEFAULT 'main'::text NOT NULL,
    marquee_mode text DEFAULT 'auto'::text NOT NULL,
    marquee_text text DEFAULT ''::text NOT NULL,
    mvp_enabled boolean DEFAULT true NOT NULL,
    mvp_title text DEFAULT '한주 최다 방문 MVP'::text NOT NULL,
    app_title text DEFAULT '유료DB ACTION HUB'::text NOT NULL,
    app_subtitle text DEFAULT '방문 · 학습 · 콜 활동을 한눈에 공유합니다.'::text NOT NULL,
    logo_height integer DEFAULT 36 NOT NULL,
    notice_enabled boolean DEFAULT true NOT NULL,
    notice_title text DEFAULT 'TFA TOOLBOX 리뉴얼 안내'::text NOT NULL,
    notice_content text DEFAULT '생보 수수료 계산기 신규 탑재\n\n2026년 10월 자료 기준으로 생명보험 수수료 계산기를 새롭게 탑재했습니다.\n보험사 · 상품 · 납입기간을 선택하고 월 보험료를 입력하면 수수료 · 시책 · 환산을 빠르게 확인할 수 있습니다.'::text NOT NULL,
    notice_url text DEFAULT 'https://hbtoolbox.vercel.app/'::text NOT NULL,
    notice_new boolean DEFAULT true NOT NULL,
    notice_published_at timestamp with time zone,
    notice_history jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: library_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE hb_action_hub.library_files (
    id text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    category text DEFAULT '기타'::text NOT NULL,
    pinned boolean DEFAULT false NOT NULL,
    file_name text NOT NULL,
    mime_type text DEFAULT 'application/octet-stream'::text NOT NULL,
    file_size integer DEFAULT 0 NOT NULL,
    file_data bytea NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notice_publications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE hb_action_hub.notice_publications (
    id text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: purged_schedule_ids; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE hb_action_hub.purged_schedule_ids (
    schedule_id text NOT NULL,
    purged_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: push_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE hb_action_hub.push_config (
    id text NOT NULL,
    public_key text NOT NULL,
    private_key text NOT NULL
);


--
-- Name: push_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE hb_action_hub.push_deliveries (
    event_id text NOT NULL,
    recipient_id integer NOT NULL,
    subscription jsonb NOT NULL,
    attempts integer DEFAULT 0,
    next_at timestamp with time zone DEFAULT now(),
    sent_at timestamp with time zone,
    last_status text
);


--
-- Name: push_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE hb_action_hub.push_events (
    id text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: push_member_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE hb_action_hub.push_member_id_seq
    START WITH 5
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: push_recipients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE hb_action_hub.push_recipients (
    id integer NOT NULL,
    name text NOT NULL,
    token_hash text,
    subscription jsonb,
    connected_at timestamp with time zone,
    invite_expires_at timestamp with time zone,
    device_token_hash text
);


--
-- Name: schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE hb_action_hub.schedules (
    id text NOT NULL,
    owner_name text NOT NULL,
    customer_name text NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    owner_token_hash text,
    source text DEFAULT 'local'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: admin_auth admin_auth_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY hb_action_hub.admin_auth
    ADD CONSTRAINT admin_auth_pkey PRIMARY KEY (email);


--
-- Name: app_migrations app_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY hb_action_hub.app_migrations
    ADD CONSTRAINT app_migrations_pkey PRIMARY KEY (migration_key);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY hb_action_hub.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: library_files library_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY hb_action_hub.library_files
    ADD CONSTRAINT library_files_pkey PRIMARY KEY (id);


--
-- Name: notice_publications notice_publications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY hb_action_hub.notice_publications
    ADD CONSTRAINT notice_publications_pkey PRIMARY KEY (id);


--
-- Name: purged_schedule_ids purged_schedule_ids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY hb_action_hub.purged_schedule_ids
    ADD CONSTRAINT purged_schedule_ids_pkey PRIMARY KEY (schedule_id);


--
-- Name: push_config push_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY hb_action_hub.push_config
    ADD CONSTRAINT push_config_pkey PRIMARY KEY (id);


--
-- Name: push_deliveries push_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY hb_action_hub.push_deliveries
    ADD CONSTRAINT push_deliveries_pkey PRIMARY KEY (event_id, recipient_id);


--
-- Name: push_events push_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY hb_action_hub.push_events
    ADD CONSTRAINT push_events_pkey PRIMARY KEY (id);


--
-- Name: push_recipients push_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY hb_action_hub.push_recipients
    ADD CONSTRAINT push_recipients_pkey PRIMARY KEY (id);


--
-- Name: schedules schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY hb_action_hub.schedules
    ADD CONSTRAINT schedules_pkey PRIMARY KEY (id);


--
-- Name: push_member_token_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX push_member_token_unique ON hb_action_hub.push_recipients USING btree (device_token_hash) WHERE (device_token_hash IS NOT NULL);


--
-- Name: push_deliveries push_deliveries_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY hb_action_hub.push_deliveries
    ADD CONSTRAINT push_deliveries_event_id_fkey FOREIGN KEY (event_id) REFERENCES hb_action_hub.push_events(id);


--
-- Name: push_deliveries push_deliveries_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY hb_action_hub.push_deliveries
    ADD CONSTRAINT push_deliveries_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES hb_action_hub.push_recipients(id);


--
-- PostgreSQL database dump complete
--


REVOKE ALL ON SCHEMA hb_action_hub FROM PUBLIC,anon,authenticated;
ALTER TABLE hb_action_hub.admin_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_action_hub.app_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_action_hub.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_action_hub.library_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_action_hub.notice_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_action_hub.purged_schedule_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_action_hub.push_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_action_hub.push_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_action_hub.push_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_action_hub.push_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_action_hub.schedules ENABLE ROW LEVEL SECURITY;

ALTER TABLE hb_action_hub.library_files ADD COLUMN IF NOT EXISTS storage_path text;
