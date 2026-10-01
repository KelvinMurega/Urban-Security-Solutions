-- AlterTable
ALTER TABLE `Incident` ADD COLUMN `photoUrls` JSON NULL;

-- AlterTable
ALTER TABLE `Report` ADD COLUMN `photoUrls` JSON NULL;
