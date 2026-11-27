import { useEffect, useState } from 'react';
import { ImagePlus, Loader2, ShoppingBag, Sparkles, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { deleteTryOnPhoto, uploadTryOnPhoto } from '../lib/storage';

async function readFunctionError(error) {
  try {
    const body = await error.context.json();
    return body.error ?? error.message;
  } catch {
    return error.message;
  }
}

/** Mount conditionally ({open && <VirtualTryOnModal …/>}) so state resets on close. */
export default function VirtualTryOnModal({ product, onClose, onAddToCart }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [status, setStatus] = useState('idle'); // idle | uploading | generating | done | error
  const [resultUrl, setResultUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) return setPreview('');
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const busy = status === 'uploading' || status === 'generating';

  const generate = async () => {
    if (!file || !product.image_url) return;
    setError('');
    setStatus('uploading');
    let uploadedPath = null;
    try {
      const { path, signedUrl } = await uploadTryOnPhoto(file);
      uploadedPath = path;

      setStatus('generating');
      const { data, error: fnError } = await supabase.functions.invoke('fashn-tryon', {
        body: {
          model_image: signedUrl,
          garment_image: product.image_url,
          category: product.vton_category,
        },
      });
      if (fnError) throw new Error(await readFunctionError(fnError));
      if (!data?.image_url) throw new Error('No image was returned. Please try again.');

      setResultUrl(data.image_url);
      setStatus('done');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    } finally {
      if (uploadedPath) deleteTryOnPhoto(uploadedPath).catch(() => {}); // best-effort cleanup of the user's photo
    }
  };

  const reset = () => {
    setFile(null);
    setResultUrl('');
    setError('');
    setStatus('idle');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Virtual try-on">
      <div className="absolute inset-0 bg-black/80" onClick={busy ? undefined : onClose} />
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-lime-500/30 bg-neutral-950 p-5 shadow-2xl">
        <button onClick={onClose} disabled={busy} className="absolute right-4 top-4 disabled:opacity-30" aria-label="Close">
          <X className="h-6 w-6" />
        </button>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-lime-400" /> Virtual Try-On
        </h2>
        <p className="mt-1 text-sm text-neutral-400">{product.name}</p>

        <div className="mt-4">
          {status === 'done' ? (
            <div className="space-y-4">
              <img src={resultUrl} alt={`You wearing ${product.name}`} className="mx-auto max-h-[55vh] rounded-lg" />
              <div className="flex gap-3">
                <button
                  onClick={() => { onAddToCart(); onClose(); }}
                  disabled={product.stock_count <= 0}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-lime-500 py-3 font-semibold text-black hover:bg-lime-400 disabled:opacity-40"
                >
                  <ShoppingBag className="h-4 w-4" /> Add to Cart
                </button>
                <button onClick={reset} className="rounded-full border border-neutral-700 px-5 py-3 text-sm hover:border-lime-500">
                  Try another photo
                </button>
              </div>
            </div>
          ) : busy ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-lime-400" />
              <p>{status === 'uploading' ? 'Uploading your photo…' : 'Generating your look… this can take up to a minute.'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-700 p-4 text-center hover:border-lime-500">
                {preview ? (
                  <img src={preview} alt="Your photo" className="max-h-64 rounded" />
                ) : (
                  <>
                    <ImagePlus className="h-10 w-10 text-lime-400" />
                    <span className="text-sm">Upload a full-body photo (JPG, PNG or WebP, up to 10 MB)</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(''); setStatus('idle'); }}
                />
              </label>
              {!product.image_url && <p className="text-sm text-red-400">This product has no image to try on.</p>}
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                onClick={generate}
                disabled={!file || !product.image_url}
                className="w-full rounded-full bg-lime-500 py-3 font-semibold text-black hover:bg-lime-400 disabled:opacity-40"
              >
                Generate Try-On
              </button>
              <p className="text-xs text-neutral-500">Your photo is used only to create this preview and is deleted right after.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
