require('dotenv').config();
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
const hpp = require('hpp');
const diskusage = require('diskusage');
const os = require('os');
const client = require('prom-client');

const pipeline = promisify(stream.pipeline);

// Inicializar métricas de Prometheus
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode || 500;
    this.errorCode = errorCode || 'server_error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Configuración inicial
const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// 1. Middlewares de Seguridad Avanzada
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
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'same-origin' }
}));

app.use(hpp());
app.set('trust proxy', 1);

// 2. Configuración de CORS
const allowedOrigins = new Set([
  'https://yieyoo.github.io',
  'https://yieyoo.github.io/CONTROL_OPERATIVO/',
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [])
]);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin && !isProduction) {
      return callback(null, true);
    }
    
    if (origin && allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    
    console.warn(`Intento de acceso desde origen no permitido: ${origin || 'null'}`);
    callback(new AppError('Origen no permitido por CORS', 403, 'cors_not_allowed'));
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  exposedHeaders: ['x-ratelimit-limit', 'x-ratelimit-remaining'],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 3. Rate Limiting
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || (isProduction ? '100' : '1000')),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      error: 'rate_limit_exceeded',
      message: 'Demasiadas peticiones desde esta IP, por favor intente más tarde',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// 4. Configuración de Cloudinary
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
      api_proxy: process.env.PROXY_URL,
      timeout: 30000
    });
    
    console.log('✅ Cloudinary configurado correctamente');
  } catch (error) {
    console.error('❌ Error configurando Cloudinary:', error);
    process.exit(1);
  }
};

validateCloudinaryConfig();

// 5. Middlewares de Aplicación
app.use(morgan(isProduction ? 'combined' : 'dev', {
  skip: (req, res) => req.path === '/api/health' || req.path === '/metrics',
  stream: isProduction ? 
    fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' }) : 
    process.stdout
}));

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

app.use(require('compression')({ 
  level: zlib.constants.Z_BEST_COMPRESSION,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return /json|text|javascript|pdf/.test(res.getHeader('Content-Type'));
  }
}));

// 6. Configuración de Multer para PDFs
const memoryStorage = multer.memoryStorage();
const pdfUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 1,
    fields: 5,
    parts: 10
  },
  fileFilter: (req, file, cb) => {
    const validMimeTypes = ['application/pdf'];
    const validExtensions = ['.pdf'];
    
    if (!validMimeTypes.includes(file.mimetype) || 
        !validExtensions.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new AppError('Solo se permiten archivos PDF', 400, 'invalid_file_type'), false);
    }
    
    if (!/^[\w\-\. ]+\.pdf$/i.test(file.originalname)) {
      return cb(new AppError('Nombre de archivo no válido', 400, 'invalid_filename'), false);
    }
    
    cb(null, true);
  }
}).single('file');

// 7. Autenticación
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
    console.warn(`Intento de acceso con API Key inválida desde IP: ${req.ip}`);
    return res.status(401).json({
      status: 'error',
      error: 'unauthorized',
      message: 'API Key inválida',
      code: 'INVALID_API_KEY'
    });
  }

  next();
};

// 8. Manejo de Archivos en Cloudinary
const processUpload = async (file, estado, tipoDocumento) => {
  if (!file) throw new AppError('No se ha subido ningún archivo', 400, 'missing_file');
  
  const originalName = path.parse(file.originalname).name.replace(/[^\w\- ]/gi, '') + '.pdf';
  
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
      original_filename: originalName,
      uploaded_at: new Date().toISOString(),
      custom: { estado, tipo_documento: tipoDocumento, uploaded_by: 'api' }
    }
  };

  try {
    return await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => 
        error ? reject(error) : resolve(result));
      
      pipeline(stream.Readable.from(file.buffer), uploadStream).catch(reject);
    });
  } catch (error) {
    throw new AppError(`Error al subir a Cloudinary: ${error.message}`, 502, 'cloudinary_error');
  }
};

// 9. Cache para listado de archivos
const listFilesCache = new Map();
const CACHE_TTL = 60000;

// 10. Rutas
const router = express.Router();

// Health Check
router.get('/health', async (req, res) => {
  const healthcheck = {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.2.0',
    checks: {
      memoryUsage: process.memoryUsage(),
      cloudinary: 'connected',
      disk: {
        free: `${(diskusage.checkSync('/').free / 1024 / 1024).toFixed(2)} MB`,
        total: `${(diskusage.checkSync('/').total / 1024 / 1024).toFixed(2)} MB`
      },
      load: os.loadavg()
    },
    environment: process.env.NODE_ENV || 'development'
  };

  try {
    await cloudinary.api.resources({ max_results: 1 });
    res.json(healthcheck);
  } catch (error) {
    healthcheck.status = 'degraded';
    healthcheck.cloudinary = 'disconnected';
    healthcheck.error = error.message;
    res.status(503).json(healthcheck);
  }
});

// Subir archivo
router.post('/upload', authenticate, (req, res, next) => {
  pdfUpload(req, res, async (err) => {
    try {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          throw new AppError('El archivo excede el límite de 15MB', 413, 'file_too_large');
        }
        throw err;
      }

      const { estado = 'aguascalientes', tipo_documento = 'ficha_curricular' } = req.body;
      
      if (!req.file) throw new AppError('No se ha subido ningún archivo', 400, 'no_file_uploaded');
      
      const result = await processUpload(req.file, estado, tipo_documento);

      res.status(201).json({
        status: 'success',
        data: {
          url: result.secure_url,
          public_id: result.public_id,
          filename: result.original_filename,
          estado,
          tipo_documento,
          view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(result.secure_url)}&embedded=true`,
          uploaded_at: result.created_at,
          size: result.bytes
        }
      });
    } catch (error) {
      next(error);
    }
  });
});

// Eliminar archivo
router.delete('/delete', authenticate, async (req, res, next) => {
  try {
    const { public_id, estado, tipo_documento } = req.body;

    if (!public_id) throw new AppError('public_id es requerido', 400, 'missing_public_id');
    if (!estado || !tipo_documento) {
      throw new AppError('Estado y tipo de documento son requeridos', 400, 'missing_parameters');
    }

    const expectedPrefix = `${estado}/${tipo_documento}/`;
    if (!public_id.startsWith(expectedPrefix)) {
      throw new AppError('No tienes permiso para eliminar este archivo', 403, 'forbidden');
    }

    await cloudinary.api.resource(public_id, { resource_type: 'raw' });
    
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
      data: { public_id, deleted_at: new Date().toISOString() }
    });
  } catch (error) {
    if (error.http_code === 404) {
      error = new AppError('Archivo no encontrado', 404, 'not_found');
    }
    next(error);
  }
});

// Listar archivos
router.get('/archivos/:estado/:tipoDocumento', authenticate, async (req, res, next) => {
  try {
    const { estado = 'aguascalientes', tipoDocumento = 'ficha_curricular' } = req.params;
    const cacheKey = `${estado}:${tipoDocumento}`;
    
    if (listFilesCache.has(cacheKey)) {
      const cached = listFilesCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
      }
    }

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: `${estado}/${tipoDocumento}/`,
      resource_type: 'raw',
      max_results: 500
    });

    const archivos = result.resources.map(resource => ({
      url: resource.secure_url,
      public_id: resource.public_id,
      filename: resource.context?.custom?.original_filename || path.parse(resource.public_id).name + '.pdf',
      estado,
      tipo_documento: tipoDocumento,
      view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(resource.secure_url)}&embedded=true`,
      uploaded_at: resource.created_at,
      size: resource.bytes
    }));

    const responseData = {
      status: 'success',
      data: archivos,
      count: archivos.length,
      estado,
      tipo_documento,
      timestamp: new Date().toISOString()
    };

    listFilesCache.set(cacheKey, { timestamp: Date.now(), data: responseData });
    res.json(responseData);
  } catch (error) {
    next(error);
  }
});

// Métricas
router.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Montar rutas
app.use('/api', apiLimiter, router);

// Documentación
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'API de Gestión de Archivos PDF',
    version: '1.2.0',
    endpoints: {
      health: '/api/health',
      upload: '/api/upload',
      delete: '/api/delete',
      list: '/api/archivos/:estado/:tipoDocumento',
      metrics: '/api/metrics'
    }
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  console.error(`🔴 [${new Date().toISOString()}] Error ${statusCode}:`, {
    message: err.message,
    stack: !isProduction ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(statusCode).json({
    status: 'error',
    error: err.errorCode || 'server_error',
    message: err.message,
    ...(!isProduction && { stack: err.stack })
  });
});

// Ruta no encontrada
app.use((req, res, next) => {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.path}`, 404, 'not_found'));
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`
🚀 Servidor en puerto ${PORT}
🔒 Modo seguro: ${isProduction ? 'ON' : 'OFF'}
🌍 Cloudinary: ${process.env.CLOUD_NAME}
📂 Estructura: estado/tipoDocumento/archivo.pdf
⚡ Versión: 1.2.0 - ${new Date().toISOString()}
  `);
});

// Manejo de cierre
const shutdown = async (signal) => {
  console.log(`🛑 Recibido ${signal}, cerrando servidor...`);
  try {
    await new Promise(resolve => server.close(resolve));
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error al cerrar el servidor:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', err => console.error('⚠️ Unhandled Rejection:', err));
process.on('uncaughtException', err => {
  console.error('⚠️ Uncaught Exception:', err);
  shutdown('uncaughtException');
});

module.exports = { app, server };