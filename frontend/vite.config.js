import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Expose VITE_ prefixed env variables to the frontend bundle
  // Set VITE_API_URL in Vercel dashboard to your Railway backend URL
})
