import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { WalletProvider } from './lib/wallet'
import { ToastProvider } from './lib/toast'
import { SoundProvider } from './lib/sound'
import { FavoritesProvider, RecentProvider } from './lib/favorites'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WalletProvider>
      <ToastProvider>
        <SoundProvider>
          <FavoritesProvider>
            <RecentProvider>
              <App />
            </RecentProvider>
          </FavoritesProvider>
        </SoundProvider>
      </ToastProvider>
    </WalletProvider>
  </React.StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // A demo continua funcional sem cache offline.
    })
  })
}
