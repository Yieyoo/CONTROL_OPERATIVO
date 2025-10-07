// server.js - VERSIÓN COMPLETA CON AUTENTICACIÓN Y PERMISOS DIFERENCIADOS
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
const session = require('express-session');
const bcrypt = require('bcryptjs');
const pipeline = promisify(stream.pipeline);
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== CONFIGURACIÓN DE SEGURIDAD ====================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'res.cloudinary.com'],
      connectSrc: ["'self'", 'https://api.cloudinary.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"]
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
  }
}));

app.use(morgan('combined', {
  skip: (req, res) => req.path === '/api/health' || req.path === '/favicon.ico',
  stream: process.env.NODE_ENV === 'production' 
    ? fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' }) 
    : process.stdout
}));

app.set('trust proxy', 1);

// ==================== CONFIGURACIÓN DE SESIONES ====================
app.use(session({
  name: 'control_operativo_sid',
  secret: process.env.SESSION_SECRET || 'clave-super-secreta-control-operativo-inm-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: 'lax'
  },
  rolling: true
}));

// ==================== USUARIOS AUTORIZADOS ====================
const authorizedUsers = [
  {
    id: 1,
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    name: 'Administrador Principal',
    role: 'admin',
    email: 'admin@inm.gob.mx',
    permissions: ['upload', 'delete', 'view', 'manage_users', 'system_config', 'access_files']
  },
  {
    id: 2,
    username: 'diego',
    password: bcrypt.hashSync('diego123', 10),
    name: 'Diego Jiménez',
    role: 'user',
    email: 'diegojimher@yahoo.com.mx',
    permissions: ['upload', 'delete', 'view', 'access_files']
  },
  {
    id: 3,
    username: 'coordinador',
    password: bcrypt.hashSync('coord123', 10),
    name: 'Coordinador Regional',
    role: 'coordinator',
    email: 'coordinacion@inm.gob.mx',
    permissions: ['view'] // SOLO puede ver páginas normales, NO archivos
  },
  {
    id: 4,
    username: 'visor',
    password: bcrypt.hashSync('visor123', 10),
    name: 'Usuario Visor',
    role: 'viewer',
    email: 'visor@inm.gob.mx',
    permissions: ['view'] // SOLO puede ver páginas normales
  }
];

// ==================== MIDDLEWARES DE AUTENTICACIÓN ====================
const requireAuth = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ 
      status: 'error',
      error: 'unauthorized',
      message: 'Debe iniciar sesión para acceder a este recurso',
      code: 'SESSION_REQUIRED',
      redirect: '/login'
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ 
      status: 'error',
      error: 'forbidden', 
      message: 'Se requieren privilegios de administrador',
      code: 'ADMIN_REQUIRED'
    });
  }
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (req.session.user && req.session.user.permissions.includes(permission)) {
      next();
    } else {
      res.status(403).json({ 
        status: 'error',
        error: 'forbidden',
        message: `Permiso requerido: ${permission}`,
        code: 'PERMISSION_DENIED'
      });
    }
  };
};

// ==================== VERIFICACIÓN DE ACCESO A ARCHIVOS ====================
const canAccessFiles = (user) => {
  // Solo estos usuarios pueden acceder al gestor de archivos
  const allowedUsers = ['admin', 'diego'];
  return allowedUsers.includes(user.username);
};

const requireFileAccess = (req, res, next) => {
  if (req.session.user && canAccessFiles(req.session.user)) {
    next();
  } else {
    res.status(403).json({ 
      status: 'error',
      error: 'forbidden',
      message: 'No tienes permisos para acceder al gestor de archivos',
      code: 'FILE_ACCESS_DENIED',
      user: req.session.user?.username
    });
  }
};

// ==================== CONFIGURACIÓN CORS ====================
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
    version: '2.0.0',
    features: ['file_management', 'authentication', 'session_management'],
    requires_auth: true
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

// ==================== CONFIGURACIÓN CLOUDINARY ====================
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
      secure_distribution: null,
      cdn_subdomain: true,
      shorten: true,
      sign_url: true,
      api_proxy: process.env.PROXY_URL
    });
    console.log('✅ Cloudinary configurado correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error configurando Cloudinary:', error);
    process.exit(1);
  }
};

validateCloudinaryConfig();

// ==================== RATE LIMITING ====================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip;
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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    status: 'error',
    error: 'auth_rate_limit',
    message: 'Demasiados intentos de login, intente más tarde'
  }
});

