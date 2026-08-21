// Barra placeholder visible de inmediato, sin esperar fetch
(function () {
    if (document.querySelector('nav.menu') || document.getElementById('nav-ph')) return;
    const ph = document.createElement('div');
    ph.id = 'nav-ph';
    ph.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:50px;' +
        'background:linear-gradient(to right,#6b1e3f,#320d1c);' +
        'border-bottom:4px solid #A5852E;box-shadow:0 2px 20px rgba(0,0,0,.35);' +
        'z-index:9999;pointer-events:none';
    document.body.insertBefore(ph, document.body.firstChild);
})();

class MenuLoader {
    static injectMenuCSS() {
        const depth = this.getDepth();
        const prefix = depth === 0 ? '' : '../'.repeat(depth);
        const href = prefix + 'menu.css';
        if (!document.querySelector(`link[href="${href}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        }

        const faHref = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        if (!document.querySelector(`link[href="${faHref}"]`)) {
            const fa = document.createElement('link');
            fa.rel = 'stylesheet';
            fa.href = faHref;
            document.head.appendChild(fa);
        }
    }

    static async loadMenu() {
        this.injectMenuCSS();
        try {
            const menuPath = this.getFixedMenuPath();
            const response = await fetch(menuPath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const menuHTML = await response.text();
            const ph = document.getElementById('nav-ph');
            if (ph) ph.remove();
            this.cleanExistingMenu();
            document.body.insertAdjacentHTML('afterbegin', menuHTML);
            setTimeout(() => {
                this.setupCompleteMenu();
            }, 150);
        } catch (error) {
            console.error('❌ Error cargando menú:', error);
            this.loadEmergencyMenu();
        }
    }

    static getDepth() {
        const p = window.location.pathname;
        if (p.includes('/opciones/')) return 3;
        if (p.includes('/datos_nacionales/opcionesdatos/')) return 2;
        if (p.includes('/estados/')) return 2;
        if (p.includes('/datos_nacionales/') || p.includes('/gestion/')) return 1;
        return 0;
    }

    static getFixedMenuPath() {
        const depth = this.getDepth();
        const menuPath = depth === 0 ? 'menu.html' : '../'.repeat(depth) + 'menu.html';
        console.log(`🎯 Profundidad: ${depth}, Ruta: ${menuPath}`);
        return menuPath;
    }

    static cleanExistingMenu() {
        document.querySelectorAll('.menu, .menu-overlay, .menu-toggle, .topbar').forEach(el => el.remove());
    }

    static enhanceDocumentPages() {
        const titulo = document.querySelector('.titulo-personalizado');
        if (!titulo) return;
        const depth = this.getDepth();
        const prefix = '../'.repeat(depth);

        // Cambiar logo a unnamed.png
        const logoImg = document.querySelector('.logo-container img');
        if (logoImg) {
            logoImg.src = prefix + 'imagenes/unnamed.png';
            logoImg.alt = 'INM';
        }

        // Inyectar fecha debajo del título
        if (titulo && !document.querySelector('.doc-fecha')) {
            const fecha = new Date().toLocaleDateString('es-MX', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            const div = document.createElement('div');
            div.className = 'doc-fecha';
            div.innerHTML = `<i class="fas fa-calendar-alt"></i> ${fecha}`;
            titulo.insertAdjacentElement('afterend', div);
        }
    }

    static setupCompleteMenu() {
        console.log('🔧 Configurando menú completo...');

        const menu = document.querySelector('.menu');
        if (!menu) {
            console.error('❌ Menú no encontrado');
            return;
        }

        this.fixMenuLinks();
        this.markActiveLink();
        this.setDynamicTitle();
        this.setupBackButton();
        this.setupSubmenus();
        this.setupSearchFilter();
        this.setupLogout();
        this.setupHamburger();
        this.enhanceDocumentPages();
        this.updateStateHeader();
        this.loadUsername();

        console.log('🎉 Menú completamente configurado y listo');
    }

    static fixMenuLinks() {
        const allLinks = document.querySelectorAll('.topbar a[href], .menu a[href]');
        console.log(`🔗 Corrigiendo ${allLinks.length} enlaces del menú`);

        const depth = this.getDepth();
        const prefix = depth === 0 ? '' : '../'.repeat(depth);

        // Corregir ruta del logo en el encabezado del sidebar
        const sidebarLogo = document.querySelector('.sidebar-logo');
        if (sidebarLogo && prefix) {
            sidebarLogo.setAttribute('src', prefix + 'imagenes/gobernacion.jpg');
        }

        allLinks.forEach(link => {
            const originalHref = link.getAttribute('href');
            if (originalHref && !originalHref.startsWith('http') && !originalHref.startsWith('#') && originalHref !== '#') {
                let newHref = originalHref;
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
            const isActive = menu.classList.toggle('active');
            menuToggle.textContent = isActive ? '✕' : '☰';
            if (menuOverlay) menuOverlay.classList.toggle('active');
            console.log('🎯 Menú ' + (isActive ? 'abierto' : 'cerrado'));
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
                    console.log('📂 Submenú abierto:', newToggle.textContent.trim());
                }
            });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.submenu')) {
                this.closeAllSubmenus();
            }
        });
    }

    static markActiveLink() {
        const currentURL = window.location.href.split('?')[0].split('#')[0];
        document.querySelectorAll('.topbar a[href], .menu a[href]').forEach(link => {
            const linkURL = link.href.split('?')[0].split('#')[0];
            if (linkURL && linkURL === currentURL) {
                link.classList.add('active');
            }
        });
    }

    static setDynamicTitle() {
        const path = window.location.pathname;

        // Extraer nombre del estado de la ruta (/estados/chihuahua/...)
        const stateMatch = path.match(/\/estados\/([^\/]+)\//);
        const rawState = stateMatch ? stateMatch[1] : null;
        const stateName = rawState
            ? rawState.replace(/_/g, ' ')
                .split(' ')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ')
            : null;

        // Título actual de la página (sin sufijos anteriores)
        const baseTitle = document.title.split('|')[0].split('-')[0].trim();

        let newTitle = document.title;

        if (path.includes('/opciones/') && stateName) {
            // Página de documento dentro de un estado
            const docTitle = document.querySelector('h1')?.textContent?.trim() || baseTitle;
            newTitle = `${docTitle} | ${stateName} | INM`;
        } else if (stateName) {
            // Página índice del estado
            newTitle = `${stateName} | INM`;
        } else if (path.includes('/datos_nacionales/') || path.includes('/gestion/')) {
            newTitle = `${baseTitle} | INM`;
        }

        if (newTitle && newTitle !== document.title) {
            document.title = newTitle;
        }
    }

    static setupSearchFilter() {
        const searchInput = document.querySelector('.menu-search');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const submenuList = searchInput.closest('.submenu-list');
            submenuList.querySelectorAll('li:not(.search-item)').forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(query) ? '' : 'none';
            });
        });

        // Evitar que el click en el input cierre el submenú
        searchInput.addEventListener('click', (e) => e.stopPropagation());
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

                this.closeMenu();

                setTimeout(() => {
                    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                        localStorage.removeItem('authenticated');
                        localStorage.removeItem('username');
                        window.location.href = '/login.html';
                    }
                }, 100);
            });
        });
    }

    static setupHamburger() {
        const btn = document.getElementById('navHamburger');
        const nav = document.querySelector('nav.menu');
        const overlay = document.getElementById('menuOverlay');
        if (!btn || !nav) return;

        const closeMobileMenu = () => {
            nav.classList.remove('mobile-open');
            if (overlay) overlay.classList.remove('active');
            btn.setAttribute('aria-expanded', 'false');
            btn.innerHTML = '<i class="fas fa-bars"></i>';
        };

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = nav.classList.toggle('mobile-open');
            if (overlay) overlay.classList.toggle('active', isOpen);
            btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            btn.innerHTML = isOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
            if (!isOpen) this.closeAllSubmenus();
        });

        if (overlay) {
            overlay.addEventListener('click', closeMobileMenu);
        }

        // Cerrar el panel móvil al navegar (pero no al abrir/cerrar un submenú)
        document.querySelectorAll('.menu a').forEach(link => {
            if (link.parentElement.classList.contains('submenu')) return;
            link.addEventListener('click', closeMobileMenu);
        });

        document.addEventListener('click', (e) => {
            if (nav.classList.contains('mobile-open') && !e.target.closest('nav.menu')) {
                closeMobileMenu();
            }
        });
    }

    static goBack(e) {
        e.preventDefault();
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/index.html';
        }
    }

    static setupBackButton() {
        if (this.getDepth() === 0) return;

        const ul = document.querySelector('nav.menu > ul');
        if (ul) {
            const li = document.createElement('li');
            li.className = 'nav-back';
            li.innerHTML = '<a href="#" class="nav-back-link"><i class="fas fa-arrow-left"></i> Regresar</a>';
            ul.insertBefore(li, ul.firstChild);
            li.querySelector('a').addEventListener('click', (e) => this.goBack(e));
        }

        // En páginas internas, la marca de la topbar se convierte en el botón de regresar
        const brand = document.getElementById('topbarBrand');
        if (brand) {
            brand.innerHTML = '<i class="fas fa-arrow-left"></i><span>Regresar</span>';
            brand.href = '#';
            brand.addEventListener('click', (e) => this.goBack(e));
        }

        // Ocultar botones regresar físicos en el HTML
        document.querySelectorAll('.regresar-btn').forEach(btn => btn.style.display = 'none');
    }

    static updateStateHeader() {
        if (this.getDepth() !== 2) return;
        const subtitle = document.querySelector('.inst-subtitle');
        if (subtitle) subtitle.textContent = 'Información de la OR';
    }

    static loadUsername() {
        const username = localStorage.getItem('username');
        if (username) {
            document.querySelectorAll('.nav-username').forEach(el => {
                el.textContent = username;
            });
        }
    }

    static closeMenu() {
        this.closeAllSubmenus();
        const nav = document.querySelector('nav.menu');
        const btn = document.getElementById('navHamburger');
        const overlay = document.getElementById('menuOverlay');
        if (nav) nav.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('active');
        if (btn) {
            btn.setAttribute('aria-expanded', 'false');
            btn.innerHTML = '<i class="fas fa-bars"></i>';
        }
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

console.log('🚀 load-menu.js - Sistema de menú global');
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        MenuLoader.loadMenu();
    });
} else {
    MenuLoader.loadMenu();
}

// El sidebar siempre debe arrancar cerrado: cubre tanto la carga normal
// como cuando el navegador restaura la página desde el bfcache (back/forward),
// que de otro modo conservaría la clase mobile-open tal como quedó antes de navegar.
window.addEventListener('pageshow', () => {
    MenuLoader.closeMenu();
});

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
