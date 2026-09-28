-- Admin CMS: audit fields, drugs, media library, clinical case status.

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "app_role" TEXT NOT NULL DEFAULT 'student';

ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "level" TEXT;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "duration_min" INTEGER;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP(3);
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "updated_by" UUID;

ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP(3);
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "updated_by" UUID;

ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "external_url" TEXT;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "thumbnail_url" TEXT;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "language" TEXT;

ALTER TABLE "clinical_cases" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "clinical_cases" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "clinical_cases" ADD COLUMN IF NOT EXISTS "specialty" TEXT;
ALTER TABLE "clinical_cases" ADD COLUMN IF NOT EXISTS "management" TEXT;
ALTER TABLE "clinical_cases" ADD COLUMN IF NOT EXISTS "references" JSONB;
ALTER TABLE "clinical_cases" ADD COLUMN IF NOT EXISTS "last_reviewed_at" TIMESTAMP(3);
ALTER TABLE "clinical_cases" ADD COLUMN IF NOT EXISTS "reviewer_name" TEXT;
ALTER TABLE "clinical_cases" ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP(3);
ALTER TABLE "clinical_cases" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE "clinical_cases" ADD COLUMN IF NOT EXISTS "updated_by" UUID;

CREATE TABLE IF NOT EXISTS "drugs" (
    "id" UUID NOT NULL,
    "generic_name" TEXT NOT NULL,
    "brand_name" TEXT,
    "drug_class" TEXT,
    "mechanism" TEXT,
    "indications" TEXT,
    "contraindications" TEXT,
    "adverse_effects" TEXT,
    "dosage" TEXT,
    "interactions" TEXT,
    "pregnancy" TEXT,
    "references" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "last_reviewed_at" TIMESTAMP(3),
    "reviewer_name" TEXT,
    "published_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drugs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "drugs_status_updated_at_idx" ON "drugs"("status", "updated_at");

CREATE TABLE IF NOT EXISTS "content_sources" (
    "id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "source_title" TEXT NOT NULL,
    "author" TEXT,
    "year" INTEGER,
    "url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_sources_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "content_sources_entity_type_entity_id_idx" ON "content_sources"("entity_type", "entity_id");

CREATE TABLE IF NOT EXISTS "media_assets" (
    "id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" BIGINT NOT NULL DEFAULT 0,
    "kind" TEXT NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "media_assets_kind_created_at_idx" ON "media_assets"("kind", "created_at");
