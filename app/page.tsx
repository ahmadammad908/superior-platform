import { getPosts } from "@/app/actions/getPosts";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialPosts = await getPosts("trending");

  return <AppShell initialPosts={initialPosts} />;
}
