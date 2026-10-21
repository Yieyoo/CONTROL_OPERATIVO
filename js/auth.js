// login.html está un nivel arriba de /js/; se resuelve relativo a este script para que
// funcione tanto en localhost como en GitHub Pages (yieyoo.github.io/CONTROL_OPERATIVO/)
const LOGIN_URL = document.currentScript
    ? new URL('../login.html', document.currentScript.src).href
    : 'login.html';

const SESSION_KEYS = ['authenticated', 'username', 'loginTime', 'authToken'];

class AuthSystem {
    constructor() {
        if (!this.isLoginPage()) {
            this.verify();
        }
    }

    isLoginPage() {
        const p = window.location.pathname;
        return p.endsWith('login.html') || p.endsWith('/login');
    }

    verify() {
        const loginTime = parseInt(localStorage.getItem('loginTime'), 10);
        const sessionValid = localStorage.getItem('authenticated') === 'true' &&
            localStorage.getItem('authToken') &&
            loginTime && (Date.now() - loginTime) < 8 * 60 * 60 * 1000;

        if (!sessionValid) {
            this.clearSession();
            this.redirectToLogin();
        } else {
            const ls = document.getElementById('loadingScreen');
            if (ls) ls.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    clearSession() {
        SESSION_KEYS.forEach(k => localStorage.removeItem(k));
    }

    redirectToLogin() {
        window.location.replace(LOGIN_URL);
    }

    logout(showConfirmation = true) {
        const doLogout = () => {
            this.clearSession();
            this.redirectToLogin();
        };

        if (showConfirmation) {
            if (confirm('¿Estás seguro de que quieres cerrar sesión?')) doLogout();
        } else {
            doLogout();
        }
    }

    static logout() { new AuthSystem().logout(); }
    static forceLogout() { new AuthSystem().logout(false); }
}

window.authSystem = new AuthSystem();
window.logout = () => AuthSystem.logout();
window.forceLogout = () => AuthSystem.forceLogout();
