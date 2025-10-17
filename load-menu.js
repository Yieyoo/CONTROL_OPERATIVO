// load-menu.js - VERSIÓN COMPLETA CON CORRECCIÓN DE RUTAS
class MenuLoader {
    static async loadMenu() {
        try {
            console.log('🔄 Cargando menú...');
            
            // INTENTA ESTAS RUTAS EN ORDEN:
            const possiblePaths = [
                'menu.html',           // Si está en la misma carpeta
                '../menu.html',        // Si está en una subcarpeta
                '../../menu.html',     // Si está dos niveles abajo
                '../../../menu.html'   // Si está tres niveles abajo
            ];
            
            let menuHTML = '';
            let successfulPath = '';
            
            for (const path of possiblePaths) {
                try {
                    console.log(`🔍 Probando ruta: ${path}`);
                    const response = await fetch(path);
                    if (response.ok) {
                        menuHTML = await response.text();
                        successfulPath = path;
                        console.log(`✅ menu.html encontrado en: ${path}`);
                        break;
                    }
                } catch (e) {
                    console.log(`❌ No se encontró en: ${path}`);
                }
            }
            
            if (!menuHTML) {
                throw new Error('No se pudo encontrar menu.html en ninguna ruta');
            }
            
            // Insertar menú
            document.body.insertAdjacentHTML('afterbegin', menuHTML);
            console.log('✅ Menú insertado correctamente');
            
            // Configurar eventos CON CORRECCIÓN DE RUTAS
            setTimeout(() => {
                this.setupMenuEvents();
            }, 100);
            
        } catch (error) {
            console.error('❌ Error:', error);
            this.loadFallbackMenu();
        }
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
        
        // 1. PRIMERO CORREGIR TODAS LAS RUTAS DEL MENÚ
        this.fixAllMenuLinks();
        
        // 2. Configurar toggle del menú
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
            if (menuOverlay) menuOverlay.classList.toggle('active');
        });
        
        // 3. Cerrar con overlay
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
     * ¡FUNCIÓN CLAVE! Corrige todas las rutas del menú
     */
    static fixAllMenuLinks() {
        const allLinks = document.querySelectorAll('.menu a[href]');
        console.log(`🔗 Encontrados ${allLinks.length} enlaces para corregir`);
        
        allLinks.forEach(link => {
            const originalHref = link.getAttribute('href');
            
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
        
        // Contar cuántas carpetas hay en la ruta actual
        const pathParts = currentPath.split('/').filter(part => 
            part && part !== '' && !part.includes('.html')
        );
        const currentDepth = pathParts.length;
        
        console.log(`📍 Estamos en: ${currentPath} (${currentDepth} niveles de carpeta)`);
        
        // Construir la ruta corregida
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
                
                // Cerrar todos los submenús primero
                this.closeAllSubmenus();
                
                // Abrir este submenú si no estaba activo
                if (!isActive) {
                    submenu.classList.add('active');
                    console.log('📂 Submenú abierto:', toggle.textContent.trim());
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
            
            // Usar la corrección de rutas para el logout también
            const loginPath = this.fixLinkPath('login.html');
            window.location.href = loginPath;
        }
    }
    
    static closeAllSubmenus() {
        const activeSubmenus = document.querySelectorAll('.submenu.active');
        activeSubmenus.forEach(submenu => {
            submenu.classList.remove('active');
        });
    }
    
    static loadFallbackMenu() {
        console.log('🔄 Mostrando menú básico...');
        
        const basicMenu = `
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
        
        document.body.insertAdjacentHTML('afterbegin', basicMenu);
        
        setTimeout(() => {
            this.setupMenuEvents();
        }, 100);
    }
}

// Inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', MenuLoader.loadMenu);
} else {
    MenuLoader.loadMenu();
}