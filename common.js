import { initKeepAlive } from './keep-alive.js';

// Inicialización estándar (ping cada 5 min)
document.addEventListener('DOMContentLoaded', () => {
    initKeepAlive('https://control-operativo-1.onrender.com');
});