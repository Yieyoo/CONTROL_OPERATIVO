// load-menu.js - VERSIÓN CON DEBUGGING MEJORADO
class MenuLoader {
    static async loadMenu() {
        try {
            console.log('🔄 Iniciando carga del menú...');
            
            // Obtener y verificar la ruta del menú
            const menuPath = this.getMenuPath();
            console.log('📍 Ruta calculada del menú:', menuPath);
            console.log('📁 URL completa:', window.location.origin + menuPath);
            
            const response = await fetch(menuPath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: No se encontró menu.html en ${menuPath}`);
            }
            
            const menuHTML = await response.text();
            console.log('✅ menu.html cargado exitosamente');
            
            this.injectMenu(menuHTML);
            
            setTimeout(() => {
                this.setupMenuEvents();
            }, 100);
            
        } catch (error) {
            console.error('❌ Error crítico:', error);
            console.log('🔧 Intentando cargar menú de respaldo...');
            this.loadFallbackMenu();
        }
    }
    
    static getMenuPath() {
        const currentPath = window.location.pathname;
        console.log('🔍 Analizando ruta actual:', currentPath);
        
        // Dividir la ruta en partes
        const allParts = currentPath.split('/').filter(part => part !== '');
        console.log('📋 Todas las partes de la ruta:', allParts);
        
        // Filtrar solo carpetas (excluir archivos .html)
        const folders = allParts.filter(part => !part.includes('.html'));
        console.log('📂 Carpetas encontradas:', folders);
        
        const depth = folders.length;
        console.log('📊 Profundidad calculada:', depth, 'carpetas');
        
        // Construir ruta relativa
        let menuPath = '';
        for (let i = 0; i < depth; i++) {
            menuPath += '../';
        }
        menuPath += 'menu.html';
        
        console.log('🎯 Ruta final del menú:', menuPath);
        return menuPath;
    }
    
    static injectMenu(menuHTML) {
        // Limpiar menús existentes de forma más agresiva
        const elementsToRemove = document.querySelectorAll('.menu, .menu-overlay, .menu-toggle, nav, .menu-container');
        elementsToRemove.forEach(element => element.remove());
        
        document.body.insertAdjacentHTML('afterbegin', menuHTML);
        console.log('📝 Menú inyectado en el DOM');
    }
    
    static setupMenuEvents() {
        console.log('⚙️ Configurando eventos del menú...');
        
        const menuToggle = document.querySelector('.menu-toggle');
        const menu = document.querySelector('.menu');
        const menuOverlay = document.querySelector('.menu-overlay');
        
        console.log('🔎 Elementos encontrados:', {
            menuToggle: !!menuToggle,
            menu: !!menu,
            menuOverlay: !!menuOverlay
        });
        
        if (!menuToggle || !menu) {
            console.error('❌ No se pudieron encontrar los elementos del menú');
            return;
        }
        
        // 1. Primero corregir todas las rutas
        this.fixAllMenuLinks();
        
        // 2. Configurar eventos básicos
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
            if (menuOverlay) menuOverlay.classList.toggle('active');
            console.log('🎯 Menú ' + (menu.classList.contains('active') ? 'abierto' : 'cerrado'));
        });
        
        if (menuOverlay) {
            menuOverlay.addEventListener('click', () => {
                menu.classList.remove('active');
                menuOverlay.classList.remove('active');
                this.closeAllSubmenus();
            });
        }
        
        // 3. Configurar submenús
        this.setupSubmenus();
        
        // 4. Configurar logout
        this.setupLogout();
        
        console.log('✅ Todos los eventos configurados correctamente');
    }
    
    static fixAllMenuLinks() {
        const allLinks = document.querySelectorAll('.menu a[href]');
        console.log(`🔗 Encontrados ${allLinks.length} enlaces en el menú`);
        
        let correctedCount = 0;
        
        allLinks.forEach(link => {
            const originalHref = link.getAttribute('href');
            
            if (this.shouldFixLink(originalHref)) {
                const correctedHref = this.fixLinkPath(originalHref);
                
                if (correctedHref !== originalHref) {
                    link.setAttribute('href', correctedHref);
                    correctedCount++;
                    console.log(`🔄 "${link.textContent.trim()}" : ${originalHref} → ${correctedHref}`);
                }
            }
        });
        
        console.log(`📈 ${correctedCount} enlaces corregidos`);
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
        
        console.log(`📍 Desde: ${currentPath} (${currentDepth} niveles)`);
        
        // Construir ruta corregida
        let correctedPath = '';
        for (let i = 0; i < currentDepth; i++) {
            correctedPath += '../';
        }
        correctedPath += originalHref;
        
        return correctedPath;
    }
    
    static setupSubmenus() {
        const submenuToggles = document.querySelectorAll('.submenu > a');
        console.log(`🎯 Configurando ${submenuToggles.length} submenús`);
        
        submenuToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const submenu = toggle.parentElement;
                const isActive = submenu.classList.contains('active');
                
                this.closeAllSubmenus();
                
                if (!isActive) {
                    submenu.classList.add('active');
                    console.log('📂 Submenú abierto:', toggle.textContent.trim());
                }
            });
        });
        
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
            
            const loginPath = this.fixLinkPath('login.html');
            window.location.href = loginPath;
        }
    }
    
    static closeAllSubmenus() {
        document.querySelectorAll('.submenu.active').forEach(submenu => {
            submenu.classList.remove('active');
        });
    }
    
    static loadFallbackMenu() {
        console.log('🆘 Cargando menú de emergencia...');
        
        const fallbackMenu = `
            <div class="menu-overlay"></div>
            <button class="menu-toggle">☰</button>
            <nav class="menu">
                <ul>
                    <li><a href="index.html">🏠 Inicio</a></li>
                    <li><a href="login.html">🔐 Iniciar Sesión</a></li>
                    <li><a href="#" class="logout-link">🚪 Cerrar Sesión</a></li>
                    <li><a href="#" onclick="location.reload()">🔄 Recargar Página</a></li>
                </ul>
            </nav>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', fallbackMenu);
        
        setTimeout(() => {
            this.setupMenuEvents();
        }, 100);
    }
}

// Inicialización mejorada
console.log('🚀 Script load-menu.js cargado');
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM completamente cargado, iniciando menú...');
        MenuLoader.loadMenu();
    });
} else {
    console.log('📄 DOM ya está listo, iniciando menú...');
    MenuLoader.loadMenu();
}