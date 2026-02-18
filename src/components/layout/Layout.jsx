import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Layout({ children, titulo }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getRolNombre = (rol) => {
    switch(rol) {
      case 'ADMIN': return 'Administrador'
      case 'SUBADMIN': return 'Subadministrador'
      case 'PARAMEDICO': return 'Paramédico'
      default: return rol
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar superior */}
      <nav className="bg-gradient-to-r from-red-700 to-red-600 text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo y título */}
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🚑</span>
              <div>
                <h1 className="font-bold text-lg">Cruz Roja Costarricense</h1>
                <p className="text-xs text-red-100">Sistema de Control de Ambulancias</p>
              </div>
            </div>

            {/* Info del usuario */}
            <div className="flex items-center space-x-4">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium">{user?.nombre}</p>
                <p className="text-xs text-red-200">{getRolNombre(user?.rol)}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-800 hover:bg-red-900 px-4 py-2 rounded-lg text-sm transition flex items-center space-x-2"
              >
                <span>🚪</span>
                <span className="hidden md:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Título de página */}
      {titulo && (
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <h2 className="text-xl font-bold text-gray-800">{titulo}</h2>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-4 text-center text-sm text-gray-500">
        <p>© 2026 Cruz Roja Costarricense - Versión 1.0</p>
      </footer>
    </div>
  )
}