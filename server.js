// server.js - VERSIÓN SIMPLIFICADA CON 1 USUARIO ADMIN
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const stream = require('stream');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const pipeline = promisify(stream.pipeline);
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== CONFIGURACIÓN BÁSICA ====================
app.set('trust proxy', 1);

// ==================== CONFIGURACIÓN DE SESIONES ====================
app.use(session({
  name: 'control_operativo_sid',
  secret: process.env.SESSION_SECRET || 'clave-super-secreta-control-operativo-inm-2024',
  resave: true,
  saveUninitialized: false,
  cookie: { 
    secure: true, // Siempre true en Render (HTTPS)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: 'none' // Importante para cross-origin
  },
  rolling: true
}));

// ==================== USUARIOS AUTORIZADOS ====================
const authorizedUsers = [
  {
    id: 1,
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    name: 'Administrador INM',
    role: 'admin'
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
      message: 'Debe iniciar sesión para acceder a este recurso'
    });
  }
};

// ==================== CONFIGURACIÓN CORS ====================
const corsOptions = {
  origin: [
    'https://yieyoo.github.io',
    'https://yieyoo.github.io/CONTROL_OPERATIVO/',
    'http://localhost:3000',
    'http://localhost',
    'https://control-operativo-1.onrender.com'
  ],
  credentials: true, // CRÍTICO para las cookies de sesión
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Middleware para deshabilitar caché
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'API de Gestión de Archivos PDF - INM',
    version: '2.0.0',
    requires_auth: true
  });
});

// Middlewares para parsear el cuerpo de las peticiones
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
      secure: true
    });
    console.log('✅ Cloudinary configurado correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error configurando Cloudinary:', error);
    process.exit(1);
  }
};

validateCloudinaryConfig();

// ==================== CONFIGURACIÓN MULTER ====================
const memoryStorage = multer.memoryStorage();
const pdfUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  }
}).single('file');

// ==================== MANEJO DE ERRORES ====================
const handleError = (error, req, res, next) => {
  console.error(`🔴 Error:`, {
    message: error.message,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: req.session.user?.username || 'anonymous'
  });

  res.status(500).json({
    status: 'error',
    message: error.message
  });
};

// ==================== RUTAS API ====================
const router = express.Router();

// ==================== RUTAS DE AUTENTICACIÓN ====================

// Ruta de login
router.post('/auth/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Usuario y contraseña son requeridos' 
      });
    }
    
    const user = authorizedUsers.find(u => u.username === username);
    
    if (user && await bcrypt.compare(password, user.password)) {
      // Crear sesión
      const userSession = { ...user };
      delete userSession.password;
      
      req.session.user = userSession;
      
      console.log(`✅ Login exitoso: ${user.name} desde IP: ${req.ip}`);
      
      res.json({ 
        status: 'success',
        message: `Bienvenido ${user.name}`,
        data: {
          user: userSession
        }
      });
    } else {
      console.log(`❌ Intento de login fallido para usuario: ${username}`);
      res.status(401).json({ 
        status: 'error',
        message: 'Usuario o contraseña incorrectos'
      });
    }
  } catch (error) {
    next(error);
  }
});

// Ruta de logout
router.post('/auth/logout', (req, res) => {
  const username = req.session.user?.username || 'unknown';
  
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        status: 'error',
        message: 'Error al cerrar sesión' 
      });
    }
    
    console.log(`✅ Logout exitoso: ${username}`);
    
    res.json({ 
      status: 'success', 
      message: 'Sesión cerrada correctamente'
    });
  });
});

// Verificar autenticación
router.get('/auth/check', (req, res) => {
  res.json({ 
    status: 'success',
    data: {
      authenticated: !!req.session.user, 
      user: req.session.user || null
    }
  });
});

// ==================== RUTAS DE ARCHIVOS ====================

// Ruta de salud
router.get('/health', requireAuth, async (req, res) => {
  const healthcheck = {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    user: req.session.user.username
  };

  try {
    await cloudinary.api.ping();
    res.json(healthcheck);
  } catch (error) {
    healthcheck.status = 'degraded';
    healthcheck.error = error.message;
    res.status(503).json(healthcheck);
  }
});

