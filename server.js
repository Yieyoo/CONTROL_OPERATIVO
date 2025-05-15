const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// 1. Configuración de Seguridad
// ======================
const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        connectSrc: ["'self'", "https://*.render.com", "https://*.github.io"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com']
      }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' }
  }),
  express.json({ limit: '15mb' }),
  express.urlencoded({ extended: true, limit: '15mb' })
];

app.use(securityMiddleware);

// Configuración de logs
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'), 
  { flags: 'a' }
);
app.use(morgan('combined', { stream: accessLogStream }));

app.set('trust proxy', 1);

// ======================
// 2. Limitación de Tasas
// ======================
const limiterConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      error: 'rate_limit_exceeded',
      message: 'Demasiadas solicitudes desde esta IP. Por favor intente nuevamente más tarde.'
    });
  }
};

const apiLimiter = rateLimit(limiterConfig);

// ======================
// 3. Configuración CORS
// ======================
const allowedOrigins = [
  'https://yieyoo.github.io',
  'https://yieyoo.github.io/CONTROL_OPERATIVO/',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    if (allowedOrigins.some(allowedOrigin => 
      origin === allowedOrigin || 
      origin?.startsWith(allowedOrigin)
    )) {
      callback(null, true);
    } else {
      console.warn(`⚠️  Intento de acceso desde origen no permitido: ${origin}`);
      callback(new Error('Acceso no permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
  optionsSuccessStatus: 200,
  exposedHeaders: ['Content-Disposition', 'X-RateLimit-Limit', 'X-RateLimit-Remaining']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ======================
// 4. Configuración de Cloudinary
// ======================
const setupCloudinary = () => {
  const requiredConfig = {
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
    secure: true
  };

  const missingConfig = Object.entries(requiredConfig)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingConfig.length > 0) {
    console.error('❌ Configuración faltante de Cloudinary:', missingConfig.join(', '));
    process.exit(1);
  }

  try {
    cloudinary.config(requiredConfig);
    console.log('✅ Cloudinary configurado correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error configurando Cloudinary:', error.message);
    process.exit(1);
  }
};

setupCloudinary();

// ======================
// 5. Middleware de Autenticación
// ======================
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      status: 'error',
      error: 'unauthorized',
      message: 'Se requiere API Key para acceder a este recurso',
      docs: 'https://github.com/yieyoo/CONTROL_OPERATIVO/blob/main/API_DOCS.md'
    });
  }

  if (apiKey !== process.env.API_KEY) {
    console.warn(`⚠️  Intento de acceso con API Key inválida desde IP: ${req.ip}`);
    return res.status(403).json({
      status: 'error',
      error: 'forbidden',
      message: 'API Key no válida'
    });
  }

  next();
};

// ======================
// 6. Configuración de Multer
// ======================
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 15 * 1024 * 1024,
    files: 1,
    fields: 5
  },
  fileFilter: (req, file, cb) => {
    const validMimeTypes = ['application/pdf', 'application/x-pdf'];
    const validExtensions = ['.pdf'];
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (!validMimeTypes.includes(file.mimetype) || !validExtensions.includes(fileExt)) {
      return cb(new Error('Solo se permiten archivos PDF (extensión .pdf)'), false);
    }
    
    cb(null, true);
  }
}).single('file');

// ======================
// 7. Tipos de Documentos
// ======================
const DOCUMENT_TYPES = {
  FICHA_CURRICULAR: 'ficha_curricular',
  ORGANIGRAMA: 'organigrama',
  PLANTILLA_PERSONAL: 'plantilla_personal',
  VISITA_SUPERVISION: 'visita_supervision',
  ACUERDOS_VISITA: 'acuerdos_visita',
  VEHICULOS: 'vehiculos',
  INMUEBLES: 'inmuebles',
  UNIDAD_CANINA: 'unidad_canina'
};

