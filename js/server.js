// server.js - VERSIÓN SIN CLOUDINARY - ALMACENAMIENTO LOCAL
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const zlib = require('zlib');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ================================================
// CONFIGURACIÓN DE ALMACENAMIENTO LOCAL
// ================================================

// Directorio principal para documentos
const DOCS_DIR = path.join(__dirname, 'documentos');

// Crear estructura de carpetas para estados y tipos de documentos
const crearEstructuraDirectorios = () => {
    const estados = ['aguascalientes', 'baja-california', 'cdmx', 'chihuahua', 'jalisco', 'nuevo-leon', 'sonora', 'veracruz', 'yucatan'];
    const tipos = ['ficha_curricular', 'plantilla_personal', 'contrato', 'informe', 'oficio', 'solicitud'];
    
    estados.forEach(estado => {
        tipos.forEach(tipo => {
            const dirPath = path.join(DOCS_DIR, estado, tipo);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        });
    });
    
    console.log('📁 Estructura de directorios creada en:', DOCS_DIR);
};

crearEstructuraDirectorios();

// Archivo para título global
const TITULO_GLOBAL_FILE = path.join(DOCS_DIR, 'titulo_global.json');
if (!fs.existsSync(TITULO_GLOBAL_FILE)) {
    fs.writeFileSync(TITULO_GLOBAL_FILE, JSON.stringify({ 
        titulo: process.env.TITULO_GLOBAL_INICIAL || 'Plantilla de Personal - INM' 
    }));
}

