import { Injectable } from '@nestjs/common';
import { sha256 } from '../../common/crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { drmSession, mediaPath, publicMediaUrl } from './delivery';
import { MediaTokenService } from './media-token.service';

@Injectable()
export class MediaSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: MediaTokenService,
  ) {}

  async playback(videoId: string, subject: string, deviceRecordId?: string, preview = false) {
    const video = await this.prisma.video.findUniqueOrThrow({
      where: { id: videoId },
      include: { variants: true },
    });
    const ttl = preview ? 600 : 3600;
    const token = this.tokens.issue('video', videoId, subject, ttl, preview);
    if (deviceRecordId) {
      await this.prisma.videoPlaybackSession.create({
        data: {
          videoId,
          userId: subject,
          deviceId: deviceRecordId,
          tokenHash: sha256(token),
          expiresAt: new Date(Date.now() + ttl * 1000),
        },
      });
    }
    const hls = video.variants.some((variant) => variant.protocol === 'hls');
    const dash = video.variants.find((variant) => variant.protocol === 'dash');
    const playback = publicMediaUrl(mediaPath('video', token), ttl);
    const dashDelivery = dash
      ? publicMediaUrl(mediaPath('video', token, 'manifest.mpd'), ttl)
      : null;
    const drm = drmSession(subject, videoId, ttl);
    return {
      token,
      expiresIn: ttl,
      protocol: hls ? 'hls' : dash ? 'dash' : 'signed-mp4',
      qualities: video.variants
        .filter((variant) => variant.protocol === 'hls' && variant.quality !== 'master')
        .map((variant) => variant.quality),
      playbackUrl: playback.url,
      dashUrl: dashDelivery?.url ?? null,
      cdn: playback.cdn,
      drm,
      preview,
      watermark: { text: `MEDdonish\nID: ${subject.slice(0, 8)}` },
    };
  }

  async viewPdf(documentId: string, subject: string) {
    const ttl = 3600;
    const token = this.tokens.issue('pdf', documentId, subject, ttl);
    await this.prisma.documentViewSession.create({
      data: {
        documentId,
        subject,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });
    return {
      token,
      expiresIn: ttl,
      viewUrl: publicMediaUrl(mediaPath('pdf', token), ttl).url,
    };
  }

  viewClinicalImage(mediaId: string, subject: string) {
    const token = this.tokens.issue('image', mediaId, subject, 120);
    return {
      token,
      expiresIn: 120,
      viewUrl: publicMediaUrl(mediaPath('image', token), 120).url,
    };
  }
}
