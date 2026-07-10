import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { writeFile, readFile, readdir, unlink, mkdir } from 'fs/promises'
import { join } from 'path'

const LOCAL_ARCHIVE_DIR = '/tmp/archives'

interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
}

function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucketName = process.env.R2_BUCKET_NAME
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) return null
  return { accountId, accessKeyId, secretAccessKey, bucketName }
}

function createS3Client(config: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

export function isR2Configured(): boolean {
  return getR2Config() !== null
}

export async function uploadArchive(
  key: string,
  data: Buffer,
): Promise<{ provider: string }> {
  const config = getR2Config()
  if (config) {
    const client = createS3Client(config)
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        Body: data,
        ContentType: 'application/json',
      }),
    )
    return { provider: 'r2' }
  }
  // Local fallback
  await mkdir(LOCAL_ARCHIVE_DIR, { recursive: true })
  const filePath = join(LOCAL_ARCHIVE_DIR, key.replace(/\//g, '_'))
  await writeFile(filePath, data)
  return { provider: 'local' }
}

export async function downloadArchive(key: string): Promise<Buffer> {
  const config = getR2Config()
  if (config) {
    const client = createS3Client(config)
    const response = await client.send(
      new GetObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      }),
    )
    const stream = response.Body
    if (!stream) throw new Error('Empty response from R2')
    const chunks: Uint8Array[] = []
    // @ts-expect-error - stream is async iterable in Node.js
    for await (const chunk of stream) {
      chunks.push(chunk as Uint8Array)
    }
    return Buffer.concat(chunks)
  }
  // Local fallback
  const filePath = join(LOCAL_ARCHIVE_DIR, key.replace(/\//g, '_'))
  return readFile(filePath)
}

export async function listArchives(prefix?: string): Promise<string[]> {
  const config = getR2Config()
  if (config) {
    const client = createS3Client(config)
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucketName,
        Prefix: prefix,
      }),
    )
    return (response.Contents ?? []).map((obj) => obj.Key ?? '').filter(Boolean)
  }
  // Local fallback
  try {
    const files = await readdir(LOCAL_ARCHIVE_DIR)
    if (prefix) {
      return files.filter((f) => f.startsWith(prefix.replace(/\//g, '_')))
    }
    return files
  } catch {
    return []
  }
}

export async function deleteArchive(key: string): Promise<void> {
  const config = getR2Config()
  if (config) {
    const client = createS3Client(config)
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      }),
    )
    return
  }
  // Local fallback
  const filePath = join(LOCAL_ARCHIVE_DIR, key.replace(/\//g, '_'))
  await unlink(filePath)
}
