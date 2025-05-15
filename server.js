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
const PORT = process.env.PORT || 10000; // Cambiado a puerto 10000 como en tu configuración

// ====================
// 1. CONFIGURACIONES
// ====================

// Configuración de seguridad mejorada
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'res.cloudinary.com'],
      connectSrc: ["'self'", 'https://api.cloudinary.com']
    }
  }
}));

// Logging mejorado
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
}));

app.set('trust proxy', true);

// Rate limiting optimizado
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // Límite aumentado para operaciones de archivos
  message: {
    status: 'error',
    message: 'Demasiadas solicitudes desde esta IP, por favor intente más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// CORS configurado para producción y desarrollo
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://yieyoo.github.io',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origen no permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Middlewares para parsear requests
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

// ====================
// 2. CONFIGURACIÓN CLOUDINARY
// ====================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbl0vo8t4',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  private_cdn: false,
  secure_distribution: null
});

console.log('✅ Cloudinary configurado correctamente');
console.log(`🌍 Cloudinary configurado para: ${cloudinary.config().cloud_name}`);

// ====================
// 3. MIDDLEWARES PERSONALIZADOS
// ====================

// Autenticación mejorada
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
    console.warn(`Intento de acceso no autorizado desde IP: ${req.ip}`);
    return res.status(401).json({
      status: 'error',
      error: 'invalid_api_key',
      message: 'API Key inválida'
    });
  }

  next();
};

// Configuración avanzada de Multer para PDFs
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten archivos PDF (.pdf)'));
  }
}).single('file');

// ====================
// 4. MANEJO DE ERRORES
// ====================

class OperationalError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Error interno del servidor' : err.message;

  // Log detallado del error
  console.error(`🔴 [${new Date().toISOString()}] Error ${statusCode}:`, {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    body: req.body,
    headers: req.headers
  });

  res.status(statusCode).json({
    status: 'error',
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

// ====================
// 5. ENDPOINTS PRINCIPALES
// ====================

/**
 * @api {post} /api/upload Subir archivo PDF
 * @apiName UploadPDF
 * @apiGroup Archivos
 */
app.post('/api/upload', apiLimiter, authenticate, (req, res, next) => {
  pdfUpload(req, res, async (err) => {
    try {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          throw new OperationalError('El archivo excede el límite de 15MB', 413);
        }
        throw new OperationalError(err.message, 400);
      }

      if (!req.file) {
        throw new OperationalError('No se ha subido ningún archivo', 400);
      }

      const { estado = 'aguascalientes', tipo_documento = 'ficha_curricular' } = req.body;
      const originalName = path.parse(req.file.originalname).name.replace(/[^\w\-]/g, '');

      // Opciones avanzadas de upload a Cloudinary
      const uploadOptions = {
        resource_type: 'raw',
        folder: `${estado}/${tipo_documento}`,
        public_id: originalName,
        overwrite: true,
        format: 'pdf',
        type: 'upload',
        context: {
          original_filename: req.file.originalname,
          uploaded_at: new Date().toISOString()
        },
        invalidate: true
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
          filename: req.file.originalname,
          estado,
          tipo_documento,
          size: result.bytes,
          uploaded_at: result.created_at,
          view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(result.secure_url)}&embedded=true`
        }
      });

    } catch (error) {
      next(error);
    }
  });
});

/**
 * @api {delete} /api/delete Eliminar archivo PDF
 * @apiName DeletePDF
 * @apiGroup Archivos
 */
app.delete('/api/delete', apiLimiter, authenticate, async (req, res, next) => {
  try {
    const { public_id, estado, tipo_documento } = req.body;

    // Validación avanzada
    if (!public_id) {
      throw new OperationalError('El campo public_id es requerido', 400);
    }

    // Verificar estructura del public_id
    if (estado && tipo_documento) {
      const expectedPrefix = `${estado}/${tipo_documento}/`;
      if (!public_id.startsWith(expectedPrefix)) {
        throw new OperationalError('El public_id no coincide con la estructura esperada', 400);
      }
    }

    // Verificar que el archivo existe
    let resource;
    try {
      resource = await cloudinary.api.resource(public_id, { 
        resource_type: 'raw',
        image_metadata: true
      });
    } catch (error) {
      if (error.http_code === 404) {
        throw new OperationalError('El archivo no existe en Cloudinary', 404);
      }
      throw error;
    }

    // Eliminar el archivo
    const deletionResult = await cloudinary.uploader.destroy(public_id, {
      resource_type: 'raw',
      invalidate: true
    });

    if (deletionResult.result !== 'ok') {
      throw new OperationalError('Error al eliminar el archivo de Cloudinary', 500);
    }

    res.json({
      status: 'success',
      message: 'Archivo eliminado correctamente',
      data: {
        public_id,
        estado,
        tipo_documento,
        deleted_at: new Date().toISOString(),
        original_filename: resource.context?.custom?.original_filename || resource.public_id,
        size: resource.bytes
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @api {get} /api/archivos/:estado/:tipoDocumento Listar archivos PDF
 * @apiName ListPDFs
 * @apiGroup Archivos
 */
app.get('/api/archivos/:estado/:tipoDocumento', apiLimiter, authenticate, async (req, res, next) => {
  try {
    const { estado, tipoDocumento } = req.params;
    const prefix = `${estado}/${tipoDocumento}/`;

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: prefix,
      resource_type: 'raw',
      max_results: 500,
      context: true
    });

    const archivos = result.resources.map(resource => ({
      url: resource.secure_url,
      public_id: resource.public_id,
      filename: resource.context?.custom?.original_filename || path.parse(resource.public_id).name + '.pdf',
      estado,
      tipo_documento: tipoDocumento,
      uploaded_at: resource.created_at,
      size: resource.bytes,
      format: resource.format,
      view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(resource.secure_url)}&embedded=true`
    }));

    res.json({
      status: 'success',
      data: archivos,
      count: archivos.length,
      estado,
      tipo_documento
    });

  } catch (error) {
    next(error);
  }
});

