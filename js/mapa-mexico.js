// Mapa interactivo de México y lista de estados de la portada.
// El contorno sale de imagenes/mx.svg (Simplemaps, licencia gratuita para uso comercial,
// sin marca de agua). Cada estado se identifica con su código ISO (MXAGU, MXBCN...).
(function () {
    const ESTADOS = {
        MXAGU: { nombre: 'Aguascalientes', url: 'estados/aguascalientes/aguascalientesindex.html' },
        MXBCN: { nombre: 'Baja California', url: 'estados/baja_california/baja_californiaindex.html' },
        MXBCS: { nombre: 'Baja California Sur', url: 'estados/baja_california_s/baja_california_surindex.html' },
        MXCAM: { nombre: 'Campeche', url: 'estados/campeche/campecheindex.html' },
        MXCHP: { nombre: 'Chiapas', url: 'estados/chiapas/chiapasindex.html' },
        MXCHH: { nombre: 'Chihuahua', url: 'estados/chihuahua/chihuahuaindex.html' },
        MXCMX: { nombre: 'Ciudad de México', url: 'estados/cdmx/cdmxindex.html' },
        MXCOA: { nombre: 'Coahuila', url: 'estados/coahuila/coahuilaindex.html' },
        MXCOL: { nombre: 'Colima', url: 'estados/colima/colimaindex.html' },
        MXDUR: { nombre: 'Durango', url: 'estados/durango/durangoindex.html' },
        MXMEX: { nombre: 'Estado de México', url: 'estados/edomex/edomexindex.html' },
        MXGUA: { nombre: 'Guanajuato', url: 'estados/guanajuato/guanajuatoindex.html' },
        MXGRO: { nombre: 'Guerrero', url: 'estados/guerrero/guerreroindex.html' },
        MXHID: { nombre: 'Hidalgo', url: 'estados/hidalgo/hidalgoindex.html' },
        MXJAL: { nombre: 'Jalisco', url: 'estados/jalisco/jaliscoindex.html' },
        MXMIC: { nombre: 'Michoacán', url: 'estados/michoacan/michoacanindex.html' },
        MXMOR: { nombre: 'Morelos', url: 'estados/morelos/morelosindex.html' },
        MXNAY: { nombre: 'Nayarit', url: 'estados/nayarit/nayaritindex.html' },
        MXNLE: { nombre: 'Nuevo León', url: 'estados/nuevo_leon/nuevolindex.html' },
        MXOAX: { nombre: 'Oaxaca', url: 'estados/oaxaca/oaxacaindex.html' },
        MXPUE: { nombre: 'Puebla', url: 'estados/puebla/pueblaindex.html' },
        MXQUE: { nombre: 'Querétaro', url: 'estados/queretaro/queretaroindex.html' },
        MXROO: { nombre: 'Quintana Roo', url: 'estados/quintanaroo/quintanarooindex.html' },
        MXSLP: { nombre: 'San Luis Potosí', url: 'estados/san_luis/san_luisindex.html' },
        MXSIN: { nombre: 'Sinaloa', url: 'estados/sinaloa/sinaloaindex.html' },
        MXSON: { nombre: 'Sonora', url: 'estados/sonora/sonoraindex.html' },
        MXTAB: { nombre: 'Tabasco', url: 'estados/tabasco/tabascoindex.html' },
        MXTAM: { nombre: 'Tamaulipas', url: 'estados/tamaulipas/tamaulipasindex.html' },
        MXTLA: { nombre: 'Tlaxcala', url: 'estados/tlaxcala/tlaxcalaindex.html' },
        MXVER: { nombre: 'Veracruz', url: 'estados/veracruz/veracruzindex.html' },
        MXYUC: { nombre: 'Yucatán', url: 'estados/yucatan/yucatanindex.html' },
        MXZAC: { nombre: 'Zacatecas', url: 'estados/zacatecas/zacatecasindex.html' }
    };

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const quitarAcentos = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    // Resalta un estado en el mapa y en la lista a la vez
    function resaltar(id, activo) {
        document.querySelectorAll(`[data-estado="${id}"]`).forEach(el => el.classList.toggle('activo', activo));
    }

    async function cargarMapa(contenedor) {
        const tooltip = document.createElement('div');
        tooltip.className = 'mapa-tooltip';
        contenedor.appendChild(tooltip);

        try {
            const resp = await fetch('imagenes/mx.svg');
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const origen = new DOMParser().parseFromString(await resp.text(), 'image/svg+xml');

            const svg = document.createElementNS(SVG_NS, 'svg');
            svg.setAttribute('viewBox', '0 0 1000 630');
            svg.setAttribute('role', 'img');
            svg.setAttribute('aria-label', 'Mapa de México por estado');

            origen.querySelectorAll('#features path').forEach(p => {
                const id = p.getAttribute('id');
                const estado = ESTADOS[id];
                if (!estado) return;

                const path = document.createElementNS(SVG_NS, 'path');
                path.setAttribute('d', p.getAttribute('d'));
                path.setAttribute('class', 'mapa-estado');
                path.setAttribute('tabindex', '0');
                path.setAttribute('role', 'link');
                path.setAttribute('aria-label', estado.nombre);
                path.dataset.estado = id;

                path.addEventListener('mouseenter', () => {
                    resaltar(id, true);
                    tooltip.textContent = estado.nombre;
                    tooltip.classList.add('visible');
                });
                path.addEventListener('mousemove', e => {
                    const r = contenedor.getBoundingClientRect();
                    tooltip.style.left = `${e.clientX - r.left}px`;
                    tooltip.style.top = `${e.clientY - r.top}px`;
                });
                path.addEventListener('mouseleave', () => {
                    resaltar(id, false);
                    tooltip.classList.remove('visible');
                });
                path.addEventListener('focus', () => resaltar(id, true));
                path.addEventListener('blur', () => resaltar(id, false));
                path.addEventListener('click', () => { window.location.href = estado.url; });
                path.addEventListener('keydown', e => {
                    if (e.key === 'Enter') window.location.href = estado.url;
                });

                svg.appendChild(path);
            });

            contenedor.prepend(svg);
        } catch (error) {
            console.error('Error cargando el mapa:', error);
            const aviso = document.createElement('p');
            aviso.className = 'mapa-aviso';
            aviso.textContent = 'No se pudo cargar el mapa. Usa la lista de estados.';
            contenedor.prepend(aviso);
        }
    }

    function armarLista(lista, buscar, vacia) {
        Object.keys(ESTADOS)
            .sort((a, b) => ESTADOS[a].nombre.localeCompare(ESTADOS[b].nombre, 'es'))
            .forEach(id => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = ESTADOS[id].url;
                a.textContent = ESTADOS[id].nombre;
                a.dataset.estado = id;
                a.dataset.busqueda = quitarAcentos(ESTADOS[id].nombre);
                a.addEventListener('mouseenter', () => resaltar(id, true));
                a.addEventListener('mouseleave', () => resaltar(id, false));
                li.appendChild(a);
                lista.appendChild(li);
            });

        buscar.addEventListener('input', () => {
            const q = quitarAcentos(buscar.value.trim());
            let visibles = 0;
            lista.querySelectorAll('a').forEach(a => {
                const ok = a.dataset.busqueda.includes(q);
                a.parentNode.style.display = ok ? '' : 'none';
                if (ok) visibles++;
            });
            vacia.style.display = visibles ? 'none' : 'block';
        });

        // Enter abre el primer resultado
        buscar.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            const primero = [...lista.querySelectorAll('a')].find(a => a.parentNode.style.display !== 'none');
            if (primero) window.location.href = primero.href;
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const mapa = document.getElementById('map');
        const lista = document.getElementById('listaEstados');
        if (mapa) cargarMapa(mapa);
        if (lista) armarLista(lista, document.getElementById('buscarEstado'), document.getElementById('listaVacia'));
    });
})();
