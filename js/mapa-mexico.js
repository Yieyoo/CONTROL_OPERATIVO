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

    // ===== Zoom: se mueve el viewBox del SVG =====
    const ANCHO = 1000, ALTO = 630;
    const ZOOM_MAX = 12;

    function crearZoom(svg, contenedor) {
        let vista = { x: 0, y: 0, w: ANCHO, h: ALTO };
        let objetivo = vista;   // a dónde va la animación en curso
        let animacion = null;

        // Mantiene la proporción y no deja que el mapa se salga del recuadro
        function ajustar(v) {
            const w = Math.min(ANCHO, Math.max(ANCHO / ZOOM_MAX, v.w));
            const h = w * ALTO / ANCHO;
            const x = Math.min(ANCHO - w, Math.max(0, v.x + (v.w - w) / 2));
            const y = Math.min(ALTO - h, Math.max(0, v.y + (v.h - h) / 2));
            return { x, y, w, h };
        }

        function aplicar(v) {
            vista = v;
            svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
            contenedor.classList.toggle('con-zoom', v.w < ANCHO - 0.5);
        }

        const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function ir(destino, animar = true) {
            destino = ajustar(destino);
            objetivo = destino;
            cancelAnimationFrame(animacion);
            if (!animar || sinMovimiento) return aplicar(destino);

            const inicio = { ...vista };
            const t0 = performance.now();
            const DURACION = 450;
            const paso = () => {
                const t = Math.min(1, Math.max(0, (performance.now() - t0) / DURACION));
                const e = 1 - Math.pow(1 - t, 3);
                aplicar({
                    x: inicio.x + (destino.x - inicio.x) * e,
                    y: inicio.y + (destino.y - inicio.y) * e,
                    w: inicio.w + (destino.w - inicio.w) * e,
                    h: inicio.h + (destino.h - inicio.h) * e
                });
                if (t < 1) animacion = requestAnimationFrame(paso);
            };
            animacion = requestAnimationFrame(paso);
        }

        // Convierte coordenadas de pantalla a coordenadas del mapa
        function aMapa(clientX, clientY) {
            const r = svg.getBoundingClientRect();
            return {
                x: vista.x + (clientX - r.left) / r.width * vista.w,
                y: vista.y + (clientY - r.top) / r.height * vista.h
            };
        }

        // Acerca o aleja dejando fijo el punto (px, py) del mapa
        function zoomEn(factor, px, py, animar = true) {
            const w = vista.w / factor, h = vista.h / factor;
            ir({
                x: px - (px - vista.x) / factor,
                y: py - (py - vista.y) / factor,
                w, h
            }, animar);
        }

        // Parte del destino de la animación en curso para que clics seguidos se acumulen
        function zoomCentro(factor) {
            const v = objetivo, w = v.w / factor, h = v.h / factor;
            ir({ x: v.x + (v.w - w) / 2, y: v.y + (v.h - h) / 2, w, h });
        }

        function enfocar(path) {
            const b = path.getBBox();
            const margen = 2.2;
            let w = Math.max(b.width * margen, b.height * margen * ANCHO / ALTO);
            w = Math.max(w, ANCHO / ZOOM_MAX);
            const h = w * ALTO / ANCHO;
            ir({ x: b.x + b.width / 2 - w / 2, y: b.y + b.height / 2 - h / 2, w, h });
        }

        function restablecer() {
            ir({ x: 0, y: 0, w: ANCHO, h: ALTO });
        }

        // Rueda del mouse: acercar siempre; alejar solo si hay zoom (si no, deja bajar la página)
        svg.addEventListener('wheel', e => {
            const alejando = e.deltaY > 0;
            if (alejando && vista.w >= ANCHO - 0.5) return;
            e.preventDefault();
            const p = aMapa(e.clientX, e.clientY);
            zoomEn(alejando ? 1 / 1.25 : 1.25, p.x, p.y, false);
        }, { passive: false });

        // Arrastrar para mover y pellizcar para acercar (mouse y touch)
        const punteros = new Map();
        let arrastre = null;
        let pellizco = null;
        let seMovio = false;

        svg.addEventListener('pointerdown', e => {
            punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
            seMovio = false;
            if (punteros.size === 1) {
                arrastre = { x: e.clientX, y: e.clientY, vista: { ...vista } };
            } else if (punteros.size === 2) {
                const [a, b] = [...punteros.values()];
                pellizco = { dist: Math.hypot(a.x - b.x, a.y - b.y), vista: { ...vista } };
                arrastre = null;
            }
        });

        svg.addEventListener('pointermove', e => {
            if (!punteros.has(e.pointerId)) return;
            punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
            const r = svg.getBoundingClientRect();

            if (pellizco && punteros.size === 2) {
                const [a, b] = [...punteros.values()];
                const factor = Math.hypot(a.x - b.x, a.y - b.y) / pellizco.dist;
                const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
                const v = pellizco.vista;
                const px = v.x + (cx - r.left) / r.width * v.w;
                const py = v.y + (cy - r.top) / r.height * v.h;
                const w = v.w / factor, h = v.h / factor;
                ir({ x: px - (px - v.x) / factor, y: py - (py - v.y) / factor, w, h }, false);
                seMovio = true;
            } else if (arrastre && vista.w < ANCHO - 0.5) {
                const dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y;
                if (!seMovio && Math.hypot(dx, dy) < 5) return;
                if (!seMovio) svg.setPointerCapture(e.pointerId);
                seMovio = true;
                const v = arrastre.vista;
                ir({ x: v.x - dx / r.width * v.w, y: v.y - dy / r.height * v.h, w: v.w, h: v.h }, false);
            }
        });

        const soltar = e => {
            punteros.delete(e.pointerId);
            if (punteros.size < 2) pellizco = null;
            if (punteros.size === 0) arrastre = null;
        };
        svg.addEventListener('pointerup', soltar);
        svg.addEventListener('pointercancel', soltar);

        // Un arrastre no debe contar como clic en un estado
        svg.addEventListener('click', e => {
            if (seMovio) { e.stopPropagation(); seMovio = false; }
        }, true);

        return { zoomCentro, enfocar, restablecer };
    }

    function crearBoton(icono, titulo, accion) {
        const b = document.createElement('button');
        b.type = 'button';
        b.title = titulo;
        b.setAttribute('aria-label', titulo);
        b.innerHTML = `<i class="fas ${icono}"></i>`;
        b.addEventListener('click', accion);
        return b;
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
            svg.setAttribute('viewBox', `0 0 ${ANCHO} ${ALTO}`);
            svg.setAttribute('role', 'img');
            svg.setAttribute('aria-label', 'Mapa de México por estado');
            contenedor.prepend(svg);

            const zoom = crearZoom(svg, contenedor);

            // Tarjeta del estado seleccionado
            const tarjeta = document.createElement('div');
            tarjeta.className = 'mapa-seleccion';
            tarjeta.innerHTML = '<strong></strong><a href="#">Ver información <i class="fas fa-arrow-right"></i></a>';
            const cerrar = crearBoton('fa-times', 'Quitar selección', () => deseleccionar());
            cerrar.className = 'mapa-seleccion-cerrar';
            tarjeta.appendChild(cerrar);
            contenedor.appendChild(tarjeta);

            let seleccionado = null;

            function seleccionar(id, path) {
                if (seleccionado) seleccionado.classList.remove('seleccionado');
                seleccionado = path;
                path.classList.add('seleccionado');
                tarjeta.querySelector('strong').textContent = ESTADOS[id].nombre;
                tarjeta.querySelector('a').href = ESTADOS[id].url;
                tarjeta.classList.add('visible');
                zoom.enfocar(path);
            }

            function deseleccionar() {
                if (seleccionado) seleccionado.classList.remove('seleccionado');
                seleccionado = null;
                tarjeta.classList.remove('visible');
                zoom.restablecer();
            }

            // Controles de zoom
            const controles = document.createElement('div');
            controles.className = 'mapa-controles';
            controles.append(
                crearBoton('fa-plus', 'Acercar', () => zoom.zoomCentro(1.6)),
                crearBoton('fa-minus', 'Alejar', () => zoom.zoomCentro(1 / 1.6)),
                crearBoton('fa-expand', 'Ver todo el país', deseleccionar)
            );
            contenedor.appendChild(controles);

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
                // Primer clic: acerca y centra el estado. Segundo clic sobre el mismo: abre su página
                path.addEventListener('click', () => {
                    if (seleccionado === path) window.location.href = estado.url;
                    else seleccionar(id, path);
                });
                path.addEventListener('keydown', e => {
                    if (e.key === 'Enter') window.location.href = estado.url;
                });

                svg.appendChild(path);
            });
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
