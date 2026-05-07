-- Add patient phone number field
ALTER TABLE "Patient"
ADD COLUMN "phone" TEXT NOT NULL DEFAULT '';
