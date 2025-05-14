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

// ======================
// 1. Configuración de Seguridad
// ======================
app.use(helmet());
app.use(morgan('dev'));
app.set('trust proxy', true);

// ======================
// 2. Limitación de Tasas
// ======================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limit_exceeded',
    message: 'Too many requests from this IP, please try again later'
  }
});

// ======================
// 3. Configuración CORS
// ======================
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
      console.warn('Intento de acceso desde origen no autorizado:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ======================
// 4. Middleware para Parsear el Cuerpo
// ======================
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ======================
// 5. Configuración de Cloudinary
// ======================
const validateCloudinaryConfig = () => {
  const requiredVars = ['CLOUD_NAME', 'CLOUD_API_KEY', 'CLOUD_API_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Variables de entorno requeridas faltantes:', missingVars.join(', '));
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

// ======================
// 6. Middleware de Autenticación
// ======================
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      status: 'error',
      error: 'unauthorized',
      message: 'API Key no proporcionada'
    });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      status: 'error',
      error: 'unauthorized',
      message: 'API Key inválida'
    });
  }

  next();
};

// ======================
// 7. Configuración de Multer para PDFs
// ======================
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  }
});

// ======================
// 8. Definición de Tipos de Documentos
// ======================
const DOCUMENT_TYPES = {
  FICHA_CURRICULAR: 'ficha_curricular',
  ORGANIGRAMA: 'organigrama',
  PLANTILLA_PERSONAL: 'plantilla_personal',
  VISITA_SUPERVISION: 'visita_supervision',
  ACUERDOS_VISITA: 'acuerdos_visita',
  VEHICULOS: 'vehiculos',
  INMUEBLES: 'inmuebles',
  UNIDAD_CANINA: 'unidad_canina'
};

// ======================
// 9. Middleware de Validación de Tipo de Documento
// ======================
const validateDocumentType = (req, res, next) => {
  const docType = req.params.docType?.toLowerCase();

  if (!docType || !Object.values(DOCUMENT_TYPES).includes(docType)) {
    return res.status(400).json({
      error: 'invalid_document_type',
      message: 'Tipo de documento inválido',
      valid_types: Object.values(DOCUMENT_TYPES)
    });
  }

  req.docType = docType;
  next();
};

// ======================
// 10. Middleware de Manejo de Errores
// ======================
const handleError = (error, req, res, next) => {
  console.error('🔴 Error:', error.message);

  const status = error.message.includes('CORS') ? 403 :
                 error.message.includes('PDF') ? 400 :
                 error.message.includes('size') ? 413 :
                 error.message.includes('document') ? 400 : 500;

  res.status(status).json({
    status: 'error',
    error: 'server_error',
    message: error.message
  });
};

// ======================
// 11. Rutas de la API
// ======================
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.1.0',
    services: { cloudinary: 'active' },
    document_types: DOCUMENT_TYPES
  });
});

