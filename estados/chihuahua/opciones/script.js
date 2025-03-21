// Obtener el identificador único para esta página desde el atributo 'data-page' en el body
const pageId = document.body.getAttribute('data-page'); 

// Verificar si pageId es nulo (esto sería un error, ya que debe existir siempre)
if (!pageId) {
    console.error("No se ha definido el 'data-page' en el cuerpo de la página.");
} else {
    // Función para abrir y cerrar el menú lateral
    function toggleMenu() {
        const menu = document.querySelector('.menu');
        const menuOverlay = document.querySelector('.menu-overlay');
        menu.classList.toggle('active');
        menuOverlay.classList.toggle('active');
    }

    // Función para cargar el archivo PDF
    document.getElementById('uploadForm').addEventListener('submit', function (e) {
        e.preventDefault(); // Evita que el formulario se envíe

        const fileInput = document.getElementById('pdfInput');
        const file = fileInput.files[0];

        if (file && file.type === 'application/pdf') {
            // Validar el tamaño del archivo (ejemplo: menos de 5 MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('El archivo es demasiado grande. El tamaño máximo permitido es 5 MB.');
                return;
            }

            // Convertir el archivo a base64
            const reader = new FileReader();
            reader.onload = function (e) {
                const base64PDF = e.target.result;

                // Guardar el PDF en localStorage con la clave única correspondiente a la página
                localStorage.setItem(`pdf_${pageId}`, base64PDF); 

                // Mostrar el PDF en el iframe
                const pdfViewer = document.getElementById('pdfViewer');
                pdfViewer.setAttribute('src', base64PDF);
                alert('PDF subido correctamente.');
            };
            reader.readAsDataURL(file); // Lee el archivo como base64

            // Limpiar el input de archivo
            fileInput.value = '';
        } else {
            alert('Por favor, selecciona un archivo PDF válido.');
        }
    });

    // Función para eliminar el PDF
    document.getElementById('deleteButton').addEventListener('click', function () {
        const pdfViewer = document.getElementById('pdfViewer');
        pdfViewer.removeAttribute('src'); // Eliminar el PDF del iframe

        // Eliminar el PDF de localStorage
        localStorage.removeItem(`pdf_${pageId}`); // Eliminar el PDF con la clave única
        alert('PDF eliminado correctamente.');
    });

    // Cargar el PDF almacenado en localStorage al cargar la página
    document.addEventListener('DOMContentLoaded', () => {
        const pdfData = localStorage.getItem(`pdf_${pageId}`); // Obtener el PDF almacenado para esta página

        const pdfViewer = document.getElementById('pdfViewer');

        if (pdfData) {
            pdfViewer.setAttribute('src', pdfData);  // Mostrar el PDF en el iframe
        }
    });
}
