import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import IdleRPG from './idle-rpg-fixed.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <IdleRPG />
  </StrictMode>
)
