// documento-loader.js - Visor del PDF más reciente de un tipo de documento por estado.
// Cada página solo define window.DOC_PAGE = { estado, tipo, titulo } y un <div id="documento-root">.
// Se puede sobrescribir con ?estado=...&tipo=...&titulo=... en la URL.

(function () {
    const PAGE = window.DOC_PAGE || {};
    const BACKEND_URL = window.CONFIG.BACKEND_URL;
    const PREFIX = '../../../';

    const params = new URLSearchParams(window.location.search);
    const ESTADO = params.get('estado') || PAGE.estado;
    const TIPO = params.get('tipo') || PAGE.tipo;
    const TITULO = params.get('titulo') || PAGE.titulo;

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[c]);
    }

    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    function showLoading(show) {
        document.getElementById('loading').style.display = show ? 'flex' : 'none';
    }

    function showError(message) {
        ['pdf-error', 'mobile-error'].forEach(id => {
            const el = document.getElementById(id);
            el.textContent = message;
            el.style.display = 'block';
        });
    }

    function hideErrors() {
        ['pdf-error', 'mobile-error'].forEach(id => {
            document.getElementById(id).style.display = 'none';
        });
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function injectDOM(root) {
        root.innerHTML = `
            <div class="loading" id="loading">
                <div class="spinner"></div>
            </div>
            <div class="logo-container">
                <img src="${PREFIX}imagenes/inm logo.png" alt="Logo INM">
            </div>
            <div class="pdf-container">
                <iframe id="pdf-viewer" class="pdf-embed" frameborder="0" title="Visualizador de PDF"></iframe>
                <div id="pdf-error" class="error-message" style="display: none;"></div>
            </div>
            <!-- Contenedor específico para iOS (oculto en otros dispositivos) -->
            <div id="ios-container" class="ios-only">
                <p>Para visualizar el documento en tu dispositivo iOS:</p>
                <a href="#" id="ios-pdf-link" class="ios-pdf-link" download>
                    <span>Descargar Documento</span>
                </a>
                <p class="ios-instructions">Toca el botón arriba para descargar el PDF a tu dispositivo</p>
            </div>
            <div class="mobile-images">
                <div id="mobile-error" class="error-message" style="display: none;"></div>
            </div>
        `;
    }

    async function cargarDocumentoPDF() {
        showLoading(true);
        hideErrors();

        document.title = TITULO + ' - ' + ESTADO.toUpperCase();
        const titulo = document.getElementById('titulo-documento');
        if (titulo) titulo.textContent = TITULO;

        try {
            const response = await fetch(`${BACKEND_URL}/archivos/${ESTADO}/${TIPO}`, {
                headers: { 'Authorization': 'Bearer ' + window.CONFIG.getToken() }
            });
            if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);

            const result = await response.json();
            if (!result?.data) throw new Error('Formato de respuesta inválido');

            if (result.data.length === 0) {
                showError(`No se encontraron documentos de ${TITULO.toLowerCase()} para ${ESTADO}`);
                return;
            }

            const latest = result.data.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))[0];
            const filename = latest.filename || `${TIPO}.pdf`;

            document.getElementById('pdf-viewer').src = latest.url;

            if (isIOS()) {
                const iosLink = document.getElementById('ios-pdf-link');
                iosLink.href = latest.url;
                iosLink.setAttribute('download', filename);
            } else {
                document.querySelector('.mobile-images').innerHTML = `
                    <div class="file-info">
                        <h3>${escapeHtml(latest.filename || TITULO)}</h3>
                        <p>Actualizado: ${formatDate(latest.uploaded_at)}</p>
                        <p>Tamaño: ${(latest.size / (1024 * 1024)).toFixed(2)} MB</p>
                        <a href="${escapeHtml(latest.url)}" class="download-btn" download="${escapeHtml(filename)}">
                            Descargar Documento
                        </a>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error:', error);
            showError(`Error al cargar el documento: ${error.message}`);
        } finally {
            showLoading(false);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('documento-root');
        if (!root) return;
        injectDOM(root);
        cargarDocumentoPDF();
    });
})();
