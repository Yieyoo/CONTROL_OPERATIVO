// load-menu.js - VERSIÓN QUE FUNCIONA EN INDEX Y ESTADOS
class MenuLoader {
    static async loadMenu() {
        try {
            console.log('🔄 Iniciando carga del menú...');
            
            // Estrategia: probar rutas desde la más específica a la más general
            const possiblePaths = [
                'menu.html',           // Raíz
                '../menu.html',        // 1 nivel arriba  
                '../../menu.html',     // 2 niveles arriba
                '../../../menu.html'   // 3 niveles arriba
            ];
            
            let menuHTML = '';
            let successfulPath = '';
            
            for (const path of possiblePaths) {
                try {
                    console.log(`🔍 Probando: ${path}`);
                    const response = await fetch(path);
                    if (response.ok) {
                        menuHTML = await response.text();
                        successfulPath = path;
                        console.log(`✅ menu.html encontrado en: ${path}`);
                        break;
                    }
                } catch (e) {
                    console.log(`❌ Falló: ${path}`);
                }
            }
            
            if (!menuHTML) {
                throw new Error('No se pudo cargar menu.html desde ninguna ruta');
            }
            
            // Insertar menú limpio
            this.cleanExistingMenu();
            document.body.insertAdjacentHTML('afterbegin', menuHTML);
            console.log('✅ Menú insertado en el DOM');
            
            // Configurar eventos después de un breve delay
            setTimeout(() => {
                this.setupCompleteMenu();
            }, 150);
            
        } catch (error) {
            console.error('❌ Error crítico:', error);
            this.loadEmergencyMenu();
        }
    }
    