const validateDocumentType = (req, res, next) => {
  const docType = req.params.docType?.toLowerCase();
  const validTypes = Object.values(DOCUMENT_TYPES);

  if (!docType || !validTypes.includes(docType)) {
    return res.status(400).json({
      status: 'error',
      error: 'invalid_document_type',
      message: `Tipo de documento no válido. Tipos permitidos: ${validTypes.join(', ')}`,
      received: docType,
      valid_types: validTypes
    });
  }

  req.docType = docType;
  next();
};

// ======================
// 8. Sistema de Logs
// ======================
const errorLogStream = fs.createWriteStream(
  path.join(__dirname, 'error.log'), 
  { flags: 'a' }
);

const logError = (error) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${error.stack || error.message}\n`;
  errorLogStream.write(logEntry);
  console.error('🔴 Error:', error.message);
};

// ======================
// 9. Middleware de Errores
// ======================
const errorHandler = (error, req, res, next) => {
  logError(error);

  const errorMap = {
    'CORS': { status: 403, code: 'cors_error' },
    'PDF': { status: 400, code: 'invalid_file_type' },
    'size': { status: 413, code: 'file_too_large' },
    'document': { status: 400, code: 'invalid_document' },
    'default': { status: 500, code: 'server_error' }
  };

  const match = Object.entries(errorMap).find(([key]) => 
    error.message.toLowerCase().includes(key.toLowerCase())
  );

  const { status, code } = match ? match[1] : errorMap.default;

  res.status(status).json({
    status: 'error',
    error: code,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

// ======================
// 10. Utilidades para Cloudinary
// ======================
const uploadToCloudinary = (fileBuffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => error ? reject(error) : resolve(result)
    );
    uploadStream.end(fileBuffer);
  });
};

const deleteFromCloudinary = (publicId) => {
  return cloudinary.uploader.destroy(publicId, {
    resource_type: 'raw',
    invalidate: true
  });
};

// ======================
// 11. Rutas
// ======================
const router = express.Router();

// Endpoint de salud
router.get('/health', (req, res) => {
  const healthCheck = {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.2.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      cloudinary: 'active',
      database: 'none',
      memory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
    }
  };

  res.json(healthCheck);
});

// Upload
router.post(
  '/upload',
  authenticate,
  (req, res, next) => {
    pdfUpload(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          err.message = 'El archivo excede el límite de 15MB';
        }
        return next(err);
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new Error('No se proporcionó ningún archivo para subir');
      }

      const { estado, tipoDocumento } = req.body;

      if (!estado || !tipoDocumento) {
        throw new Error('Estado y tipoDocumento son requeridos');
      }

      const originalName = sanitizeFilename(req.file.originalname);

      const uploadOptions = {
        resource_type: 'raw',
        folder: `${estado}/${tipoDocumento}`,
        format: 'pdf',
        type: 'upload',
        access_mode: 'public',
        filename_override: originalName,
        unique_filename: false,
        overwrite: true,
        context: {
          custom: {
            original_filename: originalName,
            uploaded_at: new Date().toISOString(),
            document_type: tipoDocumento,
            estado
          }
        }
      };

      const result = await uploadToCloudinary(req.file.buffer, uploadOptions);

      res.status(201).json({
        status: 'success',
        data: formatCloudinaryResponse(result, tipoDocumento, estado)
      });
    } catch (error) {
      next(error);
    }
  }
);

// Eliminar archivo
router.delete('/delete', authenticate, async (req, res, next) => {
  try {
    const { public_id, estado } = req.body;

    if (!public_id) {
      throw new Error('El parámetro public_id es requerido');
    }

    if (estado && !public_id.startsWith(`${estado}/`)) {
      return res.status(403).json({
        status: 'error',
        error: 'forbidden',
        message: 'No autorizado para eliminar este recurso'
      });
    }

    const result = await deleteFromCloudinary(public_id);

    if (result.result !== 'ok') {
      return res.status(404).json({
        status: 'error',
        error: 'not_found',
        message: 'El archivo no existe o ya fue eliminado'
      });
    }

    res.json({
      status: 'success',
      data: {
        public_id,
        deleted_at: new Date().toISOString(),
        bytes_freed: result.bytes
      }
    });
  } catch (error) {
    next(error);
  }
});

// Listar archivos con filtro doble (estado + tipoDocumento)
router.get('/archivos/:estado/:tipoDocumento?', authenticate, async (req, res, next) => {
  try {
    const { estado, tipoDocumento } = req.params;
    
    if (!estado) {
      return res.status(400).json({
        status: 'error',
        message: 'El parámetro estado es requerido'
      });
    }

    // Construir la ruta de búsqueda
    const folderPath = tipoDocumento ? `${estado}/${tipoDocumento}` : estado;
    
    const result = await cloudinary.search({
      expression: `resource_type:raw AND folder:"${folderPath}"`,
      sort_by: { created_at: 'desc' },
      max_results: 100
    });

    res.json({
      status: 'success',
      data: {
        archivos: result.resources.map(resource => 
          formatCloudinaryResponse(resource, tipoDocumento, estado))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Función para formatear respuestas de Cloudinary
const formatCloudinaryResponse = (resource, docType, estado) => ({
  id: resource.asset_id,
  url: resource.secure_url,
  public_id: resource.public_id,
  filename: resource.context?.custom?.original_filename || 
            resource.public_id.split('/').pop() + '.pdf',
  document_type: docType || resource.public_id.split('/')[1] || 'general',
  estado: estado || resource.public_id.split('/')[0] || 'unknown',
  view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(resource.secure_url)}&embedded=true`,
  download_url: resource.secure_url.replace('/upload/', '/upload/fl_attachment/'),
  uploaded_at: resource.created_at,
  size: resource.bytes,
  format: resource.format,
  width: resource.width,
  height: resource.height
});

