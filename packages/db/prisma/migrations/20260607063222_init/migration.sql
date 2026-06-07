/*
  Warnings:

  - Changed the type of `qty` on the `Fill` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `price` on the `Fill` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `price` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `qty` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `filledQty` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `initialMargin` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Fill" DROP COLUMN "qty",
ADD COLUMN     "qty" BIGINT NOT NULL,
DROP COLUMN "price",
ADD COLUMN     "price" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "price",
ADD COLUMN     "price" BIGINT NOT NULL,
DROP COLUMN "qty",
ADD COLUMN     "qty" BIGINT NOT NULL,
DROP COLUMN "filledQty",
ADD COLUMN     "filledQty" BIGINT NOT NULL,
DROP COLUMN "initialMargin",
ADD COLUMN     "initialMargin" BIGINT NOT NULL;
