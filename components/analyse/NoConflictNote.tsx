import { NO_CONFLICT_BODY, NO_CONFLICT_TITLE } from "@/lib/reportTrust";

export default function NoConflictNote() {
  return (
    <section className="rounded-2xl border border-[#D5F0E6] bg-[#F1FBF7] p-4">
      <h3 className="text-[15px] font-semibold text-[#0F6E56]">{NO_CONFLICT_TITLE}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-[#2E5E50]">{NO_CONFLICT_BODY}</p>
    </section>
  );
}
