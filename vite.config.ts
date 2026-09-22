import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// On GitHub Pages the app is served from https://<user>.github.io/<repo>/, so every
// asset URL needs that repo prefix. The deploy workflow sets VITE_BASE to "/<repo>/".
// Locally (and for a user/org page served from the domain root) "/" is correct.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
})
