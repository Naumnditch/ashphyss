/**
 * Signed UPLOAD-URL helper — the write-side counterpart to signedReceiptUrl
 * in this same directory. Mints a short-lived, single-object upload token
 * server-side (the service role key never leaves the server); the browser
 * then PUTs the file bytes directly to Supabase Storage using that token.
 *
 * This exists specifically to route around Vercel's serverless-function
 * request-body ceiling (~4.5MB, platform-wide, not configurable from this
 * app): a real scanned exam PDF or booklet routinely exceeds that, so
 * sending the file THROUGH our own API route — the original design —
 * silently broke for any file over the limit. Only this tiny JSON call
 * touches our function now; the actual bytes never do.
 */
export async function createSignedUploadUrl(bucket: string, path: string): Promise<{ signedUrl: string } | { error: string }> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return { error: 'Storage is not configured' };

  const res = await fetch(`${supabaseUrl}/storage/v1/object/upload/sign/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return { error: `Could not create a signed upload URL (HTTP ${res.status})${detail ? `: ${detail.slice(0, 200)}` : ''}` };
  }
  const data = (await res.json()) as { url?: string };
  if (!data.url) return { error: 'Signed upload response had no url' };
  return { signedUrl: `${supabaseUrl}/storage/v1${data.url}` };
}

export function publicStorageUrl(bucket: string, path: string): string {
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
