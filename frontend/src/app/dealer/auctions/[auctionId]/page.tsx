import { DealerAuctionDetailScreen } from "@/features/auctions/dealer/components/dealer-auction-detail-screen";

export default async function DealerAuctionDetailPage(
  props: PageProps<"/dealer/auctions/[auctionId]">,
) {
  const { auctionId } = await props.params;

  return <DealerAuctionDetailScreen auctionId={auctionId} />;
}
