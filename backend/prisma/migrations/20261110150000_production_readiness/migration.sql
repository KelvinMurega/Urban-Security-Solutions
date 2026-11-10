-- AlterTable
ALTER TABLE `Shift` ADD COLUMN `checkInAccuracyMeters` DOUBLE NULL,
    ADD COLUMN `checkInIp` VARCHAR(45) NULL,
    ADD COLUMN `checkInUserAgent` VARCHAR(255) NULL,
    ADD COLUMN `checkOutAccuracyMeters` DOUBLE NULL,
    ADD COLUMN `checkOutIp` VARCHAR(45) NULL,
    ADD COLUMN `checkOutUserAgent` VARCHAR(255) NULL,
    ADD COLUMN `locationFlagReason` VARCHAR(255) NULL,
    ADD COLUMN `locationFlagged` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `action` VARCHAR(64) NOT NULL,
    `entityType` VARCHAR(32) NOT NULL,
    `entityId` VARCHAR(64) NULL,
    `metadata` JSON NULL,
    `ip` VARCHAR(45) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    INDEX `AuditLog_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `AuditLog_actorId_createdAt_idx`(`actorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Incident_siteId_reportedAt_idx` ON `Incident`(`siteId`, `reportedAt`);

-- CreateIndex
CREATE INDEX `Incident_userId_createdAt_idx` ON `Incident`(`userId`, `createdAt`);

-- CreateIndex
CREATE INDEX `Incident_status_idx` ON `Incident`(`status`);

-- CreateIndex
CREATE INDEX `Report_userId_createdAt_idx` ON `Report`(`userId`, `createdAt`);

-- CreateIndex
CREATE INDEX `Report_shiftId_createdAt_idx` ON `Report`(`shiftId`, `createdAt`);

-- CreateIndex
CREATE INDEX `Shift_userId_startTime_idx` ON `Shift`(`userId`, `startTime`);

-- CreateIndex
CREATE INDEX `Shift_siteId_startTime_idx` ON `Shift`(`siteId`, `startTime`);

-- CreateIndex
CREATE INDEX `Shift_status_idx` ON `Shift`(`status`);

-- CreateIndex
CREATE INDEX `User_role_status_idx` ON `User`(`role`, `status`);

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

