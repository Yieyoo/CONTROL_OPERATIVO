// load-menu.js - VERSIÓN SIMPLE Y DIRECTA
class MenuLoader {
    static async loadMenu() {
        try {
            console.log('🔄 Cargando menú...');
            
            // INTENTA ESTAS RUTAS EN ORDEN:
            const possiblePaths = [
                'menu.html',           // Si está en la misma carpeta
                '../menu.html',        // Si está en una subcarpeta
                '../../menu.html',     // Si está dos niveles abajo
                '../../../menu.html'   // Si está tres niveles abajo
            ];
            
            let menuHTML = '';
            let successfulPath = '';
            
            for (const path of possiblePaths) {
                try {
                    console.log(`🔍 Probando ruta: ${path}`);
                    const response = await fetch(path);
                    if (response.ok) {
                        menuHTML = await response.text();
                        successfulPath = path;
                        console.log(`✅ menu.html encontrado en: ${path}`);
                        break;
                    }
                } catch (e) {
                    console.log(`❌ No se encontró en: ${path}`);
                }
            }
            
            if (!menuHTML) {
                throw new Error('No se pudo encontrar menu.html en ninguna ruta');
            }
            
            // Insertar menú
            document.body.insertAdjacentHTML('afterbegin', menuHTML);
            console.log('✅ Menú insertado correctamente');
            
            // Configurar eventos
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
        
        // Toggle del menú
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
            if (menuOverlay) menuOverlay.classList.toggle('active');
        });
        
        // Cerrar con overlay
        if (menuOverlay) {
            menuOverlay.addEventListener('click', () => {
                menu.classList.remove('active');
                menuOverlay.classList.remove('active');
            });
        }
        
        console.log('✅ Menú listo para usar');
    }
    
    static loadFallbackMenu() {
        console.log('🔄 Mostrando menú básico...');
        
        const basicMenu = `
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
        
        document.body.insertAdjacentHTML('afterbegin', basicMenu);
        
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