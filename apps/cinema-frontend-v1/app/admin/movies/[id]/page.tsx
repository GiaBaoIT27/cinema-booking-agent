import { AdminMovieForm } from "@/features/admin/components/admin-movie-form";

export default async function AdminEditMoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminMovieForm key={id} movieId={id} />;
}
