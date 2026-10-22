// Mapa interactivo de México y lista de estados de la portada.
// El contorno sale de imagenes/mx.svg (Simplemaps, licencia gratuita para uso comercial,
// sin marca de agua). Cada estado se identifica con su código ISO (MXAGU, MXBCN...).
(function () {
    const ESTADOS = {
        MXAGU: { nombre: 'Aguascalientes', slug: 'aguascalientes', url: 'estados/aguascalientes/aguascalientesindex.html' },
        MXBCN: { nombre: 'Baja California', slug: 'baja-california', url: 'estados/baja_california/baja_californiaindex.html' },
        MXBCS: { nombre: 'Baja California Sur', slug: 'baja-california-sur', url: 'estados/baja_california_s/baja_california_surindex.html' },
        MXCAM: { nombre: 'Campeche', slug: 'campeche', url: 'estados/campeche/campecheindex.html' },
        MXCHP: { nombre: 'Chiapas', slug: 'chiapas', url: 'estados/chiapas/chiapasindex.html' },
        MXCHH: { nombre: 'Chihuahua', slug: 'chihuahua', url: 'estados/chihuahua/chihuahuaindex.html' },
        MXCMX: { nombre: 'Ciudad de México', slug: 'ciudad-de-mexico', url: 'estados/cdmx/cdmxindex.html' },
        MXCOA: { nombre: 'Coahuila', slug: 'coahuila', url: 'estados/coahuila/coahuilaindex.html' },
        MXCOL: { nombre: 'Colima', slug: 'colima', url: 'estados/colima/colimaindex.html' },
        MXDUR: { nombre: 'Durango', slug: 'durango', url: 'estados/durango/durangoindex.html' },
        MXMEX: { nombre: 'Estado de México', slug: 'estado-de-mexico', url: 'estados/edomex/edomexindex.html' },
        MXGUA: { nombre: 'Guanajuato', slug: 'guanajuato', url: 'estados/guanajuato/guanajuatoindex.html' },
        MXGRO: { nombre: 'Guerrero', slug: 'guerrero', url: 'estados/guerrero/guerreroindex.html' },
        MXHID: { nombre: 'Hidalgo', slug: 'hidalgo', url: 'estados/hidalgo/hidalgoindex.html' },
        MXJAL: { nombre: 'Jalisco', slug: 'jalisco', url: 'estados/jalisco/jaliscoindex.html' },
        MXMIC: { nombre: 'Michoacán', slug: 'michoacan', url: 'estados/michoacan/michoacanindex.html' },
        MXMOR: { nombre: 'Morelos', slug: 'morelos', url: 'estados/morelos/morelosindex.html' },
        MXNAY: { nombre: 'Nayarit', slug: 'nayarit', url: 'estados/nayarit/nayaritindex.html' },
        MXNLE: { nombre: 'Nuevo León', slug: 'nuevo-leon', url: 'estados/nuevo_leon/nuevolindex.html' },
        MXOAX: { nombre: 'Oaxaca', slug: 'oaxaca', url: 'estados/oaxaca/oaxacaindex.html' },
        MXPUE: { nombre: 'Puebla', slug: 'puebla', url: 'estados/puebla/pueblaindex.html' },
        MXQUE: { nombre: 'Querétaro', slug: 'queretaro', url: 'estados/queretaro/queretaroindex.html' },
        MXROO: { nombre: 'Quintana Roo', slug: 'quintana-roo', url: 'estados/quintanaroo/quintanarooindex.html' },
        MXSLP: { nombre: 'San Luis Potosí', slug: 'san-luis-potosi', url: 'estados/san_luis/san_luisindex.html' },
        MXSIN: { nombre: 'Sinaloa', slug: 'sinaloa', url: 'estados/sinaloa/sinaloaindex.html' },
        MXSON: { nombre: 'Sonora', slug: 'sonora', url: 'estados/sonora/sonoraindex.html' },
        MXTAB: { nombre: 'Tabasco', slug: 'tabasco', url: 'estados/tabasco/tabascoindex.html' },
        MXTAM: { nombre: 'Tamaulipas', slug: 'tamaulipas', url: 'estados/tamaulipas/tamaulipasindex.html' },
        MXTLA: { nombre: 'Tlaxcala', slug: 'tlaxcala', url: 'estados/tlaxcala/tlaxcalaindex.html' },
        MXVER: { nombre: 'Veracruz', slug: 'veracruz', url: 'estados/veracruz/veracruzindex.html' },
        MXYUC: { nombre: 'Yucatán', slug: 'yucatan', url: 'estados/yucatan/yucatanindex.html' },
        MXZAC: { nombre: 'Zacatecas', slug: 'zacatecas', url: 'estados/zacatecas/zacatecasindex.html' }
    };

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const quitarAcentos = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    // ===== Resumen de plantilla (estructura + eventual) por estado =====
    let resumen = null;
    let resumenError = false;

    const resumenListo = (async () => {
        try {
            const resp = await fetch(`${window.CONFIG.BACKEND_URL}/plantilla-resumen`, {
                headers: { 'Authorization': 'Bearer ' + window.CONFIG.getToken() }
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            resumen = (await resp.json()).data;
        } catch (error) {
            console.error('Error cargando el resumen de plantilla:', error);
            resumenError = true;
        }
    })();

    const fmt = n => Number(n || 0).toLocaleString('es-MX');

    function periodoTexto(datos) {
        if (!datos) return '';
        const q = datos.quincena === '1' ? '1ra' : '2da';
        return `${q} quincena ${String(datos.mes || '').toLowerCase()} ${datos.anio}`;
    }

    // Conteos de un estado, o de todo el país si slug es null
    function conteo(datos, slug) {
        const vacio = { total: 0, activos: 0, vacantes: 0 };
        if (!datos) return vacio;
        if (slug) return datos.estados[slug] || vacio;
        return Object.values(datos.estados).reduce((s, c) => ({
            total: s.total + c.total,
            activos: s.activos + c.activos,
            vacantes: s.vacantes + c.vacantes
        }), vacio);
    }

    function filaTipo(etiqueta, datos, slug) {
        if (!datos) {
            return `<div class="sel-tipo sin-datos"><span class="sel-tipo-nombre">${etiqueta}</span><span class="sel-nd">Sin carga</span></div>`;
        }
        const c = conteo(datos, slug);
        return `
            <div class="sel-tipo" title="Vigencia: ${periodoTexto(datos)}">
                <span class="sel-tipo-nombre">${etiqueta}</span>
                <span class="sel-tipo-total">${fmt(c.total)}</span>
                <span class="sel-chip activos">${fmt(c.activos)} activos</span>
                <span class="sel-chip vacantes">${fmt(c.vacantes)} vacantes</span>
            </div>`;
    }

    function pintarResumen(caja, slug) {
        if (!resumen) {
            caja.innerHTML = resumenError
                ? '<p class="sel-aviso">No se pudo cargar la plantilla.</p>'
                : '<p class="sel-aviso"><i class="fas fa-spinner fa-spin"></i> Cargando plantilla...</p>';
            return;
        }
        const { estructura, eventual } = resumen;
        if (!estructura && !eventual) {
            caja.innerHTML = '<p class="sel-aviso">Aún no se ha cargado ninguna plantilla.</p>';
            return;
        }
        const total = conteo(estructura, slug).total + conteo(eventual, slug).total;
        const periodo = periodoTexto(estructura || eventual);

        caja.innerHTML = `
            <div class="sel-total">
                <span>Plantilla actual</span>
                <strong>${fmt(total)}</strong>
            </div>
            ${filaTipo('Estructura', estructura, slug)}
            ${filaTipo('Eventual', eventual, slug)}
            <small class="sel-periodo">Vigencia: ${periodo}</small>`;
    }

    // Resalta un estado en el mapa y en la lista a la vez
    function resaltar(id, activo) {
        document.querySelectorAll(`[data-estado="${id}"]`).forEach(el => el.classList.toggle('activo', activo));
    }

    // ===== Zoom =====
    // El SVG se mueve con transform de CSS (lo hace la tarjeta gráfica, sin redibujar
    // los estados en cada cuadro). Al terminar el movimiento se redibuja una vez, nítido.
    const ANCHO = 1000, ALTO = 630;
    const ZOOM_MAX = 12;
    const DURACION = 450;

    function crearZoom(svg, contenedor) {
        let vista = { x: 0, y: 0, w: ANCHO, h: ALTO };   // parte del mapa visible (unidades del SVG)
        let reposo = null;
        const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Mantiene la proporción y no deja que el mapa se salga del recuadro
        function ajustar(v) {
            const w = Math.min(ANCHO, Math.max(ANCHO / ZOOM_MAX, v.w));
            const h = w * ALTO / ANCHO;
            const x = Math.min(ANCHO - w, Math.max(0, v.x + (v.w - w) / 2));
            const y = Math.min(ALTO - h, Math.max(0, v.y + (v.h - h) / 2));
            return { x, y, w, h };
        }

        // Cuando el mapa deja de moverse: se quita la capa de la tarjeta gráfica para que
        // el navegador lo redibuje nítido, y el grosor de las fronteras se ajusta al zoom
        function enReposo() {
            svg.style.willChange = 'auto';
            svg.style.setProperty('--trazo', (vista.w / ANCHO).toFixed(4));
        }

        function aplicar(v, duracion) {
            vista = v;
            const s = ANCHO / v.w;
            clearTimeout(reposo);
            svg.style.willChange = 'transform';
            svg.style.transition = duracion && !sinMovimiento
                ? `transform ${duracion}ms cubic-bezier(0.22, 0.61, 0.36, 1)`
                : 'none';
            svg.style.transform =
                `translate(${-v.x / ANCHO * 100 * s}%, ${-v.y / ALTO * 100 * s}%) scale(${s})`;
            contenedor.classList.toggle('con-zoom', v.w < ANCHO - 0.5);
            reposo = setTimeout(enReposo, (sinMovimiento ? 0 : duracion || 0) + 150);
        }

        function ir(destino, duracion = DURACION) {
            aplicar(ajustar(destino), duracion);
        }

        // Convierte coordenadas de pantalla a coordenadas del mapa
        // (se mide el contenedor: el SVG está escalado y su rectángulo no sirve)
        function aMapa(clientX, clientY) {
            const r = contenedor.getBoundingClientRect();
            return {
                x: vista.x + (clientX - r.left) / r.width * vista.w,
                y: vista.y + (clientY - r.top) / r.height * vista.h
            };
        }

        // Acerca o aleja dejando fijo el punto (px, py) del mapa
        function zoomEn(factor, px, py, duracion = DURACION) {
            const w = vista.w / factor, h = vista.h / factor;
            ir({
                x: px - (px - vista.x) / factor,
                y: py - (py - vista.y) / factor,
                w, h
            }, duracion);
        }

        function zoomCentro(factor) {
            zoomEn(factor, vista.x + vista.w / 2, vista.y + vista.h / 2);
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
            zoomEn(alejando ? 1 / 1.25 : 1.25, p.x, p.y, 160);
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
            const r = contenedor.getBoundingClientRect();

            if (pellizco && punteros.size === 2) {
                const [a, b] = [...punteros.values()];
                const factor = Math.hypot(a.x - b.x, a.y - b.y) / pellizco.dist;
                const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
                const v = pellizco.vista;
                const px = v.x + (cx - r.left) / r.width * v.w;
                const py = v.y + (cy - r.top) / r.height * v.h;
                const w = v.w / factor, h = v.h / factor;
                ir({ x: px - (px - v.x) / factor, y: py - (py - v.y) / factor, w, h }, 0);
                seMovio = true;
            } else if (arrastre && vista.w < ANCHO - 0.5) {
                const dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y;
                if (!seMovio && Math.hypot(dx, dy) < 5) return;
                if (!seMovio) svg.setPointerCapture(e.pointerId);
                seMovio = true;
                const v = arrastre.vista;
                ir({ x: v.x - dx / r.width * v.w, y: v.y - dy / r.height * v.h, w: v.w, h: v.h }, 0);
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

    async function cargarMapa(contenedor, panel) {
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

            let seleccionado = null;
            let seleccionadoId = null;

            function seleccionar(id, path) {
                if (seleccionado) seleccionado.classList.remove('seleccionado');
                seleccionado = path;
                seleccionadoId = id;
                path.classList.add('seleccionado');
                pintarPanel();
                zoom.enfocar(path);
            }

            // Panel de la derecha: el estado seleccionado o, si no hay, el total nacional
            function pintarPanel() {
                if (!panel) return;
                const estado = seleccionadoId ? ESTADOS[seleccionadoId] : null;
                panel.classList.toggle('con-estado', !!estado);
                panel.innerHTML = `
                    <div class="sel-cabecera">
                        <div>
                            <span class="sel-etiqueta">${estado ? 'Oficina de Representación' : 'Resumen'}</span>
                            <strong>${estado ? estado.nombre : 'Total nacional'}</strong>
                        </div>
                    </div>
                    <div class="sel-resumen"></div>
                    <small class="sel-pista">${estado
                        ? 'Clic otra vez en el estado para abrir su página'
                        : 'Selecciona un estado para ver su resumen'}</small>`;
                if (estado) {
                    const cerrar = crearBoton('fa-times', 'Quitar selección', () => deseleccionar());
                    cerrar.className = 'mapa-seleccion-cerrar';
                    panel.querySelector('.sel-cabecera').appendChild(cerrar);
                }
                pintarResumen(panel.querySelector('.sel-resumen'), estado ? estado.slug : null);
            }

            pintarPanel();
            resumenListo.then(pintarPanel);

            function deseleccionar() {
                if (seleccionado) seleccionado.classList.remove('seleccionado');
                seleccionado = null;
                seleccionadoId = null;
                pintarPanel();
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
        if (mapa) cargarMapa(mapa, document.getElementById('panelResumen'));
        if (lista) armarLista(lista, document.getElementById('buscarEstado'), document.getElementById('listaVacia'));
    });
})();
