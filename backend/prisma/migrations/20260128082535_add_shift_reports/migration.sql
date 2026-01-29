/*
  Warnings:

  - The values [CLIENT,SUPERVISOR] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `endDate` on the `LeaveRequest` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `LeaveRequest` table. All the data in the column will be lost.
  - The `status` column on the `LeaveRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Shift` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `severity` on the `ShiftReport` table. All the data in the column will be lost.
  - You are about to drop the column `shiftId` on the `ShiftReport` table. All the data in the column will be lost.
  - You are about to drop the `Attendance` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `siteId` to the `ShiftReport` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'GUARD');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'GUARD';
COMMIT;

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_shiftId_fkey";

-- DropForeignKey
ALTER TABLE "ShiftReport" DROP CONSTRAINT "ShiftReport_shiftId_fkey";

-- DropIndex
DROP INDEX "ShiftReport_shiftId_key";

-- AlterTable
ALTER TABLE "LeaveRequest" DROP COLUMN "endDate",
DROP COLUMN "startDate",
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Shift" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE "ShiftReport" DROP COLUMN "severity",
DROP COLUMN "shiftId",
ADD COLUMN     "siteId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Attendance";

-- DropEnum
DROP TYPE "LeaveStatus";

-- DropEnum
DROP TYPE "ShiftStatus";

-- AddForeignKey
ALTER TABLE "ShiftReport" ADD CONSTRAINT "ShiftReport_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
