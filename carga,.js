class ServerStatusIndicator {
  constructor() {
    this.createIndicator();
    this.apiUrl = window.location.hostname.includes('github.io') 
      ? 'https://control-operativo-1.onrender.com/api/health'
      : 'http://localhost:3000/api/health';
    this.intervalId = null;
    this.apiKey = 'Xhy2md57';
    this.isChecking = false;
    this.currentStatus = null;
    this.lastCheckTime = null;
    
    this.intervals = {
      online: 10000,
      degraded: 5000,
      offline: 5000
    };
  }

  createIndicator() {
    // Crear contenedor principal
    this.container = document.createElement('div');
    this.container.id = 'server-status-container';
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
    `;
    
    // Crear indicador (círculo)
    this.indicator = document.createElement('div');
    this.indicator.id = 'server-status-indicator';
    this.indicator.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(252, 165, 165, 0.3);
      border: 2px solid rgba(252, 165, 165, 0.7);
      box-shadow: 0 0 10px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
      cursor: pointer;
      box-sizing: border-box;
      position: relative;
    `;
    
    // Crear tooltip (ahora hermano del indicador)
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'server-status-tooltip';
    this.tooltip.style.cssText = `
      position: absolute;
      bottom: 30px;
      right: 0;
      background: #2d3748;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      min-width: 200px;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s, visibility 0.3s;
      pointer-events: none;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transform-origin: bottom right;
    `;
    
    // Agregar elementos al DOM
    this.container.appendChild(this.indicator);
    this.container.appendChild(this.tooltip);
    document.body.appendChild(this.container);
    
    // Eventos hover
    this.indicator.addEventListener('mouseenter', () => this.showTooltip());
    this.indicator.addEventListener('mouseleave', () => this.hideTooltip());
  }

  showTooltip() {
    let statusText = '';
    let details = '';
    
    switch(this.currentStatus) {
      case 'online':
        statusText = '🟢 Servidor en línea';
        details = 'Todo funciona correctamente';
        break;
      case 'degraded':
        statusText = '🟡 Servidor con problemas';
        details = 'Algunas funciones pueden no estar disponibles';
        break;
      case 'offline':
        statusText = '🔴 Servidor no disponible';
        details = 'No se puede conectar al servidor';
        break;
      default:
        statusText = '⚪ Estado desconocido';
        details = 'Aún no se ha verificado el estado';
    }
    
    const timeText = this.lastCheckTime 
      ? `Última verificación: ${new Date(this.lastCheckTime).toLocaleTimeString()}`
      : 'No se ha verificado aún';
    
    const checkingText = this.isChecking ? '\n🔃 Verificando estado...' : '';
    
    this.tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">${statusText}</div>
      <div style="margin-bottom: 5px;">${details}</div>
      <div style="font-size: 12px; color: #a0aec0;">${timeText}${checkingText}</div>
    `;
    
    this.tooltip.style.opacity = '1';
    this.tooltip.style.visibility = 'visible';
  }

  hideTooltip() {
    this.tooltip.style.opacity = '0';
    this.tooltip.style.visibility = 'hidden';
  }

  async checkServerStatus() {
    if (this.isChecking) return;
    
    this.isChecking = true;
    this.lastCheckTime = new Date();
    
    if (this.currentStatus !== 'online') {
      this.startLoadingAnimation();
    }
    
    try {
      const response = await fetch(this.apiUrl, {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      
      const data = await response.json();
      this.currentStatus = data.status === 'healthy' ? 'online' : 'degraded';
      this.updateStatus(this.currentStatus);
    } catch (error) {
      this.currentStatus = 'offline';
      this.updateStatus('offline');
    } finally {
      this.isChecking = false;
      
      if (this.intervalId) {
        clearInterval(this.intervalId);
      }
      this.intervalId = setInterval(
        () => this.checkServerStatus(), 
        this.intervals[this.currentStatus || 'offline']
      );
      
      // Actualizar tooltip si está visible
      if (this.tooltip.style.visibility === 'visible') {
        this.showTooltip();
      }
    }
  }

  startLoadingAnimation() {
    this.indicator.style.border = '2px solid rgba(200, 200, 200, 0.7)';
    this.indicator.style.borderTop = '2px solid rgba(252, 165, 165, 0.7)';
    this.indicator.style.animation = 'spin 1s linear infinite';
    
    if (!document.getElementById('spin-animation')) {
      const style = document.createElement('style');
      style.id = 'spin-animation';
      style.innerHTML = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  updateStatus(status) {
    if (status === 'online') {
      this.indicator.style.animation = 'none';
    }
    
    let bgColor, borderColor, shadowColor;
    
    switch(status) {
      case 'online':
        bgColor = 'rgba(100, 221, 123, 0.3)';
        borderColor = 'rgba(100, 221, 123, 0.8)';
        shadowColor = 'rgba(100, 221, 123, 0.3)';
        break;
      case 'degraded':
        bgColor = 'rgba(253, 230, 138, 0.3)';
        borderColor = 'rgba(253, 230, 138, 0.8)';
        shadowColor = 'rgba(253, 230, 138, 0.3)';
        break;
      case 'offline':
        bgColor = 'rgba(252, 165, 165, 0.3)';
        borderColor = 'rgba(252, 165, 165, 0.8)';
        shadowColor = 'rgba(252, 165, 165, 0.3)';
        break;
    }
    
    this.indicator.style.border = `2px solid ${borderColor}`;
    this.indicator.style.background = bgColor;
    this.indicator.style.boxShadow = `0 0 15px ${shadowColor}`;
    
    this.indicator.style.transform = 'scale(1.2)';
    setTimeout(() => {
      this.indicator.style.transform = 'scale(1)';
    }, 300);
  }

  startMonitoring() {
    this.checkServerStatus();
    
    this.indicator.addEventListener('click', () => {
      if (!this.isChecking) {
        this.checkServerStatus();
      }
    });
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new ServerStatusIndicator().startMonitoring();
});