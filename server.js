// Configuración global
const BACKEND_URL = 'https://control-operativo-1.onrender.com/api';
const estadoActual = 'aguascalientes';
const API_KEY = 'Xhy2md57';

// Elementos del DOM
const elements = {
    loading: document.getElementById('loading'),
    uploadForm: document.getElementById('uploadForm'),
    fileInput: document.getElementById('file'),
    uploadButton: document.getElementById('uploadButton'),
    uploadStatus: document.getElementById('uploadStatus'),
    pdfIframe: document.getElementById('pdfIframe'),
    fileList: document.getElementById('fileList'),
    fileSelect: document.getElementById('fileSelect'),
    deleteFileButton: document.getElementById('deleteFileButton'),
    deleteStatus: document.getElementById('deleteStatus'),
    viewSelect: document.getElementById('viewSelect'),
    viewBtn: document.getElementById('viewBtn'),
    downloadBtn: document.getElementById('downloadBtn')
};

// Mostrar/ocultar loading
function showLoading(show) {
    elements.loading.style.display = show ? 'flex' : 'none';
}

// Mostrar mensaje de estado
function showStatus(element, message, isError = false) {
    element.textContent = message;
    element.className = isError ? 'error-message' : 'success-message';
    setTimeout(() => {
        element.textContent = '';
        element.className = '';
    }, 5000);
}

// Manejo de errores de API
async function handleApiError(response) {
    if (!response.ok) {
        let errorMessage = `Error ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error?.message || errorMessage;
        } catch (e) {
            console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
    }
    return response.json();
}

// Cargar lista de archivos
async function cargarListaArchivos() {
    showLoading(true);
    try {
        const response = await fetch(`${BACKEND_URL}/archivos/${estadoActual}`, {
            headers: {
                'x-api-key': API_KEY
            }
        });
        
        const { data } = await handleApiError(response);
        renderizarListaArchivos(data || []);
        
    } catch (error) {
        console.error('Error al cargar archivos:', error);
        showStatus(elements.uploadStatus, error.message, true);
    } finally {
        showLoading(false);
    }
}

// Renderizar lista de archivos
function renderizarListaArchivos(files) {
    elements.fileList.innerHTML = '';
    elements.fileSelect.innerHTML = '<option value="">Selecciona un archivo para eliminar</option>';
    elements.viewSelect.innerHTML = '<option value="">Selecciona un archivo</option>';

    if (!files || files.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No hay archivos disponibles';
        elements.fileList.appendChild(li);
        return;
    }

    files.forEach(file => {
        const publicId = file.public_id?.replace('.pdf', '') || '';
        const filename = file.filename || 'documento.pdf';
        const pdfUrl = file.url || '';

        // Elemento de lista
        const li = document.createElement('li');
        li.textContent = filename;
        li.addEventListener('click', () => {
            mostrarPdf(pdfUrl);
            elements.viewSelect.value = pdfUrl;
        });
        elements.fileList.appendChild(li);

        // Opción para eliminar
        const deleteOption = document.createElement('option');
        deleteOption.value = publicId;
        deleteOption.textContent = filename;
        elements.fileSelect.appendChild(deleteOption);

        // Opción para visualizar
        const viewOption = document.createElement('option');
        viewOption.value = pdfUrl;
        viewOption.textContent = filename;
        elements.viewSelect.appendChild(viewOption);
    });
}

// Mostrar PDF en el visor - FUNCIÓN MEJORADA
function mostrarPdf(url) {
    if (!url) {
        elements.pdfIframe.style.display = 'none';
        elements.downloadBtn.style.display = 'none';
        return;
    }

    try {
        // Si ya es una URL de Google Viewer, usarla directamente
        if (url.includes('docs.google.com/viewer')) {
            elements.pdfIframe.src = url;
        } else {
            // Para URLs de Cloudinary
            let cloudinaryUrl = url;
            
            // Asegurar formato correcto para visualización
            if (url.includes('res.cloudinary.com')) {
                // Extraer la parte importante de la URL
                const parts = url.split('/upload/');
                cloudinaryUrl = `${parts[0]}/upload/fl_attachment/${parts[1]}`;
                
                // Asegurar que termine en .pdf
                if (!cloudinaryUrl.toLowerCase().endsWith('.pdf')) {
                    cloudinaryUrl += '.pdf';
                }
            }
            
            // Codificar la URL para el visor de Google
            const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(cloudinaryUrl)}&embedded=true`;
            elements.pdfIframe.src = viewerUrl;
        }
        
        elements.pdfIframe.style.display = 'block';
        elements.downloadBtn.style.display = 'block';
        elements.downloadBtn.onclick = () => {
            window.open(url, '_blank');
        };
        
    } catch (error) {
        console.error('Error al mostrar PDF:', error);
        showStatus(elements.uploadStatus, 'Error al cargar el PDF: ' + error.message, true);
    }
}

