// load-menu.js - VERSIÓN CORREGIDA DEFINITIVA
class MenuLoader {
    static async loadMenu() {
        try {
            console.log('🔄 Iniciando carga del menú...');
            
            // USAR RUTA FIJA - SIN BÚSQUEDA MÚLTIPLE
            const menuPath = this.getFixedMenuPath();
            console.log(`📍 Ruta calculada: ${menuPath}`);
            
            const response = await fetch(menuPath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const menuHTML = await response.text();
            
            this.cleanExistingMenu();
            document.body.insertAdjacentHTML('afterbegin', menuHTML);
            console.log('✅ Menú insertado en el DOM');
            
            setTimeout(() => {
                this.setupCompleteMenu();
            }, 150);
            
        } catch (error) {
            console.error('❌ Error cargando menú:', error);
            this.loadEmergencyMenu();
        }
    }
    
    // MÉTODO NUEVO - RUTA FIJA SIN BÚSQUEDA
    static getFixedMenuPath() {
        const currentPath = window.location.pathname;
        console.log('📍 Ruta actual detectada:', currentPath);
        
        // ESTRATEGIA MEJORADA - DETERMINAR NIVELES HACIA LA RAÍZ
        if (currentPath.includes('/estados/') && currentPath.includes('/opciones/')) {
            // Ej: /CONTROL_OPERATIVO/estados/aguascalientes/opciones/unidad_canina.html
            console.log('🎯 Desde opciones estado → ../../../menu.html');
            return '../../../menu.html';
        } else if (currentPath.includes('/estados/')) {
            // Ej: /CONTROL_OPERATIVO/estados/aguascalientes/aguascalientesindex.html
            console.log('🎯 Desde estado → ../../menu.html');
            return '../../menu.html';
        } else if (currentPath.includes('/datos_nacionales/opcionesdatos/')) {
            // Ej: /CONTROL_OPERATIVO/datos_nacionales/opcionesdatos/plantilla.html
            console.log('🎯 Desde opciones datos → ../../menu.html');
            return '../../menu.html';
        } else if (currentPath.includes('/datos_nacionales/')) {
            // Ej: /CONTROL_OPERATIVO/datos_nacionales/datosindex.html
            console.log('🎯 Desde datos nacionales → ../menu.html');
            return '../menu.html';
        } else if (currentPath.includes('/gestion/')) {
            // Ej: /CONTROL_OPERATIVO/gestion/archivos.html
            console.log('🎯 Desde gestión → ../menu.html');
            return '../menu.html';
        } else {
            // Raíz o casos no especificados
            console.log('🎯 Desde raíz → menu.html');
            return 'menu.html';
        }
    }
    
    static cleanExistingMenu() {
        const elementsToRemove = ['.menu', '.menu-overlay', '.menu-toggle', '.menu-container', 'nav.menu'];
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
            console.error('❌ Elementos del menú no encontrados');
            return;
        }
        
        console.log('✅ Elementos del menú encontrados');
        
        // CORREGIR RUTAS
        this.fixMenuLinks();
        
        // Configurar eventos básicos
        this.setupBasicMenuEvents(menuToggle, menu, menuOverlay);
        
        // Configurar submenús
        this.setupSubmenus();
        
        // Configurar logout
        this.setupLogout();
        
        console.log('🎉 Menú completamente configurado y listo');
    }
    
    static fixMenuLinks() {
        const allLinks = document.querySelectorAll('.menu a[href]');
        console.log(`🔗 Corrigiendo ${allLinks.length} enlaces del menú`);
        
        allLinks.forEach(link => {
            const originalHref = link.getAttribute('href');
            
            if (this.shouldFixLink(originalHref)) {
                const correctedHref = this.getCorrectedHref(originalHref);
                
                if (correctedHref !== originalHref) {
                    link.setAttribute('href', correctedHref);
                    console.log(`🔄 ${originalHref} → ${correctedHref}`);
                }
            }
        });
    }
    
    static shouldFixLink(href) {
        return href && 
               !href.startsWith('http') && 
               !href.startsWith('//') &&
               !href.startsWith('#') && 
               !href.startsWith('javascript:') &&
               !href.startsWith('mailto:') &&
               !href.startsWith('tel:');
    }
    
