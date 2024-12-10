const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db/db');
const fs = require('fs-extra'); 
const Presentar = require('./models/Presentar');
// Rutas
const authRoutes = require('./routes/auth/authRoutes');
const userRoutes = require('./routes/user/userRoutes');
const contentRoutes = require('./routes/content/contentRoutes');

// Configuración de CORS
const corsOptions = require('./config/cors/cors');

// Inicializar la aplicación
const app = express();

// --- Configuración base ---
dotenv.config(); // Cargar variables de entorno desde el archivo .env

// --- Conexión a la base de datos ---
connectDB(); // Conectar a MongoDB



// --- Middlewares globales ---
app.use(cors(corsOptions)); // Habilitar CORS con opciones
app.options('*', cors(corsOptions)); // Manejar preflight requests
app.use(express.json()); // Parsear cuerpos JSON
app.use(express.urlencoded({ extended: true })); // Parsear datos URL-encoded
app.use(express.static(path.join(__dirname, 'public'))); // Servir archivos estáticos

// Middleware para añadir headers CORS adicionales (opcional, ya está incluido en corsOptions)
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


// ---------------------------------------------------------
// NUEVAS FUNCIONALIDADES: Procesamiento de carpetas
// ---------------------------------------------------------

// Función para procesar cada carpeta de palabra
// Función para procesar cada carpeta de palabra
const procesarCarpeta = async (carpeta, destino) => {
  const nombreCarpeta = path.basename(carpeta).toUpperCase(); // Nombre en mayúsculas
  const archivos = await fs.readdir(carpeta); // Leer los archivos de la carpeta

  // Filtrar solo los archivos con extensión .webp
  const archivosWebp = archivos.filter(archivo => archivo.endsWith('.webp'));

  if (archivosWebp.length >= 3) {
    // Ordenar los archivos según las reglas
    const archivoPrincipal = archivosWebp.find(
      archivo => archivo.toLowerCase().startsWith(path.basename(carpeta).toLowerCase())
    );
    const archivoDeletreo = archivosWebp.find(archivo => archivo.toLowerCase().includes('deletreo'));
    const archivoFinal = archivosWebp.find(
      archivo => archivo !== archivoPrincipal && archivo !== archivoDeletreo
    );

    if (archivoPrincipal && archivoDeletreo && archivoFinal) {
      // Crear el objeto Presentar para la base de datos
      const nombreImagen = `${nombreCarpeta}.webp`; // Nombre basado en la carpeta

      const presentarDoc = {
        imagen: path.join('datos', archivoFinal),
        nombre: nombreCarpeta,
        titulos: [
          { titulo: `${nombreCarpeta}1`, video: path.join('datos', archivoPrincipal) },
          { titulo: `${nombreCarpeta}2`, video: path.join('datos', archivoDeletreo) },
          { titulo: `${nombreCarpeta}3`, video: path.join('datos', archivoFinal) },
        ],
      };

      // Copiar los archivos al destino
      await fs.copy(path.join(carpeta, archivoPrincipal), path.join(destino, archivoPrincipal));
      await fs.copy(path.join(carpeta, archivoDeletreo), path.join(destino, archivoDeletreo));
      await fs.copy(path.join(carpeta, archivoFinal), path.join(destino, archivoFinal));

      // Guardar el documento en MongoDB
      await Presentar.create(presentarDoc);
      console.log(`Datos de ${nombreCarpeta} guardados correctamente.`);
    } else {
      console.log(`No se encontraron los archivos esperados en ${nombreCarpeta}`);
    }
  } else {
    console.log(`No hay suficientes archivos en ${nombreCarpeta}`);
  }
};


// Función para recorrer todas las carpetas
const procesarCarpetas = async (carpetaRaiz, destino) => {
  try {
    const carpetas = await fs.readdir(carpetaRaiz); // Leer las carpetas (A-N)

    for (const letraCarpeta of carpetas) {
      const rutaLetra = path.join(carpetaRaiz, letraCarpeta);
      const subCarpetas = await fs.readdir(rutaLetra); // Leer las subcarpetas (palabras)

      for (const subCarpeta of subCarpetas) {
        const rutaSubCarpeta = path.join(rutaLetra, subCarpeta);
        await procesarCarpeta(rutaSubCarpeta, destino); // Procesar cada carpeta de palabra
      }
    }
    console.log('Todas las carpetas han sido procesadas.');
  } catch (error) {
    console.error('Error procesando las carpetas:', error);
  }
};

// Conexión a MongoDB y ejecución del proceso
const iniciarProceso = async () => {
  try {
    // Conexión a MongoDB
    
    connectDB();
    console.log('Conectado a MongoDB correctamente.');

    const carpetaRaiz = 'D:/Proyectos/SordoMundo/Datos/Contabo'; // Carpeta raíz donde están las letras A-N
    
    
    const destino = './Datos/Bloque'; // Carpeta de destino para copiar los archivos

    // Ejecutar el proceso de procesamiento de carpetas
    await procesarCarpetas(carpetaRaiz, destino);

  } catch (error) {
    console.error('Error conectando a MongoDB o procesando los archivos:', error);
  } finally {
    // Cerrar la conexión con MongoDB cuando termine el proceso

    console.log('Conexión a MongoDB cerrada.');
  }
};

// Configuración del servidor estático
app.use('/datos', express.static(path.join(__dirname, 'Datos/Bloque')));

// Ruta para iniciar el procesamiento de carpetas manualmente
app.get('/procesar', async (req, res) => {
  await iniciarProceso();
  res.send('Procesamiento de carpetas completado.');
});

// ---------------------------------------------------------
// FIN DE LAS NUEVAS FUNCIONALIDADES
// ---------

// --- Iniciar el servidor ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});








