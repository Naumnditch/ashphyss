/**
 * Signed-URL helper for private storage buckets (e.g. `receipts`,
 * `video-request-screenshots`).
 *
 * Payment receipts and video-request screenshots both carry information
 * that shouldn't be reachable by a guessable public URL, so those buckets
 * are deliberately private. Admin views go through short-lived signed
 * links generated server-side instead.
 */
export async function signedFileUrl(bucket: string, path: string, expiresIn = 600): Promise<string | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || !path) return null;
  const res = await fetch(`${supabaseUrl}/storage/v1/object/sign/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.signedURL ? `${supabaseUrl}/storage/v1${data.signedURL}` : null;
}

export async function signedReceiptUrl(path: string, expiresIn = 600): Promise<string | null> {
  return signedFileUrl('receipts', path, expiresIn);
}
