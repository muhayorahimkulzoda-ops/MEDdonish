export type HlsRung = {
  quality: string;
  height: number;
  width: number;
  bandwidth: number;
  maxrate: string;
  bufsize: string;
  audioBitrate: string;
};

export const HLS_LADDER: HlsRung[] = [
  { quality: '360p', height: 360, width: 640, bandwidth: 800_000, maxrate: '800k', bufsize: '1600k', audioBitrate: '96k' },
  { quality: '480p', height: 480, width: 854, bandwidth: 1_400_000, maxrate: '1400k', bufsize: '2800k', audioBitrate: '96k' },
  { quality: '720p', height: 720, width: 1280, bandwidth: 2_800_000, maxrate: '2800k', bufsize: '5600k', audioBitrate: '128k' },
  { quality: '1080p', height: 1080, width: 1920, bandwidth: 5_000_000, maxrate: '5000k', bufsize: '10000k', audioBitrate: '160k' },
];

export function pickRungs(sourceHeight: number) {
  return HLS_LADDER.filter((rung) => rung.height <= Math.max(sourceHeight, 360));
}

export function buildMasterPlaylist(rungs: HlsRung[]) {
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3'];
  for (const rung of rungs) {
    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${rung.bandwidth},RESOLUTION=${rung.width}x${rung.height},NAME="${rung.quality}"`,
      `${rung.quality}.m3u8`,
    );
  }
  return `${lines.join('\n')}\n`;
}

export function isSafeHlsName(file: string) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(file);
}
