// load-menu.js - VERSIÓN MEJORADA
class MenuLoader {
    static async loadMenu() {
        try {
            console.log('🔄 Cargando menú...');
            
            // Intentar cargar el menú desde menu.html
            const response = await fetch('menu.html');
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const menuHTML = await response.text();
            
            // Insertar el menú al inicio del body
            document.body.insertAdjacentHTML('afterbegin', menuHTML);
            
            console.log('✅ Menú cargado correctamente');
            
            // Esperar un poco para que el DOM procese el nuevo contenido
            setTimeout(() => {
                this.setupMenuEvents();
            }, 100);
            
        } catch (error) {
            console.error('❌ Error cargando el menú:', error);
            console.log('📁 Ruta intentada: menu.html');
            // Cargar menú de respaldo
            this.loadFallbackMenu();
        }
    }
    
    static setupMenuEvents() {
        console.log('🔧 Configurando eventos del menú...');
        
        // Cerrar el menú al hacer clic fuera de él
        const menuOverlay = document.querySelector('.menu-overlay');
        if (menuOverlay) {
            menuOverlay.addEventListener('click', () => {
                const menu = document.querySelector('.menu');
                if (menu) menu.classList.remove('active');
                menuOverlay.classList.remove('active');
                this.closeAllSubmenus();
            });
        } else {
            console.warn('⚠️ No se encontró menu-overlay');
        }

        // Cerrar el submenú al hacer clic fuera de él
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.submenu')) {
                this.closeAllSubmenus();
            }
        });

        // Cerrar el submenú al hacer clic en una opción
        const submenuLinks = document.querySelectorAll('.submenu-list a');
        submenuLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.closeAllSubmenus();
            });
        });
        
        console.log('✅ Eventos del menú configurados');
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
            <div class="menu-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:none; z-index:9999;"></div>
            <button class="menu-toggle" style="position:fixed; top:20px; left:20px; z-index:10000; background:#1a3e72; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer;">☰</button>
            <nav class="menu" style="position:fixed; top:0; left:-300px; width:300px; height:100%; background:white; z-index:10000; transition:left 0.3s; padding:20px;">
                <ul style="list-style:none; padding:0;">
                    <li style="margin:10px 0;"><a href="index.html" style="color:#333; text-decoration:none;">Inicio</a></li>
                    <li style="margin:10px 0;"><a href="login.html" style="color:#333; text-decoration:none;">Iniciar Sesión</a></li>
                </ul>
            </nav>
            
            <script>
            function toggleMenu() {
                const menu = document.querySelector('.menu');
                const menuOverlay = document.querySelector('.menu-overlay');
                if (menu.style.left === '0px') {
                    menu.style.left = '-300px';
                    menuOverlay.style.display = 'none';
                } else {
                    menu.style.left = '0px';
                    menuOverlay.style.display = 'block';
                }
            }
            
            // Configurar eventos para el menú de respaldo
            document.addEventListener('DOMContentLoaded', function() {
                const menuToggle = document.querySelector('.menu-toggle');
                const menuOverlay = document.querySelector('.menu-overlay');
                
                if (menuToggle) {
                    menuToggle.addEventListener('click', toggleMenu);
                }
                if (menuOverlay) {
                    menuOverlay.addEventListener('click', toggleMenu);
                }
            });
            </script>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', fallbackMenu);
        console.log('✅ Menú de respaldo cargado');
    }
}

// Método más robusto para cargar el menú
function initializeMenu() {
    // Esperar a que el DOM esté completamente listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 DOM completamente cargado, iniciando menú...');
            MenuLoader.loadMenu();
        });
    } else {
        console.log('📄 DOM ya está listo, iniciando menú...');
        MenuLoader.loadMenu();
    }
}

// Inicializar el menú
initializeMenu();