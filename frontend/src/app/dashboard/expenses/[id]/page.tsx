import { ExpenseDetailPage } from "@/components/expenses/ExpenseDetailPage";
import "@/styles/expenses.css";

export const metadata = { title: "Expense" };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ExpenseDetailRoutePage({ params }: Props) {
  const { id } = await params;
  return <ExpenseDetailPage expenseId={id} />;
}
