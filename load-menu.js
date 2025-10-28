// load-menu.js - VERSIÓN SIMPLIFICADA
class MenuLoader {
    static async loadMenu() {
        try {
            console.log('🔄 Cargando menú...');
            
            const menuPath = await this.findMenuPath();
            const response = await fetch(menuPath);
            if (!response.ok) throw new Error('Error cargando menú');
            
            const menuHTML = await response.text();
            
            // Limpiar menú existente
            document.querySelectorAll('.menu, .menu-overlay, .menu-toggle').forEach(el => el.remove());
            
            // Insertar nuevo menú
            document.body.insertAdjacentHTML('afterbegin', menuHTML);
            
            // Configurar después de un breve delay
            setTimeout(() => {
                this.setupMenu();
            }, 100);
            
        } catch (error) {
            console.error('Error:', error);
            this.loadEmergencyMenu();
        }
    }
    
    static async findMenuPath() {
        const paths = ['menu.html', '../menu.html', '../../menu.html', '../../../menu.html'];
        
        for (const path of paths) {
            try {
                const response = await fetch(path, { method: 'HEAD' });
                if (response.ok) return path;
            } catch (e) {
                continue;
            }
        }
        throw new Error('No se encontró menu.html');
    }
    
    static setupMenu() {
        const menuToggle = document.querySelector('.menu-toggle');
        const menu = document.querySelector('.menu');
        const overlay = document.querySelector('.menu-overlay');
        
        if (!menuToggle || !menu) return;
        
        // Corregir TODOS los enlaces automáticamente
        this.fixAllLinks();
        
        // Eventos del menú
        menuToggle.addEventListener('click', () => {
            menu.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
        });
        
        if (overlay) {
            overlay.addEventListener('click', () => {
                menu.classList.remove('active');
                overlay.classList.remove('active');
            });
        }
        
        // Logout
        document.querySelectorAll('.logout-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof window.logout === 'function') {
                    window.logout();
                }
            });
        });
        
        console.log('✅ Menú configurado');
    }
    
    static fixAllLinks() {
        const links = document.querySelectorAll('.menu a[href]');
        const currentPath = window.location.pathname;
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript:')) {
                return;
            }
            
            const newHref = this.getFixedHref(href, currentPath);
            if (newHref !== href) {
                link.setAttribute('href', newHref);
            }
        });
    }
    
    static getFixedHref(originalHref, currentPath) {
        // Contar cuántos niveles tenemos que subir
        const levelsUp = this.calculateLevelsUp(currentPath);
        
        if (levelsUp > 0) {
            const prefix = '../'.repeat(levelsUp);
            return prefix + originalHref;
        }
        
        return originalHref;
    }
    
    static calculateLevelsUp(currentPath) {
        // Eliminar el archivo actual y contar las carpetas
        const pathWithoutFile = currentPath.split('/').slice(0, -1).join('/');
        const folders = pathWithoutFile.split('/').filter(folder => folder.trim() !== '');
        
        return folders.length;
    }
    
    static loadEmergencyMenu() {
        const emergencyMenu = `
            <div class="menu-overlay"></div>
            <button class="menu-toggle">☰</button>
            <nav class="menu">
                <ul>
                    <li><a href="index.html">🏠 Inicio</a></li>
                    <li><a href="login.html">🔐 Login</a></li>
                    <li><a href="#" class="logout-link">🚪 Logout</a></li>
                </ul>
            </nav>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', emergencyMenu);
        this.setupMenu();
    }
}

// Inicialización automática
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MenuLoader.loadMenu());
} else {
    MenuLoader.loadMenu();
}