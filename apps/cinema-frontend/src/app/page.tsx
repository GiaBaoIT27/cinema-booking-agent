import { HomeClient } from "@/features/home/home-client";
import { homeCatalog } from "@/features/home/fixtures";
export const dynamic = "force-dynamic";
export default function HomePage() {
  const scenario =
    process.env.MBA_FIXTURE_SCENARIO === "error-once" ? "error-once" : "ready";
  return <HomeClient catalog={homeCatalog} scenario={scenario} />;
}
