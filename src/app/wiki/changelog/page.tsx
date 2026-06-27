import { cookies } from "next/headers";
import DevBlog from "@/components/devblog";
import { authCookieName, canOpenAdmin, verifySession } from "@/lib/auth";
import { getChangelogPosts } from "@/lib/changelog-store";

export const dynamic = "force-dynamic";

export default async function ChangelogPage() {
  const posts = await getChangelogPosts();

  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;
  const user = await verifySession(token);

  const showAdminButton = canOpenAdmin(user?.role);

  return <DevBlog posts={posts} showAdminButton={showAdminButton} />;
}