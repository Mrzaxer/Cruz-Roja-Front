import { useAuth } from '../../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import '../../styles/AdminLayout.css'
import firmaInst from '../../assets/imagenes/firmainst.png' // ← Cambiado a firmainst.png

export default function AdminLayout({ children, titulo, subtitulo }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const currentPath = location.pathname

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menu = [
    { nombre: 'Dashboard', icono: '📊', path: '/admin' },
    { nombre: 'Sedes', icono: '🏢', path: '/admin/sedes' },
    { nombre: 'Usuarios', icono: '👥', path: '/admin/usuarios' },
    { nombre: 'Ambulancias', icono: '🚑', path: '/admin/ambulancias' },
    { nombre: 'Insumos', icono: '💉', path: '/admin/insumos' },
    { nombre: 'Equipo', icono: '🧰', path: '/admin/equipo' },
    { nombre: 'Reportes', icono: '📈', path: '/admin/reportes' },
  ]

  return (
    <div className="admin-layout-container">
      {/* Barra superior roja */}
      <div className="admin-top-bar"></div>

      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-header-top">
            {/* Logo y título - SOLO LA IMAGEN firmainst.png */}
            <div className="admin-logo-area">
              <div className="admin-logo" style={{ display: 'none' }}> {/* Oculto */}
                <img src={firmaInst} alt="Logo Cruz Roja" />
              </div>
              <div className="admin-logo-text">
                <img 
                  src={firmaInst} 
                  alt="Firma institucional Cruz Roja Mexicana" 
                  className="admin-firma-img"
                  loading="lazy"
                />
                <h1 style={{ display: 'none' }}>CRUZ ROJA MEXICANA</h1>
                <p style={{ display: 'none' }}>Jalisco</p>
              </div>
            </div>

            {/* Área de usuario */}
            <div className="admin-user-area">
              <div className="admin-user-info">
                <p className="admin-user-name">{user?.nombre || 'Administrador'}</p>
                <p className="admin-user-role">Administrador</p>
              </div>
              <button onClick={handleLogout} className="admin-btn-logout">
                <span>🚪</span>
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>

          {/* Navegación */}
          <nav className="admin-nav">
            {menu.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`admin-nav-item ${currentPath === item.path ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault()
                  navigate(item.path)
                }}
              >
                <span className="nav-icon">{item.icono}</span>
                <span className="nav-text">{item.nombre}</span>
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* Título de página */}
      <div className="admin-page-title">
        <div className="admin-title-content">
          <h2>{titulo}</h2>
          {subtitulo && <p className="admin-subtitulo">{subtitulo}</p>}
        </div>
      </div>

      {/* Contenido principal */}
      <main className="admin-main">
        {children}
      </main>
    </div>
  )
}