    static cleanExistingMenu() {
        const elementsToRemove = [
            '.menu', '.menu-overlay', '.menu-toggle', 
            '.menu-container', 'nav.menu'
        ];
        
        elementsToRemove.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => el.remove());
        });
    }
    
    static setupCompleteMenu() {
        console.log('🔧 Configurando menú completo...');
        
        const menuToggle = document.querySelector('.menu-toggle');
        const menu = document.querySelector('.menu');
        const menuOverlay = document.querySelector('.menu-overlay');
        
        if (!menuToggle || !menu) {
            console.error('❌ Elementos del menú no encontrados después de la inserción');
            return;
        }
        
        console.log('✅ Elementos del menú encontrados');
        
        // 1. CORREGIR RUTAS PARA LA UBICACIÓN ACTUAL
        this.fixAllMenuLinks();
        
        // 2. Configurar eventos básicos del menú
        this.setupBasicMenuEvents(menuToggle, menu, menuOverlay);
        
        // 3. Configurar submenús
        this.setupSubmenus();
        
        // 4. Configurar logout
        this.setupLogout();
        
        // 5. Configurar navegación
        this.setupNavigation();
        
        console.log('🎉 Menú completamente configurado y listo');
    }
    
    static fixAllMenuLinks() {
        const allLinks = document.querySelectorAll('.menu a[href]');
        console.log(`🔗 Corrigiendo ${allLinks.length} enlaces del menú`);
        
        const currentLocation = window.location.pathname;
        console.log(`📍 Ubicación actual: ${currentLocation}`);
        
        allLinks.forEach(link => {
            const originalHref = link.getAttribute('href');
            
            if (this.needsCorrection(originalHref)) {
                const correctedHref = this.calculateCorrectPath(originalHref, currentLocation);
                
                if (correctedHref !== originalHref) {
                    link.setAttribute('href', correctedHref);
                    console.log(`🔄 ${originalHref} → ${correctedHref}`);
                }
            }
        });
    }
    
    static needsCorrection(href) {
        return href && 
               !href.startsWith('http') && 
               !href.startsWith('//') &&
               !href.startsWith('#') && 
               !href.startsWith('javascript:') &&
               !href.startsWith('mailto:') &&
               !href.startsWith('tel:');
    }
    
    static calculateCorrectPath(originalHref, currentPath) {
        // Determinar niveles necesarios basado en la ubicación actual
        let levelsUp = 0;
        
        if (currentPath.includes('/estados/') && currentPath.includes('/opciones/')) {
            levelsUp = 3; // estados/xxx/opciones/archivo.html
        } else if (currentPath.includes('/estados/')) {
            levelsUp = 2; // estados/xxx/archivo.html  
        } else if (currentPath.includes('/datos_nacionales/')) {
            levelsUp = 1; // datos_nacionales/archivo.html
        } else if (currentPath === '/' || currentPath.endsWith('/index.html') || currentPath.endsWith('.html')) {
            levelsUp = 0; // Raíz
        } else {
            // Método automático de respaldo
            const pathParts = currentPath.split('/').filter(part => part && !part.includes('.html'));
            levelsUp = pathParts.length;
        }
        
        console.log(`📊 Niveles a subir: ${levelsUp} (desde: ${currentPath})`);
        
        // Construir ruta corregida
        let correctedPath = '';
        for (let i = 0; i < levelsUp; i++) {
            correctedPath += '../';
        }
        correctedPath += originalHref;
        
        return correctedPath;
    }
    
    static setupBasicMenuEvents(menuToggle, menu, menuOverlay) {
        // Toggle del menú principal
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
            if (menuOverlay) menuOverlay.classList.toggle('active');
            console.log('🎯 Menú ' + (menu.classList.contains('active') ? 'abierto' : 'cerrado'));
        });
        
        // Cerrar con overlay
        if (menuOverlay) {
            menuOverlay.addEventListener('click', () => {
                menu.classList.remove('active');
                menuOverlay.classList.remove('active');
                this.closeAllSubmenus();
            });
        }
        
        // Cerrar con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                menu.classList.remove('active');
                if (menuOverlay) menuOverlay.classList.remove('active');
                this.closeAllSubmenus();
            }
        });
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
                
                // Abrir este si no estaba activo
                if (!isActive) {
                    submenu.classList.add('active');
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
                if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                    localStorage.removeItem('authenticated');
                    localStorage.removeItem('loginTime');
                    window.location.href = 'login.html';
                }
            });
        });
    }
    
    static setupNavigation() {
        const menuLinks = document.querySelectorAll('.menu a[href]');
        
        menuLinks.forEach(link => {
            // No aplicar a enlaces especiales
            if (link.classList.contains('logout-link') || link.parentElement.classList.contains('submenu')) {
                return;
            }
            
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                console.log(`🚀 Navegando a: ${href}`);
                
                this.closeMenu();
                
                // Navegar después de cerrar el menú
                setTimeout(() => {
                    window.location.href = href;
                }, 200);
            });
        });
    }
    
    static closeMenu() {
        const menu = document.querySelector('.menu');
        const menuOverlay = document.querySelector('.menu-overlay');
        
        if (menu) menu.classList.remove('active');
        if (menuOverlay) menuOverlay.classList.remove('active');
        this.closeAllSubmenus();
    }
    
    static closeAllSubmenus() {
        document.querySelectorAll('.submenu.active').forEach(submenu => {
            submenu.classList.remove('active');
        });
    }
    
    static loadEmergencyMenu() {
        console.log('🆘 Cargando menú de emergencia...');
        
        const emergencyMenu = `
            <div class="menu-overlay"></div>
            <button class="menu-toggle">☰</button>
            <nav class="menu">
                <ul>
                    <li><a href="index.html">🏠 Inicio</a></li>
                    <li><a href="login.html">🔐 Iniciar Sesión</a></li>
                    <li><a href="#" class="logout-link">🚪 Cerrar Sesión</a></li>
                    <li><a href="#" onclick="location.reload()">🔄 Recargar</a></li>
                </ul>
            </nav>
        `;
        
        this.cleanExistingMenu();
        document.body.insertAdjacentHTML('afterbegin', emergencyMenu);
        
        setTimeout(() => {
            const menuToggle = document.querySelector('.menu-toggle');
            const menu = document.querySelector('.menu');
            const menuOverlay = document.querySelector('.menu-overlay');
            
            if (menuToggle && menu) {
                menuToggle.addEventListener('click', () => {
                    menu.classList.toggle('active');
                    if (menuOverlay) menuOverlay.classList.toggle('active');
                });
                
                if (menuOverlay) {
                    menuOverlay.addEventListener('click', () => {
                        menu.classList.remove('active');
                        menuOverlay.classList.remove('active');
                    });
                }
            }
        }, 100);
    }
}

// Inicialización mejorada
console.log('🚀 load-menu.js cargado - Sistema de menú global');
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM listo, iniciando menú...');
        MenuLoader.loadMenu();
    });
} else {
    console.log('📄 DOM ya cargado, iniciando menú...');
    MenuLoader.loadMenu();
}

// Funciones globales para compatibilidad
window.toggleMenu = function() {
    const menu = document.querySelector('.menu');
    const menuOverlay = document.querySelector('.menu-overlay');
    if (menu) {
        menu.classList.toggle('active');
        if (menuOverlay) menuOverlay.classList.toggle('active');
    }
};