const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const contentRoutes = require('./routes/contentRoutes');
const connectDB = require('./config/db');
const path = require('path');

dotenv.config();

const app = express();

// Configuración de CORS más robusta
const corsOptions = {
  origin: function (origin, callback) {
    const whitelist = [
      'https://sordomundo.pro',
      'https://www.sordomundo.pro',
      'https://frontend-sordomundo-hucx8mjh3-farids-projects-33ebe9be.vercel.app', 
      'https://frontend-sordomundo.vercel.app',
      'https://localhost:3000'
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

// Middleware para añadir headers de CORS adicionales
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Ruta de health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/content', contentRoutes);

// Configuración del servidor estático
app.use('/datos', express.static(path.join(__dirname, 'Datos/Bloque')));

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Algo salió mal', 
    message: err.message 
  });
});

// Conectar a MongoDB
connectDB();

// Definir el puerto
const PORT = process.env.PORT || 5000;

// Iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});