-- AlterTable
ALTER TABLE `Site`
  ADD COLUMN `latitude` DOUBLE NULL,
  ADD COLUMN `longitude` DOUBLE NULL,
  ADD COLUMN `geofenceRadiusMeters` INTEGER NOT NULL DEFAULT 150;

-- AlterTable
ALTER TABLE `Shift`
  DROP COLUMN `checkInFromGuardName`,
  DROP COLUMN `checkOutToGuardName`,
  ADD COLUMN `checkInLat` DOUBLE NULL,
  ADD COLUMN `checkInLng` DOUBLE NULL,
  ADD COLUMN `checkOutLat` DOUBLE NULL,
  ADD COLUMN `checkOutLng` DOUBLE NULL,
  ADD COLUMN `checkInFromUserId` VARCHAR(191) NULL,
  ADD COLUMN `checkOutToUserId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Shift` ADD CONSTRAINT `Shift_checkInFromUserId_fkey` FOREIGN KEY (`checkInFromUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shift` ADD CONSTRAINT `Shift_checkOutToUserId_fkey` FOREIGN KEY (`checkOutToUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
