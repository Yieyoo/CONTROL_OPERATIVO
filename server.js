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

// Seguridad y logs
app.use(helmet());
app.use(morgan('dev'));
app.set('trust proxy', true);

// Limitador de peticiones
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

// CORS CONFIGURADO CORRECTAMENTE
const allowedOrigins = [
  'https://yieyoo.github.io',
  'https://yieyoo.github.io/CONTROL_OPERATIVO/',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Permitir peticiones sin origin (como Postman) o desde orígenes permitidos
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
}));

app.options('*', cors()); // Preflight

// Parseo del cuerpo
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Validación de configuración de Cloudinary
const validateCloudinaryConfig = () => {
  const requiredVars = ['CLOUD_NAME', 'CLOUD_API_KEY', 'CLOUD_API_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Faltan variables de entorno:', missingVars.join(', '));
    process.exit(1);
  }

  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
    secure: true
  });

  console.log('✅ Cloudinary configurado correctamente');
};

validateCloudinaryConfig();

// Middleware de autenticación
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

// Configuración de Multer para PDFs
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  }
});

// Manejo de errores centralizado
const handleError = (error, req, res, next) => {
  console.error('🔴 Error:', error.message);

  const status = error.message.includes('CORS') ? 403 : 
                error.message.includes('PDF') ? 400 : 
                error.message.includes('tamaño') ? 413 : 500;

  res.status(status).json({
    status: 'error',
    error: 'server_error',
    message: error.message
  });
};

// Rutas API
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Subida de PDF
router.post('/upload', authenticate, pdfUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new Error('No se ha subido ningún archivo');

    const estado = req.body.estado || 'aguascalientes';
    const originalName = req.file.originalname;

    const uploadOptions = {
      resource_type: 'raw',
      folder: estado,
      format: 'pdf',
      type: 'upload',
      access_mode: 'public',
      transformation: []
    };

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
      uploadStream.end(req.file.buffer);
    });

    res.status(201).json({
      status: 'success',
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        filename: originalName,
        view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(result.secure_url)}&embedded=true`
      }
    });
  } catch (error) {
    next(error);
  }
});

// Eliminación de PDF
router.delete('/delete', authenticate, async (req, res, next) => {
  try {
    const { public_id } = req.body;
    if (!public_id) throw new Error('public_id es requerido');

    const result = await cloudinary.uploader.destroy(public_id, { resource_type: 'raw' });

    if (result.result !== 'ok') {
      return res.status(404).json({
        status: 'error',
        error: 'not_found',
        message: 'Archivo no encontrado'
      });
    }

    res.json({ status: 'success', message: 'Archivo eliminado' });
  } catch (error) {
    next(error);
  }
});

// Listado de PDFs
router.get('/archivos/:estado', authenticate, async (req, res, next) => {
  try {
    const estado = req.params.estado || 'aguascalientes';

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: `${estado}/`,
      resource_type: 'raw',
      max_results: 500
    });

    const archivos = result.resources.map(resource => ({
      url: resource.secure_url,
      public_id: resource.public_id,
      filename: resource.public_id.split('/').pop() + '.pdf',
      view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(resource.secure_url)}&embedded=true`
    }));

    res.json({ status: 'success', data: archivos });
  } catch (error) {
    next(error);
  }
});

// Montaje de rutas y errores
app.use('/api', apiLimiter, router);

app.get('/', (req, res) => {
  res.json({
    status: 'success',
    endpoints: [
      { method: 'POST', path: '/api/upload', desc: 'Subir PDF' },
      { method: 'GET', path: '/api/archivos/:estado', desc: 'Listar PDFs' },
      { method: 'DELETE', path: '/api/delete', desc: 'Eliminar PDF' }
    ]
  });
});

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error: 'not_found'
  });
});

app.use(handleError);

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Servidor cerrado');
  });
});
