class AuthSystem {
    constructor() {
        this.config = {
            sessionDuration: 8 * 60 * 60 * 1000, // 8 horas
            loginPage: 'login.html'
        };
        this.checkInProgress = false; // NUEVO: evitar múltiples verificaciones
        this.init();
    }

    init() {
        console.log('🔄 Sistema de autenticación OPTIMIZADO iniciado');
        
        // SOLO UNA verificación inicial
        if (!this.isLoginPage()) {
            console.log('🔐 Verificación única de autenticación...');
            // Pequeño delay para evitar conflictos con carga de página
            setTimeout(() => this.safeAuthCheck(), 100);
        } else {
            console.log('📄 Página de login, omitiendo verificación');
            this.cleanExpiredSession();
        }
        
        this.setupSmartNavigationEvents();
    }

    // NUEVO: Verificación segura que evita duplicados
    safeAuthCheck() {
        if (this.checkInProgress) {
            console.log('⏳ Verificación ya en progreso, omitiendo...');
            return;
        }
        
        this.checkInProgress = true;
        const result = this.checkAuthentication();
        this.checkInProgress = false;
        return result;
    }

    // NUEVO: Eventos de navegación OPTIMIZADOS
    setupSmartNavigationEvents() {
        // 1. Solo verificar cuando la página vuelve desde cache (navegación Atrás)
        window.addEventListener('pageshow', (event) => {
            if (event.persisted && !this.isLoginPage()) {
                console.log('📋 Página cargada desde cache - Verificando sesión');
                setTimeout(() => this.safeAuthCheck(), 200);
            }
        });

        // 2. Verificación periódica SUAVE (cada 2 minutos)
        this.setupGentlePeriodicCheck();

        console.log('🎯 Eventos de navegación optimizados configurados');
    }

    // NUEVO: Verificación periódica menos agresiva
    setupGentlePeriodicCheck() {
        if (!this.isLoginPage()) {
            setInterval(() => {
                this.safeAuthCheck();
            }, 120000); // 2 minutos en lugar de 30 segundos
        }
    }

    isLoginPage() {
        const currentPath = window.location.pathname;
        const isLogin = currentPath.endsWith('login.html') || 
                       currentPath.includes('/login.html') ||
                       window.location.href.includes('login.html');
        console.log('📍 Página actual:', currentPath, 'Es login:', isLogin);
        return isLogin;
    }

    checkAuthentication() {
        // CÓDIGO ORIGINAL (este está bien)
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
        this.clearSession();
        
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
    }

    redirectToLogin() {
        const loginUrl = this.getLoginUrl();
        console.log('🚀 Redirigiendo a:', loginUrl);
        
        // Usar location.replace() para evitar que quede en historial
        window.location.replace(loginUrl);
    }

    getLoginUrl() {
        // TU CÓDIGO ORIGINAL (este está bien)
        const currentPath = window.location.pathname;
        console.log('📍 Ruta actual para login:', currentPath);
        
        const pathParts = currentPath.split('/').filter(part => part !== '');
        const depth = pathParts.length - 1;
        
        console.log('📊 Niveles de profundidad:', depth, 'Partes:', pathParts);
        
        // Tus casos específicos...
        if (currentPath.includes('/estados/') && currentPath.includes('/opciones/')) {
            console.log('🎯 Desde opciones → ../../../login.html');
            return '../../../login.html';
        }
        // ... (mantener tu lógica original)
        
        // CASO GENÉRICO
        if (depth === 0) return 'login.html';
        if (depth === 1) return '../login.html';
        if (depth === 2) return '../../login.html';
        if (depth === 3) return '../../../login.html';
        return '../../../../login.html';
    }

    logout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            console.log('🚪 Cerrando sesión...');
            this.clearSession();
            this.redirectToLogin();
        }
    }

    // Método estático para usar en HTML
    static logout() {
        new AuthSystem().logout();
    }
}

// Inicialización SIMPLIFICADA
console.log('🔧 auth.js OPTIMIZADO cargado');

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 DOM listo - Inicializando AuthSystem OPTIMIZADO');
        new AuthSystem();
    });
} else {
    console.log('📄 DOM ya listo - Inicializando AuthSystem OPTIMIZADO');
    new AuthSystem();
}

// Función global para usar en onclick
window.logout = function() {
    console.log('🖱️ Click en logout detectado');
    AuthSystem.logout();
};