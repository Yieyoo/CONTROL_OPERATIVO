import { initKeepAlive } from './keep-alive.js'; // La versión completa original

document.addEventListener('DOMContentLoaded', () => {
    // Solo activar en producción
    if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        initKeepAlive('https://control-operativo-1.onrender.com');
    }
});