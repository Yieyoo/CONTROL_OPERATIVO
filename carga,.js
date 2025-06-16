class ServerStatusIndicator {
  constructor() {
    this.createIndicator();
    this.checkInterval = 5000; // 5 segundos
    
    // Configuración automática del API URL según el entorno
    this.apiUrl = window.location.hostname.includes('github.io') 
      ? 'https://control-operativo-1.onrender.com/api/health'
      : 'http://localhost:3000/api/health';
    
    this.intervalId = null;
    this.apiKey = 'Xhy2md57';
  }

  createIndicator() {
    this.indicator = document.createElement('div');
    this.indicator.id = 'server-status-indicator';
    this.indicator.innerHTML = `
      <div class="spinner"></div>
      <span class="status-text">Verificando estado del servidor...</span>
      <span class="status-time" style="font-size: 10px; opacity: 0.7;"></span>
    `;
    this.indicator.style.cssText = `
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
      z-index: 10000;
      font-family: Arial, sans-serif;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
      backdrop-filter: blur(5px);
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
        border: 3px solid rgba(255,255,255,0.1);
        border-radius: 50%;
        border-top-color: rgba(255,255,255,0.6);
        animation: spin 1.2s ease-in-out infinite;
        transition: all 0.5s ease;
      }
      .status-text {
        font-size: 10px;
        font-weight: 300;
        letter-spacing: 0.5px;
      }
      #server-status-indicator:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        background: rgba(0,0,0,0.8);
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
        cache: 'no-store'
      });
      
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      
      const data = await response.json();
      this.updateStatus(data.status === 'healthy' ? 'online' : 'degraded');
      
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
    
    // Ajustes de animación
    if (status === 'offline') {
      spinner.style.animation = 'spin 1.5s linear infinite';
    } else {
      spinner.style.animation = 'spin 1.2s ease-in-out infinite';
    }
    
    // Colores elegantes
    switch(status) {
      case 'online':
        spinner.style.borderTopColor = 'rgba(100, 221, 123, 0.9)'; // Verde suave
        spinner.style.borderColor = 'rgba(100, 221, 123, 0.2)';
        this.indicator.style.backgroundColor = 'rgba(30, 41, 59, 0.7)'; // Azul oscuro
        text.style.color = 'rgba(200, 250, 210, 0.9)';
        break;
        
      case 'degraded':
        spinner.style.borderTopColor = 'rgba(253, 230, 138, 0.9)'; // Amarillo suave
        spinner.style.borderColor = 'rgba(253, 230, 138, 0.2)';
        this.indicator.style.backgroundColor = 'rgba(59, 46, 30, 0.7)'; // Marrón oscuro
        text.textContent = 'Servidor con problemas';
        text.style.color = 'rgba(255, 242, 200, 0.9)';
        break;
        
      case 'offline':
        spinner.style.borderTopColor = 'rgba(252, 165, 165, 0.8)'; // Rojo suave
        spinner.style.borderColor = 'rgba(252, 165, 165, 0.1)';
        this.indicator.style.backgroundColor = 'rgba(59, 30, 30, 0.7)'; // Rojo oscuro
        text.textContent = 'Servidor no disponible';
        text.style.color = 'rgba(255, 200, 200, 0.9)';
        timeElement.textContent = 'Intentando reconectar...';
        break;
    }
  }

  startMonitoring() {
    console.log(`Iniciando monitorización del servidor en: ${this.apiUrl}`);
    this.checkServerStatus();
    this.intervalId = setInterval(() => this.checkServerStatus(), this.checkInterval);
  }

  stopMonitoring() {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}

// Iniciar automáticamente
document.addEventListener('DOMContentLoaded', () => {
  const statusMonitor = new ServerStatusIndicator();
  statusMonitor.startMonitoring();
  
  window.serverStatus = {
    instance: statusMonitor,
    restart: () => {
      statusMonitor.stopMonitoring();
      statusMonitor.startMonitoring();
    }
  };
});