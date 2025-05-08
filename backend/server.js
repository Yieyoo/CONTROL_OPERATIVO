const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();  // Para cargar las variables de entorno

const app = express();
const PORT = process.env.PORT || 3000;  // Usar el puerto del entorno o 3000 como predeterminado

// Configuración para almacenar los archivos subidos temporalmente
const storage = multer.memoryStorage();  // Usamos memoria para evitar archivos locales
const upload = multer({ storage });

// Habilitar CORS y procesamiento de JSON
app.use(cors());
app.use(express.json());

// Configuración de Cloudinary con las variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,  // Usa el Cloud Name de tu cuenta de Cloudinary
  api_key: process.env.CLOUD_API_KEY,  // Usa la API Key de tu cuenta
  api_secret: process.env.CLOUD_API_SECRET  // Usa la API Secret de tu cuenta
});

// Ruta para subir archivos a Cloudinary
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se ha subido ningún archivo' });
  }

  // Subir archivo a Cloudinary
  cloudinary.uploader.upload_stream(
    { resource_type: 'auto' },
    (error, result) => {
      if (error) {
        return res.status(500).json({ message: 'Error al subir el archivo a Cloudinary', error });
      }

      res.json({
        message: 'Archivo subido correctamente a Cloudinary',
        url: result.url  // URL del archivo almacenado en Cloudinary
      });
    }
  ).end(req.file.buffer);  // Subimos el archivo a Cloudinary desde el buffer
});

// Ruta para eliminar archivos en Cloudinary
app.delete('/delete', (req, res) => {
  const { public_id } = req.body;  // Asumimos que se envía el public_id de Cloudinary

  cloudinary.uploader.destroy(public_id, (error, result) => {
    if (error) {
      return res.status(500).json({ message: 'Error al eliminar el archivo de Cloudinary', error });
    }

    res.json({ message: 'Archivo eliminado correctamente de Cloudinary' });
  });
});

// Ruta para obtener todos los archivos PDF desde Cloudinary
app.get('/archivos', (req, res) => {
  cloudinary.api.resources(
    { type: 'upload', prefix: 'aguascalientes/' },  // Filtramos por carpeta
    (error, result) => {
      if (error) {
        return res.status(500).json({ message: 'Error al obtener los archivos', error });
      }

      const files = result.resources.map(resource => resource.url);  // Extraemos las URLs de los archivos
      res.json({ archivos: files });
    }
  );
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
