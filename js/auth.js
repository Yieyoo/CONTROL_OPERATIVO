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
            loginTime && (Date.now() - loginTime) < 8 * 60 * 60 * 1000;

        if (!sessionValid) {
            localStorage.removeItem('authenticated');
            localStorage.removeItem('username');
            localStorage.removeItem('loginTime');
            this.redirectToLogin();
        } else {
            const ls = document.getElementById('loadingScreen');
            if (ls) ls.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    redirectToLogin() {
        window.location.replace('/login.html');
    }

    logout(showConfirmation = true) {
        const doLogout = () => {
            localStorage.removeItem('authenticated');
            localStorage.removeItem('username');
            localStorage.removeItem('loginTime');
            window.location.replace('/login.html');
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
