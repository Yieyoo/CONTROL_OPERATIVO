const CONFIG = {

    BACKEND_URL: 'https://control-operativo-1.onrender.com/api',

    // Token de sesión que entrega /api/login (se guarda en login.html)
    getToken() {
        return localStorage.getItem('authToken') || '';
    },

    VERSION: '2.1.0'
};

window.CONFIG = CONFIG;