    static getCorrectedHref(originalHref) {
        const currentPath = window.location.pathname;
        
        // ESTRATEGIA MEJORADA PARA TODAS LAS RUTAS
        if (currentPath.includes('/opciones/')) {
            // Desde: /estados/aguascalientes/opciones/archivo.html
            if (originalHref === 'index.html') return '../../../index.html';
            if (originalHref.startsWith('estados/')) return '../../../' + originalHref;
            if (originalHref.startsWith('datos_nacionales/')) return '../../../' + originalHref;
            if (originalHref === 'construccion.html') return '../../../construccion.html';
            if (originalHref === 'gestion/archivos.html') return '../../../gestion/archivos.html';
            
        } else if (currentPath.includes('/estados/') && !currentPath.includes('/opciones/')) {
            // Desde: /estados/aguascalientes/aguascalientesindex.html  
            if (originalHref === 'index.html') return '../../index.html';
            if (originalHref.startsWith('estados/')) return '../../' + originalHref;
            if (originalHref.startsWith('datos_nacionales/')) return '../../' + originalHref;
            if (originalHref === 'construccion.html') return '../../construccion.html';
            if (originalHref === 'gestion/archivos.html') return '../../gestion/archivos.html';
            
        } else if (currentPath.includes('/datos_nacionales/opcionesdatos/')) {
            // Desde: /datos_nacionales/opcionesdatos/archivo.html
            if (originalHref === 'index.html') return '../../index.html';
            if (originalHref.startsWith('estados/')) return '../../' + originalHref;
            if (originalHref.startsWith('datos_nacionales/')) return '../../' + originalHref;
            if (originalHref === 'construccion.html') return '../../construccion.html';
            if (originalHref === 'gestion/archivos.html') return '../../gestion/archivos.html';
            
        } else if (currentPath.includes('/datos_nacionales/')) {
            // Desde: /datos_nacionales/datosindex.html
            if (originalHref === 'index.html') return '../index.html';
            if (originalHref.startsWith('estados/')) return '../' + originalHref;
            if (originalHref.startsWith('datos_nacionales/')) return '../' + originalHref;
            if (originalHref === 'construccion.html') return '../construccion.html';
            if (originalHref === 'gestion/archivos.html') return '../gestion/archivos.html';
            
        } else if (currentPath.includes('/gestion/')) {
            // Desde: /gestion/archivos.html
            if (originalHref === 'index.html') return '../index.html';
            if (originalHref.startsWith('estados/')) return '../' + originalHref;
            if (originalHref.startsWith('datos_nacionales/')) return '../' + originalHref;
            if (originalHref === 'construccion.html') return '../construccion.html';
            if (originalHref === 'gestion/archivos.html') return 'archivos.html';
        }
        
        return originalHref;
    }
    
    static setupBasicMenuEvents(menuToggle, menu, menuOverlay) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
            if (menuOverlay) menuOverlay.classList.toggle('active');
            console.log('🎯 Menú ' + (menu.classList.contains('active') ? 'abierto' : 'cerrado'));
        });
        
        if (menuOverlay) {
            menuOverlay.addEventListener('click', () => {
                this.closeMenu();
            });
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeMenu();
        });
        
        document.querySelectorAll('.menu a').forEach(link => {
            link.addEventListener('click', () => {
                this.closeMenu();
            });
        });
    }
    
    static setupSubmenus() {
        const submenuToggles = document.querySelectorAll('.submenu > a');
        console.log(`🎯 Configurando ${submenuToggles.length} submenús`);
        
        submenuToggles.forEach(toggle => {
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
            
            newToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const submenu = newToggle.parentElement;
                const isActive = submenu.classList.contains('active');
                
                this.closeAllSubmenus();
                
                if (!isActive) {
                    submenu.classList.add('active');
                    console.log('📂 Submenú abierto:', newToggle.textContent);
                }
            });
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.submenu')) {
                this.closeAllSubmenus();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllSubmenus();
            }
        });
    }
    
    static setupLogout() {
        const logoutLinks = document.querySelectorAll('.logout-link');
        console.log(`🔍 Encontrados ${logoutLinks.length} enlaces de logout`);
        
        logoutLinks.forEach(link => {
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
            
            newLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('🖱️ Click en cerrar sesión');
                this.closeMenu();
                
                setTimeout(() => {
                    if (typeof window.logout === 'function') {
                        window.logout();
                    } else {
                        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                            localStorage.removeItem('authenticated');
                            localStorage.removeItem('loginTime');
                            window.location.href = 'login.html';
                        }
                    }
                }, 100);
            });
        });
    }
    
    static closeMenu() {
        const menu = document.querySelector('.menu');
        const menuOverlay = document.querySelector('.menu-overlay');
        
        if (menu) menu.classList.remove('active');
        if (menuOverlay) menuOverlay.classList.remove('active');
        this.closeAllSubmenus();
        
        console.log('🚪 Menú cerrado');
    }
    
    static closeAllSubmenus() {
        const activeSubmenus = document.querySelectorAll('.submenu.active');
        if (activeSubmenus.length > 0) {
            activeSubmenus.forEach(submenu => {
                submenu.classList.remove('active');
            });
            console.log('📁 Todos los submenús cerrados');
        }
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
                </ul>
            </nav>
        `;
        
        this.cleanExistingMenu();
        document.body.insertAdjacentHTML('afterbegin', emergencyMenu);
        
        setTimeout(() => {
            this.setupCompleteMenu();
        }, 100);
    }
}

// Inicialización
console.log('🚀 load-menu.js CORREGIDO - Sistema de menú global');
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        MenuLoader.loadMenu();
    });
} else {
    MenuLoader.loadMenu();
}

// Funciones globales
window.toggleMenu = function() {
    const menu = document.querySelector('.menu');
    if (menu) {
        menu.classList.toggle('active');
        const menuOverlay = document.querySelector('.menu-overlay');
        if (menuOverlay) menuOverlay.classList.toggle('active');
    }
};

window.closeMenu = function() {
    MenuLoader.closeMenu();
};