-- CreateTable
CREATE TABLE "Liquidation" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "qty" BIGINT NOT NULL,
    "entryPrice" BIGINT NOT NULL,
    "markPrice" BIGINT NOT NULL,
    "equity" BIGINT NOT NULL,
    "surplus" BIGINT NOT NULL DEFAULT 0,
    "deficit" BIGINT NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Liquidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingPayment" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "fundingRate" BIGINT NOT NULL,
    "userId" TEXT NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundingPayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Liquidation" ADD CONSTRAINT "Liquidation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingPayment" ADD CONSTRAINT "FundingPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
