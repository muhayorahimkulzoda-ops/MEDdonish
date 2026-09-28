export const STORAGE_BUCKETS = ['public-media', 'course-media', 'premium-media', 'avatars'] as const;
export type StorageBucket = (typeof STORAGE_BUCKETS)[number];

const EXECUTABLE = /\.(exe|dll|bat|cmd|com|msi|scr|ps1|sh|bash|js|mjs|cjs|jar|apk|app|dmg)$/i;

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;
const PDF_EXT = /\.pdf$/i;
const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

export const MAX_BYTES = {
  video: 2 * 1024 * 1024 * 1024,
  pdf: 40 * 1024 * 1024,
  image: 8 * 1024 * 1024,
  preview: 80 * 1024 * 1024,
} as const;

export function isExecutableFile(name: string) {
  return EXECUTABLE.test(name);
}

export function assertSafeUpload(kind: 'video' | 'pdf' | 'presentation' | 'image' | 'preview', file: {
  originalname: string;
  mimetype: string;
  size: number;
}) {
  const name = file.originalname || 'file';
  if (isExecutableFile(name) || file.mimetype.includes('javascript') || file.mimetype.includes('executable')) {
    throw Object.assign(new Error('Executable files are not allowed'), { code: 'FILE_TYPE' });
  }
  if (kind === 'video') {
    if (!VIDEO_EXT.test(name) && !file.mimetype.startsWith('video/')) {
      throw Object.assign(new Error('Only MP4, WebM and MOV are allowed'), { code: 'VIDEO_TYPE' });
    }
    if (file.size > MAX_BYTES.video) {
      throw Object.assign(new Error('Video is too large'), { code: 'FILE_SIZE' });
    }
    return;
  }
  if (kind === 'pdf' || kind === 'presentation') {
    if (!PDF_EXT.test(name) && file.mimetype !== 'application/pdf') {
      throw Object.assign(new Error('Only PDF is allowed'), { code: 'PDF_REQUIRED' });
    }
    if (file.size > MAX_BYTES.pdf) {
      throw Object.assign(new Error('PDF is too large'), { code: 'FILE_SIZE' });
    }
    return;
  }
  if (kind === 'image') {
    if (!IMAGE_EXT.test(name) && !file.mimetype.startsWith('image/')) {
      throw Object.assign(new Error('Only PNG, JPEG or WebP are allowed'), { code: 'FILE_TYPE' });
    }
    if (file.size > MAX_BYTES.image) {
      throw Object.assign(new Error('Image is too large'), { code: 'FILE_SIZE' });
    }
    return;
  }
  if (file.size > MAX_BYTES.preview) {
    throw Object.assign(new Error('Preview file is too large'), { code: 'FILE_SIZE' });
  }
}

export function bucketFor(access: 'free' | 'paid' | 'subscription', kind: 'video' | 'pdf' | 'presentation' | 'image' | 'preview'): StorageBucket {
  if (kind === 'image' || kind === 'preview' || access === 'free') return 'public-media';
  return 'premium-media';
}
