// load-menu.js - VERSIÓN MEJORADA CON DETECCIÓN AUTOMÁTICA DE RUTAS
class MenuLoader {
    static async loadMenu() {
        try {
            console.log('🔄 Iniciando carga del menú...');
            
            // Estrategia mejorada: detectar automáticamente la ruta
            const menuPath = await this.findMenuPath();
            console.log(`📍 Ruta encontrada: ${menuPath}`);
            
            const response = await fetch(menuPath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const menuHTML = await response.text();
            
            // Insertar menú limpio
            this.cleanExistingMenu();
            document.body.insertAdjacentHTML('afterbegin', menuHTML);
            console.log('✅ Menú insertado en el DOM');
            
            // Configurar eventos después de un breve delay
            setTimeout(() => {
                this.setupCompleteMenu(menuPath);
            }, 150);
            
        } catch (error) {
            console.error('❌ Error crítico:', error);
            this.loadEmergencyMenu();
        }
    }
    
    static async findMenuPath() {
        // Estrategia: probar rutas desde la más específica a la más general
        const possiblePaths = [
            'menu.html',           // Raíz
            '../menu.html',        // 1 nivel arriba  
            '../../menu.html',     // 2 niveles arriba
            '../../../menu.html',  // 3 niveles arriba
            '/menu.html'           // Ruta absoluta desde raíz
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
                // Continuar con siguiente ruta
            }
        }
        
        throw new Error('No se pudo cargar menu.html desde ninguna ruta');
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
    
    static setupCompleteMenu(menuPath) {
        console.log('🔧 Configurando menú completo...');
        
        const menuToggle = document.querySelector('.menu-toggle');
        const menu = document.querySelector('.menu');
        const menuOverlay = document.querySelector('.menu-overlay');
        
        if (!menuToggle || !menu) {
            console.error('❌ Elementos del menú no encontrados después de la inserción');
            return;
        }
        
        console.log('✅ Elementos del menú encontrados');
        
        // 1. CORREGIR RUTAS PARA LA UBICACIÓN ACTUAL (MEJORADO)
        const basePath = this.calculateBasePath(menuPath);
        this.fixAllMenuLinks(basePath);
        
        // 2. Configurar eventos básicos del menú
        this.setupBasicMenuEvents(menuToggle, menu, menuOverlay);
        
        // 3. Configurar submenús
        this.setupSubmenus();
        
        // 4. Configurar logout
        this.setupLogout();
        
        // 5. Configurar navegación (MEJORADO)
        this.setupNavigation();
        
        console.log('🎉 Menú completamente configurado y listo');
    }
    
    static calculateBasePath(menuPath) {
        // Calcular el path base basado en dónde encontramos menu.html
        if (menuPath === 'menu.html') return './';
        if (menuPath === '/menu.html') return '/';
        
        // Para rutas como '../menu.html', '../../menu.html', etc.
        const pathParts = menuPath.split('/');
        pathParts.pop(); // Remover 'menu.html'
        
        if (pathParts.length === 0) return './';
        
        return pathParts.join('/') + '/';
    }
    
    static fixAllMenuLinks(basePath) {
        const allLinks = document.querySelectorAll('.menu a[href]');
        console.log(`🔗 Corrigiendo ${allLinks.length} enlaces del menú con base: ${basePath}`);
        
        allLinks.forEach(link => {
            const originalHref = link.getAttribute('href');
            
            if (this.needsCorrection(originalHref)) {
                const correctedHref = this.calculateCorrectPath(originalHref, basePath);
                
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
               !href.startsWith('tel:') &&
               !href.startsWith('/'); // Mantener rutas absolutas
    }
    
   static calculateCorrectPath(originalHref, basePath) {
    console.log(`🔗 Calculando: "${originalHref}" desde: "${window.location.pathname}"`);
    
    // 1. No tocar enlaces absolutos o especiales
    if (originalHref.startsWith('/') || originalHref.startsWith('http') || 
        originalHref.startsWith('#') || originalHref.startsWith('javascript:')) {
        return originalHref;
    }
    
    // 2. Estrategia MEJORADA: basada en la ubicación actual
    const currentPath = window.location.pathname;
    
    // Si estamos en opciones (subcarpeta profunda)
    if (currentPath.includes('/opciones/')) {
        if (originalHref === 'index.html') {
            return '../../../index.html';
        }
        // Para otros enlaces, mantenerlos como están (ya son relativos correctos en menu.html)
    }
    // Si estamos en la raíz de un estado
    else if (currentPath.includes('/estados/') && !currentPath.includes('/opciones/')) {
        if (originalHref === 'index.html') {
            return '../../index.html';
        }
    }
    
    // 3. Para todos los demás casos, mantener la ruta ORIGINAL del menu.html
    // NO aplicar basePath para evitar corromper las rutas
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
    
    console.log(`🔍 Encontrados ${logoutLinks.length} enlaces de logout`);
    
    logoutLinks.forEach(link => {
        // Remover event listeners anteriores para evitar duplicados
        link.replaceWith(link.cloneNode(true));
    });
    
    // Volver a seleccionar después del clone
    document.querySelectorAll('.logout-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // ✅ CRÍTICO: Evitar múltiples ejecuciones
            e.stopImmediatePropagation();
            
            console.log('🖱️ Click en cerrar sesión detectado');
            
            // Cerrar el menú inmediatamente
            this.closeMenu();
            
            // Pequeño delay para que se cierre el menú visualmente
            setTimeout(() => {
                // Usar la función global de auth.js si existe
                if (typeof window.logout === 'function') {
                    console.log('✅ Usando window.logout() de auth.js');
                    window.logout();
                } else {
                    console.warn('⚠️ window.logout no disponible, usando fallback');
                    // Fallback al método antiguo
                    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                        localStorage.removeItem('authenticated');
                        localStorage.removeItem('loginTime');
                        localStorage.removeItem('loginAttempts');
                        localStorage.removeItem('lastAttempt');
                        window.location.href = 'login.html';
                    }
                }
            }, 100);
        });
    });
}
    
    static setupNavigation() {
        const menuLinks = document.querySelectorAll('.menu a[href]');
        
        menuLinks.forEach(link => {
            // No aplicar a enlaces especiales
            if (this.isSpecialLink(link)) {
                return;
            }
            
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                
                // Permitir comportamiento normal para enlaces externos, anchors, etc.
                if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
                    return;
                }
                
                e.preventDefault();
                console.log(`🚀 Navegando a: ${href}`);
                
                this.closeMenu();
                
                // Navegar después de cerrar el menú
                setTimeout(() => {
                    window.location.href = href;
                }, 200);
            });
        });
    }
    
    static isSpecialLink(link) {
        return link.classList.contains('logout-link') || 
               link.parentElement.classList.contains('submenu') ||
               link.getAttribute('target') === '_blank' ||
               link.getAttribute('download') !== null;
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
console.log('🚀 load-menu.js cargado - Sistema de menú global (Versión Mejorada)');
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
        if (menuOverlay) menuOverlay.classList.remove('active');
    }
};