'use client';

import { useParams } from 'next/navigation';
import { CourseProgramSlide } from '../../../../components/CourseProgramSlide';

export default function CourseEditorPage() {
  const params = useParams<{ id: string }>();
  const courseId = Array.isArray(params.id) ? params.id[0] : params.id;
  if (!courseId) return null;
  return <CourseProgramSlide courseId={courseId} />;
}
