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
    
    // Intervalos personalizados por estado
    this.intervals = {
      online: 10000,    // 10 segundos si está online
      degraded: 5000,   // 5 segundos si está degradado
      offline: 5000     // 5 segundos si está offline
    };
  }

  createIndicator() {
    this.indicator = document.createElement('div');
    this.indicator.id = 'server-status-indicator';
    
    this.indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 20px;
      height: 20px;
      z-index: 10000;
      border-radius: 50%;
      background: rgba(252, 165, 165, 0.3);
      border: 2px solid rgba(252, 165, 165, 0.7);
      box-shadow: 0 0 10px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
      cursor: pointer;
      box-sizing: border-box;
    `;
    
    this.indicator.title = 'Verificando estado del servidor...';
    document.body.appendChild(this.indicator);
  }

  async checkServerStatus() {
    if (this.isChecking) return;
    
    this.isChecking = true;
    
    // Mostrar animación SOLO si no está online
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
      
      // Reiniciar el intervalo con el tiempo correspondiente al estado actual
      if (this.intervalId) {
        clearInterval(this.intervalId);
      }
      this.intervalId = setInterval(
        () => this.checkServerStatus(), 
        this.intervals[this.currentStatus || 'offline']
      );
    }
  }

  startLoadingAnimation() {
    this.indicator.style.border = '2px solid rgba(200, 200, 200, 0.7)';
    this.indicator.style.borderTop = '2px solid rgba(252, 165, 165, 0.7)';
    this.indicator.style.animation = 'spin 1s linear infinite';
    this.indicator.title = 'Verificando estado del servidor...';
    
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
    // Detener animación si está online
    if (status === 'online') {
      this.indicator.style.animation = 'none';
    }
    
    let bgColor, borderColor, shadowColor, title;
    
    switch(status) {
      case 'online':
        bgColor = 'rgba(100, 221, 123, 0.3)';
        borderColor = 'rgba(100, 221, 123, 0.8)';
        shadowColor = 'rgba(100, 221, 123, 0.3)';
        title = 'Servidor en línea ✓';
        break;
        
      case 'degraded':
        bgColor = 'rgba(253, 230, 138, 0.3)';
        borderColor = 'rgba(253, 230, 138, 0.8)';
        shadowColor = 'rgba(253, 230, 138, 0.3)';
        title = 'Servidor con problemas !';
        break;
        
      case 'offline':
        bgColor = 'rgba(252, 165, 165, 0.3)';
        borderColor = 'rgba(252, 165, 165, 0.8)';
        shadowColor = 'rgba(252, 165, 165, 0.3)';
        title = 'Servidor no disponible ✗';
        break;
    }
    
    this.indicator.style.border = `2px solid ${borderColor}`;
    this.indicator.style.background = bgColor;
    this.indicator.style.boxShadow = `0 0 15px ${shadowColor}`;
    this.indicator.title = title;
    
    // Efecto de confirmación
    this.indicator.style.transform = 'scale(1.2)';
    setTimeout(() => {
      this.indicator.style.transform = 'scale(1)';
    }, 300);
  }

  startMonitoring() {
    this.checkServerStatus();
    
    this.indicator.addEventListener('click', () => {
      if (!this.isChecking) {
        this.indicator.title = 'Verificando...';
        this.checkServerStatus();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ServerStatusIndicator().startMonitoring();
});