import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import '../../styles/SubadminLayout.css'
import logo from '../../assets/imagenes/logo.jpg'

export default function SubadminLayout({ children, titulo, subtitulo }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const currentPath = window.location.pathname

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menu = [
    { nombre: 'Dashboard', icono: '📊', path: '/subadmin' },
    { nombre: 'Insumos', icono: '📦', path: '/subadmin/insumos' },
    { nombre: 'Ambulancias', icono: '🚑', path: '/subadmin/ambulancias' },
    { nombre: 'Reportes', icono: '📈', path: '/subadmin/reportes' },
  ]

  return (
    <div className="subadmin-layout-container">
      {/* Barra superior roja */}
      <div className="subadmin-top-bar"></div>

      {/* Header */}
      <header className="subadmin-header">
        <div className="subadmin-header-content">
          <div className="subadmin-header-top">
            {/* Logo y título */}
            <div className="subadmin-logo-area">
              <div className="subadmin-logo">
                <img src={logo} alt="Logo Cruz Roja" />
              </div>
              <div className="subadmin-logo-text">
                <h1>CRUZ ROJA</h1>
                <p>SUBADMIN</p>
              </div>
            </div>

            {/* Área de usuario */}
            <div className="subadmin-user-area">
              <div className="subadmin-user-info">
                <p className="subadmin-user-name">{user?.nombre || 'Subadministrador'}</p>
                <p className="subadmin-user-role">{user?.sede_nombre || 'Sede'}</p>
              </div>
              <button onClick={handleLogout} className="subadmin-btn-logout">
                <span>🚪</span>
                <span>Salir</span>
              </button>
            </div>
          </div>

          {/* Navegación */}
          <nav className="subadmin-nav">
            {menu.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`subadmin-nav-item ${currentPath === item.path ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icono}</span>
                <span className="nav-text">{item.nombre}</span>
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* Título de página */}
      <div className="subadmin-page-title">
        <div className="subadmin-title-content">
          <h2>{titulo}</h2>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
      </div>

      {/* Contenido principal */}
      <main className="subadmin-main">
        {children}
      </main>

      {/* Footer (opcional, similar al de paramédico) */}
      <footer className="subadmin-footer">
        <div className="subadmin-footer-content">
          <p>Cruz Roja Mexicana - Sistema de Gestión de Ambulancias</p>
          <p className="subadmin-footer-year">© 2026 Todos los derechos reservados</p>
        </div>
      </footer>
    </div>
  )
}