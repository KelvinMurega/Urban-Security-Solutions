-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "resolutionDetails" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3);
