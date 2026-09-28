import { ContentAccessType } from '@prisma/client';

export function isFreeAccess(access: ContentAccessType | null | undefined, lessonIsFreePreview: boolean) {
  return lessonIsFreePreview || access === ContentAccessType.free;
}

export function requiresEntitlement(access: ContentAccessType | null | undefined, lessonIsFreePreview: boolean) {
  return !isFreeAccess(access, lessonIsFreePreview);
}
