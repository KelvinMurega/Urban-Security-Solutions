-- AlterTable
ALTER TABLE `Shift`
  ADD COLUMN `checkedInAt` DATETIME(3) NULL,
  ADD COLUMN `checkedOutAt` DATETIME(3) NULL,
  ADD COLUMN `checkInFromGuardName` VARCHAR(191) NULL,
  ADD COLUMN `checkOutToGuardName` VARCHAR(191) NULL;
