/**
 * @component SubadminLayout
 * @description Layout principal para el panel de subadministrador.
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido de la página
 * @param {string} props.titulo - Título de la página
 * @param {string} [props.subtitulo] - Subtítulo opcional
 * @returns {JSX.Element}
 */

import { useAuth } from '../../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import '../../styles/SubadminLayout.css'
import firmaInst from '../../assets/imagenes/firmainst.png'

export default function SubadminLayout({ children, titulo, subtitulo }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const currentPath = location.pathname

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menu = [
    { nombre: 'Dashboard', icono: '📊', path: '/subadmin' },
    { nombre: 'Ambulancias', icono: '🚑', path: '/subadmin/ambulancias' },
    { nombre: 'Paramédicos', icono: '👥', path: '/subadmin/paramedicos' },
    { nombre: 'Insumos por Sede', icono: '💉', path: '/subadmin/insumos-sede' },
    { nombre: 'Equipo', icono: '🧰', path: '/subadmin/equipo' },
    { nombre: 'Reportes', icono: '📈', path: '/subadmin/reportes' },
  ]

  const nombreSede = user?.sedes?.nombre || 'Sede no asignada'

  return (
    <div className="subadmin-layout-container">
      <div className="subadmin-top-bar"></div>

      <header className="subadmin-header">
        <div className="subadmin-header-content">
          <div className="subadmin-header-top">
            <div className="subadmin-logo-area">
              <div className="subadmin-logo-text">
                <img 
                  src={firmaInst} 
                  alt="Firma institucional Cruz Roja Mexicana" 
                  className="subadmin-firma-img"
                  loading="lazy"
                />
              </div>
            </div>

            <div className="subadmin-user-area">
              <div className="subadmin-user-info">
                <p className="subadmin-user-name">{user?.nombre || 'Subadministrador'}</p>
                <p className="subadmin-user-role">{nombreSede}</p>
              </div>
              <button onClick={handleLogout} className="subadmin-btn-logout">
                <span>🚪</span>
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>

          <nav className="subadmin-nav">
            {menu.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`subadmin-nav-item ${currentPath === item.path ? 'active' : ''}`}
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

      <div className="subadmin-page-title">
        <div className="subadmin-title-content">
          <h2>{titulo}</h2>
          {subtitulo && <p className="subadmin-subtitulo">{subtitulo}</p>}
        </div>
      </div>

      <main className="subadmin-main">
        {children}
      </main>
    </div>
  )
}