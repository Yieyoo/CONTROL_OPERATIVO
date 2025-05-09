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

// 1. Configuración de Seguridad Mejorada
app.use(helmet());
app.use(morgan('dev'));
app.set('trust proxy', true); // Soluciona el error de X-Forwarded-For

// 2. Rate Limiting más estricto
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

// 5. Configuración de Cloudinary con validación mejorada
const validateCloudinaryConfig = () => {
  const requiredVars = ['CLOUD_NAME', 'API_KEY', 'CLOUD_API_KEY', 'CLOUD_API_SECRET'];
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
      secure: true
    });
    console.log('✅ Cloudinary configurado correctamente');
  } catch (error) {
    console.error('❌ Error configurando Cloudinary:', error);
    process.exit(1);
  }
};

validateCloudinaryConfig();

// 6. Middleware de autenticación reforzado
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

// 7. Configuración de Multer para PDFs con mejor manejo de errores
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    try {
      if (file.mimetype !== 'application/pdf') {
        throw new Error('Solo se permiten archivos PDF');
      }

      if (!/^[\w\-\. ]+\.pdf$/i.test(file.originalname)) {
        throw new Error('Nombre de archivo no válido');
      }

      cb(null, true);
    } catch (error) {
      cb(error, false);
    }
  }
});

// 8. Manejo centralizado de errores mejorado
const handleError = (error, req, res, next) => {
  console.error('🔴 Error:', error.message);

  const errorMap = {
    'CORS': { status: 403, error: 'forbidden', message: 'Origen no permitido' },
    'PDF': { status: 400, error: 'invalid_file_type', message: 'Solo se permiten archivos PDF' },
    'tamaño': { status: 400, error: 'file_too_large', message: 'El archivo excede el límite de 10MB' },
    'nombre de archivo': { status: 400, error: 'invalid_filename', message: 'Nombre de archivo no válido' },
    'Cloudinary': { status: 502, error: 'cloudinary_error', message: 'Error al procesar el archivo' }
  };

  const errorType = Object.keys(errorMap).find(key => 
    error.message.toLowerCase().includes(key.toLowerCase())
  );

  const errorResponse = errorType 
    ? errorMap[errorType] 
    : { status: 500, error: 'server_error', message: 'Error interno del servidor' };

  res.status(errorResponse.status).json({
    status: 'error',
    ...errorResponse
  });
};

// 9. Rutas API mejor estructuradas
const router = express.Router();

// Ruta de salud
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    cloudinaryConfigured: !!process.env.CLOUD_NAME
  });
});

// Subir archivo
router.post('/upload', authenticate, pdfUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new Error('No se ha subido ningún archivo');
    }

    const estado = req.body.estado || 'aguascalientes';
    const originalName = req.file.originalname;

    const uploadOptions = {
      resource_type: 'raw',
      folder: estado,
      format: 'pdf',
      use_filename: true,
      unique_filename: false,
      filename_override: originalName.replace('.pdf', ''),
      overwrite: false
    };

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(new Error('Cloudinary: ' + error.message));
          } else {
            resolve(result);
          }
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
        size: req.file.size,
        estado
      }
    });
  } catch (error) {
    next(error);
  }
});

// Eliminar archivo
router.delete('/delete', authenticate, async (req, res, next) => {
  try {
    const { public_id } = req.body;

    if (!public_id) {
      throw new Error('public_id es requerido');
    }

    if (!/^[a-zA-Z0-9_\-/]+$/.test(public_id)) {
      throw new Error('Formato de public_id inválido');
    }

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: 'raw'
    });

    if (result.result !== 'ok') {
      return res.status(404).json({
        status: 'error',
        error: 'not_found',
        message: 'El archivo no existe o ya fue eliminado'
      });
    }

    res.json({
      status: 'success',
      message: 'Archivo eliminado correctamente'
    });
  } catch (error) {
    next(error);
  }
});

// Listar archivos
router.get('/archivos/:estado', authenticate, async (req, res, next) => {
  try {
    const estado = req.params.estado || 'aguascalientes';
    const { limit = 100 } = req.query;

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: `${estado}/`,
      resource_type: 'raw',
      max_results: Math.min(parseInt(limit), 500),
      context: true
    });

    const archivos = result.resources.map(resource => ({
      url: resource.secure_url,
      public_id: resource.public_id,
      filename: resource.public_id.split('/').pop() + '.pdf',
      size: resource.bytes,
      uploaded_at: resource.created_at
    }));

    res.json({
      status: 'success',
      count: archivos.length,
      data: archivos
    });
  } catch (error) {
    next(error);
  }
});

// Montar rutas
app.use('/api', apiLimiter, router);

// 10. Documentación básica de la API
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    data: {
      name: 'Control Operativo API',
      version: '1.0.0',
      endpoints: [
        {
          method: 'GET',
          path: '/api/health',
          description: 'Verificar estado del servidor'
        },
        {
          method: 'POST',
          path: '/api/upload',
          description: 'Subir archivo PDF',
          headers: {
            'x-api-key': 'Required',
            'Content-Type': 'multipart/form-data'
          },
          body: {
            file: 'PDF file',
            estado: 'Optional (default: aguascalientes)'
          }
        },
        {
          method: 'DELETE',
          path: '/api/delete',
          description: 'Eliminar archivo',
          headers: {
            'x-api-key': 'Required',
            'Content-Type': 'application/json'
          },
          body: {
            public_id: 'ID del archivo en Cloudinary'
          }
        },
        {
          method: 'GET',
          path: '/api/archivos/:estado',
          description: 'Listar archivos por estado',
          headers: {
            'x-api-key': 'Required'
          }
        }
      ]
    }
  });
});

// 11. Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error: 'not_found',
    message: `Ruta ${req.originalUrl} no encontrada`
  });
});

// 12. Middleware de errores
app.use(handleError);

// 13. Inicio del servidor con manejo de errores
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
  console.log(`🔗 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Orígenes permitidos: ${allowedOrigins.join(', ')}`);
  console.log(`☁️ Cloudinary configurado: ${!!process.env.CLOUD_NAME}`);
});

// 14. Manejo de cierre limpio
const shutdown = (signal) => {
  console.log(`\n${signal} recibido. Cerrando servidor...`);
  server.close(() => {
    console.log('Servidor cerrado correctamente');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// 15. Manejo de errores no capturados
process.on('unhandledRejection', (error) => {
  console.error('⚠️ Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
  process.exit(1);
});