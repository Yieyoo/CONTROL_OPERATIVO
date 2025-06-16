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
    this.indicator.id = 'server-status-spinner';
    this.indicator.innerHTML = `<div class="spinner"></div>`;
    
    // Contenedor más grande para acomodar la línea gruesa
    this.indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 32px;  /* Aumentado para línea gruesa */
      height: 32px;
      z-index: 10000;
      border-radius: 50%;
      background: rgba(0,0,0,0.2);
      backdrop-filter: blur(3px);
      transition: all 0.5s ease;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .spinner {
        width: 100%;
        height: 100%;
        border: 4px solid transparent;  /* Línea más gruesa (4px) */
        border-radius: 50%;
        animation: spin 1.5s linear infinite;
        transition: all 0.5s ease;
        box-sizing: border-box;
      }
    `;
    
    document.head.appendChild(style);
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
    const spinner = this.indicator.querySelector('.spinner');
    
    // Colores con línea más gruesa y visible
    switch(status) {
      case 'online':
        spinner.style.borderTopColor = 'rgba(100, 221, 123, 0.9)';
        spinner.style.borderRightColor = 'rgba(100, 221, 123, 0.5)';
        spinner.style.borderBottomColor = 'rgba(100, 221, 123, 0.2)';
        spinner.style.borderLeftColor = 'rgba(100, 221, 123, 0.2)';
        spinner.style.borderWidth = '4px';  // Grosor consistente
        break;
        
      case 'degraded':
        spinner.style.borderTopColor = 'rgba(253, 230, 138, 0.9)';
        spinner.style.borderRightColor = 'rgba(253, 230, 138, 0.5)';
        spinner.style.borderWidth = '4px';
        break;
        
      case 'offline':
        spinner.style.borderTopColor = 'rgba(252, 165, 165, 0.9)';  // Más opaco
        spinner.style.borderRightColor = 'rgba(252, 165, 165, 0.6)';
        spinner.style.borderWidth = '4px';
        this.indicator.style.boxShadow = '0 0 12px rgba(252, 165, 165, 0.4)';  // Sombra más visible
        break;
    }
  }

  startMonitoring() {
    this.checkServerStatus();
    this.intervalId = setInterval(() => this.checkServerStatus(), this.checkInterval);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ServerStatusIndicator().startMonitoring();
});