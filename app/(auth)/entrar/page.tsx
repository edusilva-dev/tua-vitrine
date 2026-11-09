import { redirect } from "next/navigation";
import { getOptionalAdminIdentity } from "@/lib/server/context";
import { AuthForm } from "@/modules/auth/components/auth-form";

export default async function Page() {
  if (await getOptionalAdminIdentity()) redirect("/admin");

  return <AuthForm mode="login" />;
}
