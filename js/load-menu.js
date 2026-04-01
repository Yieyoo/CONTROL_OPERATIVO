class MenuLoader {
    static async loadMenu() {
        try {
            //console.log('🔄 Iniciando carga del menú...');
            
            const menuPath = this.getFixedMenuPath();
            //console.log(`📍 Ruta calculada: ${menuPath}`);
            
            const response = await fetch(menuPath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const menuHTML = await response.text();
            
            this.cleanExistingMenu();
            document.body.insertAdjacentHTML('afterbegin', menuHTML);
            //console.log('✅ Menú insertado en el DOM');
            
            setTimeout(() => {
                this.setupCompleteMenu();
            }, 150);
            
        } catch (error) {
            console.error('❌ Error cargando menú:', error);
            this.loadEmergencyMenu();
        }
    }
    
    static getFixedMenuPath() {
        const currentPath = window.location.pathname;
        //console.log('📍 Ruta actual detectada:', currentPath);
        
        let depth = 0;
        if (currentPath.includes('/opciones/')) depth = 3;
        else if (currentPath.includes('/estados/') && !currentPath.includes('/opciones/')) depth = 2;
        else if (currentPath.includes('/datos_nacionales/opcionesdatos/')) depth = 2;
        else if (currentPath.includes('/datos_nacionales/')) depth = 1;
        else if (currentPath.includes('/gestion/')) depth = 1;
        else depth = 0;
        
        const menuPath = depth === 0 ? 'menu.html' : '../'.repeat(depth) + 'menu.html';
        console.log(`🎯 Profundidad: ${depth}, Ruta: ${menuPath}`);
        return menuPath;
    }
    
    static cleanExistingMenu() {
        const elementsToRemove = ['.menu', '.menu-overlay', '.menu-toggle'];
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
        
        //console.log('✅ Elementos del menú encontrados');
        
        
        this.fixMenuLinks();
        this.setupBasicMenuEvents(menuToggle, menu, menuOverlay);
        this.setupSubmenus();
        this.setupLogout();
        
        console.log('🎉 Menú completamente configurado y listo');
    }
    
    static fixMenuLinks() {
        const allLinks = document.querySelectorAll('.menu a[href]');
        console.log(`🔗 Corrigiendo ${allLinks.length} enlaces del menú`);
        
        const currentPath = window.location.pathname;
        let depth = 0;
        if (currentPath.includes('/opciones/')) depth = 3;
        else if (currentPath.includes('/estados/') && !currentPath.includes('/opciones/')) depth = 2;
        else if (currentPath.includes('/datos_nacionales/opcionesdatos/')) depth = 2;
        else if (currentPath.includes('/datos_nacionales/')) depth = 1;
        else if (currentPath.includes('/gestion/')) depth = 1;
        else depth = 0;
        
        const prefix = depth === 0 ? '' : '../'.repeat(depth);
        
        allLinks.forEach(link => {
            const originalHref = link.getAttribute('href');
            
            if (originalHref && !originalHref.startsWith('http') && !originalHref.startsWith('#') && originalHref !== '#') {
                let newHref = originalHref;
                
                // Corregir rutas
                if (originalHref === 'index.html') {
                    newHref = prefix + 'index.html';
                } else if (originalHref.startsWith('datos_nacionales/')) {
                    newHref = prefix + originalHref;
                } else if (originalHref.startsWith('estados/')) {
                    newHref = prefix + originalHref;
                } else if (originalHref === 'construccion.html') {
                    newHref = prefix + 'construccion.html';
                } else if (originalHref === 'gestion/archivos.html') {
                    newHref = prefix + 'gestion/archivos.html';
                }
                
                if (newHref !== originalHref) {
                    link.setAttribute('href', newHref);
                    console.log(`🔄 ${originalHref} → ${newHref}`);
                }
            }
        });
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