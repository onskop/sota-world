import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './data/**/*.{md,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        midnight: '#020617',
        electric: '#38bdf8',
        sunrise: '#f97316',
      },
      fontFamily: {
        display: ['"Poppins"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
