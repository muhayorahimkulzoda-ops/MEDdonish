import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { isFreeAccess } from './access-policy';

@Injectable()
export class LessonAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async assertCanViewLesson(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: true },
    });
    if (!lesson) throw new AppException('LESSON_NOT_FOUND', 'Lesson not found');
    if (lesson.isFreePreview && lesson.status === 'published') return lesson;
    await this.entitlements.assertActive(userId, lesson.section.courseId);
    return lesson;
  }

  async assertCanPlayVideo(userId: string, videoId: string, preview = false) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      include: { lesson: { include: { section: true } } },
    });
    if (!video) throw new AppException('VIDEO_NOT_FOUND', 'Video not found');
    if (!video.sourceKey && !video.previewSourceKey && video.status !== 'READY') {
      throw new AppException('VIDEO_NOT_READY', 'Video is still processing');
    }
    if (isFreeAccess(video.accessType, video.lesson.isFreePreview)) return video;
    if (preview && video.previewSourceKey) return video;
    await this.entitlements.assertActive(userId, video.lesson.section.courseId);
    return video;
  }

  async assertCanViewDocument(userId: string, documentId: string, preview = false) {
    const link = await this.prisma.lessonDocument.findFirst({
      where: { documentId },
      include: { lesson: { include: { section: true } }, document: true },
    });
    if (!link) throw new AppException('DOCUMENT_NOT_FOUND', 'Document not found');
    if (isFreeAccess(link.document.accessType, link.lesson.isFreePreview)) return link.document;
    await this.entitlements.assertActive(userId, link.lesson.section.courseId);
    return link.document;
  }

  async assertCanTakeTest(userId: string, testId: string, preview = false) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { lesson: { include: { section: true } } },
    });
    if (!test) throw new AppException('TEST_NOT_FOUND', 'Test not found');
    const lessonFree = Boolean(test.lesson?.isFreePreview);
    if (isFreeAccess(test.accessType, lessonFree)) return test;
    if (preview && test.demoQuestionCount > 0) return test;
    if (test.courseId) {
      await this.entitlements.assertActive(userId, test.courseId);
      return test;
    }
    if (test.lesson?.section.courseId) {
      await this.entitlements.assertActive(userId, test.lesson.section.courseId);
      return test;
    }
    throw new AppException('ENTITLEMENT_INACTIVE', 'Active entitlement required');
  }
}
