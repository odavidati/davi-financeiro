import { useState } from 'react'
import { AppProvider } from './context/AppContext'
import BottomNav from './components/BottomNav'
import ImpulseOverlay from './components/ImpulseOverlay'
import Home from './components/screens/Home'
import Gastos from './components/screens/Gastos'
import Analise from './components/screens/Analise'
import Metas from './components/screens/Metas'
import Config from './components/screens/Config'

function AppContent() {
  const [tab, setTab]                 = useState('home')
  const [showImpulse, setShowImpulse] = useState(false)

  return (
    <div className="app">
      {showImpulse && (
        <ImpulseOverlay onClose={() => setShowImpulse(false)} />
      )}

      {tab === 'home'    && <Home onImpulse={() => setShowImpulse(true)} />}
      {tab === 'gastos'  && <Gastos />}
      {tab === 'analise' && <Analise />}
      {tab === 'metas'   && <Metas />}
      {tab === 'config'  && <Config />}

      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
