import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Solo importamos nuestros CSS personalizados
import './styles/admin.css'
import './styles/login.css'
// import './index.css'  // Ya no es necesario

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)