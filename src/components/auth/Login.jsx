import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import '../../styles/login.css'
import firmaInst from '../../assets/imagenes/firmainst.png'

export default function Login() {
  const [formData, setFormData] = useState({
    correo: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')

    const result = await login(formData.correo.trim(), formData.password.trim())
    
    if (result.success) {
      const routes = {
        ADMIN: '/admin',
        SUBADMIN: '/subadmin',
        PARAMEDICO: '/paramedico'
      }
      navigate(routes[result.user.rol] || '/')
    } else {
      setError(result.error)
    }
    
    setCargando(false)
  }

  return (
    <div className="login-container">
      <div className="top-bar" aria-hidden="true"></div>

      <header className="login-header">
        <div className="header-content">
          <div className="titulo">
            <img 
              src={firmaInst} 
              alt="Firma institucional Cruz Roja Mexicana" 
              loading="lazy"
            />
          </div>
        </div>
      </header>

      <div className="banner" aria-label="Banner institucional">
        <div className="banner-content">
          <h2>Sistema de Control de Ambulancias</h2>
          <p>Gestión digital de guardias</p>
        </div>
      </div>

      <main className="main-content">
        <div className="login-card">
          <h3 className="card-title">Acceso al Sistema</h3>
          <p className="card-subtitle">Ingrese con sus credenciales institucionales</p>

          {error && (
            <div className="error-message" role="alert">
              <span aria-hidden="true">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="correo">Correo Electrónico</label>
              <input
                id="correo"
                type="email"
                name="correo"
                value={formData.correo}
                onChange={handleChange}
                placeholder="ejemplo@cruzroja.mx"
                required
                disabled={cargando}
                aria-label="Correo electrónico institucional"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                disabled={cargando}
                aria-label="Contraseña"
              />
            </div>

            <button 
              type="submit" 
              className="btn-submit"
              disabled={cargando}
              aria-busy={cargando}
            >
              {cargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </main>

      <footer className="login-footer">
        <div className="footer-content">
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} Cruz Roja Mexicana - Todos los derechos reservados</p>
          </div>
        </div>
      </footer>
    </div>
  )
}