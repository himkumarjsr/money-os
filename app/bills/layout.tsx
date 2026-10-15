import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bills & renewals calendar | Finkoin",
  description:
    "Every EMI, premium, utility bill, card due date and renewal in one monthly calendar, with reminders before each one.",
  alternates: { canonical: "/bills" },
  robots: { index: false, follow: false },
};

export default function BillsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
