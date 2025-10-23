// js/auth.js - Sistema de autenticación unificado
class AuthSystem {
    constructor() {
        this.config = {
            sessionDuration: 8 * 60 * 60 * 1000, // 8 horas
            loginPage: 'login.html'
        };
        this.init();
    }

    init() {
        // Solo verificar si NO estamos en la página de login
        if (!this.isLoginPage()) {
            this.checkAuthentication();
            this.setupPeriodicCheck();
        }
    }

    isLoginPage() {
        return window.location.pathname.includes('login.html') || 
               window.location.href.includes('login.html');
    }

    checkAuthentication() {
        const isAuthenticated = localStorage.getItem('authenticated') === 'true';
        const loginTime = parseInt(localStorage.getItem('loginTime') || '0');
        const now = Date.now();
        
        console.log('🔐 Verificando autenticación...', {
            página: window.location.href,
            autenticado: isAuthenticated,
            tiempoSesión: `${Math.round((now - loginTime) / 1000 / 60)} minutos`,
            expirado: (now - loginTime) >= this.config.sessionDuration
        });

        if (!isAuthenticated || (now - loginTime) >= this.config.sessionDuration) {
            // Limpiar sesión expirada
            if (isAuthenticated) {
                this.clearSession();
            }
            
            console.log('❌ Sin sesión válida, redirigiendo al login...');
            this.redirectToLogin();
            return false;
        }

        console.log('✅ Sesión válida');
        return true;
    }

    clearSession() {
        localStorage.removeItem('authenticated');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('userData');
    }

    redirectToLogin() {
        window.location.href = this.config.loginPage;
    }

    logout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            console.log('🚪 Cerrando sesión...');
            this.clearSession();
            this.redirectToLogin();
        }
    }

    setupPeriodicCheck() {
        // Verificar cada 30 segundos
        setInterval(() => {
            this.checkAuthentication();
        }, 30000);
    }

    // Método estático para usar en HTML
    static logout() {
        new AuthSystem().logout();
    }
}

// Inicializar automáticamente
document.addEventListener('DOMContentLoaded', function() {
    new AuthSystem();
});

// Función global para usar en onclick
window.logout = function() {
    AuthSystem.logout();
};