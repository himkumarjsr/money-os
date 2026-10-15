-- Bills & renewals calendar: quarterly and half-yearly obligations repeat
-- from their first due month (financial_obligations.due_month) when one is set.
-- Without one they keep falling in Mar/Jun/Sep/Dec and Jun/Dec as before.
-- Mirrors obligationDueDateInMonth in lib/billsCalendar.ts.
--
-- Same signature, rights (SECURITY INVOKER since 051) and grants as before;
-- CREATE OR REPLACE keeps the existing EXECUTE grants.
-- No new columns: new bill categories are plain text values.

CREATE OR REPLACE FUNCTION public.generate_monthly_checklist(p_user_id uuid, p_month date)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_obligation record;
  v_month_start date;
  v_month_num integer;
  v_should_include boolean;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only generate your own checklist'
      USING ERRCODE = '42501';
  END IF;

  v_month_start := date_trunc('month', p_month)::date;
  v_month_num := EXTRACT(MONTH FROM p_month)::integer;

  FOR v_obligation IN
    SELECT * FROM public.financial_obligations
    WHERE user_id = p_user_id
    AND is_active = true
  LOOP
    v_should_include := false;

    CASE v_obligation.frequency
      WHEN 'monthly' THEN
        v_should_include := true;
      WHEN 'quarterly' THEN
        v_should_include := CASE
          WHEN v_obligation.due_month BETWEEN 1 AND 12
            THEN (v_month_num - v_obligation.due_month + 12) % 3 = 0
          ELSE v_month_num % 3 = 0
        END;
      WHEN 'half_yearly' THEN
        v_should_include := CASE
          WHEN v_obligation.due_month BETWEEN 1 AND 12
            THEN (v_month_num - v_obligation.due_month + 12) % 6 = 0
          ELSE v_month_num % 6 = 0
        END;
      WHEN 'yearly' THEN
        v_should_include := (v_obligation.due_month = v_month_num);
      WHEN 'one_time' THEN
        v_should_include :=
          (EXTRACT(MONTH FROM v_obligation.due_date) = v_month_num AND
           EXTRACT(YEAR FROM v_obligation.due_date) = EXTRACT(YEAR FROM p_month));
      ELSE
        v_should_include := false;
    END CASE;

    IF v_should_include THEN
      INSERT INTO public.obligation_checklist
        (user_id, obligation_id, checklist_month, expected_amount, status)
      VALUES (p_user_id, v_obligation.id, v_month_start, v_obligation.amount, 'pending')
      ON CONFLICT (user_id, obligation_id, checklist_month) DO NOTHING;
    END IF;
  END LOOP;
END;
$function$;