// Validar archivo antes de subir
function validarArchivo(file) {
    if (!file) throw new Error('No se seleccionó ningún archivo');
    if (file.type !== 'application/pdf') throw new Error('Solo se permiten archivos PDF');
    if (file.size > 10 * 1024 * 1024) throw new Error('El archivo excede el límite de 10MB');
    if (!/^[\w\-\. ]+\.pdf$/i.test(file.name)) throw new Error('Nombre de archivo no válido');
    return true;
}

// Subir archivo al servidor - FUNCIÓN MEJORADA
async function subirArchivo(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('estado', estadoActual);

    const response = await fetch(`${BACKEND_URL}/upload`, {
        method: 'POST',
        headers: {
            'x-api-key': API_KEY
        },
        body: formData
    });

    const result = await handleApiError(response);
    
    if (result.status !== 'success') {
        throw new Error(result.error?.message || 'Error al subir archivo');
    }

    return result.data;
}

// Eliminar archivo
async function eliminarArchivo(publicId) {
    const response = await fetch(`${BACKEND_URL}/delete`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
        },
        body: JSON.stringify({ 
            public_id: publicId,
            estado: estadoActual
        })
    });

    await handleApiError(response);
}

// Manejador del formulario de subida - MEJORADO
elements.uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const file = elements.fileInput.files[0];
    if (!file) {
        showStatus(elements.uploadStatus, 'No se seleccionó ningún archivo', true);
        return;
    }

    try {
        // Validar el archivo
        validarArchivo(file);
        
        showLoading(true);
        elements.uploadButton.disabled = true;
        elements.uploadStatus.textContent = 'Subiendo archivo...';
        
        // Subir el archivo
        const { url, public_id, filename } = await subirArchivo(file);
        
        showStatus(elements.uploadStatus, 'Archivo subido correctamente');
        
        // Actualizar la lista de archivos
        await cargarListaArchivos();
        
        // Mostrar el PDF recién subido
        if (url) {
            mostrarPdf(url);
            elements.viewSelect.value = url;
        }
        
        // Resetear el formulario
        elements.uploadForm.reset();
        
    } catch (error) {
        console.error('Error al subir archivo:', error);
        showStatus(elements.uploadStatus, 'Error: ' + error.message, true);
    } finally {
        showLoading(false);
        elements.uploadButton.disabled = false;
    }
});

// Manejador para eliminar archivos
elements.deleteFileButton.addEventListener('click', async () => {
    const publicId = elements.fileSelect.value;
    if (!publicId) {
        showStatus(elements.deleteStatus, 'Selecciona un archivo para eliminar', true);
        return;
    }
    
    try {
        if (!confirm('¿Estás seguro de eliminar este archivo?')) return;
        
        showLoading(true);
        elements.deleteFileButton.disabled = true;
        await eliminarArchivo(publicId);
        showStatus(elements.deleteStatus, 'Archivo eliminado correctamente');
        
        // Si el PDF eliminado era el que se estaba viendo, limpiar el visor
        if (elements.pdfIframe.src.includes(publicId)) {
            mostrarPdf('');
            elements.viewSelect.value = '';
        }
        
        // Actualizar la lista
        await cargarListaArchivos();
        
    } catch (error) {
        console.error('Error al eliminar archivo:', error);
        showStatus(elements.deleteStatus, 'Error: ' + error.message, true);
    } finally {
        showLoading(false);
        elements.deleteFileButton.disabled = false;
    }
});

// Manejador para visualizar PDFs
elements.viewBtn.addEventListener('click', () => {
    const selectedUrl = elements.viewSelect.value;
    if (selectedUrl) {
        mostrarPdf(selectedUrl);
    } else {
        showStatus(elements.uploadStatus, 'Selecciona un archivo primero', true);
    }
});

// Validación de archivo al seleccionar
elements.fileInput.addEventListener('change', function() {
    try {
        if (this.files[0]) {
            validarArchivo(this.files[0]);
            showStatus(elements.uploadStatus, 'Archivo válido, listo para subir');
        }
    } catch (error) {
        showStatus(elements.uploadStatus, error.message, true);
        this.value = '';
    }
});

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verificar conexión con el backend
        const healthResponse = await fetch(`${BACKEND_URL}/health`, {
            headers: {
                'x-api-key': API_KEY
            }
        });
        
        const { status } = await healthResponse.json();
        
        if (status !== 'healthy') {
            console.warn('El backend parece tener problemas');
            showStatus(elements.uploadStatus, 'Advertencia: Problemas de conexión con el servidor', true);
        }
        
        // Cargar lista inicial de archivos
        await cargarListaArchivos();
        
    } catch (error) {
        console.error('Error inicial:', error);
        showStatus(elements.uploadStatus, 'Error: No se puede conectar al servidor', true);
    }
});

// Función para el menú hamburguesa
function toggleMenu() {
    const menu = document.querySelector('.menu');
    const overlay = document.querySelector('.menu-overlay');
    menu.classList.toggle('active');
    overlay.classList.toggle('active');
}