const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// 1. Configuración de Seguridad Mejorada
// ======================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'", "https://control-operativo-1.onrender.com", "https://yieyoo.github.io"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(morgan('combined'));
app.set('trust proxy', true);

// ======================
// 2. Limitación de Tasas Mejorada
// ======================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // Límite aumentado para pruebas
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      error: 'rate_limit_exceeded',
      message: 'Demasiadas solicitudes desde esta IP, por favor intente nuevamente más tarde'
    });
  }
});

// ======================
// 3. Configuración CORS Ampliada
// ======================
const allowedOrigins = [
  'https://yieyoo.github.io',
  'https://yieyoo.github.io/CONTROL_OPERATIVO/',
  'http://localhost:3000',
  'http://localhost:5500',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como apps móviles o Postman)
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('⚠️ Intento de acceso desde origen no autorizado:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  exposedHeaders: ['Content-Disposition', 'x-api-version'],
  credentials: true,
  maxAge: 86400, // 24 horas de cache para preflight
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Habilitar pre-flight para todas las rutas

// ======================
// 4. Configuración de Parsers Mejorada
// ======================
app.use(express.json({
  limit: '15mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

app.use(express.urlencoded({
  extended: true,
  limit: '15mb',
  parameterLimit: 10000
}));

// ======================
// 5. Configuración de Cloudinary Reforzada
// ======================
const validateCloudinaryConfig = () => {
  const requiredVars = ['CLOUD_NAME', 'CLOUD_API_KEY', 'CLOUD_API_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Variables de entorno requeridas faltantes:', missingVars.join(', '));
    process.exit(1);
  }

  try {
    cloudinary.config({
      cloud_name: process.env.CLOUD_NAME,
      api_key: process.env.CLOUD_API_KEY,
      api_secret: process.env.CLOUD_API_SECRET,
      secure: true,
      cdn_subdomain: true,
      private_cdn: false,
      secure_distribution: null,
      secure_cdn_domain: false,
      cname: null,
      shorten: false,
      sign_url: false,
      api_proxy: null,
      upload_prefix: 'https://api.cloudinary.com'
    });
    console.log('✅ Cloudinary configurado correctamente');
  } catch (error) {
    console.error('❌ Error configurando Cloudinary:', error);
    process.exit(1);
  }
};

validateCloudinaryConfig();

// ======================
// 6. Middleware de Autenticación Mejorado
// ======================
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!apiKey) {
    return res.status(401).json({
      status: 'error',
      error: 'unauthorized',
      message: 'API Key no proporcionada',
      documentation: 'https://github.com/yieyoo/CONTROL_OPERATIVO'
    });
  }

  if (apiKey !== process.env.API_KEY) {
    console.warn('⚠️ Intento de acceso con API Key inválida:', apiKey);
    return res.status(401).json({
      status: 'error',
      error: 'unauthorized',
      message: 'API Key inválida',
      support: 'contacto@inm.gob.mx'
    });
  }

  next();
};

// ======================
// 7. Configuración de Multer para PDFs Mejorada
// ======================
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 15 * 1024 * 1024, // 15MB
    files: 1,
    fields: 10
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF (tipo application/pdf)'), false);
    }
  }
}).single('file');

// ======================
// 8. Definición de Tipos de Documentos Ampliada
// ======================
const DOCUMENT_TYPES = {
  FICHA_CURRICULAR: 'ficha_curricular',
  ORGANIGRAMA: 'organigrama',
  PLANTILLA_PERSONAL: 'plantilla_personal',
  VISITA_SUPERVISION: 'visita_supervision',
  ACUERDOS_VISITA: 'acuerdos_visita',
  VEHICULOS: 'vehiculos',
  INMUEBLES: 'inmuebles',
  UNIDAD_CANINA: 'unidad_canina',
  REPORTES: 'reportes',
  MANUALES: 'manuales'
};

// ======================
// 9. Middleware de Validación de Tipo de Documento Mejorado
// ======================
const validateDocumentType = (req, res, next) => {
  const docType = req.params.docType?.toLowerCase();
  const validTypes = Object.values(DOCUMENT_TYPES);

  if (!docType || !validTypes.includes(docType)) {
    return res.status(400).json({
      error: 'invalid_document_type',
      message: 'Tipo de documento inválido o no especificado',
      valid_types: validTypes,
      example: '/api/upload/ficha_curricular'
    });
  }

  req.docType = docType;
  next();
};

