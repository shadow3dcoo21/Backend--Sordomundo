const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const contentRoutes = require('./routes/contentRoutes');
const connectDB = require('./config/db');  // Importar la función de conexión a DB
const path = require('path');

// Configurar dotenv
dotenv.config();

// Crear la app de Express
const app = express();
app.use(cors());
app.use(express.json());  // Middleware para parsear JSON

// Definir el puerto
const PORT = process.env.PORT;  // Si no está definida en el .env, usa 5000

// Conectar a MongoDB
connectDB();

// Rutas
app.use('/api/auth', authRoutes);  // Rutas de autenticación
app.use('/api/users', userRoutes);  // Rutas de usuarios

//Rutas Presentacion
// Configuración del servidor estático
app.use('/datos', express.static(path.join(__dirname, 'Datos/Bloque')));
app.use('/api/content', contentRoutes);  // Rutas de autenticación


// ---------------------------------------------------------
// NUEVAS FUNCIONALIDADES: Procesamiento de carpetas
// ---------------------------------------------------------

// Función para procesar cada carpeta de palabra
const procesarCarpeta = async (carpeta, destino) => {
  const nombreCarpeta = path.basename(carpeta).toUpperCase(); // Nombre en mayúsculas
  const archivos = await fs.readdir(carpeta); // Leer los archivos de la carpeta
  
  
  // Filtrar archivos según su extensión
  const gifs = archivos.filter(archivo => archivo.endsWith('.gif'));
  const imagenPng = archivos.find(archivo => archivo.endsWith('.png'));
  const segundoGifRenombrado = `${nombreCarpeta}_${gifs[1]}`; // Renombra el segundo GIF
  if (gifs.length === 2 && imagenPng) {
    // Crear el objeto Presentar para la base de datos
    const nombreImagen = `${nombreCarpeta}.png`; // Crear el nombre de la imagen basado en la carpeta
  
    // Crear el objeto Presentar para la base de datos
    const presentarDoc = {
      imagen: path.join('datos', nombreImagen), // Usar el nuevo nombre
      nombre: nombreCarpeta, // Nombre de la carpeta en mayúsculas
      titulos: [
        { titulo: `${nombreCarpeta}1`, video: path.join('datos', gifs[0]) }, // Ruta relativa
        { titulo: `${nombreCarpeta}2`, video: path.join('datos', segundoGifRenombrado) }, // Ruta relativa
        { titulo: `${nombreCarpeta}3`, video: path.join('datos', nombreImagen) }, // Usar el nuevo nombre
      ],
    };

    // Copiar los archivos al destino
    await fs.copy(path.join(carpeta, gifs[0]), path.join(destino, gifs[0]));
    await fs.copy(path.join(carpeta, gifs[1]), path.join(destino, segundoGifRenombrado));
    await fs.copy(path.join(carpeta, imagenPng), path.join(destino, nombreImagen));

    // Guardar el documento en MongoDB
    await Presentar.create(presentarDoc);
    console.log(`Datos de ${nombreCarpeta} guardados correctamente.`);
  } else {
    console.log(`No se encontraron los archivos esperados en ${nombreCarpeta}`);
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

    const carpetaRaiz = 'D:/Proyectos/SordoMundo/Datos/Palabras'; // Carpeta raíz donde están las letras A-N
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





// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});



