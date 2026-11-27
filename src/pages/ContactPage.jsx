import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { inputCls, labelCls, primaryBtnCls } from '../lib/ui';
import { getStoreInfo } from '../components/StoreInfo';

const EMPTY = { name: '', email: '', phone: '', message: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactPage() {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const info = getStoreInfo();

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.message.trim();
    if (!name || !message) return setError('Please add your name and a message.');
    if (!EMAIL_RE.test(email)) return setError('Please enter a valid email address.');

    setBusy(true);
    setError('');
    try {
      const { error: insertError } = await supabase.from('contact_messages').insert({
        name,
        email,
        phone: form.phone.trim() || null,
        message,
      });
      if (insertError) throw insertError;
      setSent(true);
      setForm(EMPTY);
    } catch (err) {
      setError(err.message || 'Could not send your message. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="lg:col-span-5"
      >
        <p className="mb-4 text-xs uppercase tracking-[0.4em] text-lime-400">Contact</p>
        <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl">Let's talk.</h1>
        <p className="mt-6 max-w-md leading-relaxed text-soft/60">
          Questions about sizing, stock, or an order? Send us a message and we'll get back to you.
        </p>

        {info.length > 0 && (
          <dl className="mt-10 space-y-5 border-t border-white/10 pt-8">
            {info.map((i) => (
              <div key={i.label}>
                <dt className="text-xs uppercase tracking-[0.2em] text-soft/40">{i.label}</dt>
                <dd className="mt-1 text-soft/85">
                  {i.href ? <a href={i.href} className="transition hover:text-lime-400">{i.value}</a> : i.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="lg:col-span-7"
      >
        {sent ? (
          <div className="rounded-3xl border border-lime-500/30 bg-teal-deep/40 p-10 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-lime-400" />
            <h2 className="mt-5 font-display text-3xl font-bold">Message sent</h2>
            <p className="mt-3 text-soft/60">Thank you for getting in touch. We'll reply to the email you provided.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button onClick={() => setSent(false)} className="rounded-full border border-white/15 px-5 py-2.5 text-sm hover:border-lime-500/60">
                Send another
              </button>
              <Link to="/shop" className="rounded-full bg-lime-500 px-5 py-2.5 text-sm font-semibold text-midnight">
                Browse the shop
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-5 rounded-3xl border border-white/10 bg-teal-deep/30 p-6 sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="c-name" className={labelCls}>Name</label>
                <input id="c-name" autoComplete="name" value={form.name} onChange={set('name')} className={inputCls} required />
              </div>
              <div>
                <label htmlFor="c-email" className={labelCls}>Email</label>
                <input id="c-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} className={inputCls} required />
              </div>
            </div>
            <div>
              <label htmlFor="c-phone" className={labelCls}>Phone (optional)</label>
              <input id="c-phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} className={inputCls} />
            </div>
            <div>
              <label htmlFor="c-message" className={labelCls}>Message</label>
              <textarea id="c-message" rows={6} value={form.message} onChange={set('message')} className={inputCls} required />
            </div>

            {error && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

            <button type="submit" disabled={busy} className={primaryBtnCls}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send message
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
