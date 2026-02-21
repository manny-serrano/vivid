import { storageClient } from '../config/gcp.js';
import { env } from '../config/env.js';

/**
 * Uploads a report PDF (or other buffer) to Google Cloud Storage and
 * returns the public URL of the uploaded object.
 *
 * @param userId       - The user the report belongs to.
 * @param reportBuffer - Raw file contents.
 * @param filename     - Desired filename (e.g. `report-2026-02.pdf`).
 * @returns The public GCS URL for the uploaded file.
 */
export async function uploadReport(
  userId: string,
  reportBuffer: Buffer,
  filename: string,
): Promise<string> {
  const bucket = storageClient.bucket(env.GCS_BUCKET_REPORTS);
  const objectPath = `reports/${userId}/${filename}`;
  const file = bucket.file(objectPath);

  await file.save(reportBuffer, {
    metadata: {
      contentType: inferContentType(filename),
      metadata: { userId },
    },
    resumable: false,
  });

  return `https://storage.googleapis.com/${env.GCS_BUCKET_REPORTS}/${objectPath}`;
}

/**
 * Generates a time-limited signed URL for downloading a report from GCS.
 *
 * @param filename - The full object path within the bucket (e.g. `reports/{userId}/file.pdf`).
 * @returns A signed URL valid for 15 minutes.
 */
export async function getReportUrl(filename: string): Promise<string> {
  const bucket = storageClient.bucket(env.GCS_BUCKET_REPORTS);
  const file = bucket.file(filename);

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000,
  });

  return url;
}

function inferContentType(filename: string): string {
  if (filename.endsWith('.pdf')) return 'application/pdf';
  if (filename.endsWith('.json')) return 'application/json';
  if (filename.endsWith('.csv')) return 'text/csv';
  return 'application/octet-stream';
}
