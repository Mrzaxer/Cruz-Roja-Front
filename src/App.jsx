import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './components/auth/Login'
import ParamedicoDashboard from './components/paramedico/ParamedicoDashboard'
import AdminDashboard from './components/admin/AdminDashboard'
import GestionSedes from './components/admin/GestionSedes'
import GestionUsuarios from './components/admin/GestionUsuarios'
import GestionAmbulancias from './components/admin/GestionAmbulancias'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f3f4f6'
    }}>
      <div style={{ fontSize: '3rem', animation: 'spin 1s linear infinite' }}>⛑️</div>
    </div>
  }

  if (!user) {
    return <Navigate to="/login" />
  }

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
          <Route path="/login" element={<Login />} />
          
          {/* Rutas de Admin */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/sedes" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <GestionSedes />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/usuarios" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <GestionUsuarios />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/ambulancias" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <GestionAmbulancias />
            </ProtectedRoute>
          } />
          
          {/* Rutas de Paramedico */}
          <Route path="/paramedico/*" element={
            <ProtectedRoute allowedRoles={['PARAMEDICO', 'SUBADMIN', 'ADMIN']}>
              <ParamedicoDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </AuthProvider>
  )
}

export default App