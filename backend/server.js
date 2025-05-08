const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de almacenamiento en memoria para archivos subidos
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Configuración de CORS para permitir solicitudes desde tu dominio
const corsOptions = {
  origin: 'https://yieyoo.github.io',  // El dominio que deseas permitir
  methods: ['GET', 'POST', 'DELETE'], // Métodos HTTP que quieres permitir
  allowedHeaders: ['Content-Type'],    // Encabezados permitidos
};

// Middlewares
app.use(cors(corsOptions));  // Configurar CORS con las opciones específicas
app.use(express.json());

// Configurar Cloudinary con variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// Subir archivo a Cloudinary
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se ha subido ningún archivo' });
  }

  const estado = req.body.estado || 'aguascalientes'; // Carpeta por estado

  const uploadStream = cloudinary.uploader.upload_stream(
    {
      resource_type: 'auto',
      folder: estado, // Carpeta dinámica
    },
    (error, result) => {
      if (error) {
        console.error('Error al subir a Cloudinary:', error);
        return res.status(500).json({ message: 'Error al subir el archivo', error });
      }

      res.json({
        message: 'Archivo subido correctamente',
        url: result.secure_url,
        public_id: result.public_id,
      });
    }
  );

  uploadStream.end(req.file.buffer);
});

// Eliminar archivo de Cloudinary
app.delete('/delete', (req, res) => {
  const { public_id } = req.body;

  if (!public_id) {
    return res.status(400).json({ message: 'public_id es requerido' });
  }

  cloudinary.uploader.destroy(public_id, (error, result) => {
    if (error) {
      console.error('Error al eliminar en Cloudinary:', error);
      return res.status(500).json({ message: 'Error al eliminar el archivo', error });
    }

    res.json({ message: 'Archivo eliminado correctamente', result });
  });
});

// Listar archivos desde Cloudinary por estado (opcional)
app.get('/archivos/:estado', (req, res) => {
  const estado = req.params.estado || 'aguascalientes';

  cloudinary.api.resources(
    {
      type: 'upload',
      prefix: `${estado}/`,
      resource_type: 'raw',
      max_results: 100,
    },
    (error, result) => {
      if (error) {
        console.error('Error al obtener archivos:', error);
        return res.status(500).json({ message: 'Error al obtener archivos', error });
      }

      const archivos = result.resources.map(resource => ({
        url: resource.secure_url,
        public_id: resource.public_id,
        filename: resource.filename,
      }));

      res.json({ archivos });
    }
  );
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
