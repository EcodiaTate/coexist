import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'

const HomePage = lazy(() => import('@/pages/home'))

function App() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-neutral-50" />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </Suspense>
  )
}

export default App
