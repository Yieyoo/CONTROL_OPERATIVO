// config.js - Configuración centralizada para el frontend
// =====================================================
// ⚠️ SOLO CAMBIA LA URL CUANDO MIGRES AL SERVIDOR EMPRESA
// =====================================================

const CONFIG = {
    // === CAMBIA SOLO ESTO CUANDO MIGRES ===
    BACKEND_URL: 'http://localhost:3000/api',  // ← AHORA: prueba local
    // BACKEND_URL: 'https://control-operativo-1.onrender.com/api',  // ← RENDER (actual)
    // BACKEND_URL: 'http://IP-EMPRESA:3000/api',  // ← SERVIDOR EMPRESA (después)
    
    // API Key (no cambiar)
    API_KEY: 'Xhy2md57',
    
    // Versión
    VERSION: '2.0.0-sin-cloudinary'
};

// Hacer disponible globalmente
window.CONFIG = CONFIG;