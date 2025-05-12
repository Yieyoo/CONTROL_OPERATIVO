require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const expressSanitizer = require('express-sanitizer');
const { LRUCache } = require('lru-cache');
const promBundle = require('express-prom-bundle');
const { sanitize } = require('sanitizer');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Configuración de métricas
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  customLabels: { project: 'control_operativo' },
  promClient: { collectDefaultMetrics: { timeout: 5000 } }
});

// 2. Configuración de caché
const cache = new LRUCache({
  max: process.env.MAX_CACHE_ITEMS || 500,
  ttl: process.env.CACHE_TTL || 900000
});

// 3. Estados permitidos
const estadosPermitidos = new Set([
  'aguascalientes', 'jalisco', 'nuevo-leon', 
  'queretaro', 'cdmx', 'mexico'
]);

// 4. Configuración inicial
app.use(metricsMiddleware);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));
app.set('trust proxy', true);

// 5. Configuración de CORS
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 6. Rate limiting mejorado
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip + req.headers['x-api-key'],
  handler: (req, res) => res.status(429).json({
    status: 'error',
    error: 'rate_limit_exceeded',
    message: 'Demasiadas solicitudes desde esta fuente'
  })
});

// 7. Middlewares de cuerpo y sanitización
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(expressSanitizer());

// 8. Validación de Cloudinary
const validateCloudinaryConfig = () => {
  const requiredVars = ['CLOUD_NAME', 'CLOUD_API_KEY', 'CLOUD_API_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Faltan variables de Cloudinary: ${missingVars.join(', ')}`);
  }

  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
    secure: true
  });
};

validateCloudinaryConfig();

// 9. Middlewares personalizados
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
    return res.status(401).json({
      status: 'error',
      error: 'invalid_api_key',
      message: 'API Key inválida'
    });
  }

  next();
};

const validateState = (req, res, next) => {
  const estado = req.params.estado || req.body.estado;
  
  if (estado && !estadosPermitidos.has(estado)) {
    return res.status(400).json({
      status: 'error',
      error: 'invalid_state',
      message: `Estado no permitido: ${estado}`
    });
  }
  
  req.estado = sanitize(estado);
  next();
};

// 10. Configuración de Multer para PDF
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  }
});

// 11. Validación de PDF
const validatePDF = (buffer) => {
  const header = buffer.slice(0, 4).toString('ascii');
  if (!header.startsWith('%PDF')) {
    throw new Error('El archivo no es un PDF válido');
  }
  
  const trailer = buffer.slice(-1024).toString('ascii');
  if (!trailer.includes('%%EOF')) {
    throw new Error('PDF incompleto o corrupto');
  }
};

// 12. Manejo de errores
const errorDictionary = {
  ES: {
    invalid_api_key: 'Clave API inválida',
    missing_api_key: 'Clave API no proporcionada',
    invalid_state: 'Estado no válido',
    rate_limit_exceeded: 'Límite de solicitudes excedido',
    server_error: 'Error interno del servidor'
  },
  EN: {
    invalid_api_key: 'Invalid API Key',
    missing_api_key: 'API Key not provided',
    invalid_state: 'Invalid state',
    rate_limit_exceeded: 'Rate limit exceeded',
    server_error: 'Internal server error'
  }
};

const errorHandler = (err, req, res, next) => {
  const lang = req.acceptsLanguages('es', 'en') || 'ES';
  const errorCode = err.code || 'server_error';
  
  res.status(err.statusCode || 500).json({
    status: 'error',
    error: errorCode,
    message: errorDictionary[lang]?.[errorCode] || err.message,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

// 13. Rutas
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

router.post('/upload', 
  apiLimiter,
  authenticate,
  validateState,
  pdfUpload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) throw new Error('No se subió ningún archivo');
      validatePDF(req.file.buffer);

      const originalName = sanitize(req.file.originalname)
        .replace(/[^\w\-\. ]/gi, '')
        .substring(0, 255);

      const uploadOptions = {
        resource_type: 'raw',
        folder: req.estado,
        format: 'pdf',
        type: 'upload',
        access_mode: 'public',
        filename_override: originalName,
        unique_filename: false,
        overwrite: true,
        context: {
          original_filename: originalName,
          uploaded_at: new Date().toISOString(),
          upload_source: 'control_operativo'
        }
      };

      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          uploadOptions, 
          (error, result) => error ? reject(error) : resolve(result)
        ).end(req.file.buffer);
      });

      cache.delete(`archivos_${req.estado}`);

      res.status(201).json({
        status: 'success',
        data: {
          url: result.secure_url,
          public_id: result.public_id,
          filename: originalName,
          uploaded_at: result.created_at,
          size: result.bytes
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/delete', 
  apiLimiter,
  authenticate,
  validateState,
  async (req, res, next) => {
    try {
      const { public_id } = req.body;
      if (!public_id) throw new Error('public_id es requerido');
      
      if (!public_id.startsWith(`${req.estado}/`)) {
        return res.status(403).json({
          status: 'error',
          error: 'forbidden',
          message: 'No tienes permiso para este archivo'
        });
      }

      const result = await cloudinary.uploader.destroy(public_id, {
        resource_type: 'raw'
      });

      if (result.result !== 'ok') throw new Error('Archivo no encontrado');
      
      cache.delete(`archivos_${req.estado}`);
      
      res.json({
        status: 'success',
        data: {
          public_id,
          deleted_at: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/archivos/:estado', 
  apiLimiter,
  authenticate,
  validateState,
  async (req, res, next) => {
    try {
      const cacheKey = `archivos_${req.estado}`;
      if (cache.has(cacheKey)) {
        return res.json(cache.get(cacheKey));
      }

      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: `${req.estado}/`,
        resource_type: 'raw',
        max_results: 500,
        context: true
      });

      const archivos = result.resources.map(resource => ({
        url: resource.secure_url,
        public_id: resource.public_id,
        filename: resource.context?.custom?.original_filename || 
                 resource.public_id.split('/').pop() + '.pdf',
        uploaded_at: resource.created_at,
        size: resource.bytes
      }));

      const responseData = {
        status: 'success',
        data: archivos,
        count: archivos.length,
        estado: req.estado
      };

      cache.set(cacheKey, responseData);
      res.json(responseData);
    } catch (error) {
      next(error);
    }
  }
);

// 14. Configuración final
app.use('/api', router);
app.use('/metrics', (req, res) => {
  res.set('Content-Type', promBundle.register.contentType);
  promBundle.register.metrics().then(data => res.send(data));
});

app.use((req, res) => res.status(404).json({
  status: 'error',
  error: 'not_found',
  message: 'Ruta no encontrada'
}));

app.use(errorHandler);

// 15. Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
  console.log(`🔒 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌎 CORS permitidos: ${process.env.ALLOWED_ORIGINS || 'ninguno'}`);
});

process.on('SIGTERM', () => {
  server.close(() => console.log('🛑 Servidor cerrado'));
});

module.exports = app;