router.post('/upload/:docType', authenticate, validateDocumentType, pdfUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new Error('No se subió ningún archivo');

    const estado = req.body.estado || 'aguascalientes';
    const { docType } = req;
    const originalName = req.file.originalname.replace(/[^\w\-\. ]/gi, '');

    if (!/^[\w\-\. ]+\.pdf$/i.test(originalName)) {
      throw new Error('El nombre del archivo contiene caracteres inválidos');
    }

    const uploadOptions = {
      resource_type: 'raw',
      folder: `${estado}/${docType}`,
      format: 'pdf',
      type: 'upload',
      access_mode: 'public',
      transformation: [],
      filename_override: originalName,
      unique_filename: false,
      overwrite: true,
      context: {
        original_filename: originalName,
        uploaded_at: new Date().toISOString(),
        document_type: docType,
        estado
      }
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
        document_type: docType,
        estado,
        view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(result.secure_url)}&embedded=true`,
        download_url: result.secure_url.replace('/upload/', '/upload/fl_attachment/'),
        uploaded_at: result.created_at,
        size: result.bytes
      }
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/delete', authenticate, async (req, res, next) => {
  try {
    const { public_id, estado } = req.body;

    if (!public_id) throw new Error('public_id es requerido');
    if (estado && !public_id.startsWith(`${estado}/`)) {
      return res.status(403).json({
        status: 'error',
        error: 'forbidden',
        message: 'No estás autorizado para eliminar este archivo'
      });
    }

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: 'raw'
    });

    if (result.result !== 'ok') {
      return res.status(404).json({
        status: 'error',
        error: 'not_found',
        message: 'Archivo no encontrado'
      });
    }

    res.json({
      status: 'success',
      message: 'Archivo eliminado',
      data: {
        public_id,
        deleted_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/archivos/:estado/:docType?', authenticate, async (req, res, next) => {
  try {
    const estado = req.params.estado || 'aguascalientes';
    const docType = req.params.docType;

    const folderPath = docType ? `${estado}/${docType}` : estado;

    const result = await cloudinary.search
      .expression(`resource_type:raw AND folder:"${folderPath}"`)
      .sort_by('created_at', 'desc')
      .max_results(500)
      .execute();

    const archivos = result.resources.map(resource => ({
      url: resource.secure_url,
      public_id: resource.public_id,
      filename: resource.context?.custom?.original_filename || resource.public_id.split('/').pop() + '.pdf',
      document_type: docType || resource.public_id.split('/')[1] || 'general',
      estado: estado,
      view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(resource.secure_url)}&embedded=true`,
      download_url: resource.secure_url.replace('/upload/', '/upload/fl_attachment/'),
      uploaded_at: resource.created_at,
      size: resource.bytes,
      format: resource.format
    }));

    res.json({
      status: 'success',
      data: {
        archivos,
        count: archivos.length,
        estado,
        tipo_documento: docType || 'all'
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/tipos-documento', authenticate, (req, res) => {
  res.json({
    status: 'success',
    data: {
      tipos_documento: DOCUMENT_TYPES
    }
  });
});

app.use('/api', apiLimiter, router);

app.get('/', (req, res) => {
  res.json({
    status: 'success',
    version: '1.1.0',
    endpoints: [
      { method: 'POST', path: '/api/upload/:docType', desc: 'Subir PDF por tipo', auth: 'x-api-key' },
      { method: 'GET', path: '/api/archivos/:estado', desc: 'Listar todos los PDFs de un estado', auth: 'x-api-key' },
      { method: 'GET', path: '/api/archivos/:estado/:docType', desc: 'Listar PDFs filtrados por tipo', auth: 'x-api-key' },
      { method: 'GET', path: '/api/tipos-documento', desc: 'Obtener tipos de documentos disponibles', auth: 'x-api-key' },
      { method: 'DELETE', path: '/api/delete', desc: 'Eliminar PDF', auth: 'x-api-key' },
      { method: 'GET', path: '/api/health', desc: 'Estado del servicio' }
    ],
    note: 'Todos los endpoints (excepto /health) requieren el header x-api-key'
  });
});

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error: 'not_found',
    message: 'Ruta no encontrada',
    suggested_routes: [
      '/api/upload/[type]',
      '/api/archivos/[state]',
      '/api/archivos/[state]/[type]',
      '/api/tipos-documento',
      '/api/delete',
      '/api/health'
    ]
  });
});

app.use(handleError);

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
  console.log(`🔒 Modo seguro: ${process.env.NODE_ENV === 'production' ? 'ACTIVADO' : 'DESACTIVADO'}`);
  console.log(`🌍 Cloudinary configurado para: ${process.env.CLOUD_NAME}`);
  console.log(`📄 Tipos de documentos soportados: ${Object.values(DOCUMENT_TYPES).join(', ')}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('🛑 Servidor detenido');
  });
});

module.exports = app;