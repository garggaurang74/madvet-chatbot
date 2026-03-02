import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        madvet: {
          primary: '#1a6b3c',
          accent: '#e8f5e9',
        },
      },
      fontFamily: {
        sans: ['var(--font-noto-sans)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
