-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "Patient"
ADD COLUMN "status" "PatientStatus" NOT NULL DEFAULT 'IN_PROGRESS';

-- Update existing patients based on phase
UPDATE "Patient"
SET "status" = 'COMPLETED'
WHERE "phase" >= 3;

-- CreateIndex
CREATE INDEX "Patient_status_idx" ON "Patient"("status");