// Middleware para medir tiempo de respuesta
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.log(`🐌 Respuesta lenta: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  next();
});

// Configuración de seguridad (sin Cloudinary)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdnjs.cloudflare.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'https://control-operativo-1.onrender.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com', 'cdnjs.cloudflare.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", 'https://docs.google.com']
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
    policy: 'same-origin'
  },
  crossOriginEmbedderPolicy: false
}));

// Configuración de logs mejorada
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  skip: (req, res) => {
    return req.path === '/api/health' || 
           req.path === '/favicon.ico' ||
           req.path === '/api/render-ping';
  },
  stream: process.env.NODE_ENV === 'production' 
    ? fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' }) 
    : process.stdout
}));

app.set('trust proxy', 1);

// Configuración CORS
const allowedOrigins = [
  'https://yieyoo.github.io',
  'https://yieyoo.github.io/CONTROL_OPERATIVO/',
  'http://localhost:3000',
  'http://localhost',
  'https://control-operativo-1.onrender.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin) || 
        (process.env.NODE_ENV === 'development' && !origin)) {
      callback(null, true);
    } else {
      console.log('Origen bloqueado:', origin);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400
};

// Middleware para deshabilitar caché globalmente
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

app.get('/', cors({ origin: '*' }), (req, res) => {
  res.json({
    status: 'success',
    message: 'API de Gestión de Archivos PDF - INM',
    version: '2.0.0-sin-cloudinary'
  });
});

app.use('/api', cors(corsOptions));
app.options('*', cors(corsOptions));

// Middlewares para parsear el cuerpo de las peticiones
app.use(express.json({
  limit: '10mb',
  inflate: true,
  strict: true,
  type: 'application/json'
}));

app.use(express.urlencoded({
  extended: true,
  limit: '10mb',
  parameterLimit: 1000,
  inflate: true
}));

// Mejorar la compresión GZIP
app.use(compression({
  level: zlib.constants.Z_BEST_COMPRESSION,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Servir documentos estáticamente
app.use('/documentos', express.static(DOCS_DIR));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 9999 : 99999,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return true;
  },
  keyGenerator: (req) => {
    return req.headers['x-real-ip'] || 
           req.headers['x-forwarded-for']?.split(',')[0] || 
           req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      error: 'rate_limit_exceeded',
      message: 'Demasiadas peticiones desde esta IP, por favor intente más tarde',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// Configuración de Multer para guardar DIRECTAMENTE en la carpeta final
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const estado = req.body.estado || 'aguascalientes';
    const tipoDocumento = req.body.tipo_documento || 'ficha_curricular';
    const uploadPath = path.join(DOCS_DIR, estado, tipoDocumento);
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^\w.-]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  }
});

const pdfUpload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 1,
    fields: 5
  },
  fileFilter: (req, file, cb) => {
    const validMimeTypes = ['application/pdf', 'application/x-pdf'];
    const validExtensions = ['.pdf'];
    
    if (validMimeTypes.includes(file.mimetype)) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (validExtensions.includes(ext)) {
        return cb(null, true);
      }
    }
    cb(new Error('Solo se permiten archivos PDF (extensión .pdf)'), false);
  }
}).single('file');

// Middleware de autenticación
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      status: 'error',
      error: 'unauthorized',
      message: 'API Key no proporcionada',
      code: 'MISSING_API_KEY',
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }

  if (apiKey !== process.env.API_KEY) {
    console.warn(`Intento de acceso con API Key inválida desde IP: ${req.ip}`);
    return res.status(401).json({
      status: 'error',
      error: 'unauthorized',
      message: 'API Key inválida',
      code: 'INVALID_API_KEY',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Manejo de errores
class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode || 500;
    this.errorCode = errorCode || 'server_error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const handleError = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const errorCode = error.errorCode || 'server_error';
  
  console.error(`🔴 [${new Date().toISOString()}] Error ${statusCode}:`, {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(statusCode).json({
    status: 'error',
    error: errorCode,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

// Rutas API
const router = express.Router();

// ================================================
// FUNCIONES DE UTILERÍA PARA DOCUMENTOS LOCALES
// ================================================

// Obtener todos los documentos de una carpeta
const getDocumentosFromFolder = (estado, tipoDocumento, req) => {
  const folderPath = path.join(DOCS_DIR, estado, tipoDocumento);
  
  if (!fs.existsSync(folderPath)) {
    return [];
  }
  
  const files = fs.readdirSync(folderPath);
  const documentos = [];
  
  files.forEach(file => {
    if (file === 'metadata.json') return; // Saltar archivo de metadata
    
    const filePath = path.join(folderPath, file);
    const stats = fs.statSync(filePath);
    
    // Extraer timestamp y nombre original
    const match = file.match(/^(\d+)-(.*)$/);
    const nombreOriginal = match ? match[2] : file;
    const timestamp = match ? parseInt(match[1]) : stats.mtime.getTime();
    
    const fileUrl = `/documentos/${estado}/${tipoDocumento}/${file}`;
    const fullUrl = `${req.protocol}://${req.get('host')}${fileUrl}`;
    
    documentos.push({
      url: `${fileUrl}?_=${timestamp}`,
      public_id: `${estado}/${tipoDocumento}/${file}`,
      filename: nombreOriginal,
      estado: estado,
      tipo_documento: tipoDocumento,
      view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(fullUrl)}&embedded=true&_=${timestamp}`,
      download_url: `${fileUrl}?_=${timestamp}`,
      uploaded_at: stats.mtime.toISOString(),
      size: stats.size,
      format: 'pdf',
      etag: stats.ino.toString()
    });
  });
  
  // Ordenar por fecha descendente
  return documentos.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
};

// Eliminar documento
const deleteDocumento = (publicId) => {
  const filePath = path.join(DOCS_DIR, publicId);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return { result: 'ok' };
  }
  
  throw new Error('Archivo no encontrado');
};

// Funciones para título global
const getTituloGlobal = () => {
  try {
    const data = fs.readFileSync(TITULO_GLOBAL_FILE, 'utf8');
    return JSON.parse(data).titulo;
  } catch (error) {
    return 'Plantilla de Personal - INM';
  }
};

const setTituloGlobal = (titulo) => {
  fs.writeFileSync(TITULO_GLOBAL_FILE, JSON.stringify({ titulo }));
};

// ================================================
// RUTAS DE LA API
// ================================================

// Ruta de salud
router.get('/health', async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '2.0.0-sin-cloudinary',
    checks: {
      memoryUsage: process.memoryUsage(),
      storage: 'local',
      documents_path: DOCS_DIR,
      diskSpace: {
        free: 'n/a',
        total: 'n/a'
      }
    }
  };

  // Verificar que la carpeta de documentos existe
  const docsExists = fs.existsSync(DOCS_DIR);
  
  res.json({
    ...healthcheck,
    status: docsExists ? 'healthy' : 'degraded',
    documents_available: docsExists
  });
});

// Ruta para subir archivos
router.post('/upload', authenticate, (req, res, next) => {
  pdfUpload(req, res, async (err) => {
    try {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          throw new AppError('El archivo excede el límite de 20MB', 413, 'file_too_large');
        }
        throw new AppError(err.message, 400, 'upload_error');
      }

      if (!req.file) {
        throw new AppError('No se ha subido ningún archivo', 400, 'missing_file');
      }

      const estado = req.body.estado || 'aguascalientes';
      const tipoDocumento = req.body.tipo_documento || 'ficha_curricular';
      const tituloDocumento = req.body.titulo_documento || null;
      
      console.log(`📤 Documento guardado: ${req.file.filename} en ${estado}/${tipoDocumento}`);
      
      // Guardar metadata adicional
      const metadataPath = path.join(DOCS_DIR, estado, tipoDocumento, 'metadata.json');
      let metadata = {};
      
      if (fs.existsSync(metadataPath)) {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      }
      
      metadata[req.file.filename] = {
        titulo: tituloDocumento,
        original_name: req.file.originalname,
        uploaded_at: new Date().toISOString(),
        size: req.file.size,
        estado: estado,
        tipo_documento: tipoDocumento
      };
      
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      
      const fileUrl = `/documentos/${estado}/${tipoDocumento}/${req.file.filename}`;
      const fullUrl = `${req.protocol}://${req.get('host')}${fileUrl}`;

      res.status(201).json({
        status: 'success',
        data: {
          url: fileUrl,
          public_id: `${estado}/${tipoDocumento}/${req.file.filename}`,
          filename: req.file.originalname,
          estado: estado,
          tipo_documento: tipoDocumento,
          view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(fullUrl)}&embedded=true`,
          download_url: fileUrl,
          uploaded_at: new Date().toISOString(),
          size: req.file.size,
          format: 'pdf',
          ...(tituloDocumento && { titulo_documento: tituloDocumento })
        }
      });
      
    } catch (error) {
      next(error);
    }
  });
});

// Ruta para eliminar archivos
router.delete('/delete', authenticate, async (req, res, next) => {
  try {
    const { public_id, estado, tipo_documento } = req.body;
    
    if (!public_id) {
      throw new AppError('public_id es requerido', 400, 'missing_public_id');
    }

    const expectedPrefix = `${estado}/${tipo_documento}/`;
    if (estado && tipo_documento && !public_id.startsWith(expectedPrefix)) {
      throw new AppError('No tienes permiso para eliminar este archivo', 403, 'forbidden');
    }

    const result = deleteDocumento(public_id);
    
    // También eliminar de metadata
    const metadataPath = path.join(DOCS_DIR, estado, tipo_documento, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      let metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      const filename = public_id.split('/').pop();
      delete metadata[filename];
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }

    res.json({
      status: 'success',
      message: 'Archivo eliminado',
      data: {
        public_id: public_id,
        estado: estado,
        tipo_documento: tipo_documento,
        deleted_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    next(error);
  }
});

// Ruta para listar archivos
router.get('/archivos/:estado/:tipoDocumento', authenticate, async (req, res, next) => {
  try {
    let estado = decodeURIComponent(req.params.estado || 'aguascalientes');
    let tipoDocumento = decodeURIComponent(req.params.tipoDocumento || 'ficha_curricular');
    
    // Normalizar caracteres
    estado = estado.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, '-');
    tipoDocumento = tipoDocumento.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, '_');
    
    console.log(`📁 Buscando archivos para: ${estado}/${tipoDocumento}`);
    
    const documentos = getDocumentosFromFolder(estado, tipoDocumento, req);
    
    // Agregar título global si es plantilla_personal
    if (tipoDocumento === 'plantilla_personal') {
      const tituloGlobal = getTituloGlobal();
      documentos.forEach(doc => {
        doc.titulo_documento = tituloGlobal;
      });
    }
    
    res.json({
      status: 'success',
      data: documentos,
      count: documentos.length,
      estado: estado,
      tipo_documento: tipoDocumento,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en /api/archivos:', error);
    next(error);
  }
});

// Ruta para guardar título global
router.post('/guardar-titulo-global', authenticate, async (req, res, next) => {
  try {
    const { titulo } = req.body;
    
    if (!titulo || typeof titulo !== 'string') {
      throw new AppError('Título válido es requerido', 400, 'missing_titulo');
    }

    setTituloGlobal(titulo);
    
    // Opcional: actualizar metadata de todos los archivos de plantilla_personal
    const estados = fs.readdirSync(DOCS_DIR);
    estados.forEach(estado => {
      const plantillaPath = path.join(DOCS_DIR, estado, 'plantilla_personal');
      if (fs.existsSync(plantillaPath)) {
        const metadataPath = path.join(plantillaPath, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
          let metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          let modified = false;
          
          Object.keys(metadata).forEach(filename => {
            if (metadata[filename].titulo !== titulo) {
              metadata[filename].titulo = titulo;
              modified = true;
            }
          });
          
          if (modified) {
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
          }
        }
      }
    });

    res.json({
      status: 'success',
      message: 'Título global guardado correctamente',
      data: {
        titulo: titulo,
        updated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    next(error);
  }
});

// Ruta para obtener título global
router.get('/obtener-titulo-global', authenticate, async (req, res, next) => {
  try {
    const titulo = getTituloGlobal();
    
    res.json({
      status: 'success',
      titulo: titulo,
      source: 'local_file',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    next(error);
  }
});

// Ruta de diagnóstico
router.get('/debug-params/:estado/:tipoDocumento', (req, res) => {
  const estado = req.params.estado;
  const tipoDocumento = req.params.tipoDocumento;
  
  console.log('🔍 Parámetros recibidos:', { estado, tipoDocumento });
  
  res.json({
    estado_recibido: estado,
    tipoDocumento_recibido: tipoDocumento,
    normalized: {
      estado: estado.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, '-'),
      tipoDocumento: tipoDocumento.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, '_')
    },
    timestamp: new Date().toISOString()
  });
});

router.get('/render-ping', (req, res) => {
  const clientIP = req.headers['x-forwarded-for'] || req.ip;
  console.log(`📡 Ping recibido desde IP: ${clientIP} - ${new Date().toLocaleString()}`);
  
  res.status(200).json({
    status: "active",
    timestamp: new Date().toISOString(),
    clientIP: clientIP,
    uptime: process.uptime(),
    storage: "local"
  });
});

// Montar rutas
app.use('/api', apiLimiter, router);

// Manejo de rutas no encontradas
app.use((req, res, next) => {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.path}`, 404, 'not_found'));
});

// Middleware de errores
app.use(handleError);

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
  console.log(`🌍 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Directorio de documentos: ${DOCS_DIR}`);
  console.log(`✅ CORS configurado para los siguientes orígenes:`, allowedOrigins);
  console.log(`⚡ SIN CLOUDINARY - Almacenamiento local activo`);
});

// Manejo de cierre
const shutdown = async (signal) => {
  console.log(`🛑 Recibido ${signal}, cerrando servidor...`);
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error al cerrar servidor:', err);
      process.exit(1);
    }
    
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
  
  setTimeout(() => {
    console.log('⚠️ Shutdown forzado después de timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  console.error('⚠️ Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err);
  shutdown('uncaughtException');
});

module.exports = { app, server };