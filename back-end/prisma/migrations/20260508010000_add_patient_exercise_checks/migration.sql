CREATE TABLE "PatientExerciseCheck" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientExerciseCheck_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientExerciseCheck_patientId_exerciseId_date_key" ON "PatientExerciseCheck"("patientId", "exerciseId", "date");
CREATE INDEX "PatientExerciseCheck_patientId_date_idx" ON "PatientExerciseCheck"("patientId", "date");
CREATE INDEX "PatientExerciseCheck_exerciseId_date_idx" ON "PatientExerciseCheck"("exerciseId", "date");

ALTER TABLE "PatientExerciseCheck"
ADD CONSTRAINT "PatientExerciseCheck_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientExerciseCheck"
ADD CONSTRAINT "PatientExerciseCheck_exerciseId_fkey"
FOREIGN KEY ("exerciseId") REFERENCES "PatientExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
