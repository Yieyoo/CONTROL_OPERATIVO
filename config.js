const CONFIG = {

    BACKEND_URL: 'https://control-operativo-1.onrender.com/api',

    // Token de sesión que entrega /api/login (se guarda en login.html)
    getToken() {
        return localStorage.getItem('authToken') || '';
    },

    VERSION: '2.1.0'
};

window.CONFIG = CONFIG;

// Si la API responde 401 (sesión vencida o inválida), avisar y mandar al login
// en lugar de dejar que cada página muestre un error genérico.
(function () {
    const LOGIN_URL = document.currentScript
        ? new URL('login.html', document.currentScript.src).href
        : 'login.html';
    const originalFetch = window.fetch.bind(window);
    let redirecting = false;

    window.fetch = async function (input, init) {
        const response = await originalFetch(input, init);
        const url = typeof input === 'string' ? input : (input && input.url) || '';

        if (response.status === 401 && url.startsWith(CONFIG.BACKEND_URL) &&
            !url.split('?')[0].endsWith('/login') && !redirecting) {
            redirecting = true;
            ['authenticated', 'username', 'loginTime', 'authToken'].forEach(k => localStorage.removeItem(k));
            alert('Tu sesión expiró. Vuelve a iniciar sesión.');
            window.location.replace(LOGIN_URL);
        }
        return response;
    };
})();