// ======================
// 10. Middleware de Manejo de Errores Ampliado
// ======================
const handleError = (error, req, res, next) => {
  console.error('🔴 Error:', error.stack || error.message);

  const status = error.message.includes('CORS') ? 403 :
                 error.message.includes('PDF') ? 400 :
                 error.message.includes('size') ? 413 :
                 error.message.includes('document') ? 400 : 500;

  const response = {
    status: 'error',
    error: 'server_error',
    message: error.message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  };

  // Solo incluir stack trace en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    response.stack = error.stack;
  }

  res.status(status).json(response);
};

// ======================
// 11. Rutas de la API Mejoradas
// ======================
const router = express.Router();

// Health Check Mejorado
router.get('/health', (req, res) => {
  const healthcheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    version: '1.2.0',
    services: { 
      cloudinary: 'active',
      database: 'cloudinary',
      storage: '15MB'
    },
    document_types: DOCUMENT_TYPES,
    endpoints: [
      '/api/upload/[type]',
      '/api/archivos/[state]',
      '/api/archivos/[state]/[type]',
      '/api/tipos-documento',
      '/api/delete',
      '/api/health'
    ]
  };
  
  res.set('x-api-version', '1.2.0');
  res.json(healthcheck);
});

// Upload Endpoint Mejorado
router.post('/upload/:docType', authenticate, validateDocumentType, (req, res, next) => {
  pdfUpload(req, res, async (err) => {
    try {
      if (err) throw err;
      if (!req.file) throw new Error('No se subió ningún archivo');

      const estado = req.body.estado || 'aguascalientes';
      const { docType } = req;
      const originalName = req.file.originalname.replace(/[^\w\-\. ]/gi, '');

      if (!/^[\w\-\. ]+\.pdf$/i.test(originalName)) {
        throw new Error('El nombre del archivo contiene caracteres inválidos. Solo se permiten letras, números, guiones, puntos y espacios');
      }

      const uploadOptions = {
        resource_type: 'raw',
        folder: `${estado}/${docType}`,
        format: 'pdf',
        type: 'upload',
        access_mode: 'public',
        transformation: [],
        filename_override: originalName,
        unique_filename: false,
        overwrite: true,
        context: {
          original_filename: originalName,
          uploaded_at: new Date().toISOString(),
          document_type: docType,
          estado,
          uploaded_by: req.ip
        },
        tags: [`estado:${estado}`, `tipo:${docType}`]
      };

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
        uploadStream.end(req.file.buffer);
      });

      res.set('x-file-id', result.public_id);
      res.status(201).json({
        status: 'success',
        data: {
          url: result.secure_url,
          public_id: result.public_id,
          filename: originalName,
          document_type: docType,
          estado,
          view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(result.secure_url)}&embedded=true`,
          download_url: result.secure_url.replace('/upload/', '/upload/fl_attachment/'),
          uploaded_at: result.created_at,
          size: result.bytes,
          pages: result.pages,
          format: result.format,
          thumbnail_url: result.secure_url.replace('/upload/', '/upload/w_200,h_300,c_fill/')
        }
      });
    } catch (error) {
      next(error);
    }
  });
});

// Delete Endpoint Mejorado
router.delete('/delete', authenticate, async (req, res, next) => {
  try {
    const { public_id, estado } = req.body;

    if (!public_id) throw new Error('El campo public_id es requerido en el cuerpo de la solicitud');
    
    // Validación adicional de seguridad
    if (estado && !public_id.startsWith(`${estado}/`)) {
      console.warn(`⚠️ Intento de eliminación no autorizado: ${public_id} por IP: ${req.ip}`);
      return res.status(403).json({
        status: 'error',
        error: 'forbidden',
        message: 'No estás autorizado para eliminar este archivo',
        required_format: 'estado/tipo/nombre_archivo'
      });
    }

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: 'raw',
      invalidate: true
    });

    if (result.result !== 'ok') {
      return res.status(404).json({
        status: 'error',
        error: 'not_found',
        message: 'Archivo no encontrado o ya fue eliminado',
        public_id,
        suggestion: 'Verifique el public_id proporcionado'
      });
    }

    res.json({
      status: 'success',
      message: 'Archivo eliminado exitosamente',
      data: {
        public_id,
        deleted_at: new Date().toISOString(),
        bytes_freed: result.bytes,
        cache_invalidated: result.invalidate
      }
    });
  } catch (error) {
    next(error);
  }
});

// List Files Endpoint Mejorado
router.get('/archivos/:estado/:docType?', authenticate, async (req, res, next) => {
  try {
    const estado = req.params.estado || 'aguascalientes';
    const docType = req.params.docType;
    const { page = 1, limit = 100 } = req.query;

    const folderPath = docType ? `${estado}/${docType}` : estado;

    const result = await cloudinary.search
      .expression(`resource_type:raw AND folder:"${folderPath}"`)
      .sort_by('created_at', 'desc')
      .max_results(Number(limit))
      .execute();

    const archivos = result.resources.map(resource => ({
      url: resource.secure_url,
      public_id: resource.public_id,
      filename: resource.context?.custom?.original_filename || resource.public_id.split('/').pop() + '.pdf',
      document_type: docType || resource.public_id.split('/')[1] || 'general',
      estado: estado,
      view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(resource.secure_url)}&embedded=true`,
      download_url: resource.secure_url.replace('/upload/', '/upload/fl_attachment/'),
      uploaded_at: resource.created_at,
      size: resource.bytes,
      format: resource.format,
      thumbnail_url: resource.secure_url.replace('/upload/', '/upload/w_200,h_300,c_fill/'),
      tags: resource.tags || []
    }));

    res.set('x-total-count', result.total_count);
    res.json({
      status: 'success',
      data: {
        archivos,
        count: archivos.length,
        total_count: result.total_count,
        estado,
        tipo_documento: docType || 'all',
        page: Number(page),
        limit: Number(limit),
        has_more: result.next_cursor ? true : false,
        next_cursor: result.next_cursor || null
      }
    });
  } catch (error) {
    next(error);
  }
});

// Document Types Endpoint Mejorado
router.get('/tipos-documento', authenticate, (req, res) => {
  res.set('x-api-version', '1.2.0');
  res.json({
    status: 'success',
    data: {
      tipos_documento: DOCUMENT_TYPES,
      count: Object.keys(DOCUMENT_TYPES).length,
      last_updated: '2023-11-15',
      description: 'Tipos de documentos oficiales del sistema'
    }
  });
});

app.use('/api', apiLimiter, router);

// Root Endpoint Mejorado
app.get('/', (req, res) => {
  res.set('x-api-version', '1.2.0');
  res.json({
    status: 'success',
    version: '1.2.0',
    documentation: 'https://github.com/yieyoo/CONTROL_OPERATIVO',
    endpoints: [
      { 
        method: 'POST', 
        path: '/api/upload/:docType', 
        desc: 'Subir PDF por tipo', 
        auth: 'x-api-key',
        example: '/api/upload/ficha_curricular'
      },
      { 
        method: 'GET', 
        path: '/api/archivos/:estado', 
        desc: 'Listar todos los PDFs de un estado', 
        auth: 'x-api-key',
        example: '/api/archivos/aguascalientes'
      },
      { 
        method: 'GET', 
        path: '/api/archivos/:estado/:docType', 
        desc: 'Listar PDFs filtrados por tipo', 
        auth: 'x-api-key',
        example: '/api/archivos/aguascalientes/ficha_curricular'
      },
      { 
        method: 'GET', 
        path: '/api/tipos-documento', 
        desc: 'Obtener tipos de documentos disponibles', 
        auth: 'x-api-key'
      },
      { 
        method: 'DELETE', 
        path: '/api/delete', 
        desc: 'Eliminar PDF', 
        auth: 'x-api-key',
        body_example: { public_id: 'estado/tipo/nombre_archivo' }
      },
      { 
        method: 'GET', 
        path: '/api/health', 
        desc: 'Estado del servicio' 
      }
    ],
    note: 'Todos los endpoints (excepto /health) requieren el header x-api-key',
    support: 'contacto@inm.gob.mx',
    limits: '15MB por archivo, 200 solicitudes cada 15 minutos'
  });
});

// 404 Handler Mejorado
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error: 'not_found',
    message: 'Ruta no encontrada',
    requested_url: req.originalUrl,
    method: req.method,
    suggested_routes: [
      '/api/upload/[type]',
      '/api/archivos/[state]',
      '/api/archivos/[state]/[type]',
      '/api/tipos-documento',
      '/api/delete',
      '/api/health'
    ],
    documentation: 'https://github.com/yieyoo/CONTROL_OPERATIVO'
  });
});

app.use(handleError);

// Server Startup Mejorado
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
  console.log(`🔒 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌍 Cloudinary: ${process.env.CLOUD_NAME}`);
  console.log(`📄 Tipos de documentos: ${Object.values(DOCUMENT_TYPES).join(', ')}`);
  console.log(`🔑 Autenticación: ${process.env.API_KEY ? 'HABILITADA' : 'DESHABILITADA'}`);
  console.log(`🌐 Orígenes permitidos: ${allowedOrigins.join(', ')}`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recibida señal SIGTERM. Cerrando servidor...');
  server.close(() => {
    console.log('🛑 Servidor detenido');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT. Cerrando servidor...');
  server.close(() => {
    console.log('🛑 Servidor detenido');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('🔴 Unhandled Rejection:', err.stack || err.message);
  server.close(() => process.exit(1));
});

module.exports = app;