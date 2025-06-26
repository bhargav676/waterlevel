import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [react(),tailwindcss()],
  // server: {
  //   host: '0.0.0.0',
  //   port: 5173, 
  // },
  theme: { 
    extend: {
      fontFamily: { 
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  colors: {
    charcoal: 'var(--charcoal)',
    emerald: 'var(--emerald)',
    'emerald-dark': 'var(--emerald-dark)',
    'emerald-light': 'var(--emerald-light)',
    slate: 'var(--slate)',
  },
  build: {
    chunkSizeWarningLimit: 1000, 
  },
})
