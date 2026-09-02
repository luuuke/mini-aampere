import { AdminAuctionDetailScreen } from "@/features/auctions/admin/components/admin-auction-detail-screen";

export default async function AdminAuctionDetailPage(
  props: PageProps<"/admin/auctions/[auctionId]">,
) {
  const { auctionId } = await props.params;

  return <AdminAuctionDetailScreen auctionId={auctionId} />;
}
