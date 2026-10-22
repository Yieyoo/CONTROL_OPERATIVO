// plantilla-eventual-loader.js - Plantilla de Personal (PDF + Excel) con boton para alternar a la Plantilla Eventual.
// Cada pagina define window.DOC_PAGE = { estado } y un <div id="documento-root">.
// La logica es la misma que tenian las paginas individuales de cada estado.

(function () {
    const PREFIX = '../../../';

    function injectDOM() {
        const style = document.createElement('style');
        style.textContent = `
            /* Estilo para la fecha de actualización */
                #fecha-subida {
                    position: fixed;
                    bottom: 10px;
                    right: 10px;
                    background-color: rgba(0,0,0,0.7);
                    color: white;
                    padding: 5px 10px;
                    border-radius: 5px;
                    font-size: 12px;
                    z-index: 1000;
                }

                /* Botones: descargar + alternar documento (en flujo normal, se desplazan con la pagina) */
                #doc-actions-fixed {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    margin: 14px auto 0;
                }

                #download-doc-btn {
                    background-color: #A5852E;
                    color: white;
                    width: 38px;
                    height: 38px;
                    border-radius: 5px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-decoration: none;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                    transition: background-color 0.3s;
                    flex-shrink: 0;
                }

                #download-doc-btn:hover {
                    background-color: #8a6a24;
                }

                #toggle-doc-btn {
                    background-color: #2c3e50;
                    color: white;
                    border: none;
                    padding: 10px 15px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                    transition: background-color 0.3s;
                }

                #toggle-doc-btn:hover {
                    background-color: #34495e;

                }
                @media (max-width: 768px) {
                    #fecha-subida {
                        font-size: 10px;
                        padding: 3px 6px;
                    }

                    #download-doc-btn {
                        width: 34px;
                        height: 34px;
                    }
                    #toggle-doc-btn {
                        padding: 8px 12px;
                        font-size: 12px;
                    }
                }
        `;
        document.head.appendChild(style);

        const root = document.getElementById('documento-root');
        // Los bloques deben quedar como hijos directos del body (el CSS usa flex en columna)
        root.style.display = 'contents';
        root.innerHTML = `
            <div id="doc-actions-fixed">
                <a id="download-doc-btn" href="#" download title="Descargar documento">
                    <i class="fas fa-download"></i>
                </a>
                <button id="toggle-doc-btn">Mostrar Plantilla Eventual</button>
            </div>

            <div class="loading" id="loading">
                <div class="spinner"></div>
            </div>

            <div class="logo-container">
                <img src="${PREFIX}imagenes/inm logo.png" alt="Logo INM">
            </div>

            <div class="pdf-container">
                <iframe
                    id="pdf-viewer"
                    class="pdf-embed"
                    frameborder="0"
                    title="Visualizador de PDF"
                ></iframe>
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

            <div id="fecha-subida">
                Actualizado: <span id="fecha-texto">Cargando...</span>
            </div>
        `;
    }

    // ================================================
    // ✅ CONFIGURACIÓN DE DOCUMENTOS
    // ================================================
    // Configuración
    const BACKEND_URL = window.CONFIG.BACKEND_URL;
    const API_TOKEN = window.CONFIG.getToken();
    const ESTADO_FIJO = (window.DOC_PAGE || {}).estado;
    const NOMBRE_ESTADO = (window.DOC_PAGE || {}).nombre;
    const TIPO_DOCUMENTO = 'plantilla_personal'; // Documento principal
    const TIPO_DOCUMENTO_ALTERNATIVO = 'plantilla_eventual'; // Documento alternativo
    const TIPO_DOCUMENTO_EXCEL = 'plantilla_personal_excel';
    const TIPO_DOCUMENTO_ALTERNATIVO_EXCEL = 'plantilla_eventual_excel'; // Generado desde el Excel nacional eventual

    // Variables para controlar documentos alternativos
    let documentoActual = 'principal'; // 'principal' o 'alternativo'
    let documentosDisponibles = [];
    let tituloPrincipalCompleto = ''; // Almacena el título completo del documento principal
    let documentoMostrado = null; // Documento que se está viendo (para el periodo del título)

    // Detectar iOS
    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    // Función para obtener el título del documento principal desde Cloudinary
    async function obtenerTituloPrincipal() {
        try {
            const response = await fetch(`${BACKEND_URL}/archivos/${ESTADO_FIJO}/${TIPO_DOCUMENTO}`, {
                headers: { 'Authorization': 'Bearer ' + API_TOKEN }
            });

            if (response.ok) {
                const { data: archivos } = await response.json();
                if (archivos.length > 0) {
                    const ultimoArchivo = archivos.sort((a, b) =>
                        new Date(b.uploaded_at) - new Date(a.uploaded_at)
                    )[0];

                    if (ultimoArchivo.titulo_documento) {
                        return ultimoArchivo.titulo_documento;
                    }
                }
            }

            // Título global configurado en Gestión de Archivos (solo en los estados que lo usan)
            if ((window.DOC_PAGE || {}).usarTituloGlobal) {
                const tituloResponse = await fetch(`${BACKEND_URL}/obtener-titulo-global`, {
                    headers: { 'Authorization': 'Bearer ' + API_TOKEN }
                });
                if (tituloResponse.ok) {
                    const data = await tituloResponse.json();
                    if (data.titulo) return data.titulo;
                }
            }
        } catch (error) {
            console.error('Error al obtener título principal:', error);
        }

        // Título por defecto
        return 'Plantilla de Personal - ' + NOMBRE_ESTADO + ' - Estructura';
    }

    // Periodo del documento generado desde el Excel nacional, ej. "1ra Quincena Agosto 2026"
    function periodoDocumento(documento) {
        if (!documento || !documento.mes || !documento.anio) return '';
        const quincena = String(documento.quincena) === '1' ? '1ra' : '2da';
        const mes = documento.mes.charAt(0) + documento.mes.slice(1).toLowerCase();
        return `${quincena} Quincena ${mes} ${documento.anio}`;
    }

    // Función para actualizar el título en la página
    function actualizarTituloPagina(tipoDocumento = 'principal') {
        const tituloContainer = document.getElementById('tituloContainer');

        // Si lo que se muestra salió del Excel nacional, el título lleva el periodo que se eligió al subirlo
        const periodo = periodoDocumento(documentoMostrado);
        if (periodo && tituloContainer) {
            const tipoTexto = tipoDocumento === 'principal' ? 'Estructura' : 'Eventual';
            tituloContainer.textContent = `Plantilla de Personal - ${NOMBRE_ESTADO} - ${tipoTexto} - ${periodo}`;
            return;
        }

        if (!tituloPrincipalCompleto) return;

        if (tipoDocumento === 'principal') {
            // Mostrar el título principal exacto
            tituloContainer.textContent = tituloPrincipalCompleto;
        } else {
            // Crear título eventual: reemplazar "Estructura" por "Eventual"
            let tituloEventual = tituloPrincipalCompleto
                .replace(/Estructura/i, 'Eventual')  // Primero reemplazar cualquier "Estructura"
                .replace(/ - Estructura$/i, ' - Eventual')  // Luego específicamente al final
                .replace(/Estructura - /i, 'Eventual - ');  // O al principio

            // Si no se encontró "Estructura", agregar " - Eventual" al final
            if (tituloEventual === tituloPrincipalCompleto) {
                tituloEventual = tituloPrincipalCompleto.replace(/( - )?$/, ' - Eventual');
            }

            tituloContainer.textContent = tituloEventual;
        }
    }

    // Mostrar/ocultar loading
    function showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = show ? 'flex' : 'none';
    }

    // Mostrar mensaje de error
    function showError(message, target = 'both') {
        if (target === 'both' || target === 'pdf') {
            const pdfError = document.getElementById('pdf-error');
            if (pdfError) {
                pdfError.textContent = message;
                pdfError.style.display = 'block';
            }
        }
        if (target === 'both' || target === 'mobile') {
            const mobileError = document.getElementById('mobile-error');
            if (mobileError) {
                mobileError.textContent = message;
                mobileError.style.display = 'block';
            }
        }
    }

    // Ocultar errores
    function hideErrors() {
        const pdfError = document.getElementById('pdf-error');
        const mobileError = document.getElementById('mobile-error');

        if (pdfError) pdfError.style.display = 'none';
        if (mobileError) mobileError.style.display = 'none';
    }

    // Formatear fecha legible
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('es-MX', options);
    }

    // Configurar descarga para iOS
    function configurarDescargaiOS(documento) {
        const iosContainer = document.getElementById('ios-container');
        const iosLink = document.getElementById('ios-pdf-link');

        if (isIOS()) {
            iosLink.href = documento.url;
            iosLink.setAttribute('download', documento.filename || 'plantilla_personal.pdf');
            iosContainer.style.display = 'block';
        } else {
            iosContainer.style.display = 'none';
        }
    }

    // Función para alternar entre documentos
    async function alternarDocumento() {
        showLoading(true);
        hideErrors();

        try {
            if (documentoActual === 'principal') {
                // Cargar documento alternativo: el más reciente entre el PDF eventual
                // subido a mano y el Excel eventual generado desde el Excel nacional
                const [pdfResponse, excelResponse] = await Promise.all([
                    fetch(`${BACKEND_URL}/archivos/${ESTADO_FIJO}/${TIPO_DOCUMENTO_ALTERNATIVO}`, { headers: { 'Authorization': 'Bearer ' + API_TOKEN } }),
                    fetch(`${BACKEND_URL}/archivos/${ESTADO_FIJO}/${TIPO_DOCUMENTO_ALTERNATIVO_EXCEL}`, { headers: { 'Authorization': 'Bearer ' + API_TOKEN } })
                ]);

                if (!pdfResponse.ok && !excelResponse.ok) throw new Error(`Error ${pdfResponse.status}: ${pdfResponse.statusText}`);

                const pdfData = pdfResponse.ok ? ((await pdfResponse.json()).data || []) : [];
                const excelData = excelResponse.ok ? ((await excelResponse.json()).data || []) : [];
                const result = { data: [...pdfData, ...excelData] };

                if (result?.data && result.data.length > 0) {
                    const documentosAlternativos = result.data.sort((a, b) =>
                        new Date(b.uploaded_at) - new Date(a.uploaded_at)
                    );

                    const documentoAlternativo = documentosAlternativos[0];
                    cargarDocumento(documentoAlternativo, 'alternativo');

                    // Configurar descarga iOS
                    configurarDescargaiOS(documentoAlternativo);

                    // Actualizar botón y estado
                    document.getElementById('toggle-doc-btn').textContent = 'Mostrar Plantilla Estructura';
                    documentoActual = 'alternativo';

                    // Actualizar título de la página
                    actualizarTituloPagina('alternativo');
                } else {
                    alert('No se encontró la Plantilla Eventual');
                }
            } else {
                // Volver al documento principal (plantilla_personal)
                if (documentosDisponibles.length > 0) {
                    const primerDocumento = documentosDisponibles[0];
                    cargarDocumento(primerDocumento, 'principal');

                    // Configurar descarga iOS
                    configurarDescargaiOS(primerDocumento);

                    // Actualizar botón y estado
                    document.getElementById('toggle-doc-btn').textContent = 'Mostrar Plantilla Eventual';
                    documentoActual = 'principal';

                    // Actualizar título de la página
                    actualizarTituloPagina('principal');
                }
            }
        } catch (error) {
            console.error('Error al alternar documento:', error);
            alert(`Error al cargar documento alternativo: ${error.message}`);
        } finally {
            showLoading(false);
        }
    }

    // Función para cargar un documento específico
    function cargarDocumento(documento, tipo) {
        const pdfViewer = document.getElementById('pdf-viewer');
        const mobileContainer = document.querySelector('.mobile-images');
        const fechaElement = document.getElementById('fecha-texto');

        if (!pdfViewer || !fechaElement) {
            console.error('Elementos del DOM no encontrados');
            return;
        }

        documentoMostrado = documento;

        // Actualizar fecha
        fechaElement.textContent = formatDate(documento.uploaded_at);

        // PDF se muestra directo; Excel se previsualiza con el visor de Google Docs
        pdfViewer.src = documento.format === 'pdf' ? documento.url : (documento.preview_pdf_url || documento.view_url);

        // Boton de descarga fijo
        const downloadBtn = document.getElementById('download-doc-btn');
        if (downloadBtn) {
            downloadBtn.href = documento.download_url || documento.url;
            downloadBtn.setAttribute('download', documento.filename || 'documento');
        }

        // Configurar para móviles (no iOS)
        if (!isIOS() && mobileContainer) {
            const tipoTexto = tipo === 'principal' ? 'Estructura' : 'Eventual';
            mobileContainer.innerHTML = `
                <div class="file-info">
                    <h3>${documento.filename || `Plantilla ${tipoTexto}`}</h3>
                    <p>Actualizado: ${formatDate(documento.uploaded_at)}</p>
                    <p>Tamaño: ${(documento.size / (1024*1024)).toFixed(2)} MB</p>
                    <p><em>${tipoTexto}</em></p>
                    <a href="${documento.download_url || documento.url}" class="download-btn" download="${documento.filename || 'documento'}">
                        Descargar Documento
                    </a>
                </div>
            `;
        }
    }

    // Cargar PDF de Plantilla de Personal
    async function loadPlantillaPersonal() {
        showLoading(true);
        hideErrors();
        const fechaElement = document.getElementById('fecha-texto');

        try {
            const [pdfResponse, excelResponse] = await Promise.all([
                fetch(`${BACKEND_URL}/archivos/${ESTADO_FIJO}/${TIPO_DOCUMENTO}`, { headers: { 'Authorization': 'Bearer ' + API_TOKEN } }),
                fetch(`${BACKEND_URL}/archivos/${ESTADO_FIJO}/${TIPO_DOCUMENTO_EXCEL}`, { headers: { 'Authorization': 'Bearer ' + API_TOKEN } })
            ]);

            const pdfData = pdfResponse.ok ? ((await pdfResponse.json()).data || []) : [];
            const excelData = excelResponse.ok ? ((await excelResponse.json()).data || []) : [];
            const result = { data: [...pdfData, ...excelData] };

            if (result.data.length > 0) {
                documentosDisponibles = result.data.sort((a, b) =>
                    new Date(b.uploaded_at) - new Date(a.uploaded_at)
                );

                // Cargar el documento principal (más reciente)
                const primerDocumento = documentosDisponibles[0];
                cargarDocumento(primerDocumento, 'principal');

                // Configurar descarga para iOS
                configurarDescargaiOS(primerDocumento);

                // Obtener y guardar el título principal
                tituloPrincipalCompleto = await obtenerTituloPrincipal();

                // Actualizar título de la página
                actualizarTituloPagina('principal');

                // Configurar botón de alternar
                const toggleBtn = document.getElementById('toggle-doc-btn');
                if (toggleBtn) toggleBtn.style.display = 'block';
            } else {
                showError('No se encontraron documentos de plantilla de personal', 'both');
                if (fechaElement) fechaElement.textContent = 'No disponible';

                const toggleBtn = document.getElementById('toggle-doc-btn');
                if (toggleBtn) toggleBtn.style.display = 'none';

                // Aún así mostrar título por defecto
                tituloPrincipalCompleto = 'Plantilla de Personal - ' + NOMBRE_ESTADO + ' - Estructura';
                actualizarTituloPagina('principal');
            }
        } catch (error) {
            console.error('Error:', error);
            showError(`Error al cargar la plantilla: ${error.message}`, 'both');
            if (fechaElement) fechaElement.textContent = 'Error al cargar';

            const toggleBtn = document.getElementById('toggle-doc-btn');
            if (toggleBtn) toggleBtn.style.display = 'none';

            // Mostrar título por defecto en caso de error
            tituloPrincipalCompleto = 'Plantilla de Personal - ' + NOMBRE_ESTADO + ' - Estructura';
            actualizarTituloPagina('principal');
        } finally {
            showLoading(false);
        }
    }

    // Inicialización
    document.addEventListener('DOMContentLoaded', () => {
            injectDOM();

        // Configurar evento para el botón de alternar
        const toggleBtn = document.getElementById('toggle-doc-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', alternarDocumento);
        }

        // Cargar documento principal
        if (document.getElementById('pdf-viewer')) {
            loadPlantillaPersonal();
        }
    });
})();
