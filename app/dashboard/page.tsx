import { redirect } from "next/navigation";

/** The dashboard now lives at / for signed-in users; keep old links working. */
export default function DashboardPage() {
  redirect("/");
}
