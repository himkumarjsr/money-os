import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finkoin Split — Split Expenses with Friends",
  description:
    "Split bills, track shared expenses and settle debts with friends. Free expense splitting app for Indians. Better than Splitwise.",
  keywords: [
    "expense splitting app India",
    "split bills friends India",
    "splitwise alternative India",
    "group expense tracker India",
    "trip expense splitter",
  ],
  openGraph: {
    title: "Finkoin Split — Free Expense Splitting",
    description: "Split expenses with friends. Track group spending. Settle debts easily. Free forever.",
    siteName: "Finkoin",
  },
};

export default function SplitLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

