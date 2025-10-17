// load-menu.js - VERSIÓN CORREGIDA
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
            
            // Configurar los eventos inmediatamente
            this.setupMenuEvents();
            
        } catch (error) {
            console.error('❌ Error cargando el menú:', error);
            this.loadFallbackMenu();
        }
    }
    
    static setupMenuEvents() {
        console.log('🔧 Configurando eventos del menú...');
        
        // Botón del menú
        const menuToggle = document.querySelector('.menu-toggle');
        const menu = document.querySelector('.menu');
        const menuOverlay = document.querySelector('.menu-overlay');
        
        if (menuToggle && menu && menuOverlay) {
            // Función para abrir/cerrar menú principal
            menuToggle.addEventListener('click', () => {
                menu.classList.toggle('active');
                menuOverlay.classList.toggle('active');
                console.log('🎯 Menú toggled');
            });
            
            // Cerrar menú al hacer clic en el overlay
            menuOverlay.addEventListener('click', () => {
                menu.classList.remove('active');
                menuOverlay.classList.remove('active');
                this.closeAllSubmenus();
            });
            
            // Submenús
            const submenuToggles = document.querySelectorAll('.submenu > a');
            submenuToggles.forEach(toggle => {
                toggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    const submenu = e.target.closest('.submenu');
                    
                    // Cerrar otros submenús
                    this.closeAllSubmenus();
                    
                    // Abrir/cerrar este submenú
                    submenu.classList.toggle('active');
                    console.log('🎯 Submenú toggled');
                });
            });
            
            // Cerrar menú al hacer clic en enlaces
            const menuLinks = document.querySelectorAll('.menu a');
            menuLinks.forEach(link => {
                link.addEventListener('click', () => {
                    menu.classList.remove('active');
                    menuOverlay.classList.remove('active');
                    this.closeAllSubmenus();
                });
            });
            
            // Logout
            const logoutLinks = document.querySelectorAll('a[onclick*="logout"]');
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
            
            console.log('✅ Todos los eventos del menú configurados');
            
        } else {
            console.error('❌ No se encontraron elementos del menú');
        }
    }
    
    static closeAllSubmenus() {
        const submenus = document.querySelectorAll('.submenu.active');
        submenus.forEach(submenu => {
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
                </ul>
            </nav>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', fallbackMenu);
        this.setupMenuEvents();
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        MenuLoader.loadMenu();
    });
} else {
    MenuLoader.loadMenu();
}

// Hacer las funciones globales para que funcionen los onclick
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
    const submenu = event.target.closest('.submenu');
    if (submenu) {
        // Cerrar otros submenús
        document.querySelectorAll('.submenu.active').forEach(sm => {
            if (sm !== submenu) sm.classList.remove('active');
        });
        // Abrir/cerrar este submenú
        submenu.classList.toggle('active');
    }
};

window.logout = function() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        localStorage.removeItem('authenticated');
        localStorage.removeItem('loginTime');
        window.location.href = 'login.html';
    }
};