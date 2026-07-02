import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieName, isOwner, verifySession } from "@/lib/auth";
import UsersAdminClient from "./users-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;
  const user = await verifySession(token);

  if (!user || !isOwner(user.role)) {
    redirect("/admin");
  }

  return <UsersAdminClient />;
}