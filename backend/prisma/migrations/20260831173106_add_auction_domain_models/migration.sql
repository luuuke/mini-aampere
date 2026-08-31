-- CreateEnum
CREATE TYPE "AuctionResult" AS ENUM ('SOLD', 'UNSOLD');

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" UUID NOT NULL,
    "vin" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "mileageKm" INTEGER NOT NULL,
    "batteryCapacityKwh" DECIMAL(5,2) NOT NULL,
    "batteryHealthPercent" DECIMAL(5,2) NOT NULL,
    "rangeKm" INTEGER NOT NULL,
    "registrationDate" DATE NOT NULL,
    "conditionNotes" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Vehicle_mileageKm_check" CHECK ("mileageKm" >= 0),
    CONSTRAINT "Vehicle_batteryCapacityKwh_check" CHECK ("batteryCapacityKwh" > 0),
    CONSTRAINT "Vehicle_batteryHealthPercent_check" CHECK ("batteryHealthPercent" BETWEEN 0 AND 100),
    CONSTRAINT "Vehicle_rangeKm_check" CHECK ("rangeKm" >= 0)
);

-- CreateTable
CREATE TABLE "Auction" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "startingPrice" INTEGER NOT NULL,
    "reservePrice" INTEGER NOT NULL,
    "minIncrement" INTEGER NOT NULL,
    "result" "AuctionResult",
    "winningBidId" UUID,
    "resultConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Auction_time_window_check" CHECK ("endsAt" > "startsAt"),
    CONSTRAINT "Auction_startingPrice_check" CHECK ("startingPrice" >= 0),
    CONSTRAINT "Auction_reservePrice_check" CHECK ("reservePrice" >= 0),
    CONSTRAINT "Auction_minIncrement_check" CHECK ("minIncrement" > 0),
    CONSTRAINT "Auction_result_check" CHECK (
        ("result" IS NULL AND "resultConfirmedAt" IS NULL AND "winningBidId" IS NULL)
        OR ("result" = 'SOLD' AND "resultConfirmedAt" IS NOT NULL AND "winningBidId" IS NOT NULL)
        OR ("result" = 'UNSOLD' AND "resultConfirmedAt" IS NOT NULL AND "winningBidId" IS NULL)
    )
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" UUID NOT NULL,
    "auctionId" UUID NOT NULL,
    "dealerId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Bid_amount_check" CHECK ("amount" > 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "Auction_winningBidId_key" ON "Auction"("winningBidId");

-- CreateIndex
CREATE INDEX "Auction_startsAt_endsAt_idx" ON "Auction"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Auction_vehicleId_idx" ON "Auction"("vehicleId");

-- CreateIndex
CREATE INDEX "Bid_auctionId_amount_placedAt_idx" ON "Bid"("auctionId", "amount", "placedAt");

-- CreateIndex
CREATE INDEX "Bid_dealerId_placedAt_idx" ON "Bid"("dealerId", "placedAt");

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_winningBidId_fkey" FOREIGN KEY ("winningBidId") REFERENCES "Bid"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
