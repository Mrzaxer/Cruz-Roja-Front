import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import '../../styles/admin.css'

export default function AdminLayout({ children, titulo, subtitulo }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const currentPath = window.location.pathname

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menu = [
    { nombre: 'Dashboard', icono: '📊', path: '/admin' },
    { nombre: 'Sedes', icono: '🏢', path: '/admin/sedes' },
    { nombre: 'Usuarios', icono: '👥', path: '/admin/usuarios' },
    { nombre: 'Ambulancias', icono: '🚑', path: '/admin/ambulancias' },
    { nombre: 'Insumos', icono: '💊', path: '/admin/insumos' },
    { nombre: 'Reportes', icono: '📈', path: '/admin/reportes' },
  ]

  return (
    <div className="admin-container">
      <div className="admin-top-bar"></div>

      <header className="admin-header">
        <div className="admin-header-content">
          <div className="header-top">
            <div className="logo-area">
              <div className="admin-logo">
                <span>⛑️</span>
              </div>
              <div className="logo-text">
                <h1>CRUZ ROJA</h1>
                <p>ADMIN</p>
              </div>
            </div>

            <div className="user-area">
              <div className="user-info">
                <p className="name">{user?.nombre || 'Administrador Sistema'}</p>
                <p className="role">Administrador</p>
              </div>
              <button onClick={handleLogout} className="btn-logout">
                <span>🚪</span>
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>

          <nav className="admin-nav">
            {menu.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`nav-item ${currentPath === item.path ? 'active' : 'inactive'}`}
              >
                <span>{item.icono}</span>
                <span>{item.nombre}</span>
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="admin-main">
        <div className="page-header">
          <h2>{titulo}</h2>
          {subtitulo && <p>{subtitulo}</p>}
        </div>

        {children}
      </main>
    </div>
  )
}