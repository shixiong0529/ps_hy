import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// 说明：未启用 StrictMode —— Fabric 会在 <canvas> 外层包裹容器，
// StrictMode 的双次挂载会导致同一元素被初始化两次。
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.Fragment>
    <App />
  </React.Fragment>,
)
