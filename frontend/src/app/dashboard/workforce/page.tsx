import { redirect } from "next/navigation";

export const metadata = { title: "Workforce" };

export default function WorkforceRoutePage() {
  redirect("/dashboard/users");
}
