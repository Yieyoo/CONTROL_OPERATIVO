// load-menu.js - VERSIÓN UNIVERSAL PARA CUALQUIER CARPETA
class MenuLoader {
    static async loadMenu() {
        try {
            console.log('🔄 Cargando menú...');
            
            const menuPath = this.getMenuPath();
            console.log('📍 Ruta del menú calculada:', menuPath);
            
            const response = await fetch(menuPath);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            
            const menuHTML = await response.text();
            
            // Insertar el menú al inicio del body
            document.body.insertAdjacentHTML('afterbegin', menuHTML);
            
            console.log('✅ Menú HTML cargado');
            
            // Configurar eventos después de cargar
            setTimeout(() => {
                this.setupMenuEvents();
            }, 50);
            
        } catch (error) {
            console.error('❌ Error cargando el menú:', error);
            this.loadFallbackMenu();
        }
    }
    
    static getMenuPath() {
        const currentPath = window.location.pathname;
        console.log('📍 Ruta actual:', currentPath);
        
        // Contar cuántos niveles de carpeta tenemos que subir
        const depth = this.calculateDepth(currentPath);
        console.log('📁 Profundidad calculada:', depth);
        
        // Construir la ruta relativa al menú
        let menuPath = '';
        for (let i = 0; i < depth; i++) {
            menuPath += '../';
        }
        menuPath += 'menu.html';
        
        return menuPath;
    }
    
    static calculateDepth(currentPath) {
        // Eliminar el nombre del archivo y contar las carpetas
        const pathWithoutFile = currentPath.split('/').slice(0, -1).join('/');
        const folders = pathWithoutFile.split('/').filter(folder => folder !== '');
        
        console.log('📂 Carpetas en la ruta:', folders);
        return folders.length;
    }
    
