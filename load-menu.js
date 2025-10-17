// load-menu.js - SISTEMA COMPATIBLE CON TU menu.html
class MenuLoader {
    static CONFIG = {
        MENU_FILE: 'menu.html',
        LOAD_DELAY: 100,
        MAX_RETRIES: 3
    };

    static async loadMenu() {
        try {
            console.log('🌐 Cargando menú global...');
            
            const menuPath = this.getMenuPath();
            console.log('📍 Ruta del menú:', menuPath);
            
            const response = await fetch(menuPath);
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            
            const menuHTML = await response.text();
            
            // Insertar menú de forma segura
            this.injectMenu(menuHTML);
            
            console.log('✅ Menú HTML cargado correctamente');
            
            // Configurar eventos con reintentos
            await this.setupMenuWithRetry();
            
        } catch (error) {
            console.error('❌ Error cargando menú:', error);
            await this.loadFallbackMenu();
        }
    }
    
    /**
     * CALCULA LA RUTA AL menu.html DESDE CUALQUIER CARPETA
     */
    static getMenuPath() {
        const currentPath = window.location.pathname;
        
        // Contar carpetas en la ruta actual
        const pathParts = currentPath.split('/').filter(part => 
            part && part !== '' && !part.includes('.html')
        );
        
        const depth = pathParts.length;
        console.log(`📊 Profundidad: ${depth} carpetas (${pathParts.join(' → ')})`);
        
        // Construir ruta relativa
        let relativePath = '';
        for (let i = 0; i < depth; i++) {
            relativePath += '../';
        }
        relativePath += this.CONFIG.MENU_FILE;
        
        return relativePath;
    }
    
    /**
     * INYECTA EL MENÚ DE FORMA SEGURA
     */
    static injectMenu(menuHTML) {
        // Remover menús existentes para evitar duplicados
        this.removeExistingMenus();
        
        // Insertar al inicio del body
        document.body.insertAdjacentHTML('afterbegin', menuHTML);
        
        // Forzar reflow del DOM
        document.body.offsetHeight;
    }
    
    /**
     * ELIMINA MENÚS EXISTENTES
     */
    static removeExistingMenus() {
        const existingElements = document.querySelectorAll('.menu, .menu-overlay, .menu-toggle');
        existingElements.forEach(element => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
    }
    
    /**
     * CONFIGURACIÓN CON REINTENTOS
     */
    static async setupMenuWithRetry(retryCount = 0) {
        try {
            await this.delay(this.CONFIG.LOAD_DELAY);
            this.setupAllMenuEvents();
            console.log('🎯 Eventos del menú configurados correctamente');
        } catch (error) {
            if (retryCount < this.CONFIG.MAX_RETRIES) {
                console.log(`🔄 Reintento ${retryCount + 1}/${this.CONFIG.MAX_RETRIES}`);
                await this.delay(this.CONFIG.LOAD_DELAY * (retryCount + 1));
                return this.setupMenuWithRetry(retryCount + 1);
            }
            throw error;
        }
    }
    
    /**
     * CONFIGURACIÓN COMPLETA DE EVENTOS
     */
    static setupAllMenuEvents() {
        // 1. Verificar que existan los elementos esenciales
        const menuToggle = document.querySelector('.menu-toggle');
        const menu = document.querySelector('.menu');
        const menuOverlay = document.querySelector('.menu-overlay');
        
        if (!menuToggle || !menu) {
            throw new Error('Elementos del menú no encontrados');
        }
        
        // 2. Configurar eventos básicos
        this.setupBasicMenuEvents(menuToggle, menu, menuOverlay);
        
        // 3. Corregir TODAS las rutas del menú
        this.fixAllMenuLinks();
        
        // 4. Configurar submenús
        this.setupSubmenus();
        
        // 5. Configurar logout
        this.setupLogout();
        
        console.log('✅ Todos los eventos configurados');
    }
    
    /**
     * EVENTOS BÁSICOS DEL MENÚ
     */
    static setupBasicMenuEvents(menuToggle, menu, menuOverlay) {
        // Toggle del menú principal
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
            if (menuOverlay) menuOverlay.classList.toggle('active');
            console.log('🎯 Menú ' + (menu.classList.contains('active') ? 'abierto' : 'cerrado'));
        });
        
        // Cerrar menú con overlay
        if (menuOverlay) {
            menuOverlay.addEventListener('click', () => {
                menu.classList.remove('active');
                menuOverlay.classList.remove('active');
                this.closeAllSubmenus();
            });
        }
        
        // Cerrar menú con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                menu.classList.remove('active');
                if (menuOverlay) menuOverlay.classList.remove('active');
                this.closeAllSubmenus();
            }
        });
    }
    
    /**
     * CORRIGE TODAS LAS RUTAS DEL MENÚ - ¡ESTO ES CLAVE!
     */
    static fixAllMenuLinks() {
        const allLinks = document.querySelectorAll('.menu a[href]');
        console.log(`🔗 Encontrados ${allLinks.length} enlaces para corregir`);
        
        let correctedCount = 0;
        
        allLinks.forEach(link => {
            const originalHref = link.getAttribute('href');
            
            if (this.shouldFixLink(originalHref)) {
                const correctedHref = this.fixSingleLink(originalHref);
                
                if (correctedHref !== originalHref) {
                    link.setAttribute('href', correctedHref);
                    correctedCount++;
                    console.log(`🔄 ${originalHref} → ${correctedHref}`);
                }
            }
        });
        
        console.log(`✅ ${correctedCount} enlaces corregidos`);
    }
    
    /**
     * DECIDE SI UN ENLACE DEBE SER CORREGIDO
     */
    static shouldFixLink(href) {
        return href && 
               !href.startsWith('http') && 
               !href.startsWith('//') &&
               !href.startsWith('#') && 
               !href.startsWith('javascript:') &&
               !href.startsWith('mailto:') &&
               !href.startsWith('tel:');
    }
    
    /**
     * CORRIGE UN ENLACE INDIVIDUAL
     */
    static fixSingleLink(originalHref) {
        const currentDepth = this.calculateCurrentDepth();
        const targetDepth = this.calculateLinkDepth(originalHref);
        
        // Calcular cuántos "../" necesitamos
        const depthDifference = currentDepth - targetDepth;
        
        if (depthDifference <= 0) {
            return originalHref; // No necesita corrección
        }
        
        let correctedPath = '';
        for (let i = 0; i < depthDifference; i++) {
            correctedPath += '../';
        }
        correctedPath += originalHref;
        
        return correctedPath;
    }
    
    /**
     * CALCULA PROFUNDIDAD ACTUAL
     */
    static calculateCurrentDepth() {
        const currentPath = window.location.pathname;
        const pathParts = currentPath.split('/').filter(part => 
            part && part !== '' && !part.includes('.html')
        );
        return pathParts.length;
    }
    
    /**
     * CALCULA PROFUNDIDAD DEL ENLACE DE DESTINO
     */
    static calculateLinkDepth(href) {
        // Contar carpetas en el enlace (excluyendo el archivo)
        const pathParts = href.split('/').filter(part => 
            part && part !== '' && !part.includes('.html')
        );
        return pathParts.length;
    }
    
    /**
     * CONFIGURACIÓN DE SUBMENÚS
     */
    static setupSubmenus() {
        const submenuToggles = document.querySelectorAll('.submenu > a');
        console.log(`🎯 Configurando ${submenuToggles.length} submenús`);
        
        submenuToggles.forEach(toggle => {
            // Limpiar eventos anteriores
            const cleanToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(cleanToggle, toggle);
            
            cleanToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const submenu = cleanToggle.parentElement;
                const isActive = submenu.classList.contains('active');
                
                // Cerrar todos los submenús primero
                this.closeAllSubmenus();
                
                // Abrir el actual si no estaba activo
                if (!isActive) {
                    submenu.classList.add('active');
                    console.log('📂 Submenú abierto:', cleanToggle.textContent.trim());
                }
            });
        });
        
        // Cerrar submenús al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.submenu')) {
                this.closeAllSubmenus();
            }
        });
    }
    
    /**
     * CONFIGURACIÓN DE LOGOUT
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
     * EJECUTA EL LOGOUT
     */
    static performLogout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            console.log('🚪 Cerrando sesión...');
            localStorage.removeItem('authenticated');
            localStorage.removeItem('loginTime');
            
            const loginPath = this.getLoginPath();
            window.location.href = loginPath;
        }
    }
    
    /**
     * OBTIENE RUTA PARA LOGIN
     */
    static getLoginPath() {
        const depth = this.calculateCurrentDepth();
        let loginPath = '';
        
        for (let i = 0; i < depth; i++) {
            loginPath += '../';
        }
        loginPath += 'login.html';
        
        return loginPath;
    }
    
    /**
     * CIERRA TODOS LOS SUBMENÚS
     */
    static closeAllSubmenus() {
        const activeSubmenus = document.querySelectorAll('.submenu.active');
        activeSubmenus.forEach(submenu => {
            submenu.classList.remove('active');
        });
    }
    
    /**
     * MENÚ DE RESERVA
     */
    static async loadFallbackMenu() {
        console.warn('🔄 Cargando menú de respaldo...');
        
        const fallbackMenu = `
            <div class="menu-overlay"></div>
            <button class="menu-toggle">☰</button>
            <nav class="menu">
                <ul>
                    <li><a href="#" class="go-home">🏠 Inicio</a></li>
                    <li><a href="#" class="go-login">🔐 Iniciar Sesión</a></li>
                    <li><a href="#" class="logout-link">🚪 Cerrar Sesión</a></li>
                </ul>
            </nav>
        `;
        
        this.injectMenu(fallbackMenu);
        
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
        
        if (homeLink) {
            homeLink.addEventListener('click', (e) => {
                e.preventDefault();
                const homePath = this.getHomePath();
                window.location.href = homePath;
            });
        }
        
        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                const loginPath = this.getLoginPath();
                window.location.href = loginPath;
            });
        }
        
        this.setupLogout();
        
        const menuToggle = document.querySelector('.menu-toggle');
        const menu = document.querySelector('.menu');
        const menuOverlay = document.querySelector('.menu-overlay');
        
        if (menuToggle && menu) {
            this.setupBasicMenuEvents(menuToggle, menu, menuOverlay);
        }
    }
    
    /**
     * OBTIENE RUTA PARA INICIO
     */
    static getHomePath() {
        const depth = this.calculateCurrentDepth();
        let homePath = '';
        
        for (let i = 0; i < depth; i++) {
            homePath += '../';
        }
        homePath += 'index.html';
        
        return homePath;
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

window.toggleMenu = function() {
    const menu = document.querySelector('.menu');
    const menuOverlay = document.querySelector('.menu-overlay');
    
    if (menu) {
        menu.classList.toggle('active');
        if (menuOverlay) menuOverlay.classList.toggle('active');
    }
};

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

window.logout = function() {
    MenuLoader.performLogout();
};

// =============================================================================
// INICIALIZACIÓN AUTOMÁTICA
// =============================================================================

function initializeMenu() {
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
initializeMenu();