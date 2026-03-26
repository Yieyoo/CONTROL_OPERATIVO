class AuthSystem {
    constructor() {
        this.config = {
            sessionDuration: 8 * 60 * 60 * 1000, // 8 horas
            loginPage: 'login.html',
            checkInterval: 30000, // 30 segundos
            retryDelay: 100
        };
        this.checkInProgress = false;
        this.periodicCheckInterval = null;
        this.init();
    }

    init() {
        console.log('🔄 Sistema de autenticación COMPLETO iniciado');
        
        // Limpiar intervalos previos por si hay múltiples instancias
        this.cleanup();
        
        this.setupNavigationEvents();
        
        if (!this.isLoginPage()) {
            console.log('🔐 Verificación inicial de autenticación...');
            setTimeout(() => this.safeAuthCheck(), this.config.retryDelay);
        } else {
            console.log('📄 Página de login, omitiendo verificación');
            this.cleanExpiredSession();
        }
    }

    // EVENTOS DE NAVEGACIÓN MEJORADOS
    setupNavigationEvents() {
        // 1. Detectar cuando la página se muestra desde cache (navegación Atrás)
        window.addEventListener('pageshow', (event) => {
            console.log('🔄 Evento pageshow detectado', event.persisted ? '(desde cache)' : '');
            if (!this.isLoginPage()) {
                setTimeout(() => this.safeAuthCheck(), this.config.retryDelay);
            }
        });

        // 2. Detectar cuando la página se hace visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !this.isLoginPage()) {
                console.log('👀 Página visible - Verificando sesión');
                setTimeout(() => this.safeAuthCheck(), this.config.retryDelay);
            }
        });

        // 3. Verificación cuando la página termina de cargar
        window.addEventListener('load', () => {
            console.log('📄 Página completamente cargada - Verificación final');
            if (!this.isLoginPage()) {
                setTimeout(() => this.safeAuthCheck(), this.config.retryDelay + 50);
            }
        });

        // 4. Detectar cambios de hash (navegación SPA)
        window.addEventListener('hashchange', () => {
            console.log('🔗 Hash cambiado - Verificando sesión');
            if (!this.isLoginPage()) {
                setTimeout(() => this.safeAuthCheck(), this.config.retryDelay);
            }
        });

        // 5. Verificación periódica
        this.setupPeriodicCheck();

        console.log('🎯 Eventos de navegación COMPLETOS configurados');
    }

    // VERIFICACIÓN SEGURA MEJORADA
    safeAuthCheck() {
        if (this.checkInProgress) {
            console.log('⏳ Verificación ya en progreso, omitiendo...');
            return Promise.resolve(false);
        }
        
        this.checkInProgress = true;
        
        return new Promise((resolve) => {
            setTimeout(() => {
                const result = this.checkAuthentication();
                this.checkInProgress = false;
                resolve(result);
            }, 0);
        });
    }

    isLoginPage() {
        const currentPath = window.location.pathname;
        const currentUrl = window.location.href;
        
        const isLogin = currentPath.endsWith('login.html') || 
                       currentPath.includes('/login.html') ||
                       currentUrl.includes('login.html') ||
                       currentPath.endsWith('login') ||
                       currentUrl.includes('/login');
        
        console.log('📍 Página actual:', currentPath, 'Es login:', isLogin);
        return isLogin;
    }

    checkAuthentication() {
        try {
            const isAuthenticated = localStorage.getItem('authenticated') === 'true';
            const loginTime = parseInt(localStorage.getItem('loginTime') || '0');
            const userData = localStorage.getItem('userData');
            const now = Date.now();
            const sessionAge = now - loginTime;
            
            console.log('🔐 Estado de sesión:', {
                autenticado: isAuthenticated,
                tiempoSesión: `${Math.round(sessionAge / 1000 / 60)} minutos`,
                expirado: sessionAge >= this.config.sessionDuration,
                userData: userData ? 'Presente' : 'No disponible'
            });

            // Verificar si la sesión es válida
            const isValidSession = isAuthenticated && 
                                 loginTime > 0 && 
                                 sessionAge < this.config.sessionDuration;

            if (!isValidSession) {
                console.log('❌ Sesión inválida o expirada');
                this.handleInvalidSession();
                return false;
            }

            // Verificar si la sesión está por expirar (últimos 5 minutos)
            const timeUntilExpiry = this.config.sessionDuration - sessionAge;
            if (timeUntilExpiry < 5 * 60 * 1000) { // 5 minutos
                console.log('⚠️ Sesión por expirar en:', Math.round(timeUntilExpiry / 1000 / 60), 'minutos');
            }

            console.log('✅ Sesión válida');
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando autenticación:', error);
            this.handleInvalidSession();
            return false;
        }
    }

    handleInvalidSession() {
        // Guardar la página actual para posible redirección después del login
        if (!this.isLoginPage()) {
            const currentUrl = window.location.href;
            sessionStorage.setItem('redirectAfterLogin', currentUrl);
        }
        
        this.clearSession();
        
        if (!this.isLoginPage()) {
            console.log('🔄 Redirigiendo al login...');
            this.redirectToLogin();
        }
    }

    cleanExpiredSession() {
        try {
            const isAuthenticated = localStorage.getItem('authenticated') === 'true';
            const loginTime = parseInt(localStorage.getItem('loginTime') || '0');
            const now = Date.now();
            
            if (isAuthenticated && (now - loginTime) >= this.config.sessionDuration) {
                console.log('🧹 Limpiando sesión expirada en página de login');
                this.clearSession();
            }
        } catch (error) {
            console.error('Error limpiando sesión expirada:', error);
        }
    }

    clearSession() {
        console.log('🗑️ Limpiando datos de sesión');
        try {
            localStorage.removeItem('authenticated');
            localStorage.removeItem('loginTime');
            localStorage.removeItem('userData');
            
            // También limpiar sessionStorage relacionado con auth
            sessionStorage.removeItem('redirectAfterLogin');
        } catch (error) {
            console.error('Error limpiando sesión:', error);
        }
    }

    redirectToLogin() {
        const loginUrl = this.getLoginUrl();
        console.log('🚀 Redirigiendo a:', loginUrl);
        
        // Usar replace para evitar que el usuario vuelva atrás a páginas no autenticadas
        setTimeout(() => {
            window.location.replace(loginUrl);
        }, this.config.retryDelay);
    }

    getLoginUrl() {
        const currentPath = window.location.pathname;
        console.log('📍 Ruta actual para login:', currentPath);
        
        // ESTRATEGIA MEJORADA PARA TODAS LAS CARPETAS
        if (currentPath.includes('/estados/') && currentPath.includes('/opciones/')) {
            // Ej: /CONTROL_OPERATIVO/estados/aguascalientes/opciones/unidad_canina.html
            console.log('🎯 Desde opciones estado → ../../../login.html');
            return '../../../login.html';
        } else if (currentPath.includes('/estados/')) {
            // Ej: /CONTROL_OPERATIVO/estados/aguascalientes/aguascalientesindex.html
            console.log('🎯 Desde estado → ../../login.html');
            return '../../login.html';
        } else if (currentPath.includes('/datos_nacionales/opcionesdatos/')) {
            // Ej: /CONTROL_OPERATIVO/datos_nacionales/opcionesdatos/plantilla.html
            console.log('🎯 Desde opciones datos → ../../login.html');
            return '../../login.html';
        } else if (currentPath.includes('/datos_nacionales/')) {
            // Ej: /CONTROL_OPERATIVO/datos_nacionales/datosindex.html
            console.log('🎯 Desde datos nacionales → ../login.html');
            return '../login.html';
        } else if (currentPath.includes('/gestion/') || currentPath.includes('/gestor_archivos/')) {
            // CORRECCIÓN: Ambas posibles rutas para el gestor de archivos
            // Ej: /CONTROL_OPERATIVO/gestion/archivos.html
            // Ej: /CONTROL_OPERATIVO/gestor_archivos/archivos.html
            console.log('🎯 Desde gestión/gestor_archivos → ../login.html');
            return '../login.html';
        } else if (currentPath.includes('/construccion/')) {
            // Ej: /CONTROL_OPERATIVO/construccion/construccion.html
            console.log('🎯 Desde construcción → ../login.html');
            return '../login.html';
        }
        // CASO GENÉRICO MEJORADO - CALCULAR AUTOMÁTICAMENTE
        else {
            const pathParts = currentPath.split('/').filter(part => part !== '');
            const depth = pathParts.length - 1;
            
            console.log('📊 Niveles de profundidad calculados:', depth);
            
            if (depth === 0) {
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
            } else if (depth === 4) {
                console.log('🎯 Desde 4 niveles abajo → ../../../../login.html');
                return '../../../../login.html';
            } else {
                console.log('🎯 Desde muchos niveles → ../../../../../login.html');
                return '../../../../../login.html';
            }
        }
    }

    logout(showConfirmation = true) {
        const performLogout = () => {
            console.log('🚪 Cerrando sesión...');
            
            // Opcional: enviar evento de logout para analytics
            this.dispatchLogoutEvent();
            
            this.clearSession();
            
            setTimeout(() => {
                this.redirectToLogin();
            }, 300);
        };

        if (showConfirmation) {
            if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                performLogout();
            }
        } else {
            performLogout();
        }
    }

    // Nuevo método para forzar logout sin confirmación
    forceLogout() {
        this.logout(false);
    }

    setupPeriodicCheck() {
        // Limpiar intervalo previo si existe
        if (this.periodicCheckInterval) {
            clearInterval(this.periodicCheckInterval);
        }
        
        this.periodicCheckInterval = setInterval(() => {
            if (!this.isLoginPage()) {
                this.safeAuthCheck();
            }
        }, this.config.checkInterval);
    }

    // Método para limpiar recursos
    cleanup() {
        if (this.periodicCheckInterval) {
            clearInterval(this.periodicCheckInterval);
            this.periodicCheckInterval = null;
        }
    }

    // Disparar evento personalizado para analytics/logs
    dispatchLogoutEvent() {
        const logoutEvent = new CustomEvent('authLogout', {
            detail: {
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                path: window.location.pathname
            }
        });
        window.dispatchEvent(logoutEvent);
    }

    // Métodos estáticos para uso global
    static logout() {
        new AuthSystem().logout();
    }

    static forceLogout() {
        new AuthSystem().forceLogout();
    }

    // Método para verificar estado actual (útil para otros scripts)
    static getAuthStatus() {
        const auth = new AuthSystem();
        return auth.checkAuthentication();
    }
}

// INICIALIZACIÓN MEJORADA
console.log('🔧 auth.js UNIVERSAL cargado - Iniciando sistema de autenticación');

// Función de inicialización segura
function initializeAuthSystem() {
    try {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                console.log('📄 DOM listo - Inicializando AuthSystem UNIVERSAL');
                window.authSystem = new AuthSystem();
            });
        } else {
            console.log('📄 DOM ya listo - Inicializando AuthSystem UNIVERSAL inmediatamente');
            window.authSystem = new AuthSystem();
        }
    } catch (error) {
        console.error('❌ Error inicializando sistema de autenticación:', error);
    }
}

// Inicializar el sistema
initializeAuthSystem();

// Funciones globales para usar en HTML
window.logout = function() {
    console.log('🖱️ Click en logout detectado');
    AuthSystem.logout();
};

window.forceLogout = function() {
    console.log('🖱️ Click en forceLogout detectado');
    AuthSystem.forceLogout();
};

// Exportar para uso en módulos (si es necesario)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthSystem;
}