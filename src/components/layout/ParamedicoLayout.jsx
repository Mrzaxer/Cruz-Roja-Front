import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import '../../styles/ParamedicoLayout.css'
import firmaInst from '../../assets/imagenes/firmainst.png' // ← Importar la imagen

export default function ParamedicoLayout({ children, titulo }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="paramedico-layout-container">
      {/* Barra superior roja animada */}
      <div className="paramedico-top-bar"></div>

      {/* Header */}
      <header className="paramedico-header">
        <div className="paramedico-header-content">
          <div className="paramedico-header-top">
            {/* Logo y título - SOLO LA IMAGEN firmainst.png */}
            <div className="paramedico-logo-area">
              <div className="paramedico-logo-text">
                <img 
                  src={firmaInst} 
                  alt="Firma institucional Cruz Roja Mexicana" 
                  loading="lazy"
                />
                {/* Textos ocultos por CSS, pero los dejamos por si acaso */}
                <h1 style={{ display: 'none' }}>CRUZ ROJA MEXICANA</h1>
                <p style={{ display: 'none' }}>Jalisco</p>
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
                <span>Cerrar Sesión</span>
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