const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Configuración de Seguridad
app.use(helmet());
app.use(morgan('dev'));
app.set('trust proxy', true);

// 2. Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    error: 'rate_limit_exceeded',
    message: 'Demasiadas peticiones desde esta IP'
  }
});

// 3. Configuración de CORS
const allowedOrigins = [
  'https://yieyoo.github.io',
  'https://yieyoo.github.io/CONTROL_OPERATIVO/',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}));

// 4. Middlewares para parsear el cuerpo
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// 5. Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
  secure: true
});

// 6. Middleware de autenticación
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      status: 'error',
      error: 'unauthorized',
      message: 'API Key inválida o faltante'
    });
  }
  next();
};

// 7. Configuración de Multer para PDFs
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  }
}).single('file');

// 8. Función para limpiar nombres de archivos
const cleanFileName = (name) => {
  return name
    .replace(/[^\w\-\. ]/gi, '') // Elimina caracteres especiales
    .replace(/\s+/g, '_') // Reemplaza espacios con guiones bajos
    .substring(0, 100); // Limita la longitud
};

// 9. Manejo de errores
const handleError = (error, req, res, next) => {
  console.error('Error:', error.message);
  const status = error.message.includes('PDF') ? 400 : 
                error.message.includes('tamaño') ? 413 : 500;
  res.status(status).json({
    status: 'error',
    message: error.message
  });
};

// 10. Rutas API
const router = express.Router();

// Ruta de salud
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    version: '1.0.4',
    services: ['cloudinary']
  });
});

// Subir archivo (conservando nombre original)
router.post('/upload', authenticate, (req, res, next) => {
  pdfUpload(req, res, async (err) => {
    try {
      if (err) throw err;
      if (!req.file) throw new Error('No se subió ningún archivo');

      const estado = req.body.estado || 'general';
      const originalName = req.file.originalname;
      const cleanName = cleanFileName(originalName);

      // Configuración clave para Cloudinary
      const uploadOptions = {
        resource_type: 'raw',
        folder: estado,
        public_id: `${estado}/${path.parse(cleanName).name}`,
        use_filename: true,
        unique_filename: false,
        overwrite: true,
        filename_override: cleanName,
        context: `filename=${originalName}|uploaded_at=${new Date().toISOString()}`,
        tags: [`estado_${estado}`, 'pdf']
      };

      // Subir a Cloudinary
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => error ? reject(error) : resolve(result)
        );
        uploadStream.end(req.file.buffer);
      });

      // Respuesta exitosa
      res.status(201).json({
        status: 'success',
        data: {
          url: result.secure_url,
          public_id: result.public_id,
          filename: originalName,
          download_url: result.secure_url.replace('/upload/', '/upload/fl_attachment/'),
          size: result.bytes,
          estado: estado,
          uploaded_at: result.created_at
        }
      });

    } catch (error) {
      next(error);
    }
  });
});

// Listar archivos (recuperando nombres originales)
router.get('/archivos/:estado', authenticate, async (req, res, next) => {
  try {
    const estado = req.params.estado;
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: `${estado}/`,
      resource_type: 'raw',
      max_results: 500,
      context: true
    });

    const archivos = result.resources.map(resource => {
      // Extraer nombre original del contexto
      const contextPairs = resource.context?.custom ? 
        Object.entries(resource.context.custom).reduce((acc, [key, val]) => {
          acc[key] = val;
          return acc;
        }, {}) : {};
      
      const originalName = contextPairs.filename || 
                         resource.public_id.split('/').pop() + '.pdf';

      return {
        url: resource.secure_url,
        public_id: resource.public_id,
        filename: originalName,
        size: resource.bytes,
        uploaded_at: resource.created_at,
        estado: estado
      };
    });

    res.json({ 
      status: 'success', 
      data: archivos,
      count: archivos.length
    });

  } catch (error) {
    next(error);
  }
});

// Eliminar archivo
router.delete('/delete', authenticate, async (req, res, next) => {
  try {
    const { public_id, estado } = req.body;
    
    if (!public_id) throw new Error('public_id es requerido');
    
    // Verificar que el archivo pertenece al estado
    if (estado && !public_id.startsWith(`${estado}/`)) {
      return res.status(403).json({
        status: 'error',
        error: 'forbidden',
        message: 'No tienes permiso para eliminar este archivo'
      });
    }

    // Eliminar de Cloudinary
    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: 'raw'
    });

    if (result.result !== 'ok') {
      throw new Error('No se pudo eliminar el archivo');
    }

    res.json({
      status: 'success',
      message: 'Archivo eliminado correctamente'
    });

  } catch (error) {
    next(error);
  }
});

// Montar rutas
app.use('/api', apiLimiter, router);

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'API de gestión de PDFs',
    version: '1.0.4',
    endpoints: {
      upload: '/api/upload',
      list: '/api/archivos/:estado',
      delete: '/api/delete',
      health: '/api/health'
    }
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error: 'not_found',
    message: 'Ruta no encontrada'
  });
});

// Middleware de errores
app.use(handleError);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📁 Tamaño máximo de PDF: 15MB`);
  console.log(`🔑 Autenticación requerida para todas las rutas /api`);
});

module.exports = app;