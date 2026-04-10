-- AlterTable
ALTER TABLE "User" ADD COLUMN     "brandColor" TEXT NOT NULL DEFAULT '#f59e0b',
ADD COLUMN     "invoiceTemplate" TEXT NOT NULL DEFAULT 'classic',
ADD COLUMN     "logoUrl" TEXT;
