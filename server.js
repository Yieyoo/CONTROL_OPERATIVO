const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de almacenamiento en memoria para archivos subidos
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Límite de 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  }
});

// Configuración mejorada de CORS
const corsOptions = {
  origin: [
    'https://yieyoo.github.io',
    'http://localhost:3000' // Para desarrollo local
  ],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middlewares
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Preflight para todas las rutas
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// Ruta de prueba
app.get('/test-cors', (req, res) => {
  res.json({ message: 'CORS configurado correctamente' });
});

// Subir archivo a Cloudinary
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se ha subido ningún archivo' });
    }

    const estado = req.body.estado || 'aguascalientes';

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: estado,
        format: 'pdf'
      },
      (error, result) => {
        if (error) {
          console.error('Error al subir a Cloudinary:', error);
          return res.status(500).json({ 
            message: 'Error al subir el archivo',
            error: error.message 
          });
        }

        res.json({
          message: 'Archivo subido correctamente',
          url: result.secure_url,
          public_id: result.public_id,
          filename: req.file.originalname
        });
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error en el servidor',
      error: error.message 
    });
  }
});

// Eliminar archivo de Cloudinary
app.delete('/delete', (req, res) => {
  try {
    const { public_id } = req.body;

    if (!public_id) {
      return res.status(400).json({ message: 'public_id es requerido' });
    }

    cloudinary.uploader.destroy(public_id, (error, result) => {
      if (error) {
        console.error('Error al eliminar en Cloudinary:', error);
        return res.status(500).json({ 
          message: 'Error al eliminar el archivo',
          error: error.message 
        });
      }

      res.json({ 
        message: 'Archivo eliminado correctamente', 
        result 
      });
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error en el servidor',
      error: error.message 
    });
  }
});

// Listar archivos desde Cloudinary
app.get('/archivos/:estado', (req, res) => {
  try {
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
          return res.status(500).json({ 
            message: 'Error al obtener archivos',
            error: error.message 
          });
        }

        const archivos = result.resources.map(resource => ({
          url: resource.secure_url,
          public_id: resource.public_id,
          filename: resource.public_id.split('/').pop() || 'documento.pdf'
        }));

        res.json({ archivos });
      }
    );
  } catch (error) {
    res.status(500).json({ 
      message: 'Error en el servidor',
      error: error.message 
    });
  }
});

// Manejador de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Error interno del servidor',
    error: err.message 
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
