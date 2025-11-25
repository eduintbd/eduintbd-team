CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

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



--
-- Name: account_subtype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_subtype AS ENUM (
    'current_asset',
    'fixed_asset',
    'current_liability',
    'long_term_liability',
    'shareholders_equity',
    'operating_revenue',
    'other_revenue',
    'operating_expense',
    'other_expense'
);


--
-- Name: account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_type AS ENUM (
    'asset',
    'liability',
    'equity',
    'revenue',
    'expense'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'hr_manager',
    'accountant',
    'employee'
);


--
-- Name: current_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_user_role() RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: amortization_schedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.amortization_schedule (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    period_date date NOT NULL,
    period_number integer NOT NULL,
    depreciation_amount numeric(15,2) NOT NULL,
    accumulated_depreciation numeric(15,2) NOT NULL,
    book_value numeric(15,2) NOT NULL,
    journal_entry_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_code character varying(50) NOT NULL,
    asset_name character varying(255) NOT NULL,
    description text,
    account_id uuid NOT NULL,
    purchase_date date NOT NULL,
    purchase_cost numeric(15,2) NOT NULL,
    salvage_value numeric(15,2) DEFAULT 0,
    useful_life_years integer NOT NULL,
    depreciation_method character varying(50) DEFAULT 'straight_line'::character varying,
    accumulated_depreciation numeric(15,2) DEFAULT 0,
    book_value numeric(15,2),
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    attendance_date date NOT NULL,
    clock_in timestamp with time zone,
    clock_out timestamp with time zone,
    total_hours numeric,
    status character varying DEFAULT 'present'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: chart_of_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chart_of_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_code character varying(20) NOT NULL,
    account_name character varying(255) NOT NULL,
    account_type public.account_type NOT NULL,
    account_subtype public.account_subtype NOT NULL,
    parent_account_id uuid,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_code character varying NOT NULL,
    department_name character varying NOT NULL,
    description text,
    manager_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: employee_leave_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_leave_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    leave_type_id uuid NOT NULL,
    year integer NOT NULL,
    total_days numeric DEFAULT 0 NOT NULL,
    used_days numeric DEFAULT 0 NOT NULL,
    remaining_days numeric GENERATED ALWAYS AS ((total_days - used_days)) STORED,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: employee_payroll; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_payroll (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    payroll_item_id uuid NOT NULL,
    amount numeric NOT NULL,
    effective_date date NOT NULL,
    end_date date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    employee_code character varying NOT NULL,
    first_name character varying NOT NULL,
    last_name character varying NOT NULL,
    email character varying NOT NULL,
    phone character varying,
    date_of_birth date,
    hire_date date NOT NULL,
    termination_date date,
    department_id uuid,
    position_id uuid,
    manager_id uuid,
    employment_type character varying DEFAULT 'full_time'::character varying,
    status character varying DEFAULT 'active'::character varying,
    address text,
    city character varying,
    state character varying,
    postal_code character varying,
    country character varying,
    emergency_contact_name character varying,
    emergency_contact_phone character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    company_email character varying,
    salary numeric,
    bank_account_number character varying,
    bank_name character varying,
    bank_branch character varying,
    tin_number character varying,
    tin_document_url text,
    nid_number character varying,
    nid_document_url text,
    blood_group character varying,
    cv_url text,
    registration_status character varying DEFAULT 'pending'::character varying,
    salary_accepted boolean DEFAULT false,
    onboarding_completed boolean DEFAULT false
);


--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entry_number character varying(50) NOT NULL,
    entry_date date NOT NULL,
    description text NOT NULL,
    reference character varying(100),
    status character varying(20) DEFAULT 'draft'::character varying,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    entry_type character varying(20) DEFAULT 'journal'::character varying,
    CONSTRAINT journal_entries_entry_type_check CHECK (((entry_type)::text = ANY (ARRAY[('journal'::character varying)::text, ('payment'::character varying)::text, ('receipt'::character varying)::text, ('contra'::character varying)::text])))
);


--
-- Name: journal_entry_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entry_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    journal_entry_id uuid NOT NULL,
    account_id uuid NOT NULL,
    description text,
    debit numeric(15,2) DEFAULT 0,
    credit numeric(15,2) DEFAULT 0,
    line_number integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT debit_or_credit_check CHECK ((((debit > (0)::numeric) AND (credit = (0)::numeric)) OR ((credit > (0)::numeric) AND (debit = (0)::numeric)) OR ((debit = (0)::numeric) AND (credit = (0)::numeric))))
);


--
-- Name: general_ledger; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.general_ledger WITH (security_invoker='true') AS
 SELECT coa.account_code,
    coa.account_name,
    coa.account_type,
    je.entry_date,
    je.entry_number,
    je.description AS entry_description,
    jel.description AS line_description,
    jel.debit,
    jel.credit,
    jel.created_at
   FROM ((public.journal_entry_lines jel
     JOIN public.journal_entries je ON ((jel.journal_entry_id = je.id)))
     JOIN public.chart_of_accounts coa ON ((jel.account_id = coa.id)))
  WHERE ((je.status)::text = 'posted'::text)
  ORDER BY coa.account_code, je.entry_date, je.entry_number;


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    leave_type_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    days_requested numeric NOT NULL,
    reason text,
    status character varying DEFAULT 'pending'::character varying,
    approved_by uuid,
    approved_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: leave_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    leave_code character varying NOT NULL,
    leave_name character varying NOT NULL,
    description text,
    default_days_per_year numeric DEFAULT 0,
    is_paid boolean DEFAULT true,
    requires_approval boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: payroll_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_code character varying NOT NULL,
    item_name character varying NOT NULL,
    item_type character varying NOT NULL,
    account_id uuid,
    is_taxable boolean DEFAULT false,
    is_active boolean DEFAULT true,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: payroll_run_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_run_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payroll_run_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    gross_pay numeric DEFAULT 0 NOT NULL,
    total_deductions numeric DEFAULT 0 NOT NULL,
    net_pay numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: payroll_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_number character varying NOT NULL,
    pay_period_start date NOT NULL,
    pay_period_end date NOT NULL,
    payment_date date NOT NULL,
    status character varying DEFAULT 'draft'::character varying,
    total_gross numeric DEFAULT 0,
    total_deductions numeric DEFAULT 0,
    total_net numeric DEFAULT 0,
    journal_entry_id uuid,
    notes text,
    processed_by uuid,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    position_code character varying NOT NULL,
    position_title character varying NOT NULL,
    department_id uuid,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying NOT NULL,
    description text,
    assigned_to uuid,
    assigned_by uuid,
    due_date date,
    priority character varying DEFAULT 'medium'::character varying,
    status character varying DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tasks_priority_check CHECK (((priority)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text, ('urgent'::character varying)::text]))),
    CONSTRAINT tasks_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('in_progress'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: trial_balance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.trial_balance WITH (security_invoker='true') AS
 SELECT coa.account_code,
    coa.account_name,
    coa.account_type,
    coa.account_subtype,
    COALESCE(sum(jel.debit), (0)::numeric) AS total_debit,
    COALESCE(sum(jel.credit), (0)::numeric) AS total_credit,
    (COALESCE(sum(jel.debit), (0)::numeric) - COALESCE(sum(jel.credit), (0)::numeric)) AS balance
   FROM ((public.chart_of_accounts coa
     LEFT JOIN public.journal_entry_lines jel ON ((coa.id = jel.account_id)))
     LEFT JOIN public.journal_entries je ON (((jel.journal_entry_id = je.id) AND ((je.status)::text = 'posted'::text))))
  WHERE (coa.is_active = true)
  GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type, coa.account_subtype
  ORDER BY coa.account_code;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'employee'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: amortization_schedule amortization_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amortization_schedule
    ADD CONSTRAINT amortization_schedule_pkey PRIMARY KEY (id);


--
-- Name: assets assets_asset_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_asset_code_key UNIQUE (asset_code);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_employee_id_attendance_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_employee_id_attendance_date_key UNIQUE (employee_id, attendance_date);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: chart_of_accounts chart_of_accounts_account_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_account_code_key UNIQUE (account_code);


--
-- Name: chart_of_accounts chart_of_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_pkey PRIMARY KEY (id);


--
-- Name: departments departments_department_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_department_code_key UNIQUE (department_code);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: employee_leave_balances employee_leave_balances_employee_id_leave_type_id_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_leave_balances
    ADD CONSTRAINT employee_leave_balances_employee_id_leave_type_id_year_key UNIQUE (employee_id, leave_type_id, year);


--
-- Name: employee_leave_balances employee_leave_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_leave_balances
    ADD CONSTRAINT employee_leave_balances_pkey PRIMARY KEY (id);


--
-- Name: employee_payroll employee_payroll_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_payroll
    ADD CONSTRAINT employee_payroll_pkey PRIMARY KEY (id);


--
-- Name: employees employees_employee_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_employee_code_key UNIQUE (employee_code);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: employees employees_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_key UNIQUE (user_id);


--
-- Name: journal_entries journal_entries_entry_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_entry_number_key UNIQUE (entry_number);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: journal_entry_lines journal_entry_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines
    ADD CONSTRAINT journal_entry_lines_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: leave_types leave_types_leave_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_leave_code_key UNIQUE (leave_code);


--
-- Name: leave_types leave_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_pkey PRIMARY KEY (id);


--
-- Name: payroll_items payroll_items_item_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_items
    ADD CONSTRAINT payroll_items_item_code_key UNIQUE (item_code);


--
-- Name: payroll_items payroll_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_items
    ADD CONSTRAINT payroll_items_pkey PRIMARY KEY (id);


--
-- Name: payroll_run_details payroll_run_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run_details
    ADD CONSTRAINT payroll_run_details_pkey PRIMARY KEY (id);


--
-- Name: payroll_runs payroll_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT payroll_runs_pkey PRIMARY KEY (id);


--
-- Name: payroll_runs payroll_runs_run_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT payroll_runs_run_number_key UNIQUE (run_number);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: positions positions_position_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_position_code_key UNIQUE (position_code);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);


--
-- Name: idx_assets_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_account ON public.assets USING btree (account_id);


--
-- Name: idx_assets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_status ON public.assets USING btree (status);


--
-- Name: idx_journal_entries_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_entries_date ON public.journal_entries USING btree (entry_date);


--
-- Name: idx_journal_entries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_entries_status ON public.journal_entries USING btree (status);


--
-- Name: idx_journal_entry_lines_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_entry_lines_account ON public.journal_entry_lines USING btree (account_id);


--
-- Name: idx_journal_entry_lines_entry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_entry_lines_entry ON public.journal_entry_lines USING btree (journal_entry_id);


--
-- Name: assets update_assets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: attendance_records update_attendance_records_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: chart_of_accounts update_chart_of_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_chart_of_accounts_updated_at BEFORE UPDATE ON public.chart_of_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: departments update_departments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: employee_leave_balances update_employee_leave_balances_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_employee_leave_balances_updated_at BEFORE UPDATE ON public.employee_leave_balances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: employee_payroll update_employee_payroll_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_employee_payroll_updated_at BEFORE UPDATE ON public.employee_payroll FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: employees update_employees_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: journal_entries update_journal_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leave_requests update_leave_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leave_types update_leave_types_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_leave_types_updated_at BEFORE UPDATE ON public.leave_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payroll_items update_payroll_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payroll_items_updated_at BEFORE UPDATE ON public.payroll_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payroll_runs update_payroll_runs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payroll_runs_updated_at BEFORE UPDATE ON public.payroll_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: positions update_positions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON public.positions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_roles update_user_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: amortization_schedule amortization_schedule_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amortization_schedule
    ADD CONSTRAINT amortization_schedule_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: amortization_schedule amortization_schedule_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amortization_schedule
    ADD CONSTRAINT amortization_schedule_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id);


--
-- Name: assets assets_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: attendance_records attendance_records_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: chart_of_accounts chart_of_accounts_parent_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_parent_account_id_fkey FOREIGN KEY (parent_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: employee_leave_balances employee_leave_balances_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_leave_balances
    ADD CONSTRAINT employee_leave_balances_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: employee_leave_balances employee_leave_balances_leave_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_leave_balances
    ADD CONSTRAINT employee_leave_balances_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES public.leave_types(id);


--
-- Name: employee_payroll employee_payroll_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_payroll
    ADD CONSTRAINT employee_payroll_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: employee_payroll employee_payroll_payroll_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_payroll
    ADD CONSTRAINT employee_payroll_payroll_item_id_fkey FOREIGN KEY (payroll_item_id) REFERENCES public.payroll_items(id);


--
-- Name: employees employees_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: employees employees_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.employees(id);


--
-- Name: employees employees_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.positions(id);


--
-- Name: employees employees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: journal_entries journal_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: journal_entry_lines journal_entry_lines_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines
    ADD CONSTRAINT journal_entry_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: journal_entry_lines journal_entry_lines_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines
    ADD CONSTRAINT journal_entry_lines_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: leave_requests leave_requests_leave_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES public.leave_types(id);


--
-- Name: payroll_items payroll_items_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_items
    ADD CONSTRAINT payroll_items_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: payroll_run_details payroll_run_details_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run_details
    ADD CONSTRAINT payroll_run_details_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: payroll_run_details payroll_run_details_payroll_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run_details
    ADD CONSTRAINT payroll_run_details_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES public.payroll_runs(id) ON DELETE CASCADE;


--
-- Name: payroll_runs payroll_runs_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT payroll_runs_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id);


--
-- Name: positions positions_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: tasks tasks_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id);


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: amortization_schedule Accountants and admins can manage amortization schedule; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Accountants and admins can manage amortization schedule" ON public.amortization_schedule USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role)));


--
-- Name: assets Accountants and admins can manage assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Accountants and admins can manage assets" ON public.assets USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role)));


--
-- Name: chart_of_accounts Accountants and admins can manage chart of accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Accountants and admins can manage chart of accounts" ON public.chart_of_accounts USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role)));


--
-- Name: journal_entries Accountants and admins can manage journal entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Accountants and admins can manage journal entries" ON public.journal_entries USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role)));


--
-- Name: journal_entry_lines Accountants and admins can manage journal entry lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Accountants and admins can manage journal entry lines" ON public.journal_entry_lines USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role)));


--
-- Name: assets Accountants and admins can view all assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Accountants and admins can view all assets" ON public.assets FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role)));


--
-- Name: amortization_schedule Accountants and admins can view amortization schedule; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Accountants and admins can view amortization schedule" ON public.amortization_schedule FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role)));


--
-- Name: journal_entries Accountants, HR managers and admins can view journal entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Accountants, HR managers and admins can view journal entries" ON public.journal_entries FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)));


--
-- Name: journal_entry_lines Accountants, HR managers and admins can view journal entry line; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Accountants, HR managers and admins can view journal entry line" ON public.journal_entry_lines FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)));


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: departments Authenticated users can view departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view departments" ON public.departments FOR SELECT TO authenticated USING (true);


--
-- Name: leave_types Authenticated users can view leave types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view leave types" ON public.leave_types FOR SELECT TO authenticated USING (true);


--
-- Name: payroll_items Authenticated users can view payroll items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view payroll items" ON public.payroll_items FOR SELECT TO authenticated USING (true);


--
-- Name: positions Authenticated users can view positions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view positions" ON public.positions FOR SELECT TO authenticated USING (true);


--
-- Name: attendance_records Employees can clock in/out; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can clock in/out" ON public.attendance_records FOR INSERT WITH CHECK ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));


--
-- Name: leave_requests Employees can create their own leave requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can create their own leave requests" ON public.leave_requests FOR INSERT WITH CHECK ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));


--
-- Name: tasks Employees can update their assigned tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can update their assigned tasks" ON public.tasks FOR UPDATE TO authenticated USING ((assigned_to IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));


--
-- Name: leave_requests Employees can update their pending leave requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can update their pending leave requests" ON public.leave_requests FOR UPDATE USING (((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))) AND ((status)::text = 'pending'::text)));


--
-- Name: attendance_records Employees can update their today's attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can update their today's attendance" ON public.attendance_records FOR UPDATE USING (((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))) AND (attendance_date = CURRENT_DATE)));


--
-- Name: tasks Employees can view tasks assigned to them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can view tasks assigned to them" ON public.tasks FOR SELECT TO authenticated USING ((assigned_to IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));


--
-- Name: attendance_records Employees can view their own attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can view their own attendance" ON public.attendance_records FOR SELECT USING ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));


--
-- Name: employee_leave_balances Employees can view their own leave balances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can view their own leave balances" ON public.employee_leave_balances FOR SELECT USING ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));


--
-- Name: leave_requests Employees can view their own leave requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can view their own leave requests" ON public.leave_requests FOR SELECT USING ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));


--
-- Name: employee_payroll Employees can view their own payroll; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can view their own payroll" ON public.employee_payroll FOR SELECT USING ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));


--
-- Name: payroll_run_details Employees can view their own payroll details; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can view their own payroll details" ON public.payroll_run_details FOR SELECT USING ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));


--
-- Name: employees Employees can view their own record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can view their own record" ON public.employees FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: tasks HR managers and admins can manage all tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers and admins can manage all tasks" ON public.tasks TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)));


--
-- Name: attendance_records HR managers and admins can manage attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers and admins can manage attendance" ON public.attendance_records USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)));


--
-- Name: departments HR managers and admins can manage departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers and admins can manage departments" ON public.departments USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)));


--
-- Name: employees HR managers and admins can manage employees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers and admins can manage employees" ON public.employees USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)));


--
-- Name: employee_leave_balances HR managers and admins can manage leave balances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers and admins can manage leave balances" ON public.employee_leave_balances USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)));


--
-- Name: leave_requests HR managers and admins can manage leave requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers and admins can manage leave requests" ON public.leave_requests USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)));


--
-- Name: leave_types HR managers and admins can manage leave types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers and admins can manage leave types" ON public.leave_types USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)));


--
-- Name: employee_payroll HR managers and admins can manage payroll; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers and admins can manage payroll" ON public.employee_payroll USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)));


--
-- Name: payroll_run_details HR managers and admins can manage payroll details; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers and admins can manage payroll details" ON public.payroll_run_details USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)));


--
-- Name: payroll_runs HR managers and admins can manage payroll runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers and admins can manage payroll runs" ON public.payroll_runs USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)));


--
-- Name: positions HR managers and admins can manage positions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers and admins can manage positions" ON public.positions USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)));


--
-- Name: attendance_records HR managers and admins can view all attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers and admins can view all attendance" ON public.attendance_records FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)));


--
-- Name: employees HR managers and admins can view all employees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers and admins can view all employees" ON public.employees FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)));


--
-- Name: employee_leave_balances HR managers and admins can view all leave balances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers and admins can view all leave balances" ON public.employee_leave_balances FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)));


--
-- Name: leave_requests HR managers and admins can view all leave requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers and admins can view all leave requests" ON public.leave_requests FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)));


--
-- Name: tasks HR managers and admins can view all tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers and admins can view all tasks" ON public.tasks FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)));


--
-- Name: payroll_items HR managers, accountants and admins can manage payroll items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers, accountants and admins can manage payroll items" ON public.payroll_items USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role)));


--
-- Name: employee_payroll HR managers, accountants and admins can view all payroll; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers, accountants and admins can view all payroll" ON public.employee_payroll FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role)));


--
-- Name: payroll_run_details HR managers, accountants and admins can view all payroll detail; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers, accountants and admins can view all payroll detail" ON public.payroll_run_details FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role)));


--
-- Name: payroll_runs HR managers, accountants and admins can view payroll runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR managers, accountants and admins can view payroll runs" ON public.payroll_runs FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role)));


--
-- Name: chart_of_accounts Limited roles can view chart of accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Limited roles can view chart of accounts" ON public.chart_of_accounts FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role) OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)));


--
-- Name: employees Users can create their own employee record during signup; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own employee record during signup" ON public.employees FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND ((registration_status)::text = 'pending'::text)));


--
-- Name: user_roles Users can view their own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: amortization_schedule; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.amortization_schedule ENABLE ROW LEVEL SECURITY;

--
-- Name: assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

--
-- Name: chart_of_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_leave_balances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employee_leave_balances ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_payroll; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employee_payroll ENABLE ROW LEVEL SECURITY;

--
-- Name: employees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

--
-- Name: journal_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: journal_entry_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;

--
-- Name: payroll_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;

--
-- Name: payroll_run_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payroll_run_details ENABLE ROW LEVEL SECURITY;

--
-- Name: payroll_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: positions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


