// carga.js - Versión final y corregida para frontend
class ServerStatusIndicator {
  constructor() {
    this.createIndicator();
    this.checkInterval = 5000; // 5 segundos
    
    // Configuración automática del API URL según el entorno
    this.apiUrl = window.location.hostname.includes('github.io') 
      ? 'https://control-operativo-1.onrender.com/api/health'  // Producción
      : 'http://localhost:3000/api/health';  // Desarrollo local
    
    this.intervalId = null;
    this.apiKey = 'tu_api_key_secreta'; // ¡REEMPLAZA ESTO CON TU API KEY REAL!
  }

  createIndicator() {
    this.indicator = document.createElement('div');
    this.indicator.id = 'server-status-indicator';
    this.indicator.innerHTML = `
      <div class="spinner"></div>
      <span class="status-text">Verificando estado del servidor...</span>
      <span class="status-time" style="font-size: 5px; opacity: 0.7;"></span>
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
      transition: all 0.3s ease;
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
        transition: border-color 0.3s ease;
      }
      .status-text {
        font-size: 10px;
      }
      #server-status-indicator:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(this.indicator);
  }

  async checkServerStatus() {
    try {
      const timestamp = new Date().toLocaleTimeString();
      const timeElement = this.indicator.querySelector('.status-time');
      timeElement.textContent = `Último intento: ${timestamp}`;
      
      const response = await fetch(this.apiUrl, {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        cache: 'no-store' // Evitar caché
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      this.updateStatus(data.status === 'healthy' ? 'online' : 'degraded');
      
      // Mostrar versión del servidor si está disponible
      if (data.version) {
        const textElement = this.indicator.querySelector('.status-text');
        textElement.innerHTML = `Servidor en línea <small>(v${data.version})</small>`;
      }
    } catch (error) {
      console.error('Error al verificar estado del servidor:', error);
      this.updateStatus('offline');
    }
  }

  updateStatus(status) {
    const spinner = this.indicator.querySelector('.spinner');
    const text = this.indicator.querySelector('.status-text');
    const timeElement = this.indicator.querySelector('.status-time');
    
    // Detener animación cuando está offline
    if (status === 'offline') {
      spinner.style.animation = 'none';
    } else {
      spinner.style.animation = 'spin 1s ease-in-out infinite';
    }
    
    switch(status) {
      case 'online':
        spinner.style.borderTopColor = '#4CAF50';
        spinner.style.borderColor = 'rgba(76, 175, 80, 0.3)';
        this.indicator.style.backgroundColor = 'rgba(0,0,0,0.8)';
        break;
      case 'degraded':
        spinner.style.borderTopColor = '#FFC107';
        spinner.style.borderColor = 'rgba(255, 193, 7, 0.3)';
        this.indicator.style.backgroundColor = 'rgba(0,0,0,0.8)';
        text.textContent = 'Servidor con problemas';
        break;
      case 'offline':
        spinner.style.borderTopColor = '#F44336';
        spinner.style.borderColor = 'rgba(244, 67, 54, 0.3)';
        this.indicator.style.backgroundColor = 'rgba(139, 0, 0, 0.8)';
        text.textContent = 'Servidor no disponible';
        timeElement.textContent = 'Intentando reconectar...';
        break;
    }
  }

  startMonitoring() {
    console.log(`Iniciando monitorización del servidor en: ${this.apiUrl}`);
    this.checkServerStatus(); // Verificación inmediata
    this.intervalId = setInterval(() => this.checkServerStatus(), this.checkInterval);
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Iniciar automáticamente cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
  const statusMonitor = new ServerStatusIndicator();
  statusMonitor.startMonitoring();
  
  // Hacerlo accesible globalmente para control manual
  window.serverStatus = {
    instance: statusMonitor,
    restart: () => {
      statusMonitor.stopMonitoring();
      statusMonitor.startMonitoring();
    },
    getStatus: () => {
      const text = statusMonitor.indicator.querySelector('.status-text').textContent;
      const color = statusMonitor.indicator.querySelector('.spinner').style.borderTopColor;
      return { text, color };
    }
  };
});