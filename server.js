const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const contentRoutes = require('./routes/contentRoutes');
const connectDB = require('./config/db');  // Importar la función de conexión a DB
const path = require('path');

// Configurar dotenv
dotenv.config();

// Crear la app de Express
const app = express();
// Configuración CORS más flexible
app.use(cors({
  origin: [
    'https://tu-dominio-frontend.vercel.app', 
    'http://localhost:3000', 
    'https://localhost:3000',
    'http://localhost:3001', 
    'https://localhost:3001'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para manejar HTTPS
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

app.use(express.json());  // Middleware para parsear JSON
app.use(express.urlencoded({ extended: true }));

// Ruta de health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Algo salió mal', 
    message: err.message 
  });
});

// Definir el puerto
const PORT = process.env.PORT || 5000;  // Si no está definida en el .env, usa 5000

// Conectar a MongoDB
connectDB();

// Rutas
app.use('/api/auth', authRoutes);  // Rutas de autenticación
app.use('/api/users', userRoutes);  // Rutas de usuarios

//Rutas Presentacion
// Configuración del servidor estático
app.use('/datos', express.static(path.join(__dirname, 'Datos/Bloque')));
app.use('/api/content', contentRoutes);  // Rutas de autenticación



// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});