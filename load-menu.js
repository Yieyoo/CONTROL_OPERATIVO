// load-menu.js - Cargador del menú
class MenuLoader {
    static async loadMenu() {
        try {
            // Intentar cargar el menú desde menu.html
            const response = await fetch('menu.html');
            if (!response.ok) {
                throw new Error('No se pudo cargar el menú');
            }
            
            const menuHTML = await response.text();
            
            // Insertar el menú al inicio del body
            document.body.insertAdjacentHTML('afterbegin', menuHTML);
            
            console.log('✅ Menú cargado correctamente');
            
        } catch (error) {
            console.error('❌ Error cargando el menú:', error);
            // Cargar menú de respaldo
            this.loadFallbackMenu();
        }
    }
    
    static loadFallbackMenu() {
        console.log('🔄 Cargando menú de respaldo...');
        
        const fallbackMenu = `
            <div class="menu-overlay"></div>
            <button class="menu-toggle" onclick="toggleMenu()">☰</button>
            <nav class="menu">
                <ul>
                    <li><a href="index.html">Inicio</a></li>
                    <li><a href="login.html">Iniciar Sesión</a></li>
                </ul>
            </nav>
            
            <script>
            function toggleMenu() {
                const menu = document.querySelector('.menu');
                const menuOverlay = document.querySelector('.menu-overlay');
                menu.classList.toggle('active');
                menuOverlay.classList.toggle('active');
            }
            </script>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', fallbackMenu);
    }
}

// Cargar el menú automáticamente cuando esté listo el DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        MenuLoader.loadMenu();
    });
} else {
    MenuLoader.loadMenu();
}