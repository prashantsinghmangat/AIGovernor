CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "Users can view own company"
  ON public.companies FOR SELECT
  USING (id = public.get_user_company_id());

CREATE POLICY "Admins can update own company"
  ON public.companies FOR UPDATE
  USING (id = public.get_user_company_id() AND public.is_company_admin());

CREATE POLICY "Users can view company members"
  ON public.users FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view company repos"
  ON public.repositories FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can manage repos"
  ON public.repositories FOR ALL
  USING (company_id = public.get_user_company_id() AND public.is_company_admin());

CREATE POLICY "Users can view company scans"
  ON public.scans FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Members can trigger scans"
  ON public.scans FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can view company scan results"
  ON public.scan_results FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can view company scores"
  ON public.ai_debt_scores FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can view company PRs"
  ON public.pull_requests FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can view company alerts"
  ON public.alerts FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Members can update alerts"
  ON public.alerts FOR UPDATE
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can view company team metrics"
  ON public.team_metrics FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can view company integrations"
  ON public.integrations FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can manage integrations"
  ON public.integrations FOR ALL
  USING (company_id = public.get_user_company_id() AND public.is_company_admin());

CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (company_id = public.get_user_company_id() AND public.is_company_admin());

CREATE POLICY "Users can view company reports"
  ON public.governance_reports FOR SELECT
  USING (company_id = public.get_user_company_id());
