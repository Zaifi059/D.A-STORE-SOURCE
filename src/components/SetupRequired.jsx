import { Settings } from 'lucide-react';
import { missingSupabaseEnv } from '../lib/config';

/** Shown instead of a blank page when the build was made without Supabase settings. */
export default function SetupRequired({ missing = missingSupabaseEnv }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-midnight p-6 text-soft">
      <div className="max-w-lg rounded-3xl border border-white/10 bg-teal-deep/40 p-8">
        <Settings className="h-10 w-10 text-lime-400" />
        <h1 className="mt-5 font-display text-3xl font-bold">Store setup needed</h1>
        <p className="mt-3 leading-relaxed text-soft/60">
          This build is missing the Supabase settings it needs to load products. Add the variables below in your
          hosting environment (for Netlify: Site configuration → Environment variables), then trigger a fresh deploy.
          Variables are read at build time, so a redeploy is required.
        </p>
        <ul className="mt-5 space-y-2 font-mono text-sm">
          {missing.map((name) => (
            <li key={name} className="rounded-lg border border-white/10 bg-midnight/60 px-3 py-2 text-lime-400">
              {name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