// ==================== CONFIGURACIÓN MULTER ====================
const memoryStorage = multer.memoryStorage();
const pdfUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 15 * 1024 * 1024,
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

// ==================== COMPRESIÓN ====================
const shouldCompress = (req, res) => {
  if (req.headers['x-no-compression']) return false;
  return /json|text|javascript|pdf/.test(res.getHeader('Content-Type'));
};

app.use(require('compression')({
  level: zlib.constants.Z_BEST_COMPRESSION,
  threshold: 1024,
  filter: shouldCompress
}));

// ==================== MIDDLEWARE DE API KEY (PARA COMPATIBILIDAD) ====================
const authenticateAPI = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  // Si hay sesión de usuario, permitir acceso
  if (req.session.user) {
    return next();
  }
  
  // Si no hay sesión pero hay API key válida, permitir acceso
  if (apiKey && apiKey === process.env.API_KEY) {
    return next();
  }

  // Si no hay ninguna autenticación
  if (!apiKey) {
    return res.status(401).json({
      status: 'error',
      error: 'unauthorized',
      message: 'Se requiere autenticación (sesión o API Key)',
      code: 'AUTH_REQUIRED',
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }

  // API Key inválida
  console.warn(`Intento de acceso con API Key inválida desde IP: ${req.ip}`);
  return res.status(401).json({
    status: 'error',
    error: 'unauthorized',
    message: 'API Key inválida',
    code: 'INVALID_API_KEY',
    timestamp: new Date().toISOString()
  });
};

// ==================== MANEJO DE ERRORES ====================
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
    ip: req.ip,
    user: req.session.user?.username || 'anonymous'
  });

  res.status(statusCode).json({
    status: 'error',
    error: errorCode,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

// ==================== RUTAS API ====================
const router = express.Router();

// ==================== RUTAS DE AUTENTICACIÓN (PÚBLICAS) ====================

// Ruta de login
router.post('/auth/login', authLimiter, express.json(), async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      throw new AppError('Usuario y contraseña son requeridos', 400, 'missing_credentials');
    }
    
    const user = authorizedUsers.find(u => u.username === username);
    
    if (user && await bcrypt.compare(password, user.password)) {
      // No enviar la contraseña en la sesión
      const userSession = { ...user };
      delete userSession.password;
      
      req.session.user = userSession;
      
      console.log(`✅ Login exitoso: ${user.name} (${user.username}) desde IP: ${req.ip}`);
      
      res.json({ 
        status: 'success',
        message: `Bienvenido ${user.name}`,
        data: {
          user: userSession,
          session_id: req.sessionID,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          can_access_files: canAccessFiles(userSession)
        }
      });
    } else {
      console.warn(`❌ Intento de login fallido para usuario: ${username} desde IP: ${req.ip}`);
      throw new AppError('Usuario o contraseña incorrectos', 401, 'invalid_credentials');
    }
  } catch (error) {
    next(error);
  }
});

// Ruta de logout
router.post('/auth/logout', (req, res, next) => {
  try {
    const username = req.session.user?.username || 'unknown';
    
    req.session.destroy((err) => {
      if (err) {
        throw new AppError('Error al cerrar sesión', 500, 'logout_error');
      }
      
      console.log(`✅ Logout exitoso: ${username} desde IP: ${req.ip}`);
      
      res.json({ 
        status: 'success', 
        message: 'Sesión cerrada correctamente',
        data: {
          timestamp: new Date().toISOString()
        }
      });
    });
  } catch (error) {
    next(error);
  }
});

// Verificar autenticación
router.get('/auth/check', (req, res) => {
  const canAccess = req.session.user ? canAccessFiles(req.session.user) : false;
  
  res.json({ 
    status: 'success',
    data: {
      authenticated: !!req.session.user, 
      user: req.session.user || null,
      can_access_files: canAccess,
      session_id: req.sessionID,
      timestamp: new Date().toISOString()
    }
  });
});

// Verificar específicamente acceso a archivos
router.get('/auth/check-file-access', requireAuth, (req, res) => {
  const canAccess = canAccessFiles(req.session.user);
  
  res.json({
    status: 'success',
    data: {
      can_access_files: canAccess,
      user: req.session.user,
      message: canAccess ? 'Acceso permitido al gestor de archivos' : 'Acceso denegado al gestor de archivos'
    }
  });
});

