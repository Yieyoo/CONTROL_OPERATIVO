class ServerStatusIndicator {
  constructor() {
    this.createIndicator();
    this.checkInterval = 5000;
    this.apiUrl = window.location.hostname.includes('github.io') 
      ? 'https://control-operativo-1.onrender.com/api/health'
      : 'http://localhost:3000/api/health';
    this.intervalId = null;
    this.apiKey = 'Xhy2md57';
    this.isChecking = false;
    this.currentStatus = null; // Para guardar el último estado conocido
  }

  createIndicator() {
    this.indicator = document.createElement('div');
    this.indicator.id = 'server-status-indicator';
    
    this.indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 24px;
      height: 24px;
      z-index: 10000;
      border-radius: 50%;
      background: rgba(252, 165, 165, 0.3); /* Color inicial (offline) */
      border: 3px solid rgba(252, 165, 165, 0.7);
      box-shadow: 0 0 10px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
      cursor: pointer;
    `;
    
    this.indicator.title = 'Verificando estado del servidor...';
    document.body.appendChild(this.indicator);
  }

  async checkServerStatus() {
    if (this.isChecking) return;
    
    this.isChecking = true;
    this.startLoadingAnimation();
    
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
    }
  }

  startLoadingAnimation() {
    // Solo mostrar animación si no tenemos un estado actual
    if (this.currentStatus === null) {
      this.indicator.style.borderTop = '3px solid transparent';
      this.indicator.style.animation = 'spin 1s linear infinite';
    }
    this.indicator.title = 'Verificando estado del servidor...';
    
    // Agregar la regla de animación al estilo si no existe
    if (!document.getElementById('spin-animation')) {
      const style = document.createElement('style');
      style.id = 'spin-animation';
      style.innerHTML = `
        @keyframes spin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  updateStatus(status) {
    // Detener la animación cuando se actualiza el estado
    this.indicator.style.animation = 'none';
    this.indicator.style.borderTop = ''; // Quitar el borde transparente
    
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
    
    this.indicator.style.background = bgColor;
    this.indicator.style.borderColor = borderColor;
    this.indicator.style.boxShadow = `0 0 15px ${shadowColor}`;
    this.indicator.title = title;
    
    // Efecto de confirmación al cambiar de estado
    this.indicator.style.transform = 'scale(1.2)';
    setTimeout(() => {
      this.indicator.style.transform = 'scale(1)';
    }, 300);
  }

  startMonitoring() {
    this.checkServerStatus();
    this.intervalId = setInterval(() => this.checkServerStatus(), this.checkInterval);
    
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