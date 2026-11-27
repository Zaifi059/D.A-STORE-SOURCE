/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#04090D',
        teal: { DEFAULT: '#284444', deep: '#162626' },
        soft: '#E4E4EA',
        // Electric lime brand accent. Overrides Tailwind's default lime scale.
        lime: { 300: '#B4F59A', 400: '#8DEE63', 500: '#70E73C', 600: '#56C226' },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        lime: '0 0 32px -4px rgba(112, 231, 60, 0.45)',
        float: '0 40px 80px -20px rgba(0, 0, 0, 0.9), 0 0 120px -30px rgba(40, 68, 68, 0.8)',
      },
      keyframes: {
        drift: { '0%,100%': { transform: 'translate3d(0,0,0)' }, '50%': { transform: 'translate3d(0,-12px,0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        drift: 'drift 7s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
      },
    },
  },
  plugins: [],
};
