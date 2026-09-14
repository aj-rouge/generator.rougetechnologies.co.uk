import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { getCurrentUser } from "../../utils/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getCurrentUser();
  if (session) redirect("/");

  const { next } = await searchParams;
  return <LoginForm next={next ?? "/"} />;
}
