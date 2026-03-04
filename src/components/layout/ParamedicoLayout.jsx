import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import '../../styles/ParamedicoLayout.css'

export default function ParamedicoLayout({ children, titulo }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="paramedico-layout-container">
      {/* Barra superior roja */}
      <div className="paramedico-top-bar"></div>

      {/* Header */}
      <header className="paramedico-header">
        <div className="paramedico-header-content">
          <div className="paramedico-header-top">
            {/* Logo y título */}
            <div className="paramedico-logo-area">
              <div className="paramedico-logo">
                <span>⛑️</span>
              </div>
              <div className="paramedico-logo-text">
                <h1>CRUZ ROJA</h1>
                <p>MEXICANA</p>
              </div>
            </div>

            {/* Área de usuario */}
            <div className="paramedico-user-area">
              <div className="paramedico-user-info">
                <p className="paramedico-user-name">{user?.nombre || 'Usuario'}</p>
                <p className="paramedico-user-role">Paramédico</p>
              </div>
              <button onClick={handleLogout} className="paramedico-btn-logout">
                <span>🚪</span>
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Título de página */}
      <div className="paramedico-page-title">
        <div className="paramedico-title-content">
          <h2>{titulo}</h2>
        </div>
      </div>

      {/* Contenido principal */}
      <main className="paramedico-main">
        {children}
      </main>
    </div>
  )
}