// Función para sanitizar nombres de archivo
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^\w\-\. ]/gi, '')
    .replace(/\s+/g, '_')
    .substring(0, 100);
};

// Registrar rutas
app.use('/api', apiLimiter, router);

// Documentación automática en endpoint raíz
app.get('/', (req, res) => {
  const apiDocs = {
    status: 'success',
    version: '1.2.0',
    documentation: 'https://github.com/yieyoo/CONTROL_OPERATIVO/blob/main/API_DOCS.md',
    endpoints: [
      {
        method: 'POST',
        path: '/api/upload',
        description: 'Subir archivo PDF',
        authentication: 'Requiere header x-api-key',
        parameters: [
          { name: 'file', type: 'PDF', max_size: '15MB' },
          { name: 'estado', required: true },
          { name: 'tipoDocumento', required: true }
        ]
      },
      {
        method: 'GET',
        path: '/api/archivos/:estado/:tipoDocumento?',
        description: 'Listar archivos por estado y tipo de documento',
        parameters: [
          { name: 'estado', required: true },
          { name: 'tipoDocumento', required: false }
        ]
      },
      {
        method: 'DELETE',
        path: '/api/delete',
        description: 'Eliminar archivo',
        body: { public_id: 'string', estado: 'string' }
      }
    ]
  };

  res.json(apiDocs);
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error: 'not_found',
    message: 'Ruta no encontrada',
    suggested_routes: [
      '/api/upload',
      '/api/archivos/[estado]',
      '/api/archivos/[estado]/[tipoDocumento]',
      '/api/delete',
      '/api/health'
    ],
    docs: 'https://github.com/yieyoo/CONTROL_OPERATIVO/blob/main/API_DOCS.md'
  });
});

// Middleware de errores
app.use(errorHandler);

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`
  🚀 Servidor listo en puerto ${PORT}
  ⏰ ${new Date().toLocaleString()}
  🔒 Modo: ${process.env.NODE_ENV || 'development'}
  🌍 CORS: ${allowedOrigins.join(', ')}
  📄 Tipos documento: ${Object.values(DOCUMENT_TYPES).join(', ')}
  `);
});

// Manejo de cierre
process.on('SIGTERM', () => {
  console.log('🛑 Recibida señal SIGTERM. Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    errorLogStream.end();
    accessLogStream.end();
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  logError(err);
  console.error('⚠️  Unhandled Rejection:', err);
});

module.exports = app;