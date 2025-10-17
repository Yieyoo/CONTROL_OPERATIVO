// load-menu.js - VERSIÓN SIMPLIFICADA Y FUNCIONAL
class MenuLoader {
    static async loadMenu() {
        try {
            console.log('🔄 Cargando menú...');
            
            // Calcular ruta al menú
            const menuPath = this.getMenuPath();
            console.log('📍 Buscando menú en:', menuPath);
            
            const response = await fetch(menuPath);
            if (!response.ok) {
                throw new Error(`No se pudo cargar menu.html (Error ${response.status})`);
            }
            
            const menuHTML = await response.text();
            
            // Insertar el menú
            document.body.insertAdjacentHTML('afterbegin', menuHTML);
            console.log('✅ Menú insertado correctamente');
            
            // Configurar eventos
            setTimeout(() => {
                this.setupMenuEvents();
            }, 100);
            
        } catch (error) {
            console.error('❌ Error:', error);
            // Mostrar menú de respaldo temporal
            this.showTemporaryMenu();
        }
    }
    
    static getMenuPath() {
        const currentPath = window.location.pathname;
        console.log('📁 Ruta actual:', currentPath);
        
        // Contar carpetas en la ruta
        const pathParts = currentPath.split('/').filter(part => part && part !== '' && !part.includes('.html'));
        const depth = pathParts.length;
        
        console.log('📊 Niveles de carpeta:', depth);
        
        // Construir ruta relativa
        let menuPath = '';
        for (let i = 0; i < depth; i++) {
            menuPath += '../';
        }
        menuPath += 'menu.html';
        
        return menuPath;
    }
    
    static setupMenuEvents() {
        console.log('🔧 Configurando eventos del menú...');
        
        const menuToggle = document.querySelector('.menu-toggle');
        const menu = document.querySelector('.menu');
        const menuOverlay = document.querySelector('.menu-overlay');
        
        if (!menuToggle || !menu) {
            console.error('❌ No se encontraron los elementos del menú');
            return;
        }
        
        // Botón toggle del menú
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            menu.classList.toggle('active');
            if (menuOverlay) menuOverlay.classList.toggle('active');
        });
        
        // Cerrar menú con overlay
        if (menuOverlay) {
            menuOverlay.addEventListener('click', function() {
                menu.classList.remove('active');
                menuOverlay.classList.remove('active');
            });
        }
        
        // Configurar submenús
        this.setupSubmenus();
        
        // Configurar logout
        this.setupLogout();
        
        console.log('✅ Eventos configurados');
    }
    
    static setupSubmenus() {
        const submenuToggles = document.querySelectorAll('.submenu > a');
        
        submenuToggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const submenu = this.parentElement;
                const isActive = submenu.classList.contains('active');
                
                // Cerrar todos los submenús primero
                document.querySelectorAll('.submenu.active').forEach(sm => {
                    sm.classList.remove('active');
                });
                
                // Abrir el actual si no estaba activo
                if (!isActive) {
                    submenu.classList.add('active');
                }
            });
        });
        
        // Cerrar submenús al hacer clic fuera
        document.addEventListener('click', function() {
            document.querySelectorAll('.submenu.active').forEach(sm => {
                sm.classList.remove('active');
            });
        });
    }
    
    static setupLogout() {
        const logoutLinks = document.querySelectorAll('.logout-link');
        
        logoutLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                    localStorage.removeItem('authenticated');
                    localStorage.removeItem('loginTime');
                    window.location.href = 'login.html';
                }
            });
        });
    }
    
    static showTemporaryMenu() {
        console.log('🔄 Mostrando menú temporal...');
        
        const tempMenu = `
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
        
        document.body.insertAdjacentHTML('afterbegin', tempMenu);
        
        setTimeout(() => {
            this.setupMenuEvents();
        }, 100);
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