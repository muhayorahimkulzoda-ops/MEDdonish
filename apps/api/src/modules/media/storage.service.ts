import { Injectable } from '@nestjs/common';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, open, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { StorageBucket } from './file-policy';
import { STORAGE_BUCKETS } from './file-policy';

type ObjectRef = { bucket: StorageBucket; path: string; key: string };

@Injectable()
export class StorageService {
  readonly root = resolve(process.env.STORAGE_ROOT ?? './storage');

  private driver() {
    return process.env.STORAGE_DRIVER === 'supabase' ? 'supabase' : 'local';
  }

  objectKey(bucket: StorageBucket, path: string) {
    const safe = path.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${bucket}/${safe}`;
  }

  parseKey(key: string): ObjectRef {
    const safe = key.replace(/\\/g, '/').replace(/^\/+/, '');
    const [head, ...rest] = safe.split('/');
    if ((STORAGE_BUCKETS as readonly string[]).includes(head) && rest.length) {
      return { bucket: head as StorageBucket, path: rest.join('/'), key: safe };
    }
    return { bucket: 'premium-media', path: safe, key: `premium-media/${safe}` };
  }

  absolute(key: string) {
    const ref = this.parseKey(key);
    const full = resolve(this.root, ref.key);
    if (!full.startsWith(this.root)) {
      throw new Error('Invalid storage key');
    }
    return full;
  }

  async ensureDir(key: string) {
    await mkdir(dirname(this.absolute(key)), { recursive: true });
  }

  async writeStream(key: string, body: Readable) {
    await this.ensureDir(key);
    const localPath = this.absolute(key);
    await pipeline(body, createWriteStream(localPath));
    if (this.driver() === 'supabase') {
      const buffer = await this.readLocal(key);
      await this.supabaseUpload(key, buffer);
    }
  }

  async writeBuffer(key: string, buffer: Buffer) {
    await this.ensureDir(key);
    await writeFile(this.absolute(key), buffer);
    if (this.driver() === 'supabase') {
      await this.supabaseUpload(key, buffer);
    }
  }

  async appendChunk(key: string, offset: number, chunk: Buffer) {
    await this.ensureDir(key);
    const handle = await open(this.absolute(key), 'a+');
    try {
      await handle.write(chunk, 0, chunk.length, offset);
    } finally {
      await handle.close();
    }
  }

  async move(fromKey: string, toKey: string) {
    await this.ensureDir(toKey);
    await rename(this.absolute(fromKey), this.absolute(toKey));
    if (this.driver() === 'supabase') {
      const buffer = await this.readLocal(toKey);
      await this.supabaseUpload(toKey, buffer);
    }
  }

  async size(key: string) {
    if (await this.localExists(key)) {
      return (await stat(this.absolute(key))).size;
    }
    if (this.driver() === 'supabase') {
      const remote = await this.supabaseHead(key);
      if (remote != null) return remote;
    }
    throw new Error('missing');
  }

  async exists(key: string) {
    if (await this.localExists(key)) return true;
    const aliases = this.aliases(key);
    for (const item of aliases) {
      if (item !== key && (await this.localExists(item))) return true;
    }
    if (this.driver() === 'supabase') {
      const buffer = await this.supabaseDownload(key);
      if (!buffer) return false;
      await this.ensureDir(key);
      await writeFile(this.absolute(key), buffer);
      return true;
    }
    return false;
  }

  stream(key: string, range?: { start: number; end: number }) {
    const resolved = this.absolute(this.existingLocal(key) ?? key);
    return createReadStream(resolved, range);
  }

  sourceKey(videoId: string, filename = 'original') {
    return this.objectKey('premium-media', `video/${videoId}/source/${filename}`);
  }

  previewKey(videoId: string, filename = 'preview') {
    return this.objectKey('public-media', `video/${videoId}/preview/${filename}`);
  }

  tempKey(videoId: string) {
    return this.objectKey('premium-media', `video/${videoId}/source/.partial`);
  }

  hlsKey(videoId: string, file = 'master.m3u8') {
    return this.objectKey('premium-media', `video/${videoId}/hls/${file}`);
  }

  documentKey(documentId: string) {
    return this.objectKey('premium-media', `documents/${documentId}/file.pdf`);
  }

  thumbnailKey(id: string, ext = 'jpg') {
    return this.objectKey('public-media', `thumbs/${id}.${ext}`);
  }

  clinicalImageKey(caseId: string, mediaId: string, ext = 'bin') {
    return this.objectKey('course-media', `clinical/${caseId}/${mediaId}.${ext}`);
  }

  mediaKey(id: string, ext = 'bin') {
    return this.objectKey('public-media', `library/${id}.${ext}`);
  }

  private aliases(key: string) {
    const ref = this.parseKey(key);
    return [key, ref.path, ref.key, join(ref.bucket, ref.path).replace(/\\/g, '/')];
  }

  private existingLocal(key: string) {
    for (const item of this.aliases(key)) {
      try {
        const full = this.absolute(item);
        require('node:fs').accessSync(full);
        return item;
      } catch {
        /* try next */
      }
    }
    return null;
  }

  private async localExists(key: string) {
    try {
      await stat(this.absolute(key));
      return true;
    } catch {
      const found = this.existingLocal(key);
      return Boolean(found);
    }
  }

  private async readLocal(key: string) {
    const { readFile } = await import('node:fs/promises');
    return readFile(this.absolute(this.existingLocal(key) ?? key));
  }

  private supabaseConfig() {
    const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    if (!url || !key) return null;
    return { url, key };
  }

  private async supabaseUpload(key: string, body: Buffer) {
    const cfg = this.supabaseConfig();
    if (!cfg) return;
    const ref = this.parseKey(key);
    const response = await fetch(`${cfg.url}/storage/v1/object/${ref.bucket}/${ref.path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        apikey: cfg.key,
        'Content-Type': 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: new Uint8Array(body),
    });
    if (!response.ok) {
      throw new Error(`Supabase upload failed: ${response.status}`);
    }
  }

  private async supabaseDownload(key: string) {
    const cfg = this.supabaseConfig();
    if (!cfg) return null;
    const ref = this.parseKey(key);
    const response = await fetch(`${cfg.url}/storage/v1/object/${ref.bucket}/${ref.path}`, {
      headers: { Authorization: `Bearer ${cfg.key}`, apikey: cfg.key },
    });
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  }

  private async supabaseHead(key: string) {
    const cfg = this.supabaseConfig();
    if (!cfg) return null;
    const ref = this.parseKey(key);
    const response = await fetch(`${cfg.url}/storage/v1/object/info/${ref.bucket}/${ref.path}`, {
      headers: { Authorization: `Bearer ${cfg.key}`, apikey: cfg.key },
    });
    if (!response.ok) return null;
    const length = response.headers.get('content-length');
    return length ? Number(length) : 0;
  }
}
