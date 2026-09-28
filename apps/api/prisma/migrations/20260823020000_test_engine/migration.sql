ALTER TABLE "test_attempts" ADD COLUMN "current_index" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "test_attempts" ADD COLUMN "question_opened_at" TIMESTAMP(3);

CREATE TABLE "question_import_jobs" (
    "id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "question_import_jobs_pkey" PRIMARY KEY ("id")
);
