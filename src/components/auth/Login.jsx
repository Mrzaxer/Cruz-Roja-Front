/**
 * @component Login
 * @description Pantalla de inicio de sesión del sistema.
 *              - Autentica usuarios contra la tabla 'usuarios' en Supabase
 *              - Redirige según el rol del usuario (ADMIN, SUBADMIN, PARAMEDICO)
 *              - Manejo de errores y estado de carga
 * @returns {JSX.Element}
 */

import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import '../../styles/login.css'
import firmaInst from '../../assets/imagenes/firmainst.png'

export default function Login() {
  // ===== ESTADOS =====
  const [formData, setFormData] = useState({
    correo: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()

  /**
   * Maneja los cambios en los inputs del formulario
   * @param {Event} e - Evento del input
   */
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  /**
   * Maneja el envío del formulario de login
   * @param {Event} e - Evento del formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')

    const result = await login(formData.correo.trim(), formData.password.trim())
    
    if (result.success) {
      // Redirigir según el rol del usuario
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
      {/* Barra superior animada */}
      <div className="top-bar" aria-hidden="true"></div>

      {/* Header con logo */}
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

      {/* Banner institucional */}
      <div className="banner" aria-label="Banner institucional">
        <div className="banner-content">
          <h2>Sistema de Control de Ambulancias</h2>
          <p>Gestión digital de guardias</p>
        </div>
      </div>

      {/* Contenido principal - Formulario de login */}
      <main className="main-content">
        <div className="login-card">
          <h3 className="card-title">Acceso al sistema</h3>
          <p className="card-subtitle">Ingrese con sus credenciales institucionales</p>

          {/* Mensaje de error */}
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
              {cargando ? '⏳ Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
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