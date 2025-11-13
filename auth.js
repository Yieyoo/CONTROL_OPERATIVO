class AuthSystem {
    constructor() {
        this.config = {
            sessionDuration: 8 * 60 * 60 * 1000, // 8 horas
            loginPage: 'login.html'
        };
        this.checkInProgress = false;
        this.init();
    }

    init() {
        console.log('🔄 Sistema de autenticación COMPLETO iniciado');
        
        this.setupNavigationEvents();
        
        // VERIFICACIÓN INICIAL (igual que antes)
        if (!this.isLoginPage()) {
            console.log('🔐 Verificación inicial de autenticación...');
            setTimeout(() => this.safeAuthCheck(), 100);
        } else {
            console.log('📄 Página de login, omitiendo verificación');
            this.cleanExpiredSession();
        }
    }

    // EVENTOS DE NAVEGACIÓN COMPLETOS (igual que antes)
    setupNavigationEvents() {
        // 1. Detectar cuando la página se muestra desde cache (navegación Atrás)
        window.addEventListener('pageshow', (event) => {
            console.log('🔄 Evento pageshow detectado');
            if (event.persisted) {
                console.log('📋 Página cargada desde cache - Re-verificando sesión');
            }
            if (!this.isLoginPage()) {
                setTimeout(() => this.safeAuthCheck(), 100);
            }
        });

        // 2. Detectar cuando la página se hace visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !this.isLoginPage()) {
                console.log('👀 Página visible - Verificando sesión');
                setTimeout(() => this.safeAuthCheck(), 100);
            }
        });

        // 3. VERIFICACIÓN ADICIONAL CUANDO LA PÁGINA TERMINA DE CARGAR
        // ¡ESTA ES LA QUE FALTABA PARA LOS LOGOUT EN SUBCARPETAS!
        window.addEventListener('load', () => {
            console.log('📄 Página completamente cargada - Verificación final');
            if (!this.isLoginPage()) {
                setTimeout(() => this.safeAuthCheck(), 150);
            }
        });

        // 4. Verificación periódica
        this.setupPeriodicCheck();

        console.log('🎯 Eventos de navegación COMPLETOS configurados');
    }

    // VERIFICACIÓN SEGURA (para evitar duplicados)
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
        
        setTimeout(() => {
            window.location.replace(loginUrl);
        }, 100);
    }

    getLoginUrl() {
        const currentPath = window.location.pathname;
        console.log('📍 Ruta actual para login:', currentPath);
        
        const pathParts = currentPath.split('/').filter(part => part !== '');
        const depth = pathParts.length - 1;
        
        console.log('📊 Niveles de profundidad:', depth, 'Partes:', pathParts);
        
        // CASOS ESPECÍFICOS (tu lógica original)
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
        } else if (currentPath.includes('/gestor_archivos/')) {
            console.log('🎯 Desde gestor_archivos → ../login.html');
            return '../login.html';
        }
        // CASO GENÉRICO
        else if (depth === 0) {
            console.log('🎯 Desde raíz → login.html');
            return 'login.html';
        } else if (depth === 1) {
            console.log('🎯 Desde 1 nivel abajo → ../login.html');
            return '../login.html';
        } else if (depth === 2) {
            console.log('🎯 Desde 2 niveles abajo → ../../login.html');
            return '../../login.html';
        } else if (depth === 3) {
            console.log('🎯 Desde 3 niveles abajo → ../../../login.html');
            return '../../../login.html';
        } else {
            console.log('🎯 Desde muchos niveles → ../../../../login.html');
            return '../../../../login.html';
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
        setInterval(() => {
            if (!this.isLoginPage()) {
                this.safeAuthCheck();
            }
        }, 30000); // 30 segundos
    }

    // Método estático para usar en HTML
    static logout() {
        new AuthSystem().logout();
    }
}

// INICIALIZACIÓN COMPLETA (igual que tu versión original)
console.log('🔧 auth.js COMPLETO cargado - Iniciando sistema de autenticación');

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 DOM listo - Inicializando AuthSystem COMPLETO');
        new AuthSystem();
    });
} else {
    console.log('📄 DOM ya listo - Inicializando AuthSystem COMPLETO inmediatamente');
    new AuthSystem();
}

// Función global para usar en onclick
window.logout = function() {
    console.log('🖱️ Click en logout detectado');
    AuthSystem.logout();
};