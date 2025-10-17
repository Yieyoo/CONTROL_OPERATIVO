// load-menu.js - VERSIÓN CON CORRECCIÓN AUTOMÁTICA DE RUTAS
class MenuLoader {
    static async loadMenu() {
        try {
            console.log('🔄 Cargando menú global...');
            
            const menuPath = this.getMenuPath();
            console.log('📍 Ruta del menú:', menuPath);
            
            const response = await fetch(menuPath);
            if (!response.ok) {
                throw new Error(`Error ${response.status} al cargar menu.html`);
            }
            
            const menuHTML = await response.text();
            this.injectMenu(menuHTML);
            
            console.log('✅ Menú cargado, configurando eventos...');
            
            setTimeout(() => {
                this.setupMenuEvents();
            }, 100);
            
        } catch (error) {
            console.error('❌ Error:', error);
            this.loadFallbackMenu();
        }
    }
    
    static getMenuPath() {
        const currentPath = window.location.pathname;
        
        // Contar niveles de carpeta
        const pathParts = currentPath.split('/').filter(part => 
            part && part !== '' && !part.includes('.html')
        );
        const depth = pathParts.length;
        
        console.log('📊 Profundidad actual:', depth, 'carpetas');
        
        // Construir ruta al menú
        let menuPath = '';
        for (let i = 0; i < depth; i++) {
            menuPath += '../';
        }
        menuPath += 'menu.html';
        
        return menuPath;
    }
    
    static injectMenu(menuHTML) {
        // Limpiar menús existentes
        const oldMenu = document.querySelector('.menu');
        const oldOverlay = document.querySelector('.menu-overlay');
        const oldToggle = document.querySelector('.menu-toggle');
        
        if (oldMenu) oldMenu.remove();
        if (oldOverlay) oldOverlay.remove();
        if (oldToggle) oldToggle.remove();
        
        // Insertar nuevo menú
        document.body.insertAdjacentHTML('afterbegin', menuHTML);
    }
    
    static setupMenuEvents() {
        console.log('🔧 Configurando eventos...');
        
        const menuToggle = document.querySelector('.menu-toggle');
        const menu = document.querySelector('.menu');
        const menuOverlay = document.querySelector('.menu-overlay');
        
        if (!menuToggle || !menu) {
            console.error('❌ Elementos del menú no encontrados');
            return;
        }
        
        // 1. CORREGIR RUTAS ANTES DE CONFIGURAR EVENTOS
        this.fixAllMenuLinks();
        
        // 2. Configurar toggle del menú
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
            if (menuOverlay) menuOverlay.classList.toggle('active');
        });
        
        // 3. Cerrar menú con overlay
        if (menuOverlay) {
            menuOverlay.addEventListener('click', () => {
                menu.classList.remove('active');
                menuOverlay.classList.remove('active');
                this.closeAllSubmenus();
            });
        }
        
        // 4. Configurar submenús
        this.setupSubmenus();
        
        // 5. Configurar logout
        this.setupLogout();
        
        console.log('✅ Menú completamente configurado');
    }
    
    /**
     * ¡ESTA ES LA FUNCIÓN MÁS IMPORTANTE!
     * Corrige todas las rutas del menú para que funcionen desde cualquier carpeta
     */
    static fixAllMenuLinks() {
        const allLinks = document.querySelectorAll('.menu a[href]');
        console.log(`🔗 Encontrados ${allLinks.length} enlaces para corregir`);
        
        allLinks.forEach(link => {
            const originalHref = link.getAttribute('href');
            
            // Solo corregir enlaces relativos
            if (this.shouldFixLink(originalHref)) {
                const correctedHref = this.fixLinkPath(originalHref);
                link.setAttribute('href', correctedHref);
                console.log(`🔄 ${originalHref} → ${correctedHref}`);
            }
        });
    }
    
    static shouldFixLink(href) {
        return href && 
               !href.startsWith('http') && 
               !href.startsWith('//') &&
               !href.startsWith('#') && 
               !href.startsWith('javascript:') &&
               !href.startsWith('mailto:');
    }
    
    static fixLinkPath(originalHref) {
        const currentPath = window.location.pathname;
        
        // Contar carpetas actuales
        const currentFolders = currentPath.split('/').filter(folder => 
            folder && folder !== '' && !folder.includes('.html')
        );
        const currentDepth = currentFolders.length;
        
        // Contar carpetas en el enlace de destino
        const linkFolders = originalHref.split('/').filter(folder => 
            folder && folder !== '' && !folder.includes('.html')
        );
        const linkDepth = linkFolders.length;
        
        // Calcular cuántos "../" necesitamos
        const depthDifference = currentDepth - linkDepth;
        
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
    
    static setupSubmenus() {
        const submenuToggles = document.querySelectorAll('.submenu > a');
        
        submenuToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const submenu = toggle.parentElement;
                const isActive = submenu.classList.contains('active');
                
                // Cerrar todos los submenús
                this.closeAllSubmenus();
                
                // Abrir este submenú si no estaba activo
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
    
    static setupLogout() {
        const logoutLinks = document.querySelectorAll('.logout-link');
        
        logoutLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.performLogout();
            });
        });
    }
    
    static performLogout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            localStorage.removeItem('authenticated');
            localStorage.removeItem('loginTime');
            
            // Redirigir al login con la ruta corregida
            const loginPath = this.getCorrectedPath('login.html');
            window.location.href = loginPath;
        }
    }
    
    static getCorrectedPath(originalPath) {
        const currentPath = window.location.pathname;
        const currentFolders = currentPath.split('/').filter(folder => 
            folder && folder !== '' && !folder.includes('.html')
        );
        const currentDepth = currentFolders.length;
        
        let correctedPath = '';
        for (let i = 0; i < currentDepth; i++) {
            correctedPath += '../';
        }
        correctedPath += originalPath;
        
        return correctedPath;
    }
    
    static closeAllSubmenus() {
        document.querySelectorAll('.submenu.active').forEach(submenu => {
            submenu.classList.remove('active');
        });
    }
    
    static loadFallbackMenu() {
        console.log('🔄 Cargando menú de respaldo...');
        
        const fallbackMenu = `
            <div class="menu-overlay"></div>
            <button class="menu-toggle">☰</button>
            <nav class="menu">
                <ul>
                    <li><a href="index.html">Inicio</a></li>
                    <li><a href="login.html">Iniciar Sesión</a></li>
                    <li><a href="#" class="logout-link">Cerrar Sesión</a></li>
                </ul>
            </nav>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', fallbackMenu);
        
        setTimeout(() => {
            this.setupMenuEvents();
        }, 100);
    }
}

// Inicialización
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        MenuLoader.loadMenu();
    });
} else {
    MenuLoader.loadMenu();
}