class ServerStatusIndicator {
  constructor() {
    this.createIndicator();
    this.checkInterval = 5000;
    this.apiUrl = window.location.hostname.includes('github.io') 
      ? 'https://control-operativo-1.onrender.com/api/health'
      : 'http://localhost:3000/api/health';
    this.intervalId = null;
    this.apiKey = 'Xhy2md57';
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
      transition: all 0.5s ease;
      cursor: pointer;
    `;
    
    // Tooltip para mostrar estado al hacer hover
    this.indicator.title = 'Verificando estado del servidor...';
    
    document.body.appendChild(this.indicator);
  }

  async checkServerStatus() {
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
      this.updateStatus(data.status === 'healthy' ? 'online' : 'degraded');
    } catch (error) {
      this.updateStatus('offline');
    }
  }

  updateStatus(status) {
    switch(status) {
      case 'online':
        this.indicator.style.background = 'rgba(100, 221, 123, 0.3)';
        this.indicator.style.borderColor = 'rgba(100, 221, 123, 0.8)';
        this.indicator.style.boxShadow = '0 0 15px rgba(100, 221, 123, 0.3)';
        this.indicator.title = 'Servidor en línea ✓';
        break;
        
      case 'degraded':
        this.indicator.style.background = 'rgba(253, 230, 138, 0.3)';
        this.indicator.style.borderColor = 'rgba(253, 230, 138, 0.8)';
        this.indicator.style.boxShadow = '0 0 15px rgba(253, 230, 138, 0.3)';
        this.indicator.title = 'Servidor con problemas !';
        break;
        
      case 'offline':
        this.indicator.style.background = 'rgba(252, 165, 165, 0.3)';
        this.indicator.style.borderColor = 'rgba(252, 165, 165, 0.8)';
        this.indicator.style.boxShadow = '0 0 15px rgba(252, 165, 165, 0.3)';
        this.indicator.title = 'Servidor no disponible ✗';
        break;
    }
    
    // Efecto de parpadeo al cambiar de estado
    this.indicator.style.transform = 'scale(1.2)';
    setTimeout(() => {
      this.indicator.style.transform = 'scale(1)';
    }, 300);
  }

  startMonitoring() {
    this.checkServerStatus();
    this.intervalId = setInterval(() => this.checkServerStatus(), this.checkInterval);
    
    // Opcional: Verificación manual al hacer click
    this.indicator.addEventListener('click', () => {
      this.indicator.title = 'Verificando...';
      this.checkServerStatus();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ServerStatusIndicator().startMonitoring();
});