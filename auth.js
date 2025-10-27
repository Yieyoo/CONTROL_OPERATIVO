// js/auth.js - Sistema de autenticación unificado CORREGIDO
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
            console.log('🔄 Iniciando verificación de autenticación...');
            this.checkAuthentication();
            this.setupPeriodicCheck();
        } else {
            console.log('📄 Página de login, omitiendo verificación');
            // En login, limpiar cualquier sesión expirada
            this.cleanExpiredSession();
        }
    }

    isLoginPage() {
        const currentPath = window.location.pathname;
        // Verificar si estamos en login.html (ignorando parámetros URL)
        const isLogin = currentPath.endsWith('login.html') || 
                       currentPath.includes('/login.html') ||
                       window.location.href.includes('login.html');
        console.log('📍 Página actual:', currentPath, 'Es login:', isLogin);
        return isLogin;
    }

    checkAuthentication() {
        const isAuthenticated = localStorage.getItem('authenticated') === 'true';
        const loginTime = parseInt(localStorage.getItem('loginTime') || '0');
        const now = Date.now();
        const sessionAge = now - loginTime;
        
        console.log('🔐 Estado de sesión:', {
            autenticado: isAuthenticated,
            tiempoSesión: `${Math.round(sessionAge / 1000 / 60)} minutos`,
            expirado: sessionAge >= this.config.sessionDuration
        });

        if (!isAuthenticated || sessionAge >= this.config.sessionDuration) {
            console.log('❌ Sesión inválida o expirada');
            this.handleInvalidSession();
            return false;
        }

        console.log('✅ Sesión válida');
        return true;
    }

    handleInvalidSession() {
        // Limpiar sesión expirada
        this.clearSession();
        
        // Solo redirigir si no estamos ya en login
        if (!this.isLoginPage()) {
            console.log('🔄 Redirigiendo al login...');
            this.redirectToLogin();
        }
    }

    cleanExpiredSession() {
        const isAuthenticated = localStorage.getItem('authenticated') === 'true';
        const loginTime = parseInt(localStorage.getItem('loginTime') || '0');
        const now = Date.now();
        
        if (isAuthenticated && (now - loginTime) >= this.config.sessionDuration) {
            console.log('🧹 Limpiando sesión expirada en página de login');
            this.clearSession();
        }
    }

    clearSession() {
        console.log('🗑️ Limpiando datos de sesión');
        localStorage.removeItem('authenticated');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('userData');
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('lastAttempt');
    }

    redirectToLogin() {
        // Usar replace para evitar que quede en el historial
        const loginUrl = this.getLoginUrl();
        console.log('🚀 Redirigiendo a:', loginUrl);
        
        // Pequeño delay para asegurar que se procesen los logs
        setTimeout(() => {
            window.location.replace(loginUrl);
        }, 100);
    }

    getLoginUrl() {
        const currentPath = window.location.pathname;
        console.log('📍 Ruta actual para login:', currentPath);
        
        // Estrategia SIMPLE Y EFECTIVA basada en la ubicación
        if (currentPath.includes('/estados/') && currentPath.includes('/opciones/')) {
            // estados/aguascalientes/opciones/perroso.html
            console.log('🎯 Desde opciones → ../../../login.html');
            return '../../../login.html';
        } else if (currentPath.includes('/estados/')) {
            // estados/aguascalientes/aguascalientesindex.html
            console.log('🎯 Desde estado → ../../login.html');
            return '../../login.html';
        } else if (currentPath.includes('/datos_nacionales/') && currentPath.includes('/opcionesdatos/')) {
            // datos_nacionales/opcionesdatos/estadofuerza.html
            console.log('🎯 Desde datos_nacionales/opciones → ../../login.html');
            return '../../login.html';
        } else if (currentPath.includes('/datos_nacionales/')) {
            // datos_nacionales/datosindex.html
            console.log('🎯 Desde datos_nacionales → ../login.html');
            return '../login.html';
        } else {
            // Raíz: index.html, login.html
            console.log('🎯 Desde raíz → login.html');
            return 'login.html';
        }
    }

    logout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            console.log('🚪 Cerrando sesión...');
            this.clearSession();
            
            // Pequeño delay para que se vea el mensaje de confirmación
            setTimeout(() => {
                this.redirectToLogin();
            }, 300);
        }
    }

    setupPeriodicCheck() {
        // Verificar cada 30 segundos
        setInterval(() => {
            if (!this.isLoginPage()) {
                this.checkAuthentication();
            }
        }, 30000);
    }

    // Método estático para usar en HTML
    static logout() {
        new AuthSystem().logout();
    }
}

// Inicialización MEJORADA
console.log('🔧 auth.js cargado - Iniciando sistema de autenticación');

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 DOM listo - Inicializando AuthSystem');
        new AuthSystem();
    });
} else {
    console.log('📄 DOM ya listo - Inicializando AuthSystem inmediatamente');
    new AuthSystem();
}

// Función global para usar en onclick
window.logout = function() {
    console.log('🖱️ Click en logout detectado');
    AuthSystem.logout();
};