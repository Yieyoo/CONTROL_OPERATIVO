// load-menu.js - VERSIÓN MEJORADA CON CORRECCIÓN PARA ESTADOS
class MenuLoader {
    static async loadMenu() {
        try {
            console.log('🔄 Cargando menú...');
            
            const possiblePaths = [
                'menu.html',
                '../menu.html', 
                '../../menu.html',
                '../../../menu.html'
            ];
            
            let menuHTML = '';
            
            for (const path of possiblePaths) {
                try {
                    console.log(`🔍 Probando ruta: ${path}`);
                    const response = await fetch(path);
                    if (response.ok) {
                        menuHTML = await response.text();
                        console.log(`✅ menu.html encontrado en: ${path}`);
                        break;
                    }
                } catch (e) {
                    console.log(`❌ No se encontró en: ${path}`);
                }
            }
            
            if (!menuHTML) {
                throw new Error('No se pudo encontrar menu.html');
            }
            
            document.body.insertAdjacentHTML('afterbegin', menuHTML);
            console.log('✅ Menú insertado');
            
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
        
        // 1. CORREGIR RUTAS ESPECÍFICAMENTE PARA ESTADOS
        this.fixAllMenuLinks();
        
        // 2. Eventos del menú
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
            if (menuOverlay) menuOverlay.classList.toggle('active');
        });
        
        if (menuOverlay) {
            menuOverlay.addEventListener('click', () => {
                menu.classList.remove('active');
                menuOverlay.classList.remove('active');
                this.closeAllSubmenus();
            });
        }
        
        this.setupSubmenus();
        this.setupLogout();
        this.setupNavigation();
        
        console.log('✅ Menú configurado');
    }
    
    /**
     * CORRECCIÓN ESPECÍFICA PARA ESTADOS
     */
    static fixAllMenuLinks() {
        const allLinks = document.querySelectorAll('.menu a[href]');
        console.log(`🔗 Encontrados ${allLinks.length} enlaces`);
        
        allLinks.forEach(link => {
            const originalHref = link.getAttribute('href');
            
            if (this.shouldFixLink(originalHref)) {
                const correctedHref = this.fixLinkForAguascalientes(originalHref);
                link.setAttribute('href', correctedHref);
                console.log(`🔄 "${link.textContent.trim()}" : ${originalHref} → ${correctedHref}`);
            }
        });
    }
    
    static shouldFixLink(href) {
        return href && 
               !href.startsWith('http') && 
               !href.startsWith('//') &&
               !href.startsWith('#') && 
               !href.startsWith('javascript:');
    }
    
    /**
     * CORRECCIÓN ESPECÍFICA PARA AGUASCALIENTES
     * Desde: estados/aguascalientes/aguascalientesindex.html
     * Necesita: ../../ para llegar a la raíz
     */
    static fixLinkForAguascalientes(originalHref) {
        const currentPath = window.location.pathname;
        console.log(`📍 Estamos en: ${currentPath}`);
        
        // Desde estados/aguascalientes/ necesitamos subir 2 niveles
        let correctedPath = '../../';
        
        // Casos especiales
        if (originalHref === 'index.html') {
            correctedPath += 'index.html';
        } else if (originalHref.startsWith('datos_nacionales/')) {
            correctedPath += originalHref;
        } else if (originalHref.startsWith('estados/')) {
            correctedPath += originalHref;
        } else if (originalHref === 'construccion.html') {
            correctedPath += 'construccion.html';
        } else if (originalHref === 'login.html') {
            correctedPath += 'login.html';
        } else {
            // Para cualquier otra ruta
            correctedPath += originalHref;
        }
        
        console.log(`🎯 Ruta corregida: ${correctedPath}`);
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
                
                this.closeAllSubmenus();
                
                if (!isActive) {
                    submenu.classList.add('active');
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
    
    static setupNavigation() {
        const allMenuLinks = document.querySelectorAll('.menu a[href]');
        
        allMenuLinks.forEach(link => {
            if (!link.classList.contains('logout-link') && 
                !link.parentElement.classList.contains('submenu')) {
                
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const href = link.getAttribute('href');
                    console.log(`🚀 Navegando a: ${href}`);
                    
                    this.closeMenu();
                    
                    setTimeout(() => {
                        window.location.href = href;
                    }, 200);
                });
            }
        });
    }
    
    static performLogout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            localStorage.removeItem('authenticated');
            localStorage.removeItem('loginTime');
            const loginPath = this.fixLinkForAguascalientes('login.html');
            window.location.href = loginPath;
        }
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
    
    static loadFallbackMenu() {
        const fallbackMenu = `
            <div class="menu-overlay"></div>
            <button class="menu-toggle">☰</button>
            <nav class="menu">
                <ul>
                    <li><a href="../../index.html">Inicio</a></li>
                    <li><a href="../../login.html">Iniciar Sesión</a></li>
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

// Inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', MenuLoader.loadMenu);
} else {
    MenuLoader.loadMenu();
}