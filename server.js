const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db/db');

// Rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const contentRoutes = require('./routes/contentRoutes');

// Configuración de CORS
const corsOptions = require('./config/cors/cors');

// Inicializar la aplicación
const app = express();

// Configuración de CORS más robusta
const corsOptions = {
  origin: function (origin, callback) {
    const whitelist = [
      'https://sordomundo.pro',
      'https://www.sordomundo.pro',
      'https://sordomundo.vercel.app', 
      'http://sordomundo.pro',
      'https://localhost:3000',
      'http://localhost:3000',
    ];

    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Aplicar middleware CORS global
app.use(cors(corsOptions));

// Manejar preflight requests
app.options('*', cors(corsOptions));

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));
// Middleware para añadir headers de CORS adicionales
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// --- Rutas principales ---
app.get('/', (req, res) => {
  res.status(200).send('Bienvenido a la API');
});

// Rutas específicas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/content', contentRoutes);

// Servir directorios adicionales
app.use('/datos', express.static(path.join(__dirname, 'Datos/Bloque')));

// --- Manejo global de errores ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Algo salió mal',
    message: err.message,
  });
});

// --- Iniciar el servidor ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
