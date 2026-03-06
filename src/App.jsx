import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import Login from './components/auth/Login'
import SubadminDashboard from "./components/subadmin/SubadminDashboard"

// Admin
import AdminDashboard from './components/admin/AdminDashboard'
import GestionSedes from './components/admin/GestionSedes'
import GestionUsuarios from './components/admin/GestionUsuarios'
import GestionAmbulancias from './components/admin/GestionAmbulancias'
import GestionInsumos from './components/admin/GestionInsumos'

// Paramedico
import ParamedicoDashboard from './components/paramedico/ParamedicoDashboard'
import InicioGuardia from './components/paramedico/InicioGuardia'
import CierreGuardia from './components/paramedico/CierreGuardia'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        ⛑️ Cargando...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" />

  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/login" />
  }

  return children
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* LOGIN */}
          <Route path="/login" element={<Login />} />

          {/* ================= ADMIN ================= */}

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/sedes"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <GestionSedes />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/usuarios"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <GestionUsuarios />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/ambulancias"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <GestionAmbulancias />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/insumos"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <GestionInsumos />
              </ProtectedRoute>
            }
          />

          {/* ================= SUBADMIN ================= */}

          <Route
            path="/subadmin"
            element={
              <ProtectedRoute allowedRoles={['SUBADMIN']}>
                <SubadminDashboard />
              </ProtectedRoute>
            }
          />

          {/* ================= PARAMEDICO ================= */}

          <Route
            path="/paramedico"
            element={
              <ProtectedRoute allowedRoles={['PARAMEDICO', 'SUBADMIN', 'ADMIN']}>
                <ParamedicoDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/paramedico/equipo"
            element={
              <ProtectedRoute allowedRoles={['PARAMEDICO']}>
                <InicioGuardia />
              </ProtectedRoute>
            }
          />

          <Route
            path="/paramedico/insumos"
            element={
              <ProtectedRoute allowedRoles={['PARAMEDICO']}>
                <CierreGuardia />
              </ProtectedRoute>
            }
          />

          {/* DEFAULT */}
          <Route path="/" element={<Navigate to="/login" />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App