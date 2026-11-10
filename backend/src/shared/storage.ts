import { promises as fs, createReadStream } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env';

// Storage backend for uploaded evidence. Keys look like `incidents/<file>`. Objects are
// never publicly readable in either driver: they are only streamed through the API's
// authorized /uploads route.
export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ stream: Readable; contentType?: string; size?: number } | null>;
  delete(key: string): Promise<void>;
}

const CONTENT_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
export const contentTypeFor = (key: string) => CONTENT_TYPES[path.extname(key).slice(1).toLowerCase()] || 'application/octet-stream';

class LocalStorage implements StorageDriver {
  private readonly root = path.resolve(process.cwd(), env.UPLOAD_DIR);

  private resolve(key: string) {
    const target = path.resolve(this.root, key);
    // Defence in depth against traversal, on top of strict file-name validation upstream.
    if (!target.startsWith(this.root + path.sep)) throw new Error('Invalid storage key');
    return target;
  }

  async put(key: string, body: Buffer) {
    const target = this.resolve(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body, { flag: 'wx' });
  }

  async get(key: string) {
    const target = this.resolve(key);
    try {
      const stat = await fs.stat(target);
      if (!stat.isFile()) return null;
      return { stream: createReadStream(target), contentType: contentTypeFor(key), size: stat.size };
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    try {
      await fs.unlink(this.resolve(key));
    } catch {
      // already gone
    }
  }
}

class S3Storage implements StorageDriver {
  private readonly client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: Boolean(env.S3_ENDPOINT),
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! },
  });
  private readonly bucket = env.S3_BUCKET!;

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ServerSideEncryption: env.S3_ENDPOINT ? undefined : 'AES256', // R2/Spaces encrypt at rest by default
      })
    );
  }

  async get(key: string) {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!result.Body) return null;
      return { stream: result.Body as Readable, contentType: result.ContentType, size: result.ContentLength };
    } catch (error: any) {
      if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) return null;
      throw error;
    }
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export const storage: StorageDriver = env.STORAGE_DRIVER === 's3' ? new S3Storage() : new LocalStorage();
