import { supabase } from './supabase';

export const BUCKETS = {
  PRODUCTS: 'products',      // public
  VTON: 'vton-uploads',      // private (signed URLs)
};

const MIME_TO_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_PRODUCT_BYTES = 5 * 1024 * 1024;
const MAX_VTON_BYTES = 10 * 1024 * 1024;
const DEFAULT_SIGNED_TTL = 60 * 60; // 1 hour

function validateImage(file, maxBytes) {
  if (!(file instanceof Blob)) throw new Error('A valid image file is required.');
  if (!MIME_TO_EXT[file.type]) throw new Error('Only JPG, PNG, or WebP images are allowed.');
  if (file.size > maxBytes) {
    throw new Error(`Image must be under ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }
}

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('You must be signed in to upload.');
  return session.user.id;
}

/** Admin only (enforced by Storage RLS). Returns { path, publicUrl }. */
export async function uploadProductImage(file, productId = 'unassigned') {
  validateImage(file, MAX_PRODUCT_BYTES);
  const path = `${productId}/${crypto.randomUUID()}.${MIME_TO_EXT[file.type]}`;

  const { error } = await supabase.storage.from(BUCKETS.PRODUCTS).upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKETS.PRODUCTS).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function deleteProductImage(path) {
  const { error } = await supabase.storage.from(BUCKETS.PRODUCTS).remove([path]);
  if (error) throw error;
}

/** Private temp photo stored under the user's own folder. Returns { path, signedUrl }. */
export async function uploadTryOnPhoto(file, expiresIn = DEFAULT_SIGNED_TTL) {
  validateImage(file, MAX_VTON_BYTES);
  const userId = await getUserId();
  const path = `${userId}/${crypto.randomUUID()}.${MIME_TO_EXT[file.type]}`;

  const { error } = await supabase.storage.from(BUCKETS.VTON).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;

  const signedUrl = await getTryOnSignedUrl(path, expiresIn);
  return { path, signedUrl };
}

export async function getTryOnSignedUrl(path, expiresIn = DEFAULT_SIGNED_TTL) {
  const { data, error } = await supabase.storage.from(BUCKETS.VTON).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

/** Call after the try-on finishes so user photos aren't kept longer than needed. */
export async function deleteTryOnPhoto(path) {
  const { error } = await supabase.storage.from(BUCKETS.VTON).remove([path]);
  if (error) throw error;
}
