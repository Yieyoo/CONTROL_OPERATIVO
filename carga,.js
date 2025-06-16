// carga.js - Versión final para frontend
class ServerStatusIndicator {
  constructor() {
    this.createIndicator();
    this.checkInterval = 5000; // 5 segundos
  // Para desarrollo local (cuando trabajas en tu computadora):
this.apiUrl = 'http://localhost:3000/api';

// Para producción (cuando está en GitHub Pages):
this.apiUrl = 'https://control-operativo-1.onrender.com/api';
    this.intervalId = null;
  }

  createIndicator() {
    this.indicator = document.createElement('div');
    this.indicator.id = 'server-status-indicator';
    this.indicator.innerHTML = `
      <div class="spinner"></div>
      <span class="status-text">Verificando estado del servidor...</span>
    `;
    this.indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px 15px;
      border-radius: 20px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
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
        border-top-color: #ffffff;
        animation: spin 1s ease-in-out infinite;
      }
      .status-text {
        font-size: 14px;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(this.indicator);
  }

  async checkServerStatus() {
    try {
      const response = await fetch(this.apiUrl);
      if (!response.ok) throw new Error('Error en la respuesta');
      
      const data = await response.json();
      this.updateStatus(data.status === 'healthy' ? 'online' : 'degraded');
    } catch (error) {
      this.updateStatus('offline');
    }
  }

  updateStatus(status) {
    const spinner = this.indicator.querySelector('.spinner');
    const text = this.indicator.querySelector('.status-text');
    
    switch(status) {
      case 'online':
        spinner.style.borderTopColor = '#4CAF50';
        text.textContent = 'Servidor en línea';
        break;
      case 'degraded':
        spinner.style.borderTopColor = '#FFC107';
        text.textContent = 'Servidor con problemas';
        break;
      case 'offline':
        spinner.style.borderTopColor = '#F44336';
        text.textContent = 'Servidor no disponible - Espere...';
        break;
    }
  }

  startMonitoring() {
    this.checkServerStatus(); // Verificación inmediata
    this.intervalId = setInterval(() => this.checkServerStatus(), this.checkInterval);
  }
}

// Iniciar automáticamente cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
  const statusMonitor = new ServerStatusIndicator();
  statusMonitor.startMonitoring();
  
  // Opcional: Hacerlo accesible globalmente
  window.serverStatus = statusMonitor;
});