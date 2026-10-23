// visor-shell.js - Armazon comun de las paginas que muestran un PDF (plantilla, organigrama,
// vehiculos, unidad canina, ubicaciones): banda del estado, barra de informacion con pestañas
// y botones, y el PDF en un marco. No cambia la logica de cada visor: solo reacomoda lo que
// ya generan (#pdf-viewer, #download-doc-btn, #fecha-texto, #toggle-doc-btn).
(function () {
    const RAIZ = document.currentScript ? new URL('../', document.currentScript.src).href : '../../../';

    // Carpeta del estado en /estados/<carpeta>/ -> [nombre, id en mx.svg]
    const ESTADOS = {
        aguascalientes: ['Aguascalientes', 'MXAGU'], baja_california: ['Baja California', 'MXBCN'],
        baja_california_s: ['Baja California Sur', 'MXBCS'], campeche: ['Campeche', 'MXCAM'],
        cdmx: ['Ciudad de México', 'MXCMX'], chiapas: ['Chiapas', 'MXCHP'], chihuahua: ['Chihuahua', 'MXCHH'],
        coahuila: ['Coahuila', 'MXCOA'], colima: ['Colima', 'MXCOL'], durango: ['Durango', 'MXDUR'],
        edomex: ['Estado de México', 'MXMEX'], guanajuato: ['Guanajuato', 'MXGUA'], guerrero: ['Guerrero', 'MXGRO'],
        hidalgo: ['Hidalgo', 'MXHID'], jalisco: ['Jalisco', 'MXJAL'], michoacan: ['Michoacán', 'MXMIC'],
        morelos: ['Morelos', 'MXMOR'], nayarit: ['Nayarit', 'MXNAY'], nuevo_leon: ['Nuevo León', 'MXNLE'],
        oaxaca: ['Oaxaca', 'MXOAX'], puebla: ['Puebla', 'MXPUE'], queretaro: ['Querétaro', 'MXQUE'],
        quintanaroo: ['Quintana Roo', 'MXROO'], san_luis: ['San Luis Potosí', 'MXSLP'], sinaloa: ['Sinaloa', 'MXSIN'],
        sonora: ['Sonora', 'MXSON'], tabasco: ['Tabasco', 'MXTAB'], tamaulipas: ['Tamaulipas', 'MXTAM'],
        tlaxcala: ['Tlaxcala', 'MXTLA'], veracruz: ['Veracruz', 'MXVER'], yucatan: ['Yucatán', 'MXYUC'],
        zacatecas: ['Zacatecas', 'MXZAC']
    };

    const SECCIONES = {
        plantilla_personal: 'Plantilla de Personal',
        organigrama: 'Organigrama',
        vehiculos: 'Vehículos',
        unidad_canina: 'Unidad Canina',
        ubicaciones_sedes: 'Ubicación de las Oficinas',
        ficha_curricular: 'Ficha Curricular'
    };

    // Documentos con dos versiones: la pestaña 2 equivale al boton "alternar" del visor
    const PESTANAS = {
        plantilla_personal: ['Estructura', 'Eventual'],
        organigrama: ['Organigrama', 'Versión completa']
    };

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const carpeta = (/\/estados\/([^/]+)\//.exec(decodeURIComponent(location.pathname)) || [])[1];
    const estado = ESTADOS[carpeta];
    // La ficha curricular no usa DOC_PAGE: solo lleva la banda (no tiene PDF ni barra)
    const pagina = window.DOC_PAGE || (window.FICHA_ESTADO ? { tipo: 'ficha_curricular' } : {});
    const seccion = SECCIONES[pagina.tipo] || pagina.titulo || '';

    function crearBanda() {
        const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
        const banda = document.createElement('section');
        banda.className = 'vb-banda';
        banda.innerHTML = `
            <img class="vb-logo" src="${RAIZ}imagenes/unnamed.png" alt="Gobernación">
            <div class="vb-sep"></div>
            <div class="vb-titulo">
                <span class="vb-estado"></span>
                <span class="vb-seccion"></span>
                <span class="vb-inm">Instituto Nacional de Migración</span>
            </div>
            <div class="vb-sep vb-sep-fecha"></div>
            <div class="vb-fecha"><i class="fas fa-calendar-alt"></i><span></span></div>`;
        banda.querySelector('.vb-estado').textContent = estado ? estado[0] : '';
        banda.querySelector('.vb-seccion').textContent = seccion;
        banda.querySelector('.vb-fecha span').textContent = fecha;
        if (estado) dibujarSilueta(banda, estado[1]);
        return banda;
    }

    async function dibujarSilueta(banda, id) {
        try {
            const resp = await fetch(`${RAIZ}imagenes/mx.svg`);
            if (!resp.ok) return;
            const origen = new DOMParser().parseFromString(await resp.text(), 'image/svg+xml');
            const forma = origen.querySelector(`#features path#${id}`);
            if (!forma) return;
            const svg = document.createElementNS(SVG_NS, 'svg');
            svg.setAttribute('class', 'vb-silueta');
            svg.setAttribute('aria-hidden', 'true');
            const path = document.createElementNS(SVG_NS, 'path');
            path.setAttribute('d', forma.getAttribute('d'));
            svg.appendChild(path);
            banda.insertBefore(svg, banda.querySelector('.vb-sep-fecha'));
            const b = path.getBBox();
            const m = Math.max(b.width, b.height) * 0.06;
            svg.setAttribute('viewBox', `${b.x - m} ${b.y - m} ${b.width + 2 * m} ${b.height + 2 * m}`);
        } catch (e) { /* sin silueta */ }
    }

    function crearBarra() {
        const barra = document.createElement('div');
        barra.className = 'vb-barra';
        barra.innerHTML = `
            <div class="vb-meta"></div>
            <div class="vb-acciones">
                <a class="vb-btn prim" href="#" data-accion="descargar"><i class="fas fa-download"></i> Descargar</a>
                <a class="vb-btn" href="#" data-accion="abrir"><i class="fas fa-up-right-from-square"></i> Abrir</a>
                <a class="vb-btn vb-btn-pc" href="#" data-accion="pantalla" title="Pantalla completa"><i class="fas fa-expand"></i></a>
            </div>`;

        barra.querySelector('[data-accion="descargar"]').addEventListener('click', e => {
            e.preventDefault();
            const a = document.getElementById('download-doc-btn');
            const href = a && a.getAttribute('href');
            if (href && href !== '#') window.location.href = href;
        });
        barra.querySelector('[data-accion="abrir"]').addEventListener('click', e => {
            e.preventDefault();
            const visor = document.getElementById('pdf-viewer');
            if (visor && visor.src) window.open(visor.src, '_blank', 'noopener');
        });
        barra.querySelector('[data-accion="pantalla"]').addEventListener('click', e => {
            e.preventDefault();
            const marco = document.querySelector('.pdf-container');
            if (marco && marco.requestFullscreen) marco.requestFullscreen();
        });

        const etiquetas = PESTANAS[pagina.tipo];
        const alternar = document.getElementById('toggle-doc-btn');
        if (etiquetas && alternar) barra.prepend(crearPestanas(etiquetas, alternar));
        return barra;
    }

    function crearPestanas(etiquetas, alternar) {
        const tabs = document.createElement('div');
        tabs.className = 'vb-tabs';
        let activa = 0;
        const botones = etiquetas.map((texto, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = texto;
            b.addEventListener('click', () => {
                if (i === activa || b.disabled) return;
                alternar.click();
                activa = i;
                pintar();
            });
            tabs.appendChild(b);
            return b;
        });
        function pintar() {
            botones.forEach((b, i) => b.classList.toggle('activa', i === activa));
            botones[1].disabled = !!alternar.disabled;
            botones[1].title = alternar.disabled ? 'No disponible' : '';
        }
        pintar();
        new MutationObserver(pintar).observe(alternar, { attributes: true, attributeFilter: ['disabled'] });
        return tabs;
    }

    // Periodo (si el titulo lo trae, ej. "... - 2da Quincena Octubre 2026") y fecha de actualizacion
    function actualizarMeta(meta) {
        const titulo = document.getElementById('tituloContainer') || document.getElementById('titulo-documento');
        const periodo = titulo && (/(\d(?:ra|da) Quincena \S+ \d{4})/i.exec(titulo.textContent) || [])[1];
        const fechaEl = document.getElementById('fecha-texto');
        const fecha = fechaEl && !/cargando/i.test(fechaEl.textContent) ? fechaEl.textContent.trim() : '';
        meta.innerHTML = '';
        if (periodo) {
            const b = document.createElement('b');
            b.textContent = periodo;
            meta.appendChild(b);
        }
        if (fecha) meta.append(`${periodo ? ' · ' : ''}Actualizado: ${fecha}`);
    }

    document.addEventListener('DOMContentLoaded', () => {
        // Corre despues del visor (este script se carga al final), cuando ya existe su contenido
        if (!document.getElementById('pdf-viewer')) {
            if (!document.getElementById('ficha-root')) return;
            document.body.classList.add('con-visor', 'con-banda-estado');
            const ancla = document.querySelector('.titulo-personalizado') || document.body.firstChild;
            ancla.parentNode.insertBefore(crearBanda(), ancla);
            return;
        }
        document.body.classList.add('con-visor', 'con-banda-estado');

        const banda = crearBanda();
        const barra = crearBarra();
        const ancla = document.querySelector('.titulo-personalizado') || document.body.firstChild;
        ancla.parentNode.insertBefore(banda, ancla);
        const marco = document.querySelector('.pdf-container');
        marco.parentNode.insertBefore(barra, marco);

        const meta = barra.querySelector('.vb-meta');
        actualizarMeta(meta);
        const observar = el => el && new MutationObserver(() => actualizarMeta(meta))
            .observe(el, { childList: true, characterData: true, subtree: true });
        observar(document.getElementById('fecha-texto'));
        observar(document.getElementById('tituloContainer') || document.getElementById('titulo-documento'));
    });
})();
