import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

async function bootstrap() {
  if (import.meta.env.DEV) {
    try {
      const { installTauriBrowserMocks } = await import('./dev/tauriBrowserMocks')
      installTauriBrowserMocks()
    } catch (e) {
      console.error('Failed to install browser Tauri mocks:', e)
    }
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

bootstrap()