// ====================
// 6. ENDPOINTS ADICIONALES
// ====================

/**
 * @api {get} /api/health Estado del servicio
 * @apiName HealthCheck
 * @apiGroup Sistema
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.2.0',
    cloudinary: {
      cloud_name: cloudinary.config().cloud_name,
      status: 'connected'
    },
    system: {
      memory: process.memoryUsage(),
      uptime: process.uptime()
    }
  });
});

/**
 * @api {get} / Documentación API
 * @apiName APIDocs
 * @apiGroup Sistema
 */
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'API de Gestión de Archivos PDF - INM',
    version: '1.2.0',
    endpoints: [
      {
        method: 'POST',
        path: '/api/upload',
        description: 'Subir archivo PDF',
        authentication: 'Requiere API Key',
        limits: '15MB máximo'
      },
      {
        method: 'DELETE',
        path: '/api/delete',
        description: 'Eliminar archivo PDF',
        authentication: 'Requiere API Key',
        parameters: {
          public_id: 'string (requerido)',
          estado: 'string (opcional)',
          tipo_documento: 'string (opcional)'
        }
      },
      {
        method: 'GET',
        path: '/api/archivos/:estado/:tipoDocumento',
        description: 'Listar archivos PDF',
        authentication: 'Requiere API Key'
      },
      {
        method: 'GET',
        path: '/api/health',
        description: 'Estado del servicio',
        authentication: 'No requiere autenticación'
      }
    ]
  });
});

// ====================
// 7. MANEJO DE RUTAS NO ENCONTRADAS
// ====================

app.use((req, res, next) => {
  next(new OperationalError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404));
});

// ====================
// 8. MIDDLEWARE DE ERRORES
// ====================

app.use(errorHandler);

// ====================
// 9. INICIO DEL SERVIDOR
// ====================

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
  console.log(`🔒 Modo seguro: ${process.env.NODE_ENV === 'production' ? 'ON' : 'OFF'}`);
  console.log(`📂 Estructura de carpetas: estado/tipoDocumento/archivo.pdf`);
  console.log(`⚡ Versión 1.2.0 - ${new Date().toISOString()}`);
  console.log(`🌍 URL: http://localhost:${PORT}`);
});

// ====================
// 10. MANEJO DE CIERRE
// ====================

const shutdown = async () => {
  console.log('\n🛑 Recibida señal de apagado...');
  
  try {
    await new Promise((resolve) => server.close(resolve));
    console.log('✅ Servidor HTTP cerrado');
    
    // Aquí puedes agregar más limpieza si es necesario
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error durante el apagado:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (err) => {
  console.error('⚠️ Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err);
  shutdown();
});

module.exports = {
  app,
  server
};