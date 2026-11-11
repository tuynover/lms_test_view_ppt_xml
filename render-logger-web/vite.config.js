import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './', // Đường dẫn tương đối để tương thích 100% với GitHub Pages subpath
  plugins: [react(), tailwindcss()],
})
