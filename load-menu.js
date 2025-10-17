// load-menu.js - VERSIÓN CORREGIDA CON SUBMENÚS
class MenuLoader {
    static async loadMenu() {
        try {
            console.log('🔄 Cargando menú...');
            
            const response = await fetch('menu.html');
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            
            const menuHTML = await response.text();
            
            // Insertar el menú al inicio del body
            document.body.insertAdjacentHTML('afterbegin', menuHTML);
            
            console.log('✅ Menú HTML cargado');
            
            // Pequeña pausa para que el DOM procese el nuevo contenido
            setTimeout(() => {
                this.setupMenuEvents();
            }, 50);
            
        } catch (error) {
            console.error('❌ Error cargando el menú:', error);
            this.loadFallbackMenu();
        }
    }
    
    static setupMenuEvents() {
        console.log('🔧 Configurando eventos del menú...');
        
        // Botón del menú principal
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
        
        // 3. EVENTOS PARA SUBMENÚS
        this.setupSubmenus();
        
        // 4. EVENTO PARA CERRAR MENÚ AL CLICAR ENLACES
        this.setupMenuLinks();
        
        // 5. EVENTO PARA LOGOUT
        this.setupLogout();
        
        console.log('✅ Todos los eventos del menú configurados');
    }
    
    static setupSubmenus() {
        // Encontrar todos los enlaces que abren submenús
        const submenuToggles = document.querySelectorAll('.submenu > a');
        
        console.log(`🔍 Encontrados ${submenuToggles.length} submenús`);
        
        submenuToggles.forEach((toggle, index) => {
            // Remover cualquier evento existente
            toggle.replaceWith(toggle.cloneNode(true));
            
            // Nuevo evento
            const newToggle = document.querySelectorAll('.submenu > a')[index];
            
            newToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const submenu = newToggle.closest('.submenu');
                const wasActive = submenu.classList.contains('active');
                
                // Cerrar todos los submenús primero
                this.closeAllSubmenus();
                
                // Si no estaba activo, abrirlo
                if (!wasActive) {
                    submenu.classList.add('active');
                    console.log('🎯 Submenú abierto:', newToggle.textContent);
                } else {
                    console.log('🎯 Submenú cerrado:', newToggle.textContent);
                }
            });
            
            console.log(`✅ Evento añadido a submenú: ${newToggle.textContent}`);
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
        
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
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
                    window.location.href = 'login.html';
                }
            });
        });
    }
    
    static closeAllSubmenus() {
        const activeSubmenus = document.querySelectorAll('.submenu.active');
        
        if (activeSubmenus.length > 0) {
            activeSubmenus.forEach(submenu => {
                submenu.classList.remove('active');
            });
            console.log('🎯 Todos los submenús cerrados');
        }
    }
    
    static loadFallbackMenu() {
        console.log('🔄 Cargando menú de respaldo...');
        
        const fallbackMenu = `
            <div class="menu-overlay"></div>
            <button class="menu-toggle">☰</button>
            <nav class="menu">
                <ul>
                    <li><a href="index.html">Inicio</a></li>
                    <li class="submenu">
                        <a href="javascript:void(0);">Menú Simple</a>
                        <ul class="submenu-list">
                            <li><a href="login.html">Iniciar Sesión</a></li>
                        </ul>
                    </li>
                </ul>
            </nav>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', fallbackMenu);
        
        setTimeout(() => {
            this.setupMenuEvents();
        }, 50);
    }
}

// Hacer funciones globales para compatibilidad
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
    
    // Cerrar todos los submenús
    document.querySelectorAll('.submenu.active').forEach(sm => {
        sm.classList.remove('active');
    });
    
    // Si no estaba activo, abrirlo
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