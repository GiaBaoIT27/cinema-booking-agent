import { notFound } from "next/navigation";
import { CineplexDetailView } from "@/features/cineplex/components/cineplex-detail-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CineplexDetailPage({ params }: Props) {
  const { id } = await params;
  const cineplexId = Number(id);
  if (!Number.isInteger(cineplexId) || cineplexId <= 0) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <CineplexDetailView id={cineplexId} />
    </main>
  );
}
