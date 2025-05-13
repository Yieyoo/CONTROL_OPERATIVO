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
    status: 'error',
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
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

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

// 6. Middleware de autenticación mejorado
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
    console.warn(`Intento de acceso con API Key inválida: ${apiKey}`);
    return res.status(401).json({
      status: 'error',
      error: 'unauthorized',
      message: 'API Key inválida',
      code: 'INVALID_API_KEY'
    });
  }

  next();
};

// 7. Configuración de Multer para PDFs optimizada
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF (application/pdf)'), false);
    }
  }
}).single('file');

// 8. Manejo centralizado de errores mejorado
const handleError = (error, req, res, next) => {
  console.error('🔴 Error:', error.message);

  let status = 500;
  let errorCode = 'server_error';
  
  if (error.message.includes('CORS')) {
    status = 403;
    errorCode = 'cors_error';
  } else if (error.message.includes('PDF') || error.message.includes('archivo')) {
    status = 400;
    errorCode = 'invalid_file';
  } else if (error.message.includes('tamaño')) {
    status = 413;
    errorCode = 'file_too_large';
  } else if (error.message.includes('no encontrado')) {
    status = 404;
    errorCode = 'not_found';
  }

  res.status(status).json({
    status: 'error',
    error: errorCode,
    message: error.message,
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
};

// 9. Rutas API mejoradas
const router = express.Router();

// Ruta de salud mejorada
router.get('/health', (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.3',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    services: {
      cloudinary: 'active',
      database: 'cloudinary'
    }
  };
  
  res.json(healthCheck);
});

// Subir archivo - Versión optimizada para conservar nombres originales
router.post('/upload', authenticate, (req, res, next) => {
  pdfUpload(req, res, async (err) => {
    try {
      if (err) throw err;
      if (!req.file) throw new Error('No se ha subido ningún archivo');

      const estado = req.body.estado || 'aguascalientes';
      const originalName = req.file.originalname;
      const cleanName = originalName.replace(/[^\w\-\. ]/gi, '');

      // Validación del nombre de archivo
      if (!/^[\w\-\. ]+\.pdf$/i.test(cleanName)) {
        throw new Error('El nombre del archivo contiene caracteres no permitidos');
      }

      // Validar tamaño del archivo
      if (req.file.size > 15 * 1024 * 1024) {
        throw new Error('El archivo excede el límite de 15MB');
      }

      // Configuración clave para mantener el nombre original
      const uploadOptions = {
        resource_type: 'raw',
        folder: estado,
        public_id: `${estado}/${path.parse(cleanName).name}`, // Conserva el nombre sin extensión
        format: 'pdf',
        type: 'upload',
        access_mode: 'public',
        use_filename: true,
        unique_filename: false,
        overwrite: true,
        invalidate: true,
        filename_override: cleanName,
        discard_original_filename: false,
        context: {
          original_filename: originalName,
          custom_filename: cleanName,
          uploaded_at: new Date().toISOString(),
          estado: estado
        },
        tags: [`estado_${estado}`, 'pdf_document']
      };

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => error ? reject(error) : resolve(result)
        );
        uploadStream.end(req.file.buffer);
      });

      res.status(201).json({
        status: 'success',
        data: {
          url: result.secure_url,
          public_id: result.public_id,
          original_name: originalName,
          clean_name: cleanName,
          view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(result.secure_url)}&embedded=true`,
          download_url: result.secure_url.replace('/upload/', '/upload/fl_attachment/'),
          uploaded_at: result.created_at,
          size: result.bytes,
          format: result.format,
          estado: estado
        }
      });
    } catch (error) {
      next(error);
    }
  });
});

// Eliminar archivo - Versión mejorada con más validaciones
router.delete('/delete', authenticate, async (req, res, next) => {
  try {
    const { public_id, estado } = req.body;

    if (!public_id) {
      throw new Error('El parámetro public_id es requerido');
    }

    // Verificación de estado
    if (estado && !public_id.startsWith(`${estado}/`)) {
      return res.status(403).json({
        status: 'error',
        error: 'forbidden',
        message: 'No tienes permiso para eliminar este archivo',
        code: 'INVALID_ESTADO'
      });
    }

    // Verificar primero si el archivo existe
    const resource = await cloudinary.api.resource(public_id, {
      resource_type: 'raw',
      context: true
    }).catch(() => null);

    if (!resource) {
      return res.status(404).json({
        status: 'error',
        error: 'not_found',
        message: 'El archivo no existe o ya fue eliminado'
      });
    }

    // Eliminar el archivo
    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: 'raw'
    });

    if (result.result !== 'ok') {
      throw new Error('Error al eliminar el archivo de Cloudinary');
    }

    res.json({
      status: 'success',
      message: 'Archivo eliminado correctamente',
      data: {
        public_id: public_id,
        filename: resource.context?.original_filename || public_id.split('/').pop(),
        deleted_at: new Date().toISOString(),
        estado: estado
      }
    });
  } catch (error) {
    next(error);
  }
});

// Listar archivos - Versión optimizada que conserva nombres originales
router.get('/archivos/:estado', authenticate, async (req, res, next) => {
  try {
    const estado = req.params.estado || 'aguascalientes';
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: `${estado}/`,
      resource_type: 'raw',
      max_results: Math.min(limit, 500),
      next_cursor: req.query.cursor,
      context: true
    });

    const archivos = result.resources.map(resource => {
      // Obtener el nombre original del contexto o del public_id
      const originalName = resource.context?.original_filename || 
                         resource.context?.custom?.original_filename ||
                         resource.public_id.split('/').pop() + '.pdf';
      
      return {
        url: resource.secure_url,
        public_id: resource.public_id,
        filename: originalName,
        original_name: resource.context?.original_filename || originalName,
        view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(resource.secure_url)}&embedded=true`,
        download_url: resource.secure_url.replace('/upload/', '/upload/fl_attachment/'),
        uploaded_at: resource.created_at,
        size: resource.bytes,
        format: resource.format,
        estado: estado
      };
    });

    // Respuesta con paginación
    const response = {
      status: 'success',
      data: archivos,
      count: archivos.length,
      total_count: result.resources.length,
      estado: estado
    };

    if (result.next_cursor) {
      response.pagination = {
        next_cursor: result.next_cursor,
        next_url: `${req.baseUrl}${req.path}?cursor=${result.next_cursor}`
      };
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Montar rutas
app.use('/api', apiLimiter, router);

// Documentación mejorada
app.get('/', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  res.json({
    status: 'success',
    version: '1.0.3',
    documentation: `${baseUrl}/docs`,
    endpoints: [
      { 
        method: 'POST', 
        path: '/api/upload', 
        description: 'Subir archivo PDF conservando el nombre original',
        authentication: 'x-api-key header',
        limits: '15MB por archivo',
        parameters: [
          { name: 'file', type: 'file', required: true, description: 'Archivo PDF a subir' },
          { name: 'estado', type: 'string', required: false, description: 'Carpeta/estado donde guardar el archivo' }
        ]
      },
      { 
        method: 'GET', 
        path: '/api/archivos/:estado', 
        description: 'Listar archivos PDF con nombres originales',
        authentication: 'x-api-key header'
      },
      { 
        method: 'DELETE', 
        path: '/api/delete', 
        description: 'Eliminar archivo PDF',
        authentication: 'x-api-key header'
      },
      { 
        method: 'GET', 
        path: '/api/health', 
        description: 'Estado del servicio'
      }
    ]
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
  console.log(`📁 Conservación de nombres originales: ACTIVADA`);
});

// Manejo de cierre
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('🛑 Servidor cerrado');
  });
});

module.exports = app;