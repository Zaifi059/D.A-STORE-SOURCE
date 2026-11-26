import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const inputCls =
  'w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none';

export default function LoginPage() {
  const { user, signIn, signUp } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (user) return <Navigate to={location.state?.from?.pathname ?? '/'} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      if (mode === 'login') {
        await signIn(form.email.trim(), form.password);
      } else {
        const data = await signUp({
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
        });
        if (!data.session) setInfo('Check your email to confirm your account, then log in.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="mb-6 text-center font-serif text-2xl font-bold">
        {mode === 'login' ? 'Welcome back' : 'Create your account'}
      </h1>
      <form onSubmit={submit} className="space-y-3">
        {mode === 'signup' && (
          <>
            <input required placeholder="Full name" value={form.fullName} onChange={set('fullName')} className={inputCls} />
            <input type="tel" placeholder="Phone" value={form.phone} onChange={set('phone')} className={inputCls} />
          </>
        )}
        <input required type="email" placeholder="Email" value={form.email} onChange={set('email')} className={inputCls} />
        <input required type="password" minLength={6} placeholder="Password" value={form.password} onChange={set('password')} className={inputCls} />

        {error && <p className="text-sm text-red-400">{error}</p>}
        {info && <p className="text-sm text-amber-400">{info}</p>}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-2.5 font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {mode === 'login' ? 'Login' : 'Sign up'}
        </button>
      </form>
      <button
        onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setInfo(''); }}
        className="mt-4 w-full text-center text-sm text-neutral-400 hover:text-amber-400"
      >
        {mode === 'login' ? "New here? Create an account" : 'Already have an account? Login'}
      </button>
    </div>
  );
}