// Función para subir archivos
const processUpload = async (file, estado, tipoDocumento, tituloDocumento = null) => {
  if (!file) throw new Error('No se ha subido ningún archivo');
  
  const originalName = path.parse(file.originalname).name.replace(/[^\w- ]/gi, '') + '.pdf';
  
  const uploadOptions = {
    resource_type: 'raw',
    folder: `${estado}/${tipoDocumento}`,
    format: 'pdf',
    type: 'upload',
    access_mode: 'public',
    filename_override: originalName,
    unique_filename: false,
    overwrite: true,
    context: {
      original_filename: originalName,
      uploaded_at: new Date().toISOString(),
      custom: {
        estado: estado,
        tipo_documento: tipoDocumento,
        ...(tituloDocumento && { titulo_documento: tituloDocumento })
      }
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
    throw new Error(`Error al subir a Cloudinary: ${error.message}`);
  }
};

// Ruta para subir archivos
router.post('/upload', requireAuth, (req, res, next) => {
  pdfUpload(req, res, async (err) => {
    try {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          throw new Error('El archivo excede el límite de 15MB');
        }
        throw new Error(err.message);
      }

      const estado = req.body.estado || 'aguascalientes';
      const tipoDocumento = req.body.tipo_documento || 'ficha_curricular';
      const tituloDocumento = req.body.titulo_documento || null;
      const uploadedBy = req.session.user.username;
      
      const result = await processUpload(req.file, estado, tipoDocumento, tituloDocumento);

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
          uploaded_at: result.created_at,
          uploaded_by: uploadedBy,
          size: result.bytes,
          ...(tituloDocumento && { titulo_documento: tituloDocumento })
        }
      });
    } catch (error) {
      next(error);
    }
  });
});

// Ruta para eliminar archivos
router.delete('/delete', requireAuth, async (req, res, next) => {
  try {
    const { public_id, estado, tipo_documento } = req.body;
    
    if (!public_id) {
      throw new Error('public_id es requerido');
    }

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: 'raw',
      invalidate: true
    });

    if (result.result !== 'ok') {
      throw new Error('Error al eliminar el archivo');
    }

    console.log(`🗑️ Archivo eliminado por ${req.session.user.username}: ${public_id}`);

    res.json({
      status: 'success',
      message: 'Archivo eliminado correctamente'
    });
  } catch (error) {
    next(error);
  }
});

// Ruta para listar archivos
router.get('/archivos/:estado/:tipoDocumento', requireAuth, async (req, res, next) => {
  try {
    const estado = req.params.estado || 'aguascalientes';
    const tipoDocumento = req.params.tipoDocumento || 'ficha_curricular';

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: `${estado}/${tipoDocumento}/`,
      resource_type: 'raw',
      max_results: 500,
      context: true
    });

    const archivos = result.resources.map(resource => {
      const originalName = resource.context?.custom?.original_filename || 
                         path.parse(resource.public_id).name + '.pdf';
      return {
        url: resource.secure_url,
        public_id: resource.public_id,
        filename: originalName,
        estado: estado,
        tipo_documento: tipoDocumento,
        uploaded_at: resource.created_at,
        size: resource.bytes,
        ...(resource.context?.custom?.titulo_documento && { 
          titulo_documento: resource.context.custom.titulo_documento 
        })
      };
    });

    res.json({
      status: 'success',
      data: archivos
    });
  } catch (error) {
    next(error);
  }
});

// ==================== RUTAS PARA TÍTULO GLOBAL ====================

let tituloGlobal = process.env.TITULO_GLOBAL_INICIAL || 'Plantilla de Personal - INM';

// Ruta para guardar título global
router.post('/guardar-titulo-global', requireAuth, async (req, res, next) => {
  try {
    const { titulo } = req.body;
    
    if (!titulo || typeof titulo !== 'string') {
      throw new Error('Título válido es requerido');
    }

    tituloGlobal = titulo;

    res.json({
      status: 'success',
      message: 'Título global guardado correctamente'
    });
  } catch (error) {
    next(error);
  }
});

// Ruta para obtener título global
router.get('/obtener-titulo-global', requireAuth, async (req, res, next) => {
  try {
    res.json({
      status: 'success',
      titulo: tituloGlobal
    });
  } catch (error) {
    next(error);
  }
});

// Ruta de ping
router.get('/render-ping', (req, res) => {
  res.status(200).json({
    status: "active",
    timestamp: new Date().toISOString(),
    user: req.session.user?.username || 'anonymous',
    authenticated: !!req.session.user
  });
});

// ==================== CONFIGURACIÓN FINAL ====================

// Montar rutas
app.use('/api', router);

// Manejo de rutas no encontradas
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Ruta no encontrada: ${req.method} ${req.path}`
  });
});

// Middleware de errores
app.use(handleError);

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor INM ejecutándose en puerto ${PORT}`);
  console.log(`🔐 Sistema de autenticación activado - 1 usuario admin`);
  console.log(`👤 Usuario: admin / admin123`);
});

// Manejo de cierre
process.on('SIGTERM', () => {
  console.log('🛑 Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});

module.exports = { app, server };