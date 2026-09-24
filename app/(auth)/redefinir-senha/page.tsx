import { AuthForm } from "@/modules/auth/components/auth-form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>;
}) {
  const query = await searchParams;

  return (
    <AuthForm
      mode="reset"
      token={typeof query.token === "string" ? query.token : ""}
      invalidLink={Boolean(query.error)}
    />
  );
}
