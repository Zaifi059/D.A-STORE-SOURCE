import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Radio, Sparkles, Shirt } from 'lucide-react';
import { getStoreInfo } from '../components/StoreInfo';

const PILLARS = [
  { icon: Shirt, title: 'Curated for menswear', body: 'A focused edit of suits, shirts and shoes, shown up close so you can judge the cut before you buy.' },
  { icon: Radio, title: 'Stock you can trust', body: 'Availability updates live. If a piece is low or sold out, you see it before you add it to your cart.' },
  { icon: Sparkles, title: 'See it on you first', body: 'Virtual try-on lets you preview a garment on a photo of yourself before you commit.' },
];

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function AboutPage() {
  const info = getStoreInfo();

  return (
    <div className="space-y-24">
      <motion.section {...fade()} className="max-w-4xl">
        <p className="mb-5 text-xs uppercase tracking-[0.4em] text-lime-400">About D.A STORE</p>
        <h1 className="font-display text-[clamp(3rem,8vw,6.5rem)] font-bold leading-[0.92] tracking-tight">
          Dress better.<br /> <span className="text-lime-500">Live stylish.</span>
        </h1>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-soft/65">
          D.A STORE is a men's clothing and fashion brand. We're building a digital home for modern menswear: a considered
          edit of pieces, presented clearly, with prices in PKR and stock that stays current.
        </p>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-3">
        {PILLARS.map((p, i) => {
          const Icon = p.icon;
          return (
            <motion.div key={p.title} {...fade(i * 0.1)} className="rounded-3xl border border-white/10 bg-teal-deep/40 p-7 transition duration-500 hover:border-lime-500/40">
              <Icon className="h-7 w-7 text-lime-400" />
              <h2 className="mt-6 font-display text-2xl font-bold">{p.title}</h2>
              <p className="mt-3 leading-relaxed text-soft/55">{p.body}</p>
            </motion.div>
          );
        })}
      </section>

      <motion.section {...fade()} className="flex flex-col items-start justify-between gap-8 rounded-3xl border border-white/10 bg-gradient-to-br from-teal/40 to-midnight p-8 sm:flex-row sm:items-center sm:p-12">
        <div>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Start with the collection.</h2>
          <p className="mt-3 text-soft/60">Browse everything we have, or start with the newest arrivals.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/shop" className="inline-flex items-center gap-1.5 rounded-full bg-lime-500 px-6 py-3 font-semibold text-midnight shadow-lime transition hover:bg-lime-400">
            Shop now <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link to="/new-arrivals" className="rounded-full border border-white/15 px-6 py-3 font-medium transition hover:border-lime-500/60 hover:text-lime-400">
            New arrivals
          </Link>
        </div>
      </motion.section>

      {info.length > 0 && (
        <section className="grid gap-8 border-t border-white/10 pt-12 sm:grid-cols-2 lg:grid-cols-4">
          {info.map((i) => (
            <div key={i.label}>
              <p className="text-xs uppercase tracking-[0.2em] text-soft/40">{i.label}</p>
              <p className="mt-2 text-soft/85">{i.href ? <a href={i.href} className="hover:text-lime-400">{i.value}</a> : i.value}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
