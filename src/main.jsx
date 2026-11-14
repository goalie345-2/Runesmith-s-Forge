import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import{ ResolutionLock } from './ResolutionLock.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ResolutionLock>
      <App />
    </ResolutionLock>
  </StrictMode>,
)
