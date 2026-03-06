import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import '../../styles/login.css'
import logo from '../../assets/imagenes/logo.jpg'// Importar la imagen

export default function Login() {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')

    const result = await login(correo.trim(), password.trim())
    
    if (result.success) {
      switch(result.user.rol) {
        case 'ADMIN':
          navigate('/admin')
          break
        case 'SUBADMIN':
          navigate('/subadmin')
          break
        case 'PARAMEDICO':
          navigate('/paramedico')
          break
        default:
          navigate('/')
      }
    } else {
      setError(result.error)
    }
    
    setCargando(false)
  }

  return (
    <div className="login-container">
      <div className="top-bar"></div>

      <header className="login-header">
        <div className="header-content">
          <div className="logo">
            <img src={logo} alt="Logo Cruz Roja" /> {/* Reemplazar la "a" con la imagen */}
          </div>
          <div className="titulo">
            <h1>CRUZ ROJA MEXICANA</h1>
            <p>Jalisco</p>
          </div>
        </div>
      </header>

      <div className="banner">
        <div className="banner-content">
          <h2>Sistema de Control de Ambulancias</h2>
          <p>Gestión digital de guardias </p>
        </div>
      </div>

      <div className="main-content">
        <div className="login-card">
          <h3 className="card-title">Acceso al Sistema</h3>
          <p className="card-subtitle">Ingrese con sus credenciales institucionales</p>

          {error && (
            <div className="error-message">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Correo Electrónico</label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="ejemplo@cruzroja.mx"
                required
              />
            </div>

            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn-submit"
              disabled={cargando}
            >
              {cargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="credenciales-prueba">
            <p>Credenciales de prueba:</p>
            <p>efrain@cruzroja.mx / 123  I admin@cruzroja.mx / admin123</p>
          </div>
        </div>
      </div>

      <footer className="login-footer">
        <div className="footer-content">
          <div className="footer-grid">
            
          </div>
          <div className="footer-bottom">
            © 2026 Cruz Roja - Todos los derechos reservados
          </div>
        </div>
      </footer>
    </div>
  )
}