import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { isSupabaseConfigured } from './lib/config';
import SetupRequired from './components/SetupRequired';
import './index.css';

const root = createRoot(document.getElementById('root'));

// Check configuration before loading anything that imports Supabase, so a
// misconfigured build shows a clear message instead of a blank page.
if (!isSupabaseConfigured) {
  root.render(
    <StrictMode>
      <SetupRequired />
    </StrictMode>
  );
} else {
  import('./Root.jsx').then(({ default: Root }) => {
    root.render(
      <StrictMode>
        <Root />
      </StrictMode>
    );
  });
}
