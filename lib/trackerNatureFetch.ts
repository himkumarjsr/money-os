import {
  natureWindowEnd,
  natureWindowStart,
  NATURE_RULES,
  type NatureTxn,
} from "@/lib/trackerNatureReport";

/** The slice of the Supabase client this loader needs (web and mobile share it). */
type QueryLike = {
  select: (cols: string) => QueryLike;
  eq: (col: string, v: string) => QueryLike;
  ilike: (col: string, v: string) => QueryLike;
  gte: (col: string, v: string) => QueryLike;
  lte: (col: string, v: string) => QueryLike;
  order: (col: string, o: { ascending: boolean }) => QueryLike;
  then: PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>["then"];
};
export type NatureSupabase = { from: (table: string) => unknown };

export type NatureRowsResult = {
  rows: NatureTxn[];
  emiSources: NatureTxn[];
  ok: boolean;
};

/**
 * Last `monthCount` months of tracker rows in ONE range query (plus the month
 * before, for income and card-bill context), and the card EMI purchases from
 * the last 5 years so long EMIs keep showing. Read-only; no schema change.
 */
export async function fetchNatureRows(
  supabase: NatureSupabase,
  userId: string,
  endYear: number,
  endMonthIndex: number,
  monthCount: number = NATURE_RULES.monthCount,
): Promise<NatureRowsResult> {
  const from = natureWindowStart(endYear, endMonthIndex, monthCount, 1);
  const to = natureWindowEnd(endYear, endMonthIndex);
  const table = () => supabase.from("expense_transactions") as QueryLike;
  const emiFrom = natureWindowStart(endYear, endMonthIndex, 60, 0);
  const [range, emi] = await Promise.all([
    table()
      .select("*")
      .eq("user_id", userId)
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: false }),
    table()
      .select("*")
      .eq("user_id", userId)
      .ilike("description", "%[#emi:%")
      .gte("date", emiFrom)
      .lte("date", to),
  ]);
  return {
    rows: ((range.data as NatureTxn[]) || []).slice(),
    emiSources: ((emi.data as NatureTxn[]) || []).slice(),
    ok: !range.error && !emi.error,
  };
}
