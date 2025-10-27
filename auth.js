// js/auth.js - Sistema de autenticación unificado MEJORADO
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
        const currentPath = window.location.pathname + window.location.search;
        const isLogin = currentPath.includes('login.html') || 
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
        window.location.replace(loginUrl);
    }

    getLoginUrl() {
        const currentPath = window.location.pathname;
        console.log('📍 Ruta actual:', currentPath);
        
        try {
            // Método ROBUSTO: calcular niveles de profundidad automáticamente
            const pathSegments = currentPath.split('/').filter(segment => 
                segment && segment !== '' && !segment.includes('.html')
            );
            
            // Si estamos en la raíz, no necesitamos "../"
            if (pathSegments.length === 0) {
                console.log('🎯 En raíz → login.html');
                return 'login.html';
            }
            
            // Calcular "../" necesarios
            let relativePath = '';
            for (let i = 0; i < pathSegments.length; i++) {
                relativePath += '../';
            }
            
            const finalUrl = relativePath + 'login.html';
            console.log(`🎯 Ruta calculada: ${finalUrl} (${pathSegments.length} niveles)`);
            
            return finalUrl;
            
        } catch (error) {
            console.error('❌ Error calculando ruta, usando fallback:', error);
            // Fallback seguro
            return '../../../login.html';
        }
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

// Función para debug inicial
function debugAuthInfo() {
    console.log('🔍 DIAGNÓSTICO AUTH:');
    console.log('- URL:', window.location.href);
    console.log('- Path:', window.location.pathname);
    console.log('- Authenticated:', localStorage.getItem('authenticated'));
    console.log('- LoginTime:', localStorage.getItem('loginTime'));
    console.log('- Ruta login calculada:', new AuthSystem().getLoginUrl());
    
    const pathSegments = window.location.pathname.split('/').filter(s => s && !s.includes('.html'));
    console.log('- Segmentos path:', pathSegments);
    console.log('- Niveles profundidad:', pathSegments.length);
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 DOM listo - Inicializando AuthSystem');
        debugAuthInfo(); // Debug info
        new AuthSystem();
    });
} else {
    console.log('📄 DOM ya listo - Inicializando AuthSystem inmediatamente');
    debugAuthInfo(); // Debug info
    new AuthSystem();
}

// Función global para usar en onclick
window.logout = function() {
    console.log('🖱️ Click en logout detectado');
    AuthSystem.logout();
};

// Función global para diagnóstico (útil para debugging)
window.authDebug = function() {
    debugAuthInfo();
};