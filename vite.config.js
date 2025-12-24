import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Questo permette di accedere al server di sviluppo da qualsiasi IP/Host
    host: true,
    // Questo disabilita il blocco di sicurezza sugli host (risolve l'errore "Blocked request")
    allowedHosts: true
  }
})