-- CreateTable
CREATE TABLE "lesson_timecodes" (
    "id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "prompt" TEXT NOT NULL,
    "offset_sec" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "lesson_timecodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lesson_timecodes_lesson_id_sort_order_idx" ON "lesson_timecodes"("lesson_id", "sort_order");

-- AddForeignKey
ALTER TABLE "lesson_timecodes" ADD CONSTRAINT "lesson_timecodes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
