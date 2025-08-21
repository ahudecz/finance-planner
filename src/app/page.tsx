import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to dashboard for the new UI
  redirect("/dashboard");
}