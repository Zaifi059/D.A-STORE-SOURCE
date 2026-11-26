import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="border-t border-amber-500/20 bg-black py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 text-center">
        <Logo className="text-xl" />
        <p className="text-xs uppercase tracking-[0.3em] text-amber-400/80">Clothing &amp; Fashion</p>
        <p className="text-xs text-neutral-500">
          Dress Better · Live Stylish — © {new Date().getFullYear()} D.A STORE. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
