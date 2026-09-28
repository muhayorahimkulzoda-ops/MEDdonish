CREATE TYPE "ContentType" AS ENUM ('video', 'presentation', 'pdf', 'test');
CREATE TYPE "ContentAccessType" AS ENUM ('free', 'paid', 'subscription');
CREATE TYPE "DocumentKind" AS ENUM ('pdf', 'presentation');

ALTER TABLE "videos" ADD COLUMN "preview_source_key" TEXT;
ALTER TABLE "videos" ADD COLUMN "access_type" "ContentAccessType" NOT NULL DEFAULT 'paid';

ALTER TABLE "video_progress" ADD COLUMN "position_seconds" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "documents" ADD COLUMN "kind" "DocumentKind" NOT NULL DEFAULT 'pdf';
ALTER TABLE "documents" ADD COLUMN "page_count" INTEGER;
ALTER TABLE "documents" ADD COLUMN "preview_pages_count" INTEGER;
ALTER TABLE "documents" ADD COLUMN "access_type" "ContentAccessType" NOT NULL DEFAULT 'paid';

ALTER TABLE "tests" ADD COLUMN "access_type" "ContentAccessType" NOT NULL DEFAULT 'paid';
ALTER TABLE "tests" ADD COLUMN "demo_question_count" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "lesson_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lesson_progress_user_id_lesson_id_key" ON "lesson_progress"("user_id", "lesson_id");

ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "content_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "content_type" "ContentType" NOT NULL,
    "access_type" "ContentAccessType" NOT NULL,
    "course_id" UUID,
    "section_id" UUID,
    "lesson_id" UUID,
    "entity_id" UUID NOT NULL,
    "storage_bucket" TEXT NOT NULL DEFAULT 'premium-media',
    "storage_path" TEXT NOT NULL DEFAULT '',
    "thumbnail_path" TEXT,
    "preview_storage_path" TEXT,
    "preview_pages_count" INTEGER,
    "demo_questions_count" INTEGER,
    "preview_duration_sec" INTEGER,
    "duration_sec" INTEGER,
    "status" "PublishStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "content_items_content_type_status_idx" ON "content_items"("content_type", "status");
CREATE INDEX "content_items_lesson_id_content_type_idx" ON "content_items"("lesson_id", "content_type");

ALTER TABLE "content_items" ADD CONSTRAINT "content_items_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
