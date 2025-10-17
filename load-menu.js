// load-menu.js - SISTEMA DE MENÚ GLOBAL UNIVERSAL
class MenuLoader {
    static CONFIG = {
        MENU_FILE: 'menu.html',
        LOAD_DELAY: 100,
        MAX_RETRIES: 3,
        RETRY_DELAY: 200
    };

    static async loadMenu() {
        try {
            console.log('🌐 Cargando menú global...');
            
            const menuPath = this.getUniversalMenuPath();
            console.log('📍 Ruta universal del menú:', menuPath);
            
            const response = await fetch(menuPath);
            if (!response.ok) {
                throw new Error(`Error ${response.status} al cargar: ${menuPath}`);
            }
            
            const menuHTML = await response.text();
            
            // Inyectar el menú de forma segura
            this.injectMenuSafely(menuHTML);
            
            console.log('✅ Menú global inyectado correctamente');
            
            // Configurar eventos con reintentos
            await this.setupMenuWithRetry();
            
        } catch (error) {
            console.error('❌ Error crítico cargando menú:', error);
            await this.loadIntelligentFallback();
        }
    }
    
    /**
     * CALCULA LA RUTA CORRECTA DESDE CUALQUIER CARPETA
     * Esta es la clave del sistema universal
     */
    static getUniversalMenuPath() {
        const currentPath = window.location.pathname;
        console.log('📁 Ruta actual:', currentPath);
        
        // Determinar cuántos niveles debemos subir
        const depth = this.calculateFolderDepth(currentPath);
        console.log('📊 Niveles de carpeta a subir:', depth);
        
        // Construir la ruta relativa al menú principal
        let relativePath = '';
        for (let i = 0; i < depth; i++) {
            relativePath += '../';
        }
        relativePath += this.CONFIG.MENU_FILE;
        
        console.log('🔄 Ruta relativa calculada:', relativePath);
        return relativePath;
    }
    
    /**
     * CALCULA PROFUNDIDAD DE CARPETAS DE FORMA INTELIGENTE
     */
    static calculateFolderDepth(currentPath) {
        // Remover el archivo actual del path
        const pathWithoutFile = currentPath.substring(0, currentPath.lastIndexOf('/'));
        
        // Contar carpetas (excluyendo vacías y la raíz)
        const folders = pathWithoutFile.split('/').filter(folder => 
            folder && folder !== '' && folder !== 'index.html'
        );
        
        console.log('📂 Estructura de carpetas:', folders);
        return folders.length;
    }
    
    /**
     * INYECCIÓN SEGURA DEL MENÚ
     */
    static injectMenuSafely(menuHTML) {
        // Eliminar menús existentes para evitar duplicados
        this.removeExistingMenus();
        
        // Insertar al inicio del body
        document.body.insertAdjacentHTML('afterbegin', menuHTML);
        
        // Forzar reflow para asegurar que el DOM se actualice
        document.body.offsetHeight;
    }
    
    /**
     * ELIMINA MENÚS EXISTENTES PARA EVITAR DUPLICADOS
     */
    static removeExistingMenus() {
        const existingMenus = document.querySelectorAll('.menu, .menu-overlay, .menu-toggle');
        existingMenus.forEach(element => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
    }
    
    /**
     * CONFIGURACIÓN CON REINTENTOS INTELIGENTES
     */
    static async setupMenuWithRetry(retryCount = 0) {
        try {
            await this.delay(this.CONFIG.LOAD_DELAY);
            this.setupAllMenuEvents();
            console.log('🎯 Eventos del menú configurados correctamente');
        } catch (error) {
            if (retryCount < this.CONFIG.MAX_RETRIES) {
                console.log(`🔄 Reintentando configuración... (${retryCount + 1}/${this.CONFIG.MAX_RETRIES})`);
                await this.delay(this.CONFIG.RETRY_DELAY * (retryCount + 1));
                return this.setupMenuWithRetry(retryCount + 1);
            }
            throw new Error(`No se pudo configurar el menú después de ${this.CONFIG.MAX_RETRIES} intentos`);
        }
    }
    
    /**
     * CONFIGURACIÓN COMPLETA DE EVENTOS
     */
    static setupAllMenuEvents() {
        // 1. Eventos básicos del menú
        this.setupBasicMenuEvents();
        
        // 2. Corregir TODAS las rutas automáticamente
        this.fixAllMenuLinks();
        
        // 3. Configurar submenús
        this.setupSubmenus();
        
        // 4. Configurar enlaces de navegación
        this.setupNavigationLinks();
        
        // 5. Configurar logout
        this.setupLogout();
    }
    
    /**
     * EVENTOS BÁSICOS DEL MENÚ
     */
    static setupBasicMenuEvents() {
        const menuToggle = document.querySelector('.menu-toggle');
        const menu = document.querySelector('.menu');
        const menuOverlay = document.querySelector('.menu-overlay');
        
        if (!menuToggle || !menu || !menuOverlay) {
            throw new Error('Elementos esenciales del menú no encontrados');
        }
        
        // Toggle del menú principal
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
            menuOverlay.classList.toggle('active');
            console.log('🎯 Menú toggled');
        });
        
        // Cerrar menú al hacer clic en overlay
        menuOverlay.addEventListener('click', () => {
            menu.classList.remove('active');
            menuOverlay.classList.remove('active');
            this.closeAllSubmenus();
        });
        
        // Cerrar menú con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                menu.classList.remove('active');
                menuOverlay.classList.remove('active');
                this.closeAllSubmenus();
            }
        });
    }
    
    /**
     * CORREGIR TODAS LAS RUTAS DEL MENÚ AUTOMÁTICAMENTE
     * ESTO ES CLAVE PARA EL FUNCIONAMIENTO UNIVERSAL
     */
    static fixAllMenuLinks() {
        console.log('🔧 Corrigiendo rutas de todos los enlaces...');
        
        const allLinks = document.querySelectorAll('.menu a[href]');
        console.log(`🔗 Encontrados ${allLinks.length} enlaces para corregir`);
        
        allLinks.forEach(link => {
            const originalHref = link.getAttribute('href');
            
            if (this.shouldFixLink(originalHref)) {
                const correctedHref = this.fixSingleLinkPath(originalHref);
                
                if (correctedHref !== originalHref) {
                    link.setAttribute('href', correctedHref);
                    console.log(`🔄 Ruta corregida: ${originalHref} → ${correctedHref}`);
                }
            }
        });
    }
    
    /**
     * DECIDE SI UN ENLACE DEBE SER CORREGIDO
     */
    static shouldFixLink(href) {
        // No corregir enlaces absolutos, anchors, o scripts
        return href && 
               !href.startsWith('http') && 
               !href.startsWith('//') &&
               !href.startsWith('#') && 
               !href.startsWith('javascript:') &&
               !href.startsWith('mailto:') &&
               !href.startsWith('tel:');
    }
    
    /**
     * CORRIGE LA RUTA DE UN ENLACE INDIVIDUAL
     */
    static fixSingleLinkPath(originalHref) {
        const currentDepth = this.calculateFolderDepth(window.location.pathname);
        const targetDepth = this.calculateLinkDepth(originalHref);
        
        // Calcular cuántos "../" necesitamos
        const depthDifference = currentDepth - targetDepth;
        
        let correctedPath = '';
        for (let i = 0; i < depthDifference; i++) {
            correctedPath += '../';
        }
        correctedPath += originalHref;
        
        return correctedPath;
    }
    
    /**
     * CALCULA LA PROFUNDIDAD DE UN ENLACE
     */
    static calculateLinkDepth(href) {
        // Contar las carpetas en el enlace de destino
        const path = href.split('/').filter(part => part && !part.includes('.html'));
        return path.length;
    }
    
    /**
     * CONFIGURACIÓN MEJORADA DE SUBMENÚS
     */
    static setupSubmenus() {
        const submenuToggles = document.querySelectorAll('.submenu > a');
        console.log(`🎯 Configurando ${submenuToggles.length} submenús`);
        
        submenuToggles.forEach(toggle => {
            // Limpiar eventos anteriores
            toggle.replaceWith(toggle.cloneNode(true));
            
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const submenu = toggle.parentElement;
                const isActive = submenu.classList.contains('active');
                
                // Cerrar todos los submenús primero
                this.closeAllSubmenus();
                
                // Abrir el actual si no estaba activo
                if (!isActive) {
                    submenu.classList.add('active');
                }
            });
        });
        
        // Cerrar submenús al hacer clic fuera
        document.addEventListener('click', () => {
            this.closeAllSubmenus();
        });
    }
    
    /**
     * CONFIGURACIÓN DE ENLACES DE NAVEGACIÓN
     */
    static setupNavigationLinks() {
        const menuLinks = document.querySelectorAll('.menu a:not(.submenu > a)');
        
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                // Cerrar menú al navegar
                this.closeMenu();
                console.log('🔗 Navegando a:', link.href);
            });
        });
    }
    
    /**
     * CONFIGURACIÓN DE LOGOUT MEJORADA
     */
    static setupLogout() {
        const logoutLinks = document.querySelectorAll('.logout-link');
        
        logoutLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.performLogout();
            });
        });
    }
    
    /**
     * LOGOUT CON REDIRECCIÓN INTELIGENTE
     */
    static performLogout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            console.log('🚪 Cerrando sesión...');
            
            // Limpiar datos de sesión
            localStorage.removeItem('authenticated');
            localStorage.removeItem('loginTime');
            
            // Redirigir al login con la ruta correcta
            const loginPath = this.getUniversalLoginPath();
            window.location.href = loginPath;
        }
    }
    
    /**
     * OBTIENE RUTA UNIVERSAL PARA LOGIN
     */
    static getUniversalLoginPath() {
        const depth = this.calculateFolderDepth(window.location.pathname);
        let loginPath = '';
        
        for (let i = 0; i < depth; i++) {
            loginPath += '../';
        }
        loginPath += 'login.html';
        
        return loginPath;
    }
    
    /**
     * MENÚ DE RESERVA INTELIGENTE
     */
    static async loadIntelligentFallback() {
        console.warn('🔄 Cargando menú de respaldo inteligente...');
        
        const fallbackMenu = `
            <div class="menu-overlay"></div>
            <button class="menu-toggle">☰</button>
            <nav class="menu">
                <ul>
                    <li><a href="#" class="go-home">🏠 Inicio</a></li>
                    <li><a href="#" class="go-login">🔐 Iniciar Sesión</a></li>
                    <li><a href="#" class="reload-page">🔄 Recargar Página</a></li>
                </ul>
            </nav>
        `;
        
        this.injectMenuSafely(fallbackMenu);
        
        // Configurar eventos del menú de respaldo
        setTimeout(() => {
            this.setupFallbackEvents();
        }, this.CONFIG.LOAD_DELAY);
    }
    
    /**
     * EVENTOS DEL MENÚ DE RESERVA
     */
    static setupFallbackEvents() {
        const homeLink = document.querySelector('.go-home');
        const loginLink = document.querySelector('.go-login');
        const reloadLink = document.querySelector('.reload-page');
        
        if (homeLink) {
            homeLink.addEventListener('click', () => {
                const homePath = this.getUniversalHomePath();
                window.location.href = homePath;
            });
        }
        
        if (loginLink) {
            loginLink.addEventListener('click', () => {
                const loginPath = this.getUniversalLoginPath();
                window.location.href = loginPath;
            });
        }
        
        if (reloadLink) {
            reloadLink.addEventListener('click', () => {
                window.location.reload();
            });
        }
        
        this.setupBasicMenuEvents();
    }
    
    /**
     * OBTIENE RUTA UNIVERSAL PARA INICIO
     */
    static getUniversalHomePath() {
        const depth = this.calculateFolderDepth(window.location.pathname);
        let homePath = '';
        
        for (let i = 0; i < depth; i++) {
            homePath += '../';
        }
        homePath += 'index.html';
        
        return homePath;
    }
    
    /**
     * CIERRA EL MENÚ COMPLETAMENTE
     */
    static closeMenu() {
        const menu = document.querySelector('.menu');
        const menuOverlay = document.querySelector('.menu-overlay');
        
        if (menu) menu.classList.remove('active');
        if (menuOverlay) menuOverlay.classList.remove('active');
        
        this.closeAllSubmenus();
    }
    
    /**
     * CIERRA TODOS LOS SUBMENÚS
     */
    static closeAllSubmenus() {
        document.querySelectorAll('.submenu.active').forEach(submenu => {
            submenu.classList.remove('active');
        });
    }
    
    /**
     * UTILIDAD: DELAY ASÍNCRONO
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// =============================================================================
// FUNCIONES GLOBALES PARA COMPATIBILIDAD
// =============================================================================

/**
 * Función global para abrir/cerrar menú (para usar en HTML)
 */
window.toggleMenu = function() {
    const menu = document.querySelector('.menu');
    const menuOverlay = document.querySelector('.menu-overlay');
    
    if (menu && menuOverlay) {
        menu.classList.toggle('active');
        menuOverlay.classList.toggle('active');
    }
};

/**
 * Función global para submenús (para usar en HTML)
 */
window.toggleSubmenu = function(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const submenu = event.target.closest('.submenu');
    const wasActive = submenu.classList.contains('active');
    
    MenuLoader.closeAllSubmenus();
    
    if (!wasActive) {
        submenu.classList.add('active');
    }
};

/**
 * Función global para logout (para usar en HTML)
 */
window.logout = function() {
    MenuLoader.performLogout();
};

/**
 * Función global para recargar el menú manualmente
 */
window.reloadMenu = function() {
    console.log('🔄 Recargando menú manualmente...');
    MenuLoader.loadMenu();
};

// =============================================================================
// INICIALIZACIÓN AUTOMÁTICA
// =============================================================================

/**
 * Inicializa el menú cuando el DOM esté listo
 */
function initializeMenuSystem() {
    console.log('🚀 Iniciando sistema de menú global...');
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            MenuLoader.loadMenu();
        });
    } else {
        MenuLoader.loadMenu();
    }
}

// Iniciar el sistema
initializeMenuSystem();