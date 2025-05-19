const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const zlib = require('zlib');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Configuración Avanzada de Seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'res.cloudinary.com'],
      connectSrc: ["'self'", 'https://api.cloudinary.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  referrerPolicy: {
    policy: 'same-origin'
  }
}));

app.use(morgan('combined', {
  skip: (req, res) => req.path === '/api/health' || req.path === '/favicon.ico',
  stream: process.env.NODE_ENV === 'production' 
    ? fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' }) 
    : process.stdout
}));

app.set('trust proxy', 1);

// 2. Configuración CORS Mejorada - Versión Final
const allowedOrigins = [
  'https://yieyoo.github.io',
  'https://yieyoo.github.io/CONTROL_OPERATIVO/',
  'http://localhost:3000',
  'http://localhost',
  'https://control-operativo-1.onrender.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como curl, Postman) en desarrollo
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Permitir solicitudes del mismo dominio (Render)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin) || 
        (process.env.NODE_ENV === 'development' && !origin)) {
      callback(null, true);
    } else {
      console.log('Origen bloqueado:', origin);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400
};

// 3. Configuración especial para el endpoint raíz
app.get('/', cors({ origin: '*' }), (req, res) => {
  res.json({
    status: 'success',
    message: 'API de Gestión de Archivos PDF - INM',
    version: '1.1.0'
  });
});

// 4. Aplicar CORS configurado a todas las rutas /api
app.use('/api', cors(corsOptions));

// 5. Middleware para manejar preflight requests globalmente
app.options('*', cors(corsOptions));

// 6. Middlewares para parsear el cuerpo de las peticiones
app.use(express.json({
  limit: '10mb',
  inflate: true,
  strict: true,
  type: 'application/json'
}));

app.use(express.urlencoded({
  extended: true,
  limit: '10mb',
  parameterLimit: 1000,
  inflate: true
}));

// 7. Configuración de Cloudinary
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
      secure_distribution: null,
      cdn_subdomain: true,
      shorten: true,
      sign_url: true,
      api_proxy: process.env.PROXY_URL
    });
    console.log('✅ Cloudinary configurado correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error configurando Cloudinary:', error);
    process.exit(1);
  }
};

validateCloudinaryConfig();

// 8. Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      error: 'rate_limit_exceeded',
      message: 'Demasiadas peticiones desde esta IP, por favor intente más tarde',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// 9. Configuración de Multer para PDFs
const memoryStorage = multer.memoryStorage();
const pdfUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 1,
    fields: 5
  },
  fileFilter: (req, file, cb) => {
    const validMimeTypes = ['application/pdf', 'application/x-pdf'];
    const validExtensions = ['.pdf'];
    
    if (validMimeTypes.includes(file.mimetype)) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (validExtensions.includes(ext)) {
        return cb(null, true);
      }
    }
    cb(new Error('Solo se permiten archivos PDF (extensión .pdf)'), false);
  }
}).single('file');

// 10. Compresión GZIP
const shouldCompress = (req, res) => {
  if (req.headers['x-no-compression']) return false;
  return /json|text|javascript|pdf/.test(res.getHeader('Content-Type'));
};

app.use(require('compression')({
  level: zlib.constants.Z_BEST_COMPRESSION,
  threshold: 1024,
  filter: shouldCompress
}));

// 11. Cache-Control
const setCacheControl = (req, res, next) => {
  const cacheTime = 86400;
  if (req.method === 'GET') {
    res.set('Cache-Control', `public, max-age=${cacheTime}`);
  } else {
    res.set('Cache-Control', 'no-store');
  }
  next();
};

app.use(setCacheControl);

