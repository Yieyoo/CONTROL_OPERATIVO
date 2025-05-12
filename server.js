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

// 1. Configuración de Seguridad Mejorada
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
    error: 'rate_limit_exceeded',
    message: 'Demasiadas peticiones desde esta IP, por favor intente más tarde'
  }
});

// 3. Configuración de CORS mejorada
const allowedOrigins = [
  'https://yieyoo.github.io',
  'https://yieyoo.github.io/CONTROL_OPERATIVO/',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('Intento de acceso desde origen no permitido:', origin);
      callback(new Error('Origen no permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 4. Middlewares para parsear el cuerpo de las peticiones
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Configuración de Cloudinary optimizada para PDFs
const validateCloudinaryConfig = () => {
  const requiredVars = ['CLOUD_NAME', 'CLOUD_API_KEY', 'CLOUD_API_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Error: Faltan variables de entorno requeridas:', missingVars.join(', '));
    process.exit(1);
  }

  try {
    cloudinary.config({
      cloud_name: process.env.CLOUD_NAME,
      api_key: process.env.CLOUD_API_KEY,
      api_secret: process.env.CLOUD_API_SECRET,
      secure: true,
      private_cdn: false,
      secure_distribution: null
    });
    console.log('✅ Cloudinary configurado correctamente');
  } catch (error) {
    console.error('❌ Error configurando Cloudinary:', error);
    process.exit(1);
  }
};

validateCloudinaryConfig();

// 6. Middleware de autenticación
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      status: 'error',
      error: 'unauthorized',
      message: 'API Key no proporcionada',
      code: 'MISSING_API_KEY'
    });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      status: 'error',
      error: 'unauthorized',
      message: 'API Key inválida',
      code: 'INVALID_API_KEY'
    });
  }

  next();
};

// 7. Configuración de Multer para PDFs
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  }
});

// 8. Manejo centralizado de errores
const handleError = (error, req, res, next) => {
  console.error('🔴 Error:', error.message);

  const status = error.message.includes('CORS') ? 403 : 
                error.message.includes('PDF') ? 400 : 
                error.message.includes('tamaño') ? 413 : 500;

  res.status(status).json({
    status: 'error',
    error: 'server_error',
    message: error.message
  });
};

// 9. Rutas API
const router = express.Router();

// Ruta de salud
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.2',
    services: {
      cloudinary: 'active'
    }
  });
});

// Subir archivo - Versión optimizada
router.post('/upload', authenticate, pdfUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new Error('No se ha subido ningún archivo');
    }

    const estado = req.body.estado || 'aguascalientes';
    const originalName = req.file.originalname.replace(/[^\w\-\. ]/gi, '');

    // Validar nombre de archivo
    if (!/^[\w\-\. ]+\.pdf$/i.test(originalName)) {
      throw new Error('El nombre del archivo contiene caracteres no permitidos');
    }

    const uploadOptions = {
      resource_type: 'raw',
      folder: estado,
      format: 'pdf',
      type: 'upload',
      access_mode: 'public',
      // Eliminamos transformaciones que podrían afectar los PDFs
      transformation: [],
      // Conservar el nombre original del archivo
      filename_override: originalName,
      unique_filename: false,
      overwrite: true,
      // Metadatos adicionales
      context: {
        original_filename: originalName,
        uploaded_at: new Date().toISOString()
      }
    };

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    res.status(201).json({
      status: 'success',
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        filename: originalName,
        // URL alternativa para visualización
        view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(result.secure_url)}&embedded=true`,
        // URL directa para descarga
        download_url: result.secure_url.replace('/upload/', '/upload/fl_attachment/'),
        uploaded_at: result.created_at,
        size: result.bytes
      }
    });
  } catch (error) {
    next(error);
  }
});

// Eliminar archivo - Versión mejorada
router.delete('/delete', authenticate, async (req, res, next) => {
  try {
    const { public_id, estado } = req.body;

    if (!public_id) {
      throw new Error('public_id es requerido');
    }

    // Verificar que el archivo pertenece al estado correcto
    if (estado && !public_id.startsWith(`${estado}/`)) {
      return res.status(403).json({
        status: 'error',
        error: 'forbidden',
        message: 'No tienes permiso para eliminar este archivo'
      });
    }

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: 'raw'
    });

    if (result.result !== 'ok') {
      return res.status(404).json({
        status: 'error',
        error: 'not_found',
        message: 'Archivo no encontrado'
      });
    }

    res.json({
      status: 'success',
      message: 'Archivo eliminado',
      data: {
        public_id: public_id,
        deleted_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Listar archivos - Versión optimizada con nombres originales
router.get('/archivos/:estado', authenticate, async (req, res, next) => {
  try {
    const estado = req.params.estado || 'aguascalientes';

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: `${estado}/`,
      resource_type: 'raw',
      max_results: 500,
      context: true
    });

    const archivos = result.resources.map(resource => {
      // Obtener el nombre original del contexto si está disponible
      const originalName = resource.context?.custom?.original_filename || 
                         resource.public_id.split('/').pop() + '.pdf';
      
      return {
        url: resource.secure_url,
        public_id: resource.public_id,
        filename: originalName,
        // URL alternativa para visualización
        view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(resource.secure_url)}&embedded=true`,
        // URL directa para descarga
        download_url: resource.secure_url.replace('/upload/', '/upload/fl_attachment/'),
        uploaded_at: resource.created_at,
        size: resource.bytes,
        format: resource.format
      };
    });

    res.json({
      status: 'success',
      data: archivos,
      count: archivos.length,
      estado: estado
    });
  } catch (error) {
    next(error);
  }
});

// Montar rutas
app.use('/api', apiLimiter, router);

// Documentación básica
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    version: '1.0.2',
    endpoints: [
      { method: 'POST', path: '/api/upload', desc: 'Subir PDF', auth: 'x-api-key' },
      { method: 'GET', path: '/api/archivos/:estado', desc: 'Listar PDFs', auth: 'x-api-key' },
      { method: 'DELETE', path: '/api/delete', desc: 'Eliminar PDF', auth: 'x-api-key' },
      { method: 'GET', path: '/api/health', desc: 'Estado del servicio' }
    ],
    note: 'Todos los endpoints (excepto /health) requieren el header x-api-key'
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error: 'not_found',
    message: 'Ruta no encontrada',
    suggested_routes: [
      '/api/upload',
      '/api/archivos/:estado',
      '/api/delete',
      '/api/health'
    ]
  });
});

// Middleware de errores
app.use(handleError);

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
  console.log(`🔒 Modo seguro: ${process.env.NODE_ENV === 'production' ? 'ON' : 'OFF'}`);
  console.log(`🌍 Cloudinary configurado para: ${process.env.CLOUD_NAME}`);
});

// Manejo de cierre
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('🛑 Servidor cerrado');
  });
});

// Exportar para testing
module.exports = app;