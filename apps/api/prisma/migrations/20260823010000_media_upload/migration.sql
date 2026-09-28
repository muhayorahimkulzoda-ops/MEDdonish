-- Media upload and processing
ALTER TABLE "videos" ADD COLUMN "original_name" TEXT;
ALTER TABLE "videos" ADD COLUMN "byte_size" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "videos" ADD COLUMN "uploaded_bytes" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "videos" ADD COLUMN "error_message" TEXT;

ALTER TABLE "documents" ADD COLUMN "mime_type" TEXT NOT NULL DEFAULT 'application/pdf';
ALTER TABLE "documents" ADD COLUMN "byte_size" BIGINT NOT NULL DEFAULT 0;

CREATE TABLE "video_jobs" (
    "id" UUID NOT NULL,
    "video_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    CONSTRAINT "video_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "video_jobs_status_created_at_idx" ON "video_jobs"("status", "created_at");
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "document_view_sessions" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_view_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "document_view_sessions_document_id_idx" ON "document_view_sessions"("document_id");
ALTER TABLE "document_view_sessions" ADD CONSTRAINT "document_view_sessions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
