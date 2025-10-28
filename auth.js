class AuthSystem {
    constructor() {
        this.config = {
            sessionDuration: 8 * 60 * 60 * 1000, // 8 horas
            loginPage: 'login.html'
        };
        this.init();
    }

    init() {
        console.log('🔄 Sistema de autenticación MEJORADO iniciado');
        
        this.setupNavigationEvents();
        
        // LUEGO verificar autenticación
        if (!this.isLoginPage()) {
            console.log('🔐 Verificación INMEDIATA de autenticación...');
            this.immediateAuthCheck();
            this.setupPeriodicCheck();
        } else {
            console.log('📄 Página de login, omitiendo verificación');
            this.cleanExpiredSession();
        }
    }

    // NUEVO: Configurar eventos para detectar navegación "Atrás"
    setupNavigationEvents() {
        // 1. Detectar cuando la página se muestra desde cache (navegación Atrás)
        window.addEventListener('pageshow', (event) => {
            console.log('🔄 Evento pageshow detectado');
            if (event.persisted) {
                console.log('📋 Página cargada desde cache - Re-verificando sesión');
            }
            if (!this.isLoginPage()) {
                setTimeout(() => this.checkAuthentication(), 50);
            }
        });

        // 2. Detectar cuando la página se hace visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !this.isLoginPage()) {
                console.log('👀 Página visible - Verificando sesión');
                setTimeout(() => this.checkAuthentication(), 50);
            }
        });

        // 3. Verificación adicional cuando la página termina de cargar
        window.addEventListener('load', () => {
            if (!this.isLoginPage()) {
                console.log('📄 Página completamente cargada - Verificación final');
                this.checkAuthentication();
            }
        });

        console.log('🎯 Eventos de navegación configurados');
    }

    // NUEVO: Verificación inmediata y más robusta
    immediateAuthCheck() {
        console.log('🔐 Ejecutando verificación INMEDIATA...');
        const isValid = this.checkAuthentication();
        
        if (!isValid) {
            console.log('🚫 Acceso denegado - Redirigiendo inmediatamente');
            return false;
        }
        
        console.log('✅ Verificación inmediata exitosa');
        return true;
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
            console.log('🎯 Desde opciones → ../../../login.html');
            return '../../../login.html';
        } else if (currentPath.includes('/estados/')) {
            console.log('🎯 Desde estado → ../../login.html');
            return '../../login.html';
        } else if (currentPath.includes('/datos_nacionales/') && currentPath.includes('/opcionesdatos/')) {
            console.log('🎯 Desde datos_nacionales/opciones → ../../login.html');
            return '../../login.html';
        } else if (currentPath.includes('/datos_nacionales/')) {
            console.log('🎯 Desde datos_nacionales → ../login.html');
            return '../login.html';
        } else {
            console.log('🎯 Desde raíz → login.html');
            return 'login.html';
        }
    }

    logout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            console.log('🚪 Cerrando sesión...');
            this.clearSession();
            
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
console.log('🔧 auth.js MEJORADO cargado - Iniciando sistema de autenticación');

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 DOM listo - Inicializando AuthSystem MEJORADO');
        new AuthSystem();
    });
} else {
    console.log('📄 DOM ya listo - Inicializando AuthSystem MEJORADO inmediatamente');
    new AuthSystem();
}

// Función global para usar en onclick
window.logout = function() {
    console.log('🖱️ Click en logout detectado');
    AuthSystem.logout();
};