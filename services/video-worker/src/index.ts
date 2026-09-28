import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { PrismaClient, VideoStatus } from '@prisma/client';
import { buildMasterPlaylist, pickRungs, type HlsRung } from './hls';

const prisma = new PrismaClient();
const storageRoot = resolve(
  process.env.STORAGE_ROOT ?? resolve(__dirname, '../../../apps/api/storage'),
);

function abs(key: string) {
  return resolve(storageRoot, key.replace(/^\/+/, ''));
}

function workPath(absPath: string) {
  return `/${relative(storageRoot, absPath).replace(/\\/g, '/')}`;
}

function run(cmd: string, args: string[]) {
  return new Promise<boolean>((done) => {
    const child = spawn(cmd, args, { stdio: 'ignore' });
    child.on('error', () => done(false));
    child.on('exit', (code) => done(code === 0));
  });
}

async function probeHeight(sourceAbs: string) {
  const local = await probeWith('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=height',
    '-of',
    'csv=p=0',
    sourceAbs,
  ]);
  if (local) return local;
  return probeWith('docker', [
    'run',
    '--rm',
    '--entrypoint',
    'ffprobe',
    '-v',
    `${storageRoot}:/work`,
    'mwader/static-ffmpeg:7.1',
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=height',
    '-of',
    'csv=p=0',
    `/work${workPath(sourceAbs)}`,
  ]);
}

function probeWith(cmd: string, args: string[]) {
  return new Promise<number | null>((done) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    child.stdout.on('data', (chunk) => {
      out += String(chunk);
    });
    child.on('error', () => done(null));
    child.on('exit', (code) => {
      const height = Number(out.trim());
      done(code === 0 && height > 0 ? height : null);
    });
  });
}

async function runFfmpeg(absArgs: string[]) {
  if (await run('ffmpeg', absArgs)) return true;
  const dockerArgs = absArgs.map((arg) => {
    if (arg.startsWith(storageRoot)) return `/work${workPath(arg)}`;
    return arg;
  });
  return run('docker', [
    'run',
    '--rm',
    '-v',
    `${storageRoot}:/work`,
    'mwader/static-ffmpeg:7.1',
    ...dockerArgs,
  ]);
}

async function packageRung(sourceAbs: string, videoId: string, rung: HlsRung) {
  const playlistKey = `video/${videoId}/hls/${rung.quality}.m3u8`;
  const segmentKey = `video/${videoId}/hls/${rung.quality}_%03d.ts`;
  await mkdir(dirname(abs(playlistKey)), { recursive: true });
  const ok = await runFfmpeg([
    '-y',
    '-i',
    sourceAbs,
    '-vf',
    `scale=-2:${rung.height}`,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-maxrate',
    rung.maxrate,
    '-bufsize',
    rung.bufsize,
    '-c:a',
    'aac',
    '-b:a',
    rung.audioBitrate,
    '-hls_time',
    '6',
    '-hls_playlist_type',
    'vod',
    '-hls_segment_filename',
    abs(segmentKey),
    abs(playlistKey),
  ]);
  if (!ok) throw new Error(`ffmpeg failed for ${rung.quality}`);
  return playlistKey;
}

async function packageDash(sourceAbs: string, videoId: string, height: number) {
  const manifestKey = `video/${videoId}/dash/manifest.mpd`;
  await mkdir(dirname(abs(manifestKey)), { recursive: true });
  const ok = await runFfmpeg([
    '-y',
    '-i',
    sourceAbs,
    '-vf',
    `scale=-2:${Math.min(height, 720)}`,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-maxrate',
    '2800k',
    '-bufsize',
    '5600k',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-f',
    'dash',
    '-seg_duration',
    '4',
    '-use_template',
    '1',
    '-use_timeline',
    '1',
    abs(manifestKey),
  ]);
  return ok ? manifestKey : null;
}

async function processVideo(videoId: string) {
  const video = await prisma.video.findUniqueOrThrow({ where: { id: videoId } });
  if (!video.sourceKey) throw new Error('missing source');

  await prisma.video.update({
    where: { id: videoId },
    data: { status: VideoStatus.PROCESSING, errorMessage: null },
  });

  const sourceAbs = abs(video.sourceKey);
  const height = (await probeHeight(sourceAbs)) ?? 720;
  const rungs = pickRungs(height);
  const packaged: { quality: string; key: string }[] = [];

  for (const rung of rungs) {
    try {
      packaged.push({ quality: rung.quality, key: await packageRung(sourceAbs, videoId, rung) });
    } catch {
      break;
    }
  }

  if (packaged.length > 0) {
    const used = rungs.filter((rung) => packaged.some((item) => item.quality === rung.quality));
    const masterKey = `video/${videoId}/hls/master.m3u8`;
    await writeFile(abs(masterKey), buildMasterPlaylist(used), 'utf8');
    await prisma.video.update({
      where: { id: videoId },
      data: { status: VideoStatus.ENCRYPTING },
    });
    await prisma.videoVariant.deleteMany({ where: { videoId } });
    const dashKey = await packageDash(sourceAbs, videoId, height);
    await prisma.videoVariant.createMany({
      data: [
        { videoId, quality: 'master', protocol: 'hls', manifestKey: masterKey },
        ...packaged.map((item) => ({
          videoId,
          quality: item.quality,
          protocol: 'hls',
          manifestKey: item.key,
        })),
        ...(dashKey
          ? [{ videoId, quality: '720p', protocol: 'dash', manifestKey: dashKey }]
          : []),
        { videoId, quality: 'source', protocol: 'signed-mp4', manifestKey: video.sourceKey },
      ],
    });
  } else {
    await prisma.video.update({
      where: { id: videoId },
      data: { status: VideoStatus.ENCRYPTING },
    });
    await prisma.videoVariant.deleteMany({ where: { videoId } });
    await prisma.videoVariant.create({
      data: {
        videoId,
        quality: 'source',
        protocol: 'signed-mp4',
        manifestKey: video.sourceKey,
      },
    });
  }

  await prisma.video.update({
    where: { id: videoId },
    data: { status: VideoStatus.READY },
  });
}

async function tick() {
  const job = await prisma.videoJob.findFirst({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
  });
  if (!job) return;

  await prisma.videoJob.update({
    where: { id: job.id },
    data: { status: 'active', startedAt: new Date() },
  });

  try {
    await processVideo(job.videoId);
    await prisma.videoJob.update({
      where: { id: job.id },
      data: { status: 'done', finishedAt: new Date() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'processing failed';
    await prisma.video.update({
      where: { id: job.videoId },
      data: { status: VideoStatus.FAILED, errorMessage: message },
    });
    await prisma.videoJob.update({
      where: { id: job.id },
      data: { status: 'failed', finishedAt: new Date() },
    });
  }
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('MEDdonish video worker started');
  for (;;) {
    await tick();
    await new Promise((resolveWait) => setTimeout(resolveWait, 2000));
  }
}

void main();
