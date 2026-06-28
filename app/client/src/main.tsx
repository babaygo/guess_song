import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { MentionsLegales } from './pages/MentionsLegales'
import { CGU } from './pages/CGU'
import { Confidentialite } from './pages/Confidentialite'
import { CookieConsent } from './components/CookieConsent'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<App />} path="/" />
        <Route element={<MentionsLegales />} path="/mentions-legales" />
        <Route element={<CGU />} path="/cgu" />
        <Route element={<Confidentialite />} path="/confidentialite" />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
      <CookieConsent />
    </HashRouter>
  </StrictMode>,
)
