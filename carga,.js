// carga.js
class EstadoServidor {
  constructor() {
    this.spinner = this.crearSpinner();
    this.intervalo = null;
    this.verificarCada = 5000; // 5 segundos
  }

  crearSpinner() {
    const spinner = document.createElement('div');
    spinner.id = 'server-status-spinner';
    spinner.innerHTML = `
      <div class="spinner"></div>
      <span class="status-text">Verificando servidor...</span>
    `;
    spinner.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 10px 15px;
      border-radius: 20px;
      z-index: 1000;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .spinner {
        width: 20px;
        height: 20px;
        border: 3px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s ease-in-out infinite;
      }
      .status-text {
        font-family: Arial, sans-serif;
        font-size: 14px;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(spinner);
    return spinner;
  }

  async verificarEstado() {
    try {
      const response = await fetch('https://tu-api.com/api/health');
      if (!response.ok) throw new Error('Servidor no disponible');
      
      const data = await response.json();
      if (data.status === 'healthy') {
        this.mostrarEstado('Servidor activo', '#4CAF50');
      } else {
        throw new Error('Servidor con problemas');
      }
    } catch (error) {
      this.mostrarEstado('Servidor inactivo. Espere...', '#F44336');
      // Reintentar después del intervalo
    }
  }

  mostrarEstado(mensaje, color) {
    const textElement = this.spinner.querySelector('.status-text');
    textElement.textContent = mensaje;
    textElement.style.color = color;
    
    // Cambiar color del spinner
    const spinnerElement = this.spinner.querySelector('.spinner');
    spinnerElement.style.borderTopColor = color;
  }

  iniciarMonitoreo() {
    this.verificarEstado(); // Verificar inmediatamente
    this.intervalo = setInterval(() => this.verificarEstado(), this.verificarCada);
  }
}

// Iniciar automáticamente al cargar
document.addEventListener('DOMContentLoaded', () => {
  const monitor = new EstadoServidor();
  monitor.iniciarMonitoreo();
  window.monitorServidor = monitor; // Opcional: hacerlo global
});