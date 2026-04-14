/**
 * @component ParamedicoLayout
 * @description Layout principal para el panel de paramédico.
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido de la página
 * @param {string} props.titulo - Título de la página
 * @returns {JSX.Element}
 */

import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import '../../styles/ParamedicoLayout.css'
import firmaInst from '../../assets/imagenes/firmainst.png'

export default function ParamedicoLayout({ children, titulo }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="paramedico-layout-container">
      <div className="paramedico-top-bar"></div>

      <header className="paramedico-header">
        <div className="paramedico-header-content">
          <div className="paramedico-header-top">
            <div className="paramedico-logo-area">
              <div className="paramedico-logo-text">
                <img 
                  src={firmaInst} 
                  alt="Firma institucional Cruz Roja Mexicana" 
                  loading="lazy"
                />
              </div>
            </div>

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

      <div className="paramedico-page-title">
        <div className="paramedico-title-content">
          <h2>{titulo}</h2>
        </div>
      </div>

      <main className="paramedico-main">
        {children}
      </main>
    </div>
  )
}