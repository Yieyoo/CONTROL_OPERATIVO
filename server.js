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

// Configuración de seguridad básica
app.use(helmet());
app.use(morgan('combined'));

// Configuración de rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 peticiones por IP
  message: 'Demasiadas peticiones desde esta IP, por favor intente más tarde'
});
app.use(limiter);

// Configuración de almacenamiento en memoria para archivos subidos
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Límite de 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  }
});

// Configuración mejorada de CORS
const corsOptions = {
  origin: [
    'https://yieyoo.github.io',
    'https://yieyoo.github.io/CONTROL_OPERATIVO/',
    'http://localhost:3000',
    process.env.FRONTEND_URL // Variable de entorno para URL del frontend
  ].filter(Boolean),
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middlewares
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Validar configuración de Cloudinary
if (!process.env.CLOUD_NAME || !process.env.CLOUD_API_KEY || !process.env.CLOUD_API_SECRET) {
  console.error('Error: Faltan variables de configuración para Cloudinary');
  process.exit(1);
}

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
  secure: true
});

// Middleware de autenticación mejorado
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API Key no proporcionada'
    });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API Key inválida'
    });
  }

  next();
};

// Función para manejar errores de Cloudinary
const handleCloudinaryError = (error, res) => {
  console.error('Error de Cloudinary:', error);
  return res.status(500).json({
    error: 'cloudinary_error',
    message: 'Error al procesar el archivo en Cloudinary',
    details: error.message
  });
};

// Ruta de prueba
app.get('/test-cors', (req, res) => {
  res.json({
    status: 'success',
    message: 'CORS configurado correctamente',
    timestamp: new Date().toISOString(),
    allowed_origins: corsOptions.origin
  });
});

// Ruta de salud mejorada
app.get('/health', (req, res) => {
  const healthcheck = {
    status: 'OK',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cloudinary: {
      configured: !!process.env.CLOUD_NAME,
      status: 'OK'
    }
  };

  res.json(healthcheck);
});

// Manejo explícito para GET /upload
app.get('/upload', (req, res) => {
  res.status(405).json({
    error: 'Method Not Allowed',
    message: 'El método GET no está permitido para esta ruta',
    allowed_methods: ['POST']
  });
});

// Subir archivo a Cloudinary con mejor manejo de errores
app.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'No se ha subido ningún archivo',
        details: {
          accepted_types: ['application/pdf'],
          max_size: '10MB'
        }
      });
    }

    const estado = req.body.estado || 'aguascalientes';

    // Validar nombre de archivo
    const originalName = req.file.originalname;
    if (!/^[\w\-\. ]+\.pdf$/i.test(originalName)) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Nombre de archivo no válido',
        details: 'Solo se permiten caracteres alfanuméricos, guiones, puntos y espacios en el nombre del archivo'
      });
    }

    const uploadOptions = {
      resource_type: 'raw',
      folder: estado,
      format: 'pdf',
      use_filename: true,
      unique_filename: false,
      filename_override: originalName.replace('.pdf', '')
    };

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    res.status(201).json({
      status: 'success',
      message: 'Archivo subido correctamente',
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        filename: originalName,
        size: req.file.size,
        estado: estado,
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    handleCloudinaryError(error, res);
  }
});

// Eliminar archivo de Cloudinary con validación mejorada
app.delete('/delete', authenticate, async (req, res) => {
  try {
    const { public_id } = req.body;

    if (!public_id) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'El campo public_id es requerido',
        details: 'Debe proporcionar el ID público del archivo a eliminar'
      });
    }

    // Validar formato del public_id
    if (!/^[a-zA-Z0-9_\-/]+$/.test(public_id)) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Formato de public_id inválido'
      });
    }

    const result = await cloudinary.uploader.destroy(public_id);

    if (result.result !== 'ok') {
      return res.status(404).json({
        error: 'not_found',
        message: 'El archivo no existe o ya fue eliminado',
        details: result
      });
    }

    res.json({
      status: 'success',
      message: 'Archivo eliminado correctamente',
      data: {
        public_id: public_id,
        deleted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    handleCloudinaryError(error, res);
  }
});

// Listar archivos desde Cloudinary con paginación
app.get('/archivos/:estado', authenticate, async (req, res) => {
  try {
    const estado = req.params.estado || 'aguascalientes';
    const { limit = 100, next_cursor } = req.query;

    const options = {
      type: 'upload',
      prefix: `${estado}/`,
      resource_type: 'raw',
      max_results: Math.min(parseInt(limit), 100),
      next_cursor
    };

    const result = await cloudinary.api.resources(options);

    const archivos = result.resources.map(resource => ({
      url: resource.secure_url,
      public_id: resource.public_id,
      filename: resource.public_id.split('/').pop() || 'documento.pdf',
      uploaded_at: resource.created_at,
      size: resource.bytes,
      format: resource.format
    }));

    const response = {
      status: 'success',
      count: archivos.length,
      data: archivos
    };

    if (result.next_cursor) {
      response.pagination = {
        next_cursor: result.next_cursor,
        has_more: true
      };
    }

    res.json(response);

  } catch (error) {
    handleCloudinaryError(error, res);
  }
});

// Ruta para obtener información de un archivo específico
app.get('/archivo/:public_id', authenticate, async (req, res) => {
  try {
    const { public_id } = req.params;

    const resource = await cloudinary.api.resource(public_id, {
      resource_type: 'raw'
    });

    res.json({
      status: 'success',
      data: {
        url: resource.secure_url,
        public_id: resource.public_id,
        filename: resource.public_id.split('/').pop(),
        uploaded_at: resource.created_at,
        size: resource.bytes,
        format: resource.format
      }
    });

  } catch (error) {
    if (error.message.includes('Not found')) {
      return res.status(404).json({
        error: 'not_found',
        message: 'El archivo no existe'
      });
    }
    handleCloudinaryError(error, res);
  }
});

// Manejador de errores 404 mejorado
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `La ruta ${req.originalUrl} no existe`,
    available_endpoints: [
      'GET /health',
      'POST /upload',
      'DELETE /delete',
      'GET /archivos/:estado',
      'GET /archivo/:public_id'
    ]
  });
});

// Manejador de errores global mejorado
app.use((err, req, res, next) => {
  console.error('Error global:', err.stack);

  const statusCode = err.status || 500;
  const response = {
    error: 'Internal Server Error',
    message: 'Algo salió mal en el servidor'
  };

  if (process.env.NODE_ENV === 'development') {
    response.details = err.message;
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

// Iniciar el servidor con manejo de errores
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Orígenes permitidos: ${corsOptions.origin.join(', ')}`);
});

// Manejo de errores en el servidor
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Error: El puerto ${PORT} ya está en uso`);
    process.exit(1);
  } else {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
});

// Manejo de señales para apagado limpio
process.on('SIGTERM', () => {
  console.log('Recibida señal SIGTERM. Apagando servidor...');
  server.close(() => {
    console.log('Servidor apagado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Recibida señal SIGINT. Apagando servidor...');
  server.close(() => {
    console.log('Servidor apagado correctamente');
    process.exit(0);
  });
});