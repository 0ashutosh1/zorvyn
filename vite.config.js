import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const isRender = Boolean(process.env.RENDER)

export default defineConfig({
  base: isRender ? '/' : '/zorvyn/',
  plugins: [react()],
  esbuild: {
    jsx: 'automatic',
  },
})
