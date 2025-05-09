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
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middlewares
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
  secure: true
});

// Middleware de autenticación
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey === process.env.API_KEY) return next();
  res.status(401).json({ 
    error: 'Unauthorized',
    message: 'API Key inválida'
  });
};

// Ruta de prueba
app.get('/test-cors', (req, res) => {
  res.json({ 
    status: 'success',
    message: 'CORS configurado correctamente',
    timestamp: new Date().toISOString()
  });
});

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Manejo explícito para GET /upload
app.get('/upload', (req, res) => {
  res.status(405).json({
    error: 'Method Not Allowed',
    message: 'El método GET no está permitido para esta ruta',
    allowed_methods: ['POST']
  });
});

// Subir archivo a Cloudinary
app.post('/upload', authenticate, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'No se ha subido ningún archivo',
        details: {
          accepted_types: ['application/pdf'],
          max_size: '10MB'
        }
      });
    }

    const estado = req.body.estado || 'aguascalientes';

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: estado,
        format: 'pdf',
        use_filename: true,
        unique_filename: false
      },
      (error, result) => {
        if (error) {
          console.error('Error al subir a Cloudinary:', error);
          return res.status(500).json({
            error: 'cloudinary_error',
            message: 'Error al subir el archivo a Cloudinary',
            details: error.message
          });
        }

        res.status(201).json({
          status: 'success',
          message: 'Archivo subido correctamente',
          data: {
            url: result.secure_url,
            public_id: result.public_id,
            filename: req.file.originalname,
            size: req.file.size,
            estado: estado
          }
        });
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error('Error en el servidor:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Eliminar archivo de Cloudinary
app.delete('/delete', authenticate, (req, res) => {
  try {
    const { public_id } = req.body;

    if (!public_id) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'El campo public_id es requerido'
      });
    }

    cloudinary.uploader.destroy(public_id, (error, result) => {
      if (error) {
        console.error('Error al eliminar en Cloudinary:', error);
        return res.status(500).json({
          error: 'cloudinary_error',
          message: 'Error al eliminar el archivo',
          details: error.message
        });
      }

      res.json({
        status: 'success',
        message: 'Archivo eliminado correctamente',
        data: result
      });
    });
  } catch (error) {
    console.error('Error en el servidor:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Listar archivos desde Cloudinary
app.get('/archivos/:estado', authenticate, (req, res) => {
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
            error: 'cloudinary_error',
            message: 'Error al obtener archivos de Cloudinary',
            details: error.message
          });
        }

        const archivos = result.resources.map(resource => ({
          url: resource.secure_url,
          public_id: resource.public_id,
          filename: resource.public_id.split('/').pop() || 'documento.pdf',
          uploaded_at: resource.created_at,
          size: resource.bytes
        }));

        res.json({
          status: 'success',
          count: archivos.length,
          data: archivos
        });
      }
    );
  } catch (error) {
    console.error('Error en el servidor:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Manejador de errores 404
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `La ruta ${req.originalUrl} no existe`
  });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error('Error global:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Algo salió mal en el servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Orígenes permitidos: ${corsOptions.origin.join(', ')}`);
});