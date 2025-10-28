// load-menu.js - VERSIÓN COMPLETA CON SUBMENÚS
class MenuLoader {
    static async loadMenu() {
        try {
            console.log('🔄 Iniciando carga del menú...');
            
            const menuPath = await this.findMenuPath();
            console.log(`📍 Ruta encontrada: ${menuPath}`);
            
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
            console.error('❌ Error crítico:', error);
            this.loadEmergencyMenu();
        }
    }
    
    static async findMenuPath() {
        const possiblePaths = [
            'menu.html',
            '../menu.html', 
            '../../menu.html',
            '../../../menu.html',
            '/menu.html'
        ];
        
        for (const path of possiblePaths) {
            try {
                console.log(`🔍 Probando: ${path}`);
                const response = await fetch(path, { method: 'HEAD' });
                if (response.ok) {
                    console.log(`✅ menu.html encontrado en: ${path}`);
                    return path;
                }
            } catch (e) {
                console.log(`❌ Falló: ${path}`);
            }
        }
        throw new Error('No se pudo cargar menu.html desde ninguna ruta');
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
        
        // 1. CORREGIR RUTAS - VERSIÓN MEJORADA
        this.fixMenuLinks();
        
        // 2. Configurar eventos básicos
        this.setupBasicMenuEvents(menuToggle, menu, menuOverlay);
        
        // 3. Configurar submenús COMPLETOS
        this.setupSubmenus();
        
        // 4. Configurar logout
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
        console.log(`📍 Desde: ${currentPath} | Enlace: ${originalHref}`);
        
        // ESTRATEGIA MEJORADA PARA TODAS LAS RUTAS
        if (currentPath.includes('/opciones/')) {
            // Estamos en: /estados/aguascalientes/opciones/archivo.html
            // Necesitamos: ../../../ para llegar a la raíz
            if (originalHref === 'index.html') return '../../../index.html';
            if (originalHref.startsWith('estados/')) return '../../../' + originalHref;
            if (originalHref.startsWith('datos_nacionales/')) return '../../../' + originalHref;
            if (originalHref === 'construccion.html') return '../../../construccion.html';
            if (originalHref === 'gestion/archivos.html') return '../../../gestion/archivos.html';
            
        } else if (currentPath.includes('/estados/') && !currentPath.includes('/opciones/')) {
            // Estamos en: /estados/aguascalientes/aguascalientesindex.html  
            // Necesitamos: ../../ para llegar a la raíz
            if (originalHref === 'index.html') return '../../index.html';
            if (originalHref.startsWith('estados/')) return '../../' + originalHref;
            if (originalHref.startsWith('datos_nacionales/')) return '../../' + originalHref;
            if (originalHref === 'construccion.html') return '../../construccion.html';
            if (originalHref === 'gestion/archivos.html') return '../../gestion/archivos.html';
            
        } else if (currentPath.includes('/datos_nacionales/opcionesdatos/')) {
            // Estamos en: /datos_nacionales/opcionesdatos/archivo.html
            // Necesitamos: ../../ para llegar a la raíz
            if (originalHref === 'index.html') return '../../index.html';
            if (originalHref.startsWith('estados/')) return '../../' + originalHref;
            if (originalHref.startsWith('datos_nacionales/')) return '../../' + originalHref;
            if (originalHref === 'construccion.html') return '../../construccion.html';
            if (originalHref === 'gestion/archivos.html') return '../../gestion/archivos.html';
            
        } else if (currentPath.includes('/datos_nacionales/')) {
            // Estamos en: /datos_nacionales/datosindex.html
            // Necesitamos: ../ para llegar a la raíz
            if (originalHref === 'index.html') return '../index.html';
            if (originalHref.startsWith('estados/')) return '../' + originalHref;
            if (originalHref.startsWith('datos_nacionales/')) return '../' + originalHref;
            if (originalHref === 'construccion.html') return '../construccion.html';
            if (originalHref === 'gestion/archivos.html') return '../gestion/archivos.html';
            
        } else if (currentPath.includes('/gestion/')) {
            // Estamos en: /gestion/archivos.html
            // Necesitamos: ../ para llegar a la raíz
            if (originalHref === 'index.html') return '../index.html';
            if (originalHref.startsWith('estados/')) return '../' + originalHref;
            if (originalHref.startsWith('datos_nacionales/')) return '../' + originalHref;
            if (originalHref === 'construccion.html') return '../construccion.html';
            if (originalHref === 'gestion/archivos.html') return 'archivos.html';
        }
        
        // Para la raíz o casos no cubiertos, mantener original
        return originalHref;
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
                this.closeMenu();
            });
        }
        
        // Cerrar con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeMenu();
        });
        
        // Cerrar menú al hacer clic en un enlace (mobile)
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
            // Remover event listeners anteriores
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
            
            newToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const submenu = newToggle.parentElement;
                const isActive = submenu.classList.contains('active');
                
                // Cerrar todos los submenús primero
                this.closeAllSubmenus();
                
                // Abrir el submenú actual si no estaba activo
                if (!isActive) {
                    submenu.classList.add('active');
                    console.log('📂 Submenú abierto:', newToggle.textContent);
                }
            });
        });
        
        // Cerrar submenús al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.submenu')) {
                this.closeAllSubmenus();
            }
        });
        
        // Cerrar submenús al presionar ESC
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
            // Remover event listeners anteriores
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
                        // Fallback
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
console.log('🚀 load-menu.js cargado - Sistema de menú global');
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        MenuLoader.loadMenu();
    });
} else {
    MenuLoader.loadMenu();
}

// Función global para compatibilidad
window.toggleMenu = function() {
    const menu = document.querySelector('.menu');
    if (menu) {
        menu.classList.toggle('active');
        const menuOverlay = document.querySelector('.menu-overlay');
        if (menuOverlay) menuOverlay.classList.toggle('active');
    }
};

// Función global para cerrar menú
window.closeMenu = function() {
    MenuLoader.closeMenu();
};