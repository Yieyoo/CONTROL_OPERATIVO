// server.js - VERSIÓN COMPLETA Y CORREGIDA
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

// 1. Configuración inicial
const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// 2. Seguridad Hardcore
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'res.cloudinary.com'],
      connectSrc: ["'self'", 'https://api.cloudinary.com', 'https://yieyoo.github.io'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
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
    policy: 'strict-origin-when-cross-origin'
  },
  hidePoweredBy: true,
  noSniff: true,
  xssFilter: true
}));

// 3. Logging avanzado
const logStream = isProduction 
  ? fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
  : process.stdout;

app.use(morgan(isProduction ? 'combined' : 'dev', {
  skip: (req) => req.path === '/api/health-check',
  stream: logStream
}));

// 4. CORS Config (Corregido el problema del x-ping-attempt)
const allowedOrigins = [
  'https://yieyoo.github.io',
  'https://yieyoo.github.io/CONTROL_OPERATIVO/',
  'http://localhost:3000',
  'http://localhost:5500',
  'https://control-operativo-1.onrender.com'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin && !isProduction) return callback(null, true);
    if (allowedOrigins.includes(origin) || !isProduction) {
      callback(null, true);
    } else {
      console.warn(`🚨 CORS Blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-api-key',
    'x-ping-attempt',
    'x-requested-with'
  ],
  exposedHeaders: ['x-ping-attempt', 'x-api-version'],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false
};

// 5. Middlewares esenciales
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 6. Cloudinary Config (con validación mejorada)
const validateCloudinaryConfig = () => {
  const requiredVars = ['CLOUD_NAME', 'CLOUD_API_KEY', 'CLOUD_API_SECRET'];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  
  if (missingVars.length) {
    console.error('🔥 Faltan variables de Cloudinary:', missingVars);
    process.exit(1);
  }

  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
    secure: true
  });

  console.log('☁️ Cloudinary configurado correctamente');
};

validateCloudinaryConfig();

// 7. Rate Limiter (optimizado)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 150 : 9999,
  message: {
    status: 'error',
    error: 'rate_limit_exceeded',
    message: 'Demasiadas peticiones desde esta IP'
  },
  skip: (req) => req.ip === '::1' || req.ip === '127.0.0.1'
});

// 8. Upload de archivos (con mejor manejo de errores)
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const validTypes = ['application/pdf', 'application/x-pdf'];
    const validExt = path.extname(file.originalname).toLowerCase() === '.pdf';
    
    if (validTypes.includes(file.mimetype) && validExt) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  }
}).single('file');

// 9. Autenticación (mejorada)
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      status: 'error',
      error: 'missing_api_key',
      message: 'API Key no proporcionada'
    });
  }

  if (apiKey !== process.env.API_KEY) {
    console.warn(`⚠️ Intento de acceso no autorizado desde IP: ${req.ip}`);
    return res.status(401).json({
      status: 'error',
      error: 'invalid_api_key',
      message: 'API Key inválida'
    });
  }
  
  next();
};

// 10. Creación del router
const router = express.Router();

// 11. Health Check Endpoint (mejorado)
router.get('/health-check', (req, res) => {
  const pingAttempt = req.headers['x-ping-attempt'] || 'N/A';
  
  res.header('x-ping-attempt', pingAttempt);
  res.json({
    status: 'active',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    attempt: pingAttempt
  });
});

// 12. Upload Endpoint (con mejor manejo de archivos)
router.post('/upload', apiLimiter, authenticate, (req, res) => {
  pdfUpload(req, res, async (err) => {
    try {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          throw new Error('El archivo excede el límite de 20MB');
        }
        throw err;
      }

      if (!req.file) {
        throw new Error('No se ha subido ningún archivo');
      }

      const { estado = 'default', tipo_documento = 'general', titulo_documento } = req.body;
      
      const uploadOptions = {
        resource_type: 'raw',
        folder: `${estado}/${tipo_documento}`,
        format: 'pdf',
        public_id: path.parse(req.file.originalname).name,
        overwrite: true,
        context: {
          estado: estado,
          tipo_documento: tipo_documento,
          ...(titulo_documento && { titulo_documento: titulo_documento })
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
          size: result.bytes,
          format: result.format,
          estado: estado,
          tipo_documento: tipo_documento,
          ...(titulo_documento && { titulo_documento: titulo_documento })
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: 'upload_failed',
        message: error.message
      });
    }
  });
});

// 13. Listar archivos
router.get('/archivos/:estado/:tipoDocumento', authenticate, async (req, res) => {
  try {
    const { estado, tipoDocumento } = req.params;
    
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: `${estado}/${tipoDocumento}/`,
      resource_type: 'raw',
      max_results: 500
    });

    const archivos = result.resources.map(resource => ({
      url: resource.secure_url,
      public_id: resource.public_id,
      filename: resource.context?.custom?.original_filename || resource.public_id,
      size: resource.bytes,
      uploaded_at: resource.created_at,
      ...(resource.context?.custom?.titulo_documento && {
        titulo_documento: resource.context.custom.titulo_documento
      })
    }));

    res.json({
      status: 'success',
      data: archivos,
      count: archivos.length
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'list_error',
      message: error.message
    });
  }
});

// 14. Montar rutas
app.use('/api', apiLimiter, router);

// 15. Manejo de rutas no encontradas
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    error: 'not_found',
    message: `Ruta no encontrada: ${req.method} ${req.path}`
  });
});

// 16. Manejo de errores centralizado
app.use((err, req, res, next) => {
  console.error('💥 ERROR:', err.stack);
  
  const status = err.status || 500;
  const response = {
    status: 'error',
    error: err.code || 'server_error',
    message: err.message || 'Error interno del servidor'
  };

  if (!isProduction) {
    response.stack = err.stack;
  }
  
  res.status(status).json(response);
});

// 17. Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🛡️  Orígenes permitidos: ${allowedOrigins.join(', ')}`);
  console.log(`⏱️  Hora de inicio: ${new Date().toLocaleString()}\n`);
});

// 18. Apagado controlado
const shutdown = (signal) => {
  console.log(`\n🛑 Recibido ${signal}, cerrando servidor...`);
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  console.error('⚠️ Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  shutdown('uncaughtException');
});

module.exports = { app, server };