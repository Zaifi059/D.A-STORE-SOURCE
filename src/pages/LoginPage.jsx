import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { inputCls, labelCls, primaryBtnCls } from '../lib/ui';

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
    <div className="mx-auto max-w-sm py-8">
      <p className="mb-3 text-center text-xs uppercase tracking-[0.4em] text-lime-400">Account</p>
      <h1 className="mb-8 text-center font-display text-4xl font-bold">
        {mode === 'login' ? 'Welcome back' : 'Create your account'}
      </h1>
      <form onSubmit={submit} className="space-y-4 rounded-3xl border border-white/10 bg-teal-deep/30 p-6">
        {mode === 'signup' && (
          <>
            <div>
              <label htmlFor="l-name" className={labelCls}>Full name</label>
              <input id="l-name" required autoComplete="name" value={form.fullName} onChange={set('fullName')} className={inputCls} />
            </div>
            <div>
              <label htmlFor="l-phone" className={labelCls}>Phone</label>
              <input id="l-phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} className={inputCls} />
            </div>
          </>
        )}
        <div>
          <label htmlFor="l-email" className={labelCls}>Email</label>
          <input id="l-email" required type="email" autoComplete="email" value={form.email} onChange={set('email')} className={inputCls} />
        </div>
        <div>
          <label htmlFor="l-password" className={labelCls}>Password</label>
          <input
            id="l-password"
            required
            type="password"
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={form.password}
            onChange={set('password')}
            className={inputCls}
          />
        </div>

        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        {info && <p role="status" className="text-sm text-lime-400">{info}</p>}

        <button type="submit" disabled={busy} className={primaryBtnCls}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {mode === 'login' ? 'Login' : 'Sign up'}
        </button>
      </form>
      <button
        onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setInfo(''); }}
        className="mt-5 w-full text-center text-sm text-soft/50 transition hover:text-lime-400"
      >
        {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Login'}
      </button>
    </div>
  );
}
