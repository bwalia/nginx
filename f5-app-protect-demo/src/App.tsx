import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Architecture } from './pages/Architecture'
import { Home } from './pages/Home'
import { Lab } from './pages/Lab'
import { Policies } from './pages/Policies'
import { Walkthrough } from './pages/Walkthrough'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="walkthrough" element={<Walkthrough />} />
          <Route path="lab" element={<Lab />} />
          <Route path="policies" element={<Policies />} />
          <Route path="architecture" element={<Architecture />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
