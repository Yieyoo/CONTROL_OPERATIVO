// server.js - VERSIÓN COMPLETA CON TODO Y MÁS
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

// 4. CORS Config (Arreglado el problema del x-ping-attempt)
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
    'x-ping-attempt',  // ¡Aquí está el cabrón que faltaba!
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

// 6. Cloudinary Config (con validación hardcore)
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

  console.log('☁️ Cloudinary listo para la batalla');
};

validateCloudinaryConfig();

// 7. Rate Limiter (más inteligente)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 150 : 9999,
  message: {
    status: 'error',
    error: 'rate_limit_exceeded',
    message: '¡Frena, cowboy! Demasiadas peticiones'
  },
  skip: (req) => req.ip === '::1' || req.ip === '127.0.0.1'
});

// 8. Upload de archivos (con más validaciones)
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const validTypes = ['application/pdf', 'application/x-pdf'];
    const validExt = path.extname(file.originalname).toLowerCase() === '.pdf';
    
    if (validTypes.includes(file.mimetype) && validExt) {
      cb(null, true);
    } else {
      cb(new Error('Solo PDFs, mi rey'), false);
    }
  }
}).single('file');

// 9. Autenticación (más robusta)
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      status: 'error',
      error: 'missing_api_key',
      message: '¿Y la API key, papá?'
    });
  }

  if (apiKey !== process.env.API_KEY) {
    console.warn(`⚠️ Intento de acceso con key inválida desde IP: ${req.ip}`);
    return res.status(401).json({
      status: 'error',
      error: 'invalid_api_key',
      message: 'API key equivocada, compa'
    });
  }
  
  next();
};

// 10. Health Check Mejorado (con ping-attempt)
router.get('/health-check', (req, res) => {
  const pingAttempt = req.headers['x-ping-attempt'] || 'N/A';
  
  res.header('x-ping-attempt', pingAttempt);
  res.json({
    status: '🔥 ON FIRE 🔥',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    attempt: pingAttempt
  });
});

// 11. Upload Endpoint (con todo y la cocina)
router.post('/upload', apiLimiter, authenticate, (req, res) => {
  pdfUpload(req, res, async (err) => {
    try {
      if (err) throw err;
      if (!req.file) throw new Error('No file uploaded');

      const { estado = 'default', tipo_documento = 'general' } = req.body;
      const result = await cloudinary.uploader.upload_stream({
        resource_type: 'raw',
        folder: `${estado}/${tipo_documento}`,
        format: 'pdf',
        public_id: req.file.originalname.replace('.pdf', '')
      });

      pipeline(
        stream.Readable.from(req.file.buffer),
        result
      );

      res.status(201).json({
        status: 'success',
        data: {
          url: result.secure_url,
          public_id: result.public_id,
          size: result.bytes
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

// 12. Error Handling (bien chingón)
app.use((err, req, res, next) => {
  console.error('💥 ERROR:', err.stack);
  
  const status = err.status || 500;
  const response = {
    status: 'error',
    error: err.code || 'server_error',
    message: err.message || 'Algo explotó'
  };

  if (!isProduction) response.stack = err.stack;
  
  res.status(status).json(response);
});

// 13. Server Start (con estilo)
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Servidor ON en puerto ${PORT}`);
  console.log(`🌎 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🛡️  CORS permitiendo: ${allowedOrigins.join(', ')}\n`);
});

// 14. Graceful Shutdown (para cuando la cosa se pone fea)
const shutdown = (signal) => {
  console.log(`\n🛑 Recibido ${signal}, cerrando con estilo...`);
  server.close(() => {
    console.log('✅ Servidor OFF');
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

module.exports = server;