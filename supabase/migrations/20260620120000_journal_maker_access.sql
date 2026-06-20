-- =============================================================================
-- Maker access for journal entries.
-- Any authenticated employee can act as a "maker": view the chart of accounts
-- (to pick accounts) and create / edit / delete THEIR OWN journal entries while
-- still in draft or pending state. Posting/approval (status = 'posted') remains
-- with admins and the Finance department via the existing "manage" policies.
--
-- Workflow statuses used by the app: draft (new) -> pending (submitted on edit)
-- -> posted (admin/Finance). Makers may touch only draft/pending rows they own.
-- =============================================================================

-- 1. Chart of accounts: anyone authenticated may VIEW (needed for the account
--    dropdown). Creating/editing accounts is unchanged (admin/manager/Finance).
DROP POLICY IF EXISTS "Authenticated can view chart of accounts" ON public.chart_of_accounts;
CREATE POLICY "Authenticated can view chart of accounts"
  ON public.chart_of_accounts FOR SELECT TO authenticated USING (true);

-- 2. Journal entries: makers manage their own unposted entries.
DROP POLICY IF EXISTS "Makers create own draft journal entries" ON public.journal_entries;
CREATE POLICY "Makers create own draft journal entries"
  ON public.journal_entries FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND status IN ('draft', 'pending'));

DROP POLICY IF EXISTS "Makers view own journal entries" ON public.journal_entries;
CREATE POLICY "Makers view own journal entries"
  ON public.journal_entries FOR SELECT TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Makers edit own unposted journal entries" ON public.journal_entries;
CREATE POLICY "Makers edit own unposted journal entries"
  ON public.journal_entries FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND status IN ('draft', 'pending'))
  WITH CHECK (created_by = auth.uid() AND status IN ('draft', 'pending'));

DROP POLICY IF EXISTS "Makers delete own unposted journal entries" ON public.journal_entries;
CREATE POLICY "Makers delete own unposted journal entries"
  ON public.journal_entries FOR DELETE TO authenticated
  USING (created_by = auth.uid() AND status IN ('draft', 'pending'));

-- 3. Journal entry lines: tied to the parent entry's owner / status.
DROP POLICY IF EXISTS "Makers view own journal entry lines" ON public.journal_entry_lines;
CREATE POLICY "Makers view own journal entry lines"
  ON public.journal_entry_lines FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
      AND je.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS "Makers insert own journal entry lines" ON public.journal_entry_lines;
CREATE POLICY "Makers insert own journal entry lines"
  ON public.journal_entry_lines FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
      AND je.created_by = auth.uid()
      AND je.status IN ('draft', 'pending')
  ));

DROP POLICY IF EXISTS "Makers update own journal entry lines" ON public.journal_entry_lines;
CREATE POLICY "Makers update own journal entry lines"
  ON public.journal_entry_lines FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
      AND je.created_by = auth.uid()
      AND je.status IN ('draft', 'pending')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
      AND je.created_by = auth.uid()
      AND je.status IN ('draft', 'pending')
  ));

DROP POLICY IF EXISTS "Makers delete own journal entry lines" ON public.journal_entry_lines;
CREATE POLICY "Makers delete own journal entry lines"
  ON public.journal_entry_lines FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
      AND je.created_by = auth.uid()
      AND je.status IN ('draft', 'pending')
  ));
