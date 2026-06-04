import { redirect } from "next/navigation";

// Кореневий маршрут: proxy.ts направить на /login, якщо немає сесії.
export default function Home() {
  redirect("/dashboard");
}