    static setupMenuEvents() {
        console.log('🔧 Configurando eventos del menú...');
        
        const menuToggle = document.querySelector('.menu-toggle');
        const menu = document.querySelector('.menu');
        const menuOverlay = document.querySelector('.menu-overlay');
        
        if (!menuToggle || !menu || !menuOverlay) {
            console.error('❌ Elementos del menú no encontrados');
            return;
        }
        
        // 1. EVENTO PARA EL BOTÓN DEL MENÚ PRINCIPAL
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
            menuOverlay.classList.toggle('active');
            console.log('🎯 Menú principal toggled');
        });
        
        // 2. EVENTO PARA CERRAR MENÚ AL CLICAR EN OVERLAY
        menuOverlay.addEventListener('click', () => {
            menu.classList.remove('active');
            menuOverlay.classList.remove('active');
            this.closeAllSubmenus();
            console.log('🎯 Menú cerrado por overlay');
        });
        
        // 3. CORREGIR TODAS LAS RUTAS ANTES DE CONFIGURAR EVENTOS
        this.fixAllMenuLinks();
        
        // 4. EVENTOS PARA SUBMENÚS
        this.setupSubmenus();
        
        // 5. EVENTO PARA CERRAR MENÚ AL CLICAR ENLACES
        this.setupMenuLinks();
        
        // 6. EVENTO PARA LOGOUT
        this.setupLogout();
        
        console.log('✅ Todos los eventos del menú configurados');
    }
    
    static fixAllMenuLinks() {
        console.log('🔧 Corrigiendo TODAS las rutas del menú...');
        
        const allLinks = document.querySelectorAll('.menu a[href]');
        console.log(`🔗 Encontrados ${allLinks.length} enlaces en el menú`);
        
        allLinks.forEach(link => {
            const originalHref = link.getAttribute('href');
            
            // Solo corregir rutas relativas que no sean especiales
            if (this.shouldFixLink(originalHref)) {
                const correctedHref = this.fixLinkPath(originalHref);
                
                if (correctedHref !== originalHref) {
                    link.setAttribute('href', correctedHref);
                    console.log(`🔄 Ruta corregida: ${originalHref} → ${correctedHref}`);
                }
            }
        });
        
        console.log('✅ Todas las rutas del menú corregidas');
    }
    
    static shouldFixLink(href) {
        return href && 
               !href.startsWith('http') && 
               !href.startsWith('//') &&
               !href.startsWith('#') && 
               !href.startsWith('javascript:') &&
               !href.startsWith('mailto:') &&
               href !== 'index.html' &&
               !href.includes('/');
    }
    
    static fixLinkPath(originalHref) {
        const currentPath = window.location.pathname;
        const depth = this.calculateDepth(currentPath);
        
        // Construir la ruta corregida
        let correctedPath = '';
        for (let i = 0; i < depth; i++) {
            correctedPath += '../';
        }
        correctedPath += originalHref;
        
        return correctedPath;
    }
    
    static setupSubmenus() {
        const submenuToggles = document.querySelectorAll('.submenu > a');
        console.log(`🔍 Encontrados ${submenuToggles.length} submenús`);
        
        submenuToggles.forEach((toggle, index) => {
            // Clonar para limpiar eventos anteriores
            toggle.replaceWith(toggle.cloneNode(true));
            
            const newToggle = document.querySelectorAll('.submenu > a')[index];
            
            newToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const submenu = newToggle.closest('.submenu');
                const wasActive = submenu.classList.contains('active');
                
                this.closeAllSubmenus();
                
                if (!wasActive) {
                    submenu.classList.add('active');
                    console.log('🎯 Submenú abierto:', newToggle.textContent.trim());
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
    
    static setupMenuLinks() {
        const menuLinks = document.querySelectorAll('.menu a:not(.submenu > a)');
        console.log(`🔗 Configurando ${menuLinks.length} enlaces del menú`);
        
        menuLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                console.log('🎯 Clic en enlace:', link.textContent, '→', link.href);
                
                // Solo cerrar el menú, NO prevenir la navegación
                const menu = document.querySelector('.menu');
                const menuOverlay = document.querySelector('.menu-overlay');
                
                if (menu && menuOverlay) {
                    menu.classList.remove('active');
                    menuOverlay.classList.remove('active');
                    this.closeAllSubmenus();
                }
            });
        });
    }
    
    static setupLogout() {
        const logoutLinks = document.querySelectorAll('.logout-link');
        
        logoutLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                    localStorage.removeItem('authenticated');
                    localStorage.removeItem('loginTime');
                    const loginPath = this.getLoginPath();
                    window.location.href = loginPath;
                }
            });
        });
    }
    
    static getLoginPath() {
        const currentPath = window.location.pathname;
        const depth = this.calculateDepth(currentPath);
        
        let loginPath = '';
        for (let i = 0; i < depth; i++) {
            loginPath += '../';
        }
        loginPath += 'login.html';
        
        return loginPath;
    }
    
    static closeAllSubmenus() {
        const activeSubmenus = document.querySelectorAll('.submenu.active');
        
        if (activeSubmenus.length > 0) {
            activeSubmenus.forEach(submenu => {
                submenu.classList.remove('active');
            });
        }
    }
    
    static loadFallbackMenu() {
        console.log('🔄 Cargando menú de respaldo...');
        
        const fallbackMenu = `
            <div class="menu-overlay"></div>
            <button class="menu-toggle">☰</button>
            <nav class="menu">
                <ul>
                    <li><a href="#" class="go-home">Inicio</a></li>
                    <li><a href="#" class="go-login">Iniciar Sesión</a></li>
                </ul>
            </nav>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', fallbackMenu);
        
        // Configurar eventos para el menú de respaldo
        setTimeout(() => {
            const homeLink = document.querySelector('.go-home');
            const loginLink = document.querySelector('.go-login');
            const menuToggle = document.querySelector('.menu-toggle');
            const menu = document.querySelector('.menu');
            const menuOverlay = document.querySelector('.menu-overlay');
            
            if (homeLink) {
                homeLink.addEventListener('click', () => {
                    const depth = this.calculateDepth(window.location.pathname);
                    let homePath = '';
                    for (let i = 0; i < depth; i++) homePath += '../';
                    homePath += 'index.html';
                    window.location.href = homePath;
                });
            }
            
            if (loginLink) {
                loginLink.addEventListener('click', () => {
                    const depth = this.calculateDepth(window.location.pathname);
                    let loginPath = '';
                    for (let i = 0; i < depth; i++) loginPath += '../';
                    loginPath += 'login.html';
                    window.location.href = loginPath;
                });
            }
            
            if (menuToggle && menu && menuOverlay) {
                menuToggle.addEventListener('click', () => {
                    menu.classList.toggle('active');
                    menuOverlay.classList.toggle('active');
                });
                
                menuOverlay.addEventListener('click', () => {
                    menu.classList.remove('active');
                    menuOverlay.classList.remove('active');
                });
            }
        }, 50);
    }
}

// Funciones globales para compatibilidad
window.toggleMenu = function() {
    const menu = document.querySelector('.menu');
    const menuOverlay = document.querySelector('.menu-overlay');
    if (menu && menuOverlay) {
        menu.classList.toggle('active');
        menuOverlay.classList.toggle('active');
    }
};

window.toggleSubmenu = function(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const submenu = event.target.closest('.submenu');
    const wasActive = submenu.classList.contains('active');
    
    document.querySelectorAll('.submenu.active').forEach(sm => {
        sm.classList.remove('active');
    });
    
    if (!wasActive) {
        submenu.classList.add('active');
    }
};

window.logout = function() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        localStorage.removeItem('authenticated');
        localStorage.removeItem('loginTime');
        window.location.href = 'login.html';
    }
};

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM listo, iniciando menú...');
        MenuLoader.loadMenu();
    });
} else {
    console.log('📄 DOM ya listo, iniciando menú...');
    MenuLoader.loadMenu();
}