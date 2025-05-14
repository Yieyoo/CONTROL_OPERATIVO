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
// 1. Security Configuration
// ======================
app.use(helmet());
app.use(morgan('dev'));
app.set('trust proxy', true);

// ======================
// 2. Rate Limiting
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
// 3. CORS Configuration
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
      console.warn('Attempted access from unauthorized origin:', origin);
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
// 4. Body Parsing Middleware
// ======================
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ======================
// 5. Cloudinary Configuration
// ======================
const validateCloudinaryConfig = () => {
  const requiredVars = ['CLOUD_NAME', 'CLOUD_API_KEY', 'CLOUD_API_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
  }

  try {
    cloudinary.config({
      cloud_name: process.env.CLOUD_NAME,
      api_key: process.env.CLOUD_API_KEY,
      api_secret: process.env.CLOUD_API_SECRET,
      secure: true
    });
    console.log('✅ Cloudinary configured successfully');
  } catch (error) {
    console.error('❌ Error configuring Cloudinary:', error);
    process.exit(1);
  }
};

validateCloudinaryConfig();

// ======================
// 6. Authentication Middleware
// ======================
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      status: 'error',
      error: 'unauthorized',
      message: 'API Key not provided'
    });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      status: 'error',
      error: 'unauthorized',
      message: 'Invalid API Key'
    });
  }

  next();
};

// ======================
// 7. Multer Configuration for PDFs
// ======================
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// ======================
// 8. Document Types Definition
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
// 9. Document Type Validation Middleware
// ======================
const validateDocumentType = (req, res, next) => {
  const docType = req.params.docType?.toLowerCase();
  
  if (!docType || !Object.values(DOCUMENT_TYPES).includes(docType)) {
    return res.status(400).json({
      error: 'invalid_document_type',
      message: 'Invalid document type',
      valid_types: Object.values(DOCUMENT_TYPES)
    });
  }
  
  req.docType = docType;
  next();
};

// ======================
// 10. Error Handling Middleware
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
// 11. API Routes
// ======================
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.1.0',
    services: {
      cloudinary: 'active'
    },
    document_types: DOCUMENT_TYPES
  });
});

// Upload file endpoint
router.post('/upload/:docType', authenticate, validateDocumentType, pdfUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const estado = req.body.estado || 'aguascalientes';
    const { docType } = req;
    const originalName = req.file.originalname.replace(/[^\w\-\. ]/gi, '');

    // Validate filename
    if (!/^[\w\-\. ]+\.pdf$/i.test(originalName)) {
      throw new Error('Filename contains invalid characters');
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
        estado: estado
      }
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
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        filename: originalName,
        document_type: docType,
        estado: estado,
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

// Delete file endpoint
router.delete('/delete', authenticate, async (req, res, next) => {
  try {
    const { public_id, estado } = req.body;

    if (!public_id) {
      throw new Error('public_id is required');
    }

    // Verify file belongs to the correct state
    if (estado && !public_id.startsWith(`${estado}/`)) {
      return res.status(403).json({
        status: 'error',
        error: 'forbidden',
        message: 'You are not authorized to delete this file'
      });
    }

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: 'raw'
    });

    if (result.result !== 'ok') {
      return res.status(404).json({
        status: 'error',
        error: 'not_found',
        message: 'File not found'
      });
    }

    res.json({
      status: 'success',
      message: 'File deleted',
      data: {
        public_id: public_id,
        deleted_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// List files endpoint
router.get('/archivos/:estado/:docType?', authenticate, async (req, res, next) => {
  try {
    const estado = req.params.estado || 'aguascalientes';
    const docType = req.params.docType;
    
    // Build search prefix
    const prefix = docType ? `${estado}/${docType}` : `${estado}`;

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: prefix,
      resource_type: 'raw',
      max_results: 500,
      context: true
    });

    const archivos = result.resources.map(resource => {
      const originalName = resource.context?.original_filename || 
                         resource.public_id.split('/').pop() + '.pdf';
      const documentType = resource.public_id.split('/')[1] || 'general';
      
      return {
        url: resource.secure_url,
        public_id: resource.public_id,
        filename: originalName,
        document_type: documentType,
        estado: estado,
        view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(resource.secure_url)}&embedded=true`,
        download_url: resource.secure_url.replace('/upload/', '/upload/fl_attachment/'),
        uploaded_at: resource.created_at,
        size: resource.bytes,
        format: resource.format
      };
    });

    res.json({
      status: 'success',
      data: {
        archivos: archivos,
        count: archivos.length,
        estado: estado,
        tipo_documento: docType || 'all'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get document types endpoint
router.get('/tipos-documento', authenticate, (req, res) => {
  res.json({
    status: 'success',
    data: {
      tipos_documento: DOCUMENT_TYPES
    }
  });
});

// Mount routes
app.use('/api', apiLimiter, router);

// Basic documentation
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    version: '1.1.0',
    endpoints: [
      { method: 'POST', path: '/api/upload/:docType', desc: 'Upload PDF by type', auth: 'x-api-key' },
      { method: 'GET', path: '/api/archivos/:estado', desc: 'List all PDFs for a state', auth: 'x-api-key' },
      { method: 'GET', path: '/api/archivos/:estado/:docType', desc: 'List PDFs filtered by type', auth: 'x-api-key' },
      { method: 'GET', path: '/api/tipos-documento', desc: 'Get available document types', auth: 'x-api-key' },
      { method: 'DELETE', path: '/api/delete', desc: 'Delete PDF', auth: 'x-api-key' },
      { method: 'GET', path: '/api/health', desc: 'Service status' }
    ],
    note: 'All endpoints (except /health) require x-api-key header'
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error: 'not_found',
    message: 'Route not found',
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

// Error handler
app.use(handleError);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔒 Secure mode: ${process.env.NODE_ENV === 'production' ? 'ON' : 'OFF'}`);
  console.log(`🌍 Cloudinary configured for: ${process.env.CLOUD_NAME}`);
  console.log(`📄 Supported document types: ${Object.values(DOCUMENT_TYPES).join(', ')}`);
});

// Handle shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('🛑 Server stopped');
  });
});

module.exports = app;