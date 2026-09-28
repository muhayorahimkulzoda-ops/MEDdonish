import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AppException } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';
import { isSafeHlsName } from './hls-file';
import { MediaTokenService } from './media-token.service';
import { StorageService } from './storage.service';

@ApiTags('media-stream')
@SkipThrottle()
@Controller('media')
export class MediaController {
  constructor(
    private readonly tokens: MediaTokenService,
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('video/:token')
  async video(@Param('token') token: string, @Req() req: Request, @Res() res: Response) {
    const payload = this.safeVerify(token, 'video');
    const video = await this.prisma.video.findUniqueOrThrow({
      where: { id: payload.id },
      include: { variants: true },
    });
    const key = payload.preview
      ? video.previewSourceKey ?? this.storage.previewKey(video.id)
      : this.playbackKey(video.variants, video.sourceKey) ?? (await this.existingSource(video.id));
    if (!key) throw new AppException('VIDEO_NOT_READY', 'Video is not available');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
    res.setHeader('Content-Type', this.sourceType(video.originalName, key));
    res.setHeader('Cache-Control', 'no-store');
    await this.pipeFile(key, res, req);
  }

  @Get('video/:token/:file')
  async videoFile(
    @Param('token') token: string,
    @Param('file') file: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!isSafeHlsName(file)) {
      throw new AppException('MEDIA_TOKEN_INVALID', 'Invalid media path');
    }
    const payload = this.safeVerify(token, 'video');
    const key = await this.packagedFile(payload.id, file);
    if (!key) throw new AppException('VIDEO_NOT_READY', 'Video is not available');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', this.packagedType(file));
    res.setHeader('Cache-Control', 'no-store');
    await this.pipeFile(key, res, req);
  }

  @Get('pdf/:token')
  async pdf(@Param('token') token: string, @Req() req: Request, @Res() res: Response) {
    const payload = this.safeVerify(token, 'pdf');
    const document = await this.prisma.document.findUniqueOrThrow({ where: { id: payload.id } });
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="notes.pdf"');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    await this.pipeFile(document.storageKey, res);
  }

  @Get('image/:token')
  async image(@Param('token') token: string, @Res() res: Response) {
    const payload = this.safeVerify(token, 'image');
    const media = await this.prisma.clinicalCaseMedia.findUniqueOrThrow({
      where: { id: payload.id },
    });
    const ext = media.storageKey.split('.').pop();
    const mime =
      ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    await this.pipeFile(media.storageKey, res);
  }

  private async pipeFile(key: string, res: Response, req?: Request) {
    if (!(await this.storage.exists(key))) {
      throw new AppException('VIDEO_NOT_READY', 'Media file is not available');
    }
    const size = await this.storage.size(key);
    const range = this.parseRange(req?.headers.range, size);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-store');
    const attachError = (stream: ReturnType<StorageService['stream']>) => {
      stream.on('error', () => {
        if (!res.headersSent) {
          res.status(404).end();
          return;
        }
        res.destroy();
      });
      stream.pipe(res);
    };
    if (!range) {
      res.setHeader('Content-Length', String(size));
      attachError(this.storage.stream(key));
      return;
    }
    res.status(206);
    res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
    res.setHeader('Content-Length', String(range.end - range.start + 1));
    attachError(this.storage.stream(key, range));
  }

  private parseRange(header: string | undefined, size: number) {
    if (!header) return null;
    const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
    if (!match) return null;
    const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2] || 0));
    const end = match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return null;
    return { start, end };
  }

  private async packagedFile(videoId: string, file: string) {
    const keys = [
      this.storage.hlsKey(videoId, file),
      `video/${videoId}/hls/${file}`,
      `premium-media/video/${videoId}/dash/${file}`,
      `video/${videoId}/dash/${file}`,
    ];
    for (const key of keys) {
      if (await this.storage.exists(key)) return key;
    }
    return null;
  }

  private packagedType(file: string) {
    if (file.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
    if (file.endsWith('.mpd')) return 'application/dash+xml';
    if (file.endsWith('.m4s') || file.endsWith('.mp4')) return 'video/mp4';
    return 'video/mp2t';
  }

  private async existingSource(videoId: string) {
    const candidates = [
      this.storage.sourceKey(videoId),
      `video/${videoId}/source/original`,
      this.storage.tempKey(videoId),
      `video/${videoId}/source/.partial`,
    ];
    for (const key of candidates) {
      if (await this.storage.exists(key)) return key;
    }
    return null;
  }

  private playbackKey(
    variants: { quality: string; protocol: string; manifestKey: string }[],
    sourceKey?: string | null,
  ) {
    const mp4 = variants.find((variant) => variant.protocol === 'signed-mp4');
    const master = variants.find((variant) => variant.protocol === 'hls' && variant.quality === 'master');
    const hls = master ?? variants.find((variant) => variant.protocol === 'hls');
    return mp4?.manifestKey ?? hls?.manifestKey ?? sourceKey ?? null;
  }

  private sourceType(originalName: string | null, key: string) {
    const name = `${originalName ?? ''} ${key}`.toLowerCase();
    if (name.includes('.webm')) return 'video/webm';
    if (name.includes('.mov')) return 'video/quicktime';
    if (name.endsWith('.m3u8') || name.includes('.m3u8')) return 'application/vnd.apple.mpegurl';
    return 'video/mp4';
  }

  private safeVerify(token: string, kind: 'video' | 'pdf' | 'image') {
    try {
      const payload = this.tokens.verify(token);
      if (payload.kind !== kind) throw new Error('kind');
      return payload;
    } catch {
      throw new AppException('MEDIA_TOKEN_INVALID', 'Media session expired');
    }
  }
}