// Cambiar contraseña
router.post('/auth/change-password', requireAuth, express.json(), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.user.id;
    
    if (!currentPassword || !newPassword) {
      throw new AppError('Contraseña actual y nueva contraseña son requeridas', 400, 'missing_passwords');
    }
    
    if (newPassword.length < 6) {
      throw new AppError('La nueva contraseña debe tener al menos 6 caracteres', 400, 'weak_password');
    }
    
    const user = authorizedUsers.find(u => u.id === userId);
    
    if (user && await bcrypt.compare(currentPassword, user.password)) {
      user.password = bcrypt.hashSync(newPassword, 10);
      
      console.log(`✅ Contraseña cambiada para usuario: ${user.username}`);
      
      res.json({ 
        status: 'success', 
        message: 'Contraseña actualizada correctamente',
        data: {
          username: user.username,
          updated_at: new Date().toISOString()
        }
      });
    } else {
      throw new AppError('Contraseña actual incorrecta', 400, 'invalid_current_password');
    }
  } catch (error) {
    next(error);
  }
});

// ==================== RUTAS DE ADMINISTRACIÓN ====================

// Listar usuarios (solo admin)
router.get('/admin/users', requireAdmin, (req, res) => {
  const usersSafe = authorizedUsers.map(user => {
    const { password, ...userSafe } = user;
    userSafe.can_access_files = canAccessFiles(user);
    return userSafe;
  });
  
  res.json({
    status: 'success',
    data: {
      users: usersSafe,
      total: usersSafe.length,
      timestamp: new Date().toISOString()
    }
  });
});

