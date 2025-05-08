const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Configuración para almacenar los archivos subidos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads', 'aguascalientes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);  // Establece la carpeta de destino
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);  // Mantiene el nombre original del archivo
  }
});

const upload = multer({ storage });

// Habilitar CORS y procesamiento de JSON
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ruta para subir archivos
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se ha subido ningún archivo' });
  }
  res.json({ filename: req.file.filename });  // Responde con el nombre del archivo subido
});

// Ruta para eliminar archivos
app.delete('/delete', (req, res) => {
  const { filename } = req.body;  // Asumiendo que se envía el nombre del archivo para eliminar
  const filePath = path.join(__dirname, 'uploads', 'aguascalientes', filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error al eliminar el archivo' });
    }
    res.json({ message: 'Archivo eliminado correctamente' });
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
app.get('/ultimo-archivo', (req, res) => {
  const dir = path.join(__dirname, 'uploads', 'aguascalientes');
  fs.readdir(dir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Error al leer la carpeta' });

    const pdfs = files.filter(f => f.endsWith('.pdf'));
    if (pdfs.length === 0) return res.json({ filename: null });

    // Ordena por fecha de modificación
    const sorted = pdfs.sort((a, b) => {
      const aTime = fs.statSync(path.join(dir, a)).mtime.getTime();
      const bTime = fs.statSync(path.join(dir, b)).mtime.getTime();
      return bTime - aTime;
    });

    res.json({ filename: sorted[0] }); // El más reciente
  });
});
app.delete('/delete', (req, res) => {
  const { filename } = req.body;
  const filePath = path.join(__dirname, 'uploads', 'aguascalientes', filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error al eliminar el archivo:', err);
      return res.status(500).json({ message: 'Error al eliminar el archivo' });
    }
    res.json({ message: 'Archivo eliminado correctamente' });
  });
});
app.get('/archivos', (req, res) => {
  const dir = path.join(__dirname, 'uploads', 'aguascalientes');
  fs.readdir(dir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error al leer la carpeta' });
    }

    const pdfs = files.filter(file => file.endsWith('.pdf'));
    res.json({ archivos: pdfs });
  });
});
app.get('/files', (req, res) => {
  const dir = path.join(__dirname, 'uploads', 'aguascalientes');
  fs.readdir(dir, (err, files) => {
    if (err) {
      return res.status(500).json({ message: 'Error al leer los archivos' });
    }

    // Solo devolver archivos PDF
    const pdfs = files.filter(file => file.endsWith('.pdf'));
    res.json(pdfs);
  });
});
const cloudinary = require('cloudinary').v2;

// Configura Cloudinary con tus claves API
cloudinary.config({
  cloud_name: 'dbl0vo8t4',  // Usa el "Cloud Name" de tu cuenta
  api_key: '7919444259186274',  // API Key
  api_secret: 'tu_api_secret'  // API Secret
});

// Ejemplo de cómo subir un archivo a Cloudinary
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se ha subido ningún archivo' });
  }

  // Subir archivo a Cloudinary
  cloudinary.uploader.upload(req.file.path, { resource_type: 'auto' }, (error, result) => {
    if (error) {
      return res.status(500).json({ message: 'Error al subir el archivo', error });
    }

    res.json({ message: 'Archivo subido correctamente', url: result.url });
  });
});


