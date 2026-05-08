-- Patient profile content management

CREATE TABLE "PatientVideo" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "videoUrl" TEXT NOT NULL,
  "phase" INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PatientVideo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientExercise" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "phase" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PatientExercise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientInteraction" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PatientInteraction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PatientVideo_patientId_phase_idx" ON "PatientVideo"("patientId", "phase");
CREATE INDEX "PatientExercise_patientId_phase_isActive_idx" ON "PatientExercise"("patientId", "phase", "isActive");
CREATE INDEX "PatientInteraction_patientId_createdAt_idx" ON "PatientInteraction"("patientId", "createdAt");
CREATE INDEX "PatientInteraction_authorId_idx" ON "PatientInteraction"("authorId");

ALTER TABLE "PatientVideo"
ADD CONSTRAINT "PatientVideo_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientVideo"
ADD CONSTRAINT "PatientVideo_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PatientExercise"
ADD CONSTRAINT "PatientExercise_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientInteraction"
ADD CONSTRAINT "PatientInteraction_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientInteraction"
ADD CONSTRAINT "PatientInteraction_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
