-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "customerName" TEXT NOT NULL DEFAULT 'Walk-in',
ADD COLUMN     "paymentMethod" TEXT NOT NULL DEFAULT 'Cash';