// 12. Middleware de autenticación
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      status: 'error',
      error: 'unauthorized',
      message: 'API Key no proporcionada',
      code: 'MISSING_API_KEY',
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }

  if (apiKey !== process.env.API_KEY) {
    console.warn(`Intento de acceso con API Key inválida desde IP: ${req.ip}`);
    return res.status(401).json({
      status: 'error',
      error: 'unauthorized',
      message: 'API Key inválida',
      code: 'INVALID_API_KEY',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// 13. Manejo de errores
class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode || 500;
    this.errorCode = errorCode || 'server_error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const handleError = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const errorCode = error.errorCode || 'server_error';
  
  console.error(`🔴 [${new Date().toISOString()}] Error ${statusCode}:`, {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(statusCode).json({
    status: 'error',
    error: errorCode,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

// 14. Rutas API
const router = express.Router();

// Ruta de salud
router.get('/health', async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.1.0',
    checks: {
      memoryUsage: process.memoryUsage(),
      cloudinary: 'active',
      database: 'n/a',
      diskSpace: {
        free: promisify(fs.statfs || (() => {}))('/')
          .then(stats => stats.bfree * stats.bsize)
          .catch(() => 'n/a'),
        total: promisify(fs.statfs || (() => {}))('/')
          .then(stats => stats.blocks * stats.bsize)
          .catch(() => 'n/a')
      }
    }
  };

  try {
    await cloudinary.api.ping();
    res.json({
      ...healthcheck,
      status: 'healthy',
      dbStatus: 'connected'
    });
  } catch (error) {
    healthcheck.status = 'degraded';
    healthcheck.dbStatus = 'disconnected';
    healthcheck.error = error.message;
    res.status(503).json(healthcheck);
  }
});

// Función para subir archivos
const processUpload = async (file, estado, tipoDocumento) => {
  if (!file) throw new AppError('No se ha subido ningún archivo', 400, 'missing_file');
  
  const originalName = path.parse(file.originalname).name.replace(/[^\w- ]/gi, '') + '.pdf';
  if (!/^[\w- ]+\.pdf$/i.test(originalName)) {
    throw new AppError('El nombre del archivo contiene caracteres no permitidos', 400, 'invalid_filename');
  }

  const uploadOptions = {
    resource_type: 'raw',
    folder: `${estado}/${tipoDocumento}`,
    format: 'pdf',
    type: 'upload',
    access_mode: 'public',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    filename_override: originalName,
    unique_filename: false,
    overwrite: true,
    context: {
      original_filename: originalName,
      uploaded_at: new Date().toISOString(),
      custom: {
        estado: estado,
        tipo_documento: tipoDocumento,
        uploaded_by: 'api'
      }
    },
    responsive_breakpoints: {
      create_derived: false,
      bytes_step: 20000,
      min_width: 200,
      max_width: 1000,
      transformation: { crop: 'limit' }
    }
  };

  try {
    return await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => error ? reject(error) : resolve(result)
      );
      
      pipeline(
        stream.Readable.from(file.buffer),
        uploadStream
      ).catch(reject);
    });
  } catch (error) {
    throw new AppError(`Error al subir a Cloudinary: ${error.message}`, 502, 'cloudinary_error');
  }
};

// Ruta para subir archivos
// Ruta para subir archivos
router.post('/upload', authenticate, (req, res, next) => {
  pdfUpload(req, res, async (err) => {
    try {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          throw new AppError('El archivo excede el límite de 15MB', 413, 'file_too_large');
        }
        throw new AppError(err.message, 400, 'upload_error');
      }

      const estado = req.body.estado || 'aguascalientes';
      const tipoDocumento = req.body.tipo_documento || 'ficha_curricular';
      const titulo = req.body.titulo || 'Plantilla de Personal'; // Nuevo campo

      // Usar el título en el nombre del archivo si es plantilla_personal
      const nombreArchivo = tipoDocumento === 'plantilla_personal' 
        ? `${titulo.replace(/ /g, '_')}_${Date.now()}.pdf`
        : path.parse(req.file.originalname).name.replace(/[^\w- ]/gi, '') + '.pdf';

      const uploadOptions = {
        resource_type: 'raw',
        folder: `${estado}/${tipoDocumento}`,
        filename_override: nombreArchivo,
        format: 'pdf',
        type: 'upload',
        access_mode: 'public',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        unique_filename: false,
        overwrite: true,
        context: {
          original_filename: nombreArchivo,
          uploaded_at: new Date().toISOString(),
          custom: {
            estado: estado,
            tipo_documento: tipoDocumento,
            titulo: titulo,
            uploaded_by: 'api'
          }
        }
      };

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => error ? reject(error) : resolve(result)
        );
        
        pipeline(
          stream.Readable.from(req.file.buffer),
          uploadStream
        ).catch(reject);
      });

      res.status(201).json({
        status: 'success',
        data: {
          url: result.secure_url,
          public_id: result.public_id,
          filename: nombreArchivo,
          estado: estado,
          tipo_documento: tipoDocumento,
          titulo: titulo,
          view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(result.secure_url)}&embedded=true`,
          download_url: result.secure_url.replace('/upload/', '/upload/fl_attachment/'),
          uploaded_at: result.created_at,
          size: result.bytes,
          format: result.format,
          etag: result.etag
        }
      });
    } catch (error) {
      next(error);
    }
  });
});

// Ruta para eliminar archivos
router.delete('/delete', authenticate, async (req, res, next) => {
  try {
    const { public_id, estado, tipo_documento } = req.body;
    
    if (!public_id) {
      throw new AppError('public_id es requerido', 400, 'missing_public_id');
    }

    // Verificación de la estructura del public_id
    const expectedPrefix = `${estado}/${tipo_documento}/`;
    if (estado && tipo_documento && !public_id.startsWith(expectedPrefix)) {
      throw new AppError('No tienes permiso para eliminar este archivo', 403, 'forbidden');
    }

    // Verificar que el archivo existe
    try {
      await cloudinary.api.resource(public_id, { resource_type: 'raw' });
    } catch (error) {
      if (error.http_code === 404) {
        throw new AppError('Archivo no encontrado', 404, 'not_found');
      }
      throw error;
    }

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: 'raw',
      invalidate: true
    });

    if (result.result !== 'ok') {
      throw new AppError('Error al eliminar el archivo', 500, 'delete_failed');
    }

    res.json({
      status: 'success',
      message: 'Archivo eliminado',
      data: {
        public_id: public_id,
        estado: estado,
        tipo_documento: tipo_documento,
        deleted_at: new Date().toISOString(),
        deletion_result: result
      }
    });
  } catch (error) {
    next(error);
  }
});

// Ruta para listar archivos
router.get('/archivos/:estado/:tipoDocumento', authenticate, async (req, res, next) => {
  try {
    const estado = req.params.estado || 'aguascalientes';
    const tipoDocumento = req.params.tipoDocumento || 'ficha_curricular';
    const cacheKey = `${estado}:${tipoDocumento}`;

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: `${estado}/${tipoDocumento}/`,
      resource_type: 'raw',
      max_results: 500,
      context: true,
      tags: true,
      moderations: true
    });

    const archivos = result.resources.map(resource => {
      const originalName = resource.context?.custom?.original_filename || 
                         path.parse(resource.public_id).name + '.pdf';
      return {
        url: resource.secure_url,
        public_id: resource.public_id,
        filename: originalName,
        estado: estado,
        tipo_documento: tipoDocumento,
        view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(resource.secure_url)}&embedded=true`,
        download_url: resource.secure_url.replace('/upload/', '/upload/fl_attachment/'),
        uploaded_at: resource.created_at,
        size: resource.bytes,
        format: resource.format,
        width: resource.width,
        height: resource.height,
        etag: resource.etag,
        tags: resource.tags,
        moderation: resource.moderation
      };
    });

    const responseData = {
      status: 'success',
      data: archivos,
      count: archivos.length,
      estado: estado,
      tipo_documento: tipoDocumento,
      timestamp: new Date().toISOString()
    };

    // Añadir headers CORS manualmente
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    res.json(responseData);
  } catch (error) {
    next(error);
  }
});

// Montar rutas
app.use('/api', apiLimiter, router);

// Manejo de rutas no encontradas
app.use((req, res, next) => {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.path}`, 404, 'not_found'));
});

// Middleware de errores
app.use(handleError);

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
  console.log(`🌍 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ CORS configurado para los siguientes orígenes:`, allowedOrigins);
});

// Manejo de cierre
const shutdown = async (signal) => {
  console.log(`🛑 Recibido ${signal}, cerrando servidor...`);
  try {
    await new Promise((resolve) => server.close(resolve));
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error al cerrar el servidor:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  console.error('⚠️ Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err);
  shutdown('uncaughtException');
});

module.exports = { app, server };