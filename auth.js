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
        const currentUrl = window.location.href;
        console.log('📍 Ruta actual:', currentPath);
        console.log('🌐 URL completa:', currentUrl);
        
        try {
            // Estrategia MEJORADA: usar la URL base del proyecto
            const baseUrl = this.getBaseUrl();
            const loginUrl = baseUrl + 'login.html';
            
            console.log('🎯 URL base del proyecto:', baseUrl);
            console.log('🎯 URL final del login:', loginUrl);
            
            return loginUrl;
            
        } catch (error) {
            console.error('❌ Error calculando ruta:', error);
            // Fallback: estrategia de niveles
            return this.getLoginUrlByLevels();
        }
    }

    getBaseUrl() {
        const currentUrl = window.location.href;
        
        // Si estamos en localhost o servidor local
        if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1') || currentUrl.includes('file://')) {
            return this.getBaseUrlForLocal();
        } else {
            // Para servidor remoto
            return this.getBaseUrlForServer();
        }
    }

    getBaseUrlForLocal() {
        const currentUrl = window.location.href;
        
        // Para archivos locales (file://)
        if (currentUrl.startsWith('file://')) {
            const pathSegments = currentUrl.split('/');
            // Encontrar la carpeta raíz del proyecto
            const projectRootIndex = pathSegments.findIndex(segment => 
                segment.includes('tu-proyecto') || // Cambia por el nombre de tu carpeta
                segment.includes('INM') || 
                segment.includes('ControlOperativo')
            );
            
            if (projectRootIndex !== -1) {
                return pathSegments.slice(0, projectRootIndex + 1).join('/') + '/';
            }
        }
        
        // Fallback: calcular desde path
        return this.getBaseUrlByPath();
    }

    getBaseUrlForServer() {
        const currentUrl = window.location.href;
        const urlObj = new URL(currentUrl);
        
        // Obtener el path hasta la raíz del proyecto
        const pathSegments = urlObj.pathname.split('/').filter(segment => segment);
        
        // Si estamos en la raíz del dominio
        if (pathSegments.length === 0) {
            return urlObj.origin + '/';
        }
        
        // Buscar patrones comunes de estructura
        if (pathSegments.includes('estados') || pathSegments.includes('datos_nacionales')) {
            // Asumir que el proyecto está en la raíz del dominio
            return urlObj.origin + '/';
        }
        
        // Fallback: usar el origen + primer segmento como raíz
        return urlObj.origin + '/' + (pathSegments[0] || '') + '/';
    }

    getBaseUrlByPath() {
        const currentPath = window.location.pathname;
        const pathSegments = currentPath.split('/').filter(segment => segment && !segment.includes('.html'));
        
        let basePath = '/';
        for (let i = 0; i < pathSegments.length; i++) {
            basePath += '../';
        }
        
        // Para file://, necesitamos construir la URL completa
        if (window.location.href.startsWith('file://')) {
            const absolutePath = window.location.href.split('/').slice(0, -pathSegments.length).join('/') + '/';
            return absolutePath;
        }
        
        return basePath;
    }

    getLoginUrlByLevels() {
        const currentPath = window.location.pathname;
        console.log('🔄 Usando cálculo por niveles para:', currentPath);
        
        // Estrategia de niveles mejorada
        if (currentPath.includes('/estados/') && currentPath.includes('/opciones/')) {
            // estados/aguascalientes/opciones/perroso.html
            console.log('🎯 Patrón: estado + opciones → ../../../login.html');
            return '../../../login.html';
        } else if (currentPath.includes('/estados/')) {
            // estados/aguascalientes/aguascalientesindex.html
            console.log('🎯 Patrón: estado → ../../login.html');
            return '../../login.html';
        } else if (currentPath.includes('/datos_nacionales/') && currentPath.includes('/opcionesdatos/')) {
            // datos_nacionales/opcionesdatos/estadofuerza.html
            console.log('🎯 Patrón: datos_nacionales + opcionesdatos → ../../login.html');
            return '../../login.html';
        } else if (currentPath.includes('/datos_nacionales/')) {
            // datos_nacionales/datosindex.html
            console.log('🎯 Patrón: datos_nacionales → ../login.html');
            return '../login.html';
        } else {
            // Raíz: index.html, login.html
            console.log('🎯 Patrón: raíz → login.html');
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

// Función para debug detallado
function debugAuthInfo() {
    console.log('🔍 DIAGNÓSTICO COMPLETO AUTH:');
    console.log('- URL:', window.location.href);
    console.log('- Path:', window.location.pathname);
    console.log('- Origin:', window.location.origin);
    console.log('- Protocol:', window.location.protocol);
    console.log('- Host:', window.location.host);
    
    const auth = new AuthSystem();
    console.log('- Ruta login (baseUrl):', auth.getBaseUrl() + 'login.html');
    console.log('- Ruta login (niveles):', auth.getLoginUrlByLevels());
    
    console.log('- LocalStorage auth:', localStorage.getItem('authenticated'));
    console.log('- LocalStorage loginTime:', localStorage.getItem('loginTime'));
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 DOM listo - Inicializando AuthSystem');
        debugAuthInfo();
        new AuthSystem();
    });
} else {
    console.log('📄 DOM ya listo - Inicializando AuthSystem inmediatamente');
    debugAuthInfo();
    new AuthSystem();
}

// Función global para usar en onclick
window.logout = function() {
    console.log('🖱️ Click en logout detectado');
    AuthSystem.logout();
};

// Función global para diagnóstico
window.authDebug = function() {
    debugAuthInfo();
};

// También exportar para uso en consola
window.AuthSystem = AuthSystem;