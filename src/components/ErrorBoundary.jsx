import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Application render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main role="alert" className="flex min-h-screen items-center justify-center bg-[#080d14] px-4 text-slate-100">
          <div className="max-w-md rounded-2xl border border-slate-800 bg-[#111923] p-8 text-center">
            <h1 className="text-xl font-semibold">This page could not be displayed</h1>
            <p className="mt-2 text-sm text-slate-400">The error has been recorded. Reload the page to try again.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400"
            >
              Reload page
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
