// ficha-loader.js - Ficha curricular display + edit

(function () {
    const ESTADO = window.FICHA_ESTADO || '';
    const BACKEND = window.CONFIG?.BACKEND_URL || '';
    const KEY = window.CONFIG?.API_KEY || '';
    const IS_ADMIN = localStorage.getItem('authenticated') === 'true';
    const DEPTH = 3; // fichao.html is always at depth 3
    const PREFIX = '../'.repeat(DEPTH);

    let currentData = null;
    let pendingFotoBase64 = null;

    // ── Bootstrap ──────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        injectDOM();
        loadFicha();
    });

    function injectDOM() {
        const root = document.getElementById('ficha-root');
        if (!root) return;
        root.innerHTML = `
            <div class="ficha-wrapper" id="ficha-wrapper">
                <div id="ficha-card-area"></div>
                <div class="ficha-admin-bar" id="ficha-admin-bar" style="display:flex">
                    <div id="ficha-btn-descarga"></div>
                    ${IS_ADMIN ? `<button class="ficha-btn ficha-btn-editar" onclick="fichaOpenModal()">
                        <i class="fas fa-edit"></i> Editar ficha
                    </button>` : ''}
                </div>
            </div>

            <!-- Modal -->
            <div class="ficha-modal-overlay" id="fichaModalOverlay">
                <div class="ficha-modal">
                    <div class="ficha-modal-header">
                        <h2>Editar Ficha Curricular</h2>
                        <button class="ficha-modal-close" onclick="fichaCloseModal()">✕</button>
                    </div>
                    <div class="ficha-modal-body" id="fichaModalBody"></div>
                    <div class="ficha-modal-footer">
                        <button class="ficha-btn ficha-btn-cancelar" onclick="fichaCloseModal()">Cancelar</button>
                        <button class="ficha-btn ficha-btn-guardar" onclick="fichaSave()">
                            <i class="fas fa-save"></i> Guardar
                        </button>
                    </div>
                </div>
            </div>

            <!-- Loading -->
            <div class="ficha-loading" id="fichaLoading">
                <div class="ficha-spinner"></div>
            </div>
        `;
    }

    // ── Load from API ───────────────────────────────────────
    async function loadFicha() {
        try {
            const res = await fetch(`${BACKEND}/ficha-datos/${ESTADO}`, {
                headers: { 'x-api-key': KEY }
            });
            const result = await res.json();
            currentData = result.data;
        } catch (e) {
            currentData = null;
        }
        renderCard(currentData);
        renderDescarga(currentData);
    }

    // ── Render Card ─────────────────────────────────────────
    function renderCard(d) {
        const area = document.getElementById('ficha-card-area');
        if (!area) return;

        if (!d) {
            area.innerHTML = `
                <div class="ficha-empty">
                    ${IS_ADMIN
                        ? '<p>Esta ficha no tiene datos aún.<br>Haz clic en <strong>Editar ficha</strong> para agregarlos.</p>'
                        : '<p>Ficha curricular no disponible.</p>'}
                </div>`;
            return;
        }

        const formacionHTML = (d.formacion || []).map(f =>
            `<li>${f}</li>`).join('');

        const trayHTML = (d.trayectoria || []).map(t => `
            <div class="ficha-tray-item">
                <span class="periodo">${t.periodo}:</span> ${t.cargo}
            </div>`).join('');

        const carreraHTML = (d.carrera_profesional || []).map(c => `
            <div class="ficha-carrera-item">
                <span class="org">${c.org}</span> ${c.cargo}
            </div>`).join('');

        const fotoPos = d.foto_position || '20% center';
        const fotoTag = d.foto_url
            ? `<img class="ficha-foto" src="${d.foto_url}" alt="Foto" style="object-position:${fotoPos}">`
            : `<span class="ficha-foto-placeholder">👤</span>`;

        area.innerHTML = `
            <div class="ficha-card">
                <div class="ficha-izq">
                    <div class="ficha-cargo">${d.cargo || ''}</div>
                    <div class="ficha-foto-wrap">${fotoTag}</div>
                    <div class="ficha-nombre">${d.nombre || ''}</div>

                    ${(d.formacion?.length) ? `
                    <div class="ficha-sec-izq">
                        <h4>Formación Académica</h4>
                        <ul>${formacionHTML}</ul>
                    </div>` : ''}

                    <div class="ficha-sec-izq">
                        <h4>Información de Contacto</h4>
                        ${d.contacto?.personal ? `
                            <span class="ficha-contacto-label">☎ Personal:</span>
                            <span class="ficha-contacto-val">${d.contacto.personal}</span>` : ''}
                        ${d.contacto?.trabajo ? `
                            <span class="ficha-contacto-label">☎ Trabajo:</span>
                            <span class="ficha-contacto-val">${d.contacto.trabajo}</span>` : ''}
                        ${d.contacto?.institucional ? `
                            <span class="ficha-contacto-label">✉ Institucional:</span>
                            <span class="ficha-contacto-val">${d.contacto.institucional}</span>` : ''}
                    </div>
                </div>

                <div class="ficha-der">
                    <div class="ficha-logos">
                        <img src="${PREFIX}imagenes/gobernacion.jpg" alt="Gobernación" onerror="this.style.display='none'">
                    </div>

                    <div class="ficha-sec-der">
                        <h3>Trayectoria INM</h3>
                        ${d.anio_ingreso ? `<p class="ficha-anio">Año de ingreso al INM: ${d.anio_ingreso}</p>` : ''}
                        ${d.or_nombre ? `<p class="ficha-or-nombre">${d.or_nombre}</p>` : ''}
                        ${trayHTML}
                    </div>

                    ${(d.carrera_intro || d.carrera_profesional?.length) ? `
                    <div class="ficha-sec-der">
                        <h3>Carrera Profesional</h3>
                        ${d.carrera_intro ? `<p class="ficha-carrera-intro">${d.carrera_intro}</p>` : ''}
                        ${carreraHTML}
                    </div>` : ''}
                </div>
            </div>`;
    }

    function renderDescarga(d) {
        const wrap = document.getElementById('ficha-btn-descarga');
        if (!wrap) return;
        if (d?.documento_url) {
            const nombre = d.documento_nombre || 'Documento';
            wrap.innerHTML = `<a class="ficha-btn ficha-btn-descargar" href="${d.documento_url}" download="${nombre}" target="_blank">
                <i class="fas fa-download"></i> Descargar documento
            </a>`;
        } else {
            wrap.innerHTML = '';
        }
    }

    // ── Modal Open ──────────────────────────────────────────
    window.fichaOpenModal = function () {
        pendingFotoBase64 = null;
        const d = currentData || {};
        const body = document.getElementById('fichaModalBody');
        if (!body) return;

        body.innerHTML = `
            <!-- Datos personales -->
            <div class="ficha-form-section">
                <h3>Datos personales</h3>
                <div class="ficha-field">
                    <label>Cargo / título (aparece en la columna izquierda)</label>
                    <textarea id="f-cargo" rows="3">${d.cargo || ''}</textarea>
                </div>
                <div class="ficha-field">
                    <label>Nombre completo</label>
                    <input id="f-nombre" type="text" value="${d.nombre || ''}">
                </div>
                <div class="ficha-field">
                    <label>Foto</label>
                    <div class="ficha-foto-preview-wrap">
                        <div class="ficha-drag-wrap" id="ficha-drag-wrap">
                            <img id="ficha-foto-preview" src="${d.foto_url || ''}" ${!d.foto_url ? 'style="display:none"' : ''}>
                        </div>
                        <div>
                            <input type="file" id="f-foto" accept="image/*" onchange="fichaPreviewFoto(this)">
                            <small style="color:#888;font-size:0.7rem;display:block;margin-top:4px">Arrastra la foto para reposicionarla</small>
                        </div>
                    </div>
                </div>
            </div>

                <div class="ficha-field">
                    <label>URL del documento (pega el enlace del archivo subido en Gestión)</label>
                    <input id="f-doc-url" type="text" value="${d.documento_url || ''}" placeholder="https://res.cloudinary.com/...">
                </div>
                <div class="ficha-field">
                    <label>Nombre del documento (ej: Ficha Curricular.pdf)</label>
                    <input id="f-doc-nombre" type="text" value="${d.documento_nombre || ''}" placeholder="Ficha Curricular.pdf">
                </div>

            <!-- Formación académica -->
            <div class="ficha-form-section">
                <h3>Formación Académica</h3>
                <div id="f-formacion-rows"></div>
                <button class="ficha-dyn-add" onclick="fichaAddRow('formacion')">+ Agregar título</button>
            </div>

            <!-- Contacto -->
            <div class="ficha-form-section">
                <h3>Información de Contacto</h3>
                <div class="ficha-field">
                    <label>Teléfono personal</label>
                    <input id="f-tel-personal" type="text" value="${d.contacto?.personal || ''}">
                </div>
                <div class="ficha-field">
                    <label>Teléfono trabajo</label>
                    <input id="f-tel-trabajo" type="text" value="${d.contacto?.trabajo || ''}">
                </div>
                <div class="ficha-field">
                    <label>Correo institucional</label>
                    <input id="f-email" type="text" value="${d.contacto?.institucional || ''}">
                </div>
            </div>

            <!-- Trayectoria INM -->
            <div class="ficha-form-section">
                <h3>Trayectoria INM</h3>
                <div class="ficha-field">
                    <label>Año de ingreso al INM</label>
                    <input id="f-anio" type="text" value="${d.anio_ingreso || ''}">
                </div>
                <div class="ficha-field">
                    <label>Nombre de la OR (ej: Oficina de Representación en el Estado de X)</label>
                    <input id="f-or" type="text" value="${d.or_nombre || ''}">
                </div>
                <label style="font-size:0.75rem;font-weight:600;color:#555;margin-bottom:6px;display:block">Historial de cargos</label>
                <div id="f-tray-rows"></div>
                <button class="ficha-dyn-add" onclick="fichaAddRow('trayectoria')">+ Agregar cargo</button>
            </div>

            <!-- Carrera profesional -->
            <div class="ficha-form-section">
                <h3>Carrera Profesional <span style="font-weight:400;font-size:0.7rem;color:#888">(opcional)</span></h3>
                <div class="ficha-field">
                    <label>Texto introductorio</label>
                    <textarea id="f-carrera-intro" rows="2">${d.carrera_intro || ''}</textarea>
                </div>
                <div id="f-carrera-rows"></div>
                <button class="ficha-dyn-add" onclick="fichaAddRow('carrera')">+ Agregar puesto</button>
            </div>
        `;

        // Fill dynamic rows
        (d.formacion || []).forEach(f => addFormRow('formacion', f));
        (d.trayectoria || []).forEach(t => addFormRow('trayectoria', null, t));
        (d.carrera_profesional || []).forEach(c => addFormRow('carrera', null, null, c));

        document.getElementById('fichaModalOverlay').classList.add('active');
        setTimeout(setupFotoDrag, 50);
    };

    window.fichaCloseModal = function () {
        document.getElementById('fichaModalOverlay').classList.remove('active');
    };

    // ── Preview foto ────────────────────────────────────────
    window.fichaPreviewFoto = function (input) {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            pendingFotoBase64 = e.target.result;
            const prev = document.getElementById('ficha-foto-preview');
            if (prev) {
                prev.style.left = '';
                prev.style.top = '';
                prev.style.width = '';
                prev.style.height = '';
                prev.src = e.target.result;
                prev.style.display = '';
                prev.addEventListener('load', setupFotoDrag, { once: true });
            }
        };
        reader.readAsDataURL(file);
    };

    function setupFotoDrag() {
        const preview = document.getElementById('ficha-foto-preview');
        const wrap = document.getElementById('ficha-drag-wrap');
        if (!wrap || !preview || !preview.src || preview.style.display === 'none') return;

        const cW = wrap.clientWidth;
        const cH = wrap.clientHeight;

        function initPos() {
            const nW = preview.naturalWidth || 300;
            const nH = preview.naturalHeight || 400;
            // Scale 1.4x over the minimum cover-scale so there's excess in BOTH axes
            const scale = Math.max(cW / nW, cH / nH) * 1.4;
            const iW = nW * scale;
            const iH = nH * scale;
            preview.style.width  = iW + 'px';
            preview.style.height = iH + 'px';

            let left, top;
            const saved = currentData?.foto_position;
            if (saved) {
                const pm = saved.match(/([\d.]+)%\s+([\d.]+)%/);
                if (pm) {
                    left = -((parseFloat(pm[1]) / 100) * (iW - cW));
                    top  = -((parseFloat(pm[2]) / 100) * (iH - cH));
                }
            }
            if (left === undefined) left = (cW - iW) / 2;
            if (top  === undefined) top  = (cH - iH) * 0.2;

            preview.style.left = Math.max(cW - iW, Math.min(0, left)) + 'px';
            preview.style.top  = Math.max(cH - iH, Math.min(0, top))  + 'px';
        }

        if (preview.complete && preview.naturalWidth) {
            initPos();
        } else {
            preview.addEventListener('load', initPos, { once: true });
            return;
        }

        let dragging = false, lx = 0, ly = 0;

        function start(e) {
            dragging = true;
            const t = e.touches?.[0] || e;
            lx = t.clientX; ly = t.clientY;
            wrap.style.cursor = 'grabbing';
            e.preventDefault();
        }
        function move(e) {
            if (!dragging) return;
            const t = e.touches?.[0] || e;
            const dx = t.clientX - lx;
            const dy = t.clientY - ly;
            lx = t.clientX; ly = t.clientY;
            const iW = parseFloat(preview.style.width);
            const iH = parseFloat(preview.style.height);
            preview.style.left = Math.max(cW - iW, Math.min(0, parseFloat(preview.style.left) + dx)) + 'px';
            preview.style.top  = Math.max(cH - iH, Math.min(0, parseFloat(preview.style.top)  + dy)) + 'px';
            e.preventDefault();
        }
        function end() { dragging = false; wrap.style.cursor = 'grab'; }

        wrap.addEventListener('mousedown', start);
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', end);
        wrap.addEventListener('touchstart', start, { passive: false });
        document.addEventListener('touchmove', move, { passive: false });
        document.addEventListener('touchend', end);
    }

    function getFotoPosition() {
        const preview = document.getElementById('ficha-foto-preview');
        const wrap = document.getElementById('ficha-drag-wrap');
        if (!preview || !wrap || !preview.style.left) return currentData?.foto_position || '50% 20%';
        const cW = wrap.clientWidth;
        const cH = wrap.clientHeight;
        const iW = parseFloat(preview.style.width)  || cW;
        const iH = parseFloat(preview.style.height) || cH;
        const exW = Math.max(1, iW - cW);
        const exH = Math.max(1, iH - cH);
        const pctX = ((-parseFloat(preview.style.left)) / exW * 100).toFixed(1);
        const pctY = ((-parseFloat(preview.style.top))  / exH * 100).toFixed(1);
        return `${pctX}% ${pctY}%`;
    }

    // ── Dynamic rows ────────────────────────────────────────
    window.fichaAddRow = function (type) {
        addFormRow(type);
    };

    function addFormRow(type, textVal, trayVal, carreraVal) {
        if (type === 'formacion') {
            const cont = document.getElementById('f-formacion-rows');
            const id = 'form-row-' + Date.now() + Math.random();
            const div = document.createElement('div');
            div.className = 'ficha-dyn-row';
            div.id = id;
            div.innerHTML = `
                <input class="wide" type="text" placeholder="Ej: Licenciatura en Derecho." value="${escHtml(textVal || '')}">
                <button class="ficha-dyn-del" onclick="document.getElementById('${id}').remove()">✕</button>`;
            cont.appendChild(div);

        } else if (type === 'trayectoria') {
            const cont = document.getElementById('f-tray-rows');
            const id = 'tray-row-' + Date.now() + Math.random();
            const div = document.createElement('div');
            div.className = 'ficha-dyn-row';
            div.id = id;
            div.innerHTML = `
                <input type="text" placeholder="Período (ej: 01/01/2023 - a la fecha)" value="${escHtml(trayVal?.periodo || '')}">
                <input class="wide" type="text" placeholder="Cargo" value="${escHtml(trayVal?.cargo || '')}">
                <button class="ficha-dyn-del" onclick="document.getElementById('${id}').remove()">✕</button>`;
            cont.appendChild(div);

        } else if (type === 'carrera') {
            const cont = document.getElementById('f-carrera-rows');
            const id = 'car-row-' + Date.now() + Math.random();
            const div = document.createElement('div');
            div.className = 'ficha-dyn-row';
            div.id = id;
            div.innerHTML = `
                <input type="text" placeholder="Organización:" value="${escHtml(carreraVal?.org || '')}">
                <input class="wide" type="text" placeholder="Cargo" value="${escHtml(carreraVal?.cargo || '')}">
                <button class="ficha-dyn-del" onclick="document.getElementById('${id}').remove()">✕</button>`;
            cont.appendChild(div);
        }
    }

    // ── Save ────────────────────────────────────────────────
    window.fichaSave = async function () {
        const data = collectFormData();
        if (pendingFotoBase64) data.foto_base64 = pendingFotoBase64;

        setLoading(true);
        try {
            const res = await fetch(`${BACKEND}/ficha-datos/${ESTADO}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Error al guardar');
            const result = await res.json();
            currentData = result.data;
            pendingFotoBase64 = null;
            fichaCloseModal();
            renderCard(currentData);
            renderDescarga(currentData);
        } catch (e) {
            alert('❌ Error al guardar: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    function collectFormData() {
        const formacion = [...document.querySelectorAll('#f-formacion-rows .ficha-dyn-row input')]
            .map(i => i.value.trim()).filter(Boolean);

        const trayectoria = [...document.querySelectorAll('#f-tray-rows .ficha-dyn-row')]
            .map(row => {
                const inputs = row.querySelectorAll('input');
                return { periodo: inputs[0]?.value.trim(), cargo: inputs[1]?.value.trim() };
            }).filter(t => t.periodo || t.cargo);

        const carrera_profesional = [...document.querySelectorAll('#f-carrera-rows .ficha-dyn-row')]
            .map(row => {
                const inputs = row.querySelectorAll('input');
                return { org: inputs[0]?.value.trim(), cargo: inputs[1]?.value.trim() };
            }).filter(c => c.org || c.cargo);

        const fotoPos = getFotoPosition();
        return {
            cargo: document.getElementById('f-cargo')?.value.trim() || '',
            nombre: document.getElementById('f-nombre')?.value.trim() || '',
            foto_url: currentData?.foto_url || '',
            documento_url: document.getElementById('f-doc-url')?.value.trim() || '',
            documento_nombre: document.getElementById('f-doc-nombre')?.value.trim() || '',
            foto_position: fotoPos,
            formacion,
            contacto: {
                personal: document.getElementById('f-tel-personal')?.value.trim() || '',
                trabajo: document.getElementById('f-tel-trabajo')?.value.trim() || '',
                institucional: document.getElementById('f-email')?.value.trim() || ''
            },
            anio_ingreso: document.getElementById('f-anio')?.value.trim() || '',
            or_nombre: document.getElementById('f-or')?.value.trim() || '',
            trayectoria,
            carrera_intro: document.getElementById('f-carrera-intro')?.value.trim() || '',
            carrera_profesional
        };
    }

    function setLoading(on) {
        const el = document.getElementById('fichaLoading');
        if (el) el.classList.toggle('active', on);
    }

    function escHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

})();
