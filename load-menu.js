// load-menu.js - VERSIÓN SIN CORRECCIÓN (SOLO DEBUG)
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
            console.log('✅ Menú insertado - LAS RUTAS NO SE CORRIGEN');
            console.log('⚠️ Los enlaces usarán las rutas originales del menu.html');
            
            setTimeout(() => {
                this.setupBasicEvents();
            }, 100);
            
        } catch (error) {
            console.error('❌ Error:', error);
            this.loadFallbackMenu();
        }
    }
    
    static setupBasicEvents() {
        console.log('🔧 Configurando eventos básicos...');
        
        const menuToggle = document.querySelector('.menu-toggle');
        const menu = document.querySelector('.menu');
        const menuOverlay = document.querySelector('.menu-overlay');
        
        if (!menuToggle || !menu) return;
        
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
            if (menuOverlay) menuOverlay.classList.toggle('active');
        });
        
        if (menuOverlay) {
            menuOverlay.addEventListener('click', () => {
                menu.classList.remove('active');
                menuOverlay.classList.remove('active');
            });
        }
        
        // Configurar submenús
        const submenuToggles = document.querySelectorAll('.submenu > a');
        submenuToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const submenu = toggle.parentElement;
                submenu.classList.toggle('active');
            });
        });
        
        console.log('✅ Eventos básicos configurados');
        console.log('🔗 Los enlaces navegarán con sus rutas originales');
    }
    
    static loadFallbackMenu() {
        const fallbackMenu = `
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
        
        document.body.insertAdjacentHTML('afterbegin', fallbackMenu);
        setTimeout(() => this.setupBasicEvents(), 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', MenuLoader.loadMenu);
} else {
    MenuLoader.loadMenu();
}