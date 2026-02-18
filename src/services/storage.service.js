/**
 * Supabase Storage: upload (stream/file), removeMany, signed URL.
 * Streams to /tmp then uploads (no in-memory file size limit in app).
 */
import { createReadStream } from 'fs';
import { readFile, unlink } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { supabase, getStorageBucket } from '../config/supabase.js';

const bucket = () => getStorageBucket();

/**
 * Upload from stream: stream to temp file, then upload (Buffer); temp file deleted after.
 */
export async function uploadStream({ path: storagePath, stream, contentType }) {
  const tmpPath = join(tmpdir(), `tohuanti-${randomUUID()}`);
  const writeStream = createWriteStream(tmpPath);
  try {
    await pipeline(stream, writeStream);
  } finally {
    writeStream.destroy();
  }
  try {
    const buffer = await readFile(tmpPath);
    const { data, error } = await supabase.storage
      .from(bucket())
      .upload(storagePath, buffer, { contentType, upsert: true });
    if (error) throw error;
    return { path: data.path };
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

/**
 * Upload from file path (e.g. multer temp file).
 */
export async function uploadFile({ path: storagePath, filePath, contentType }) {
  const stream = createReadStream(filePath);
  return uploadStream({ path: storagePath, stream, contentType });
}

/**
 * Delete multiple objects. Best-effort.
 */
export async function removeMany({ paths }) {
  if (!paths?.length) return;
  const { error } = await supabase.storage.from(bucket()).remove(paths);
  if (error) throw error;
}

/**
 * Create a signed URL for download.
 */
export async function createSignedUrl({ path, expiresIn }) {
  const { data, error } = await supabase.storage.from(bucket()).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return { url: data.signedUrl };
}

export default { uploadStream, uploadFile, removeMany, createSignedUrl };
