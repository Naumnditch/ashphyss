/**
 * Client-side counterpart to lib/storage/signedUpload.ts — PUTs a File
 * directly to a Supabase Storage signed-upload URL, never touching our own
 * Vercel function with the actual bytes (see that file for why).
 *
 * The apikey below is Supabase's PUBLIC "publishable" key for this project
 * (fetched via the Supabase dashboard/API, not a secret). It identifies the
 * project to the API gateway and carries no bucket permissions on its own —
 * the signed token embedded in the URL is what actually authorizes this
 * specific write. Shipping this key in client code is the intended,
 * standard use of a publishable key, the same as any Supabase anon key in
 * any browser app; it is not equivalent to exposing the service role key,
 * which never leaves the server.
 */
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ErMPHrHNjnj-9MFC3IGUyA_KqZ7owcy';

export async function putFileToSignedUrl(signedUrl: string, file: File): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': file.type || 'application/pdf',
        'x-upsert': 'true',
      },
      body: file,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, error: `storage rejected the upload (HTTP ${res.status})${detail ? `: ${detail.slice(0, 200)}` : ''}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? `could not reach storage: ${e.message}` : 'could not reach storage' };
  }
}