// Estadísticas del sistema (solo admin)
router.get('/admin/stats', requireAdmin, async (req, res, next) => {
  try {
    const recursos = await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'raw',
      max_results: 1
    });
    
    const usersWithFileAccess = authorizedUsers.filter(user => canAccessFiles(user));
    
    res.json({
      status: 'success',
      data: {
        total_users: authorizedUsers.length,
        users_with_file_access: usersWithFileAccess.length,
        total_files: recursos.total_count || 'N/A',
        active_sessions: 'N/A',
        system_status: 'Operativo',
        cloudinary_status: 'Conectado',
        server_uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// ==================== RUTAS DE ARCHIVOS (SOLO USUARIOS AUTORIZADOS) ====================

// Ruta de salud (accesible para todos los autenticados)
router.get('/health', requireAuth, async (req, res) => {
  const healthcheck = {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    authentication: 'authenticated',
    user: req.session.user.username,
    can_access_files: canAccessFiles(req.session.user),
    checks: {
      memoryUsage: process.memoryUsage(),
      cloudinary: 'active',
      session_store: 'active',
      diskSpace: 'n/a'
    }
  };

  try {
    await cloudinary.api.ping();
    res.json(healthcheck);
  } catch (error) {
    healthcheck.status = 'degraded';
    healthcheck.cloudinary = 'disconnected';
    healthcheck.error = error.message;
    res.status(503).json(healthcheck);
  }
});

// Función para subir archivos
const processUpload = async (file, estado, tipoDocumento, tituloDocumento = null, uploadedBy = 'system') => {
  if (!file) throw new AppError('No se ha subido ningún archivo', 400, 'missing_file');
  
  const originalName = path.parse(file.originalname).name.replace(/[^\w- ]/gi, '') + '.pdf';
  if (!/^[\w- ]+\.pdf$/i.test(originalName)) {
    throw new AppError('El nombre del archivo contiene caracteres no permitidos', 400, 'invalid_filename');
  }

  const uploadOptions = {
    resource_type: 'raw',
    folder: `${estado}/${tipoDocumento}`,
    format: 'pdf',
    type: 'upload',
    access_mode: 'public',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    filename_override: originalName,
    unique_filename: false,
    overwrite: true,
    context: {
      original_filename: originalName,
      uploaded_at: new Date().toISOString(),
      uploaded_by: uploadedBy,
      custom: {
        estado: estado,
        tipo_documento: tipoDocumento,
        uploaded_by: uploadedBy,
        ...(tituloDocumento && { titulo_documento: tituloDocumento })
      }
    },
    responsive_breakpoints: {
      create_derived: false,
      bytes_step: 20000,
      min_width: 200,
      max_width: 1000,
      transformation: { crop: 'limit' }
    }
  };

  try {
    return await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => error ? reject(error) : resolve(result)
      );
      
      pipeline(
        stream.Readable.from(file.buffer),
        uploadStream
      ).catch(reject);
    });
  } catch (error) {
    throw new AppError(`Error al subir a Cloudinary: ${error.message}`, 502, 'cloudinary_error');
  }
};

// ==================== RUTAS PROTEGIDAS DE ARCHIVOS (SOLO USUARIOS CON ACCESO) ====================

// Ruta para subir archivos
router.post('/upload', requireAuth, requireFileAccess, (req, res, next) => {
  pdfUpload(req, res, async (err) => {
    try {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          throw new AppError('El archivo excede el límite de 15MB', 413, 'file_too_large');
        }
        throw new AppError(err.message, 400, 'upload_error');
      }

      const estado = req.body.estado || 'aguascalientes';
      const tipoDocumento = req.body.tipo_documento || 'ficha_curricular';
      const tituloDocumento = req.body.titulo_documento || null;
      const uploadedBy = req.session.user.username;
      
      const result = await processUpload(req.file, estado, tipoDocumento, tituloDocumento, uploadedBy);

      console.log(`📁 Archivo subido por ${uploadedBy}: ${result.original_filename}`);

      res.status(201).json({
        status: 'success',
        message: 'Archivo subido correctamente',
        data: {
          url: result.secure_url,
          public_id: result.public_id,
          filename: result.original_filename,
          estado: estado,
          tipo_documento: tipoDocumento,
          view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(result.secure_url)}&embedded=true`,
          download_url: result.secure_url.replace('/upload/', '/upload/fl_attachment/'),
          uploaded_at: result.created_at,
          uploaded_by: uploadedBy,
          size: result.bytes,
          pages: result.pages,
          format: result.format,
          etag: result.etag,
          ...(tituloDocumento && { titulo_documento: tituloDocumento })
        }
      });
    } catch (error) {
      next(error);
    }
  });
});

// Ruta para eliminar archivos
router.delete('/delete', requireAuth, requireFileAccess, async (req, res, next) => {
  try {
    const { public_id, estado, tipo_documento } = req.body;
    const deletedBy = req.session.user.username;
    
    if (!public_id) {
      throw new AppError('public_id es requerido', 400, 'missing_public_id');
    }

    const expectedPrefix = `${estado}/${tipo_documento}/`;
    if (estado && tipo_documento && !public_id.startsWith(expectedPrefix)) {
      throw new AppError('No tienes permiso para eliminar este archivo', 403, 'forbidden');
    }

    try {
      await cloudinary.api.resource(public_id, { resource_type: 'raw' });
    } catch (error) {
      if (error.http_code === 404) {
        throw new AppError('Archivo no encontrado', 404, 'not_found');
      }
      throw error;
    }

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: 'raw',
      invalidate: true
    });

    if (result.result !== 'ok') {
      throw new AppError('Error al eliminar el archivo', 500, 'delete_failed');
    }

    console.log(`🗑️ Archivo eliminado por ${deletedBy}: ${public_id}`);

    res.json({
      status: 'success',
      message: 'Archivo eliminado correctamente',
      data: {
        public_id: public_id,
        estado: estado,
        tipo_documento: tipo_documento,
        deleted_by: deletedBy,
        deleted_at: new Date().toISOString(),
        deletion_result: result
      }
    });
  } catch (error) {
    next(error);
  }
});

// Ruta para listar archivos con cache busting
router.get('/archivos/:estado/:tipoDocumento', requireAuth, requireFileAccess, async (req, res, next) => {
  try {
    const estado = req.params.estado || 'aguascalientes';
    const tipoDocumento = req.params.tipoDocumento || 'ficha_curricular';

    // Agregar timestamp para evitar caché
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: `${estado}/${tipoDocumento}/`,
      resource_type: 'raw',
      max_results: 500,
      context: true,
      tags: true,
      moderations: true,
      timestamp: Date.now() // Cache busting
    });

    const archivos = result.resources.map(resource => {
      const originalName = resource.context?.custom?.original_filename || 
                         path.parse(resource.public_id).name + '.pdf';
      return {
        url: `${resource.secure_url}?_=${Date.now()}`, // Cache busting
        public_id: resource.public_id,
        filename: originalName,
        estado: estado,
        tipo_documento: tipoDocumento,
        view_url: `https://docs.google.com/viewer?url=${encodeURIComponent(resource.secure_url)}&embedded=true&_=${Date.now()}`,
        download_url: `${resource.secure_url.replace('/upload/', '/upload/fl_attachment/')}?_=${Date.now()}`,
        uploaded_at: resource.created_at,
        uploaded_by: resource.context?.custom?.uploaded_by || 'system',
        size: resource.bytes,
        format: resource.format,
        width: resource.width,
        height: resource.height,
        etag: resource.etag,
        tags: resource.tags,
        moderation: resource.moderation,
        ...(resource.context?.custom?.titulo_documento && { 
          titulo_documento: resource.context.custom.titulo_documento 
        })
      };
    });

    res.json({
      status: 'success',
      data: archivos,
      count: archivos.length,
      estado: estado,
      tipo_documento: tipoDocumento,
      requested_by: req.session.user.username,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// ==================== RUTAS PARA TÍTULO GLOBAL ====================

// Variable para almacenar el título global
let tituloGlobal = process.env.TITULO_GLOBAL_INICIAL || 'Plantilla de Personal - INM';

// Ruta para guardar título global
router.post('/guardar-titulo-global', requireAuth, requireFileAccess, async (req, res, next) => {
  try {
    const { titulo } = req.body;
    const updatedBy = req.session.user.username;
    
    if (!titulo || typeof titulo !== 'string') {
      throw new AppError('Título válido es requerido', 400, 'missing_titulo');
    }

    // Actualizar en memoria
    tituloGlobal = titulo;

    // También puedes guardar en Cloudinary como metadata si lo prefieres
    try {
      const recursos = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'raw',
        max_results: 500,
        context: true
      });

      const plantillas = recursos.resources.filter(
        res => res.public_id.includes('/plantilla_personal/')
      );

      // Actualizar metadata en cada archivo encontrado
      await Promise.all(plantillas.map(async (resource) => {
        const originalName = resource.context?.custom?.original_filename || 'plantilla.pdf';
        await cloudinary.uploader.explicit(resource.public_id, {
          type: 'upload',
          resource_type: 'raw',
          context: `titulo_documento=${titulo}|original_filename=${originalName}|updated_by=${updatedBy}`
        });
      }));
    } catch (cloudinaryError) {
      console.warn('No se pudo actualizar metadata en Cloudinary:', cloudinaryError.message);
    }

    console.log(`📝 Título global actualizado por ${updatedBy}: ${titulo}`);

    res.json({
      status: 'success',
      message: 'Título global guardado correctamente',
      data: {
        titulo: titulo,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Ruta para obtener título global
router.get('/obtener-titulo-global', requireAuth, requireFileAccess, async (req, res, next) => {
  try {
    // Primero intenta obtener de Cloudinary (metadata del primer archivo de plantilla encontrado)
    try {
      const recursos = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'raw',
        max_results: 1,
        context: true,
        timestamp: Date.now() // Cache busting
      });

      if (recursos.resources.length > 0 && recursos.resources[0].context?.custom?.titulo_documento) {
        tituloGlobal = recursos.resources[0].context.custom.titulo_documento;
      }
    } catch (cloudinaryError) {
      console.warn('Error al buscar en Cloudinary:', cloudinaryError.message);
    }

    res.json({
      status: 'success',
      data: {
        titulo: tituloGlobal,
        source: 'memory',
        requested_by: req.session.user.username,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Ruta de ping para Render
router.get('/render-ping', (req, res) => {
  const clientIP = req.headers['x-forwarded-for'] || req.ip;
  const user = req.session.user?.username || 'anonymous';
  const canAccess = req.session.user ? canAccessFiles(req.session.user) : false;
  
  console.log(`📡 Ping recibido desde IP: ${clientIP} - Usuario: ${user} - ${new Date().toLocaleString()}`);
  
  res.status(200).json({
    status: "active",
    timestamp: new Date().toISOString(),
    clientIP: clientIP,
    user: user,
    can_access_files: canAccess,
    uptime: process.uptime(),
    authenticated: !!req.session.user
  });
});

// ==================== CONFIGURACIÓN FINAL ====================

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
  console.log(`🚀 Servidor de Control Operativo INM ejecutándose en puerto ${PORT}`);
  console.log(`🌍 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Sistema de autenticación activado`);
  console.log(`👥 Usuarios configurados: ${authorizedUsers.length}`);
  console.log(`📁 Usuarios con acceso a archivos: ${authorizedUsers.filter(u => canAccessFiles(u)).length}`);
  console.log(`✅ CORS configurado para: ${allowedOrigins.length} orígenes`);
});

// Manejo de cierre
const shutdown = async (signal) => {
  console.log(`🛑 Recibido ${signal}, cerrando servidor...`);
  try {
    await new Promise((resolve) => server.close(resolve));
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error al cerrar el servidor:', err);
    process.exit(1);
  }
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