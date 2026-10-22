// Encabezado de cada estado como banda guinda con la silueta del estado en dorado.
// La silueta sale del mismo mapa de la portada (imagenes/mx.svg).
(function () {
    // Carpeta del estado en /estados/<carpeta>/ -> id del estado en mx.svg
    const IDS = {
        aguascalientes: 'MXAGU', baja_california: 'MXBCN', baja_california_s: 'MXBCS', campeche: 'MXCAM',
        cdmx: 'MXCMX', chiapas: 'MXCHP', chihuahua: 'MXCHH', coahuila: 'MXCOA', colima: 'MXCOL', durango: 'MXDUR',
        edomex: 'MXMEX', guanajuato: 'MXGUA', guerrero: 'MXGRO', hidalgo: 'MXHID', jalisco: 'MXJAL',
        michoacan: 'MXMIC', morelos: 'MXMOR', nayarit: 'MXNAY', nuevo_leon: 'MXNLE', oaxaca: 'MXOAX',
        puebla: 'MXPUE', queretaro: 'MXQUE', quintanaroo: 'MXROO', san_luis: 'MXSLP', sinaloa: 'MXSIN',
        sonora: 'MXSON', tabasco: 'MXTAB', tamaulipas: 'MXTAM', tlaxcala: 'MXTLA', veracruz: 'MXVER',
        yucatan: 'MXYUC', zacatecas: 'MXZAC'
    };
    const SVG_NS = 'http://www.w3.org/2000/svg';

    const carpeta = (/\/estados\/([^/]+)\//.exec(decodeURIComponent(location.pathname)) || [])[1];
    const id = IDS[carpeta];

    document.addEventListener('DOMContentLoaded', async () => {
        const banda = document.querySelector('.instituto-info');
        if (!banda) return;
        banda.classList.add('con-banda');
        if (!id) return;

        try {
            const resp = await fetch('../../imagenes/mx.svg');
            if (!resp.ok) return;
            const origen = new DOMParser().parseFromString(await resp.text(), 'image/svg+xml');
            const forma = origen.querySelector(`#features path#${id}`);
            if (!forma) return;

            const svg = document.createElementNS(SVG_NS, 'svg');
            svg.setAttribute('class', 'banda-silueta');
            svg.setAttribute('aria-hidden', 'true');
            const path = document.createElementNS(SVG_NS, 'path');
            path.setAttribute('d', forma.getAttribute('d'));
            svg.appendChild(path);

            // Va entre el nombre del estado y la fecha
            const fecha = banda.querySelector('.inst-date-block');
            const antesDe = fecha && fecha.previousElementSibling && fecha.previousElementSibling.classList.contains('inst-sep')
                ? fecha.previousElementSibling : fecha;
            banda.insertBefore(svg, antesDe);

            // El recuadro se ajusta al contorno del estado (con un poco de aire)
            const b = path.getBBox();
            const m = Math.max(b.width, b.height) * 0.06;
            svg.setAttribute('viewBox', `${b.x - m} ${b.y - m} ${b.width + 2 * m} ${b.height + 2 * m}`);
        } catch (e) {
            console.error('No se pudo dibujar la silueta del estado:', e);
        }
    });
})();
