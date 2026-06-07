import { redirect } from "next/navigation";

export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Redirect old /track/:id routes to unified orders page
  redirect(`/orders?orderId=${id}`);
}
