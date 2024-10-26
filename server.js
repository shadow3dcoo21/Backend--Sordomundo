const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Presentar = require('./models/Presentar');
const Alumno = require('./models/Alumno');
const Juego = require('./models/Juego');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

const { uploadFile } = require('./util/s3');

const fs = require('fs-extra'); // Asegúrate de que esta línea esté presente

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
    await mongoose.connect('mongodb://localhost:27017/sinvoz', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
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







mongoose.connect('mongodb://localhost:27017/sinvoz', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Conexión a MongoDB establecida.');
  })
  .catch(err => console.error('Error al conectar con MongoDB:', err));

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

// Middleware

// Configurar multer para la carga de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'imagen') {
      cb(null, 'public/imagenes');
    } else if (file.fieldname === 'video') {
      cb(null, 'public/videos');
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Ruta para guardar datos y archivos en S3
app.post('/presentar', upload.fields([{ name: 'imagen' }, { name: 'video' }]), async (req, res) => {
  try {
    const { nombre, titulos } = req.body;
    
    // Subir imagen a AWS S3 y obtener la URL pública
    const imagenFile = req.files['imagen'][0];
    const imagenURL = await uploadFile(imagenFile.originalname, imagenFile.path, imagenFile.mimetype);

    // Subir cada video a AWS S3 y obtener sus URLs públicas
    const videoFiles = req.files['video'];
    const videoURLs = await Promise.all(videoFiles.map(file => 
      uploadFile(file.originalname, file.path, file.mimetype)
    ));

    // Formatear los títulos para asociarlos con las URLs de los videos
    const formattedTitulos = titulos.map((titulo, index) => ({
      titulo,
      video: videoURLs[index]
    }));

    // Crear un nuevo documento de Presentar
    const presentar = new Presentar({
      imagen: imagenURL,
      nombre,
      titulos: formattedTitulos
    });

    // Guardar el documento en MongoDB
    await presentar.save();

    res.status(201).send(presentar);
  } catch (error) {
    console.error('Error en /presentar:', error);
    res.status(400).send({ error: error.message });
  }
});



app.get('/presentar', async (req, res) => {
  try {
    const presentaciones = await Presentar.find();
    res.json(presentaciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los datos de presentación' });
  }
});



// Nueva ruta para obtener una presentación por nombre
app.get('/completar/:nombre', async (req, res) => {
  try {
    const nombre = req.params.nombre;
    const presentacion = await Presentar.findOne({ nombre });

    if (presentacion) {
      res.json(presentacion);
    } else {
      res.status(404).json({ message: 'No se encontró la presentación con ese nombre' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la presentación' });
  }
});

// Nueva ruta para obtener una presentación por nombre y aplicar un tipo específico de manipulación
app.get('/completar/:nombre/:tipo', async (req, res) => {
  try {
    const { nombre, tipo } = req.params;
    const presentacion = await Presentar.findOne({ nombre });

    if (presentacion) {
      let resultado;
      let letrasEliminadas;
      switch (tipo) {
        case 'incompleto1':
          [resultado, letrasEliminadas] = removeFirstLetter(presentacion.nombre);
          
          break;
        case 'incompleto2':
          [resultado, letrasEliminadas] = removeTwoRandomLettersWithUnderscore(presentacion.nombre);
          break;
        case 'incompletoTotal':
          [resultado, letrasEliminadas] = replaceAllWithUnderscores(presentacion.nombre);
          break;
        case 'letrasSeparadas':
          resultado = presentacion.nombre.split('');
          break;
        default:
          return res.status(400).json({ message: 'Tipo no válido' });
      }
      res.json({ nombreOriginal: presentacion.nombre, nombreManipulado: resultado, letrasEliminadas });
    } else {
      res.status(404).json({ message: 'No se encontró la presentación con ese nombre' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la presentación' });
  }
});

// Nueva ruta para obtener una presentación por nombre y aplicar un tipo específico de manipulación
app.get('/completar/:nombre/:tipo/:letraFaltante', async (req, res) => {
  try {
    const { nombre, tipo, letraFaltanteMayuscula } = req.params;
    const presentacion = await Presentar.findOne({ nombre });
    letraFaltante =letraFaltanteMayuscula.toUpperCase();
    if (presentacion) {
      let resultado;
      let letrasEliminadas;
      switch (tipo) {
        case 'incompleto1':
          [resultado, letrasEliminadas] = removeFirstLetter(presentacion.nombre);
          break;
        case 'incompleto2':
          [resultado, letrasEliminadas] = removeTwoRandomLettersWithUnderscore(presentacion.nombre);
          break;
        case 'incompletoTotal':
          [resultado, letrasEliminadas] = replaceAllWithUnderscores(presentacion.nombre);
          break;
        case 'letrasSeparadas':
          resultado = presentacion.nombre.split('');
          letrasEliminadas = [];
          break;
        default:
          return res.status(400).json({ message: 'Tipo no válido' });
      }

      if (!validateMissingLetter(letrasEliminadas, letraFaltante)) {
        res.json({
          nombreOriginal: presentacion.nombre,
          nombreManipulado: resultado,
          letrasEliminadas
        });
      } else {
        res.status(400).json({ message: 'Letra faltante incorrecta' });
      }
    } else {
      res.status(404).json({ message: 'No se encontró la presentación con ese nombre' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la presentación' });
  }
});

// Función para reemplazar todas las letras con _
function replaceAllWithUnderscores(str) {
  const letrasEliminadas = str.split('').reverse(); // Guarda todas las letras en un array de manera invertida
  const resultado = '_'.repeat(str.length); // Reemplaza todas las letras por guiones bajos
  return [resultado, letrasEliminadas];
}
function validateMissingLetter(letrasEliminadas, missingLetter) {
  return !letrasEliminadas.includes(missingLetter);
}

// Función para remover la primera letra y reemplazarla por _
function removeFirstLetter(str) {
  if (str.length <= 1) return ['_', str]; // Si la longitud es 1 o menos, devuelve un solo guion bajo

  const letraEliminada = str.charAt(0);
  const resultado = '_' + str.substring(1);
  return [resultado, letraEliminada];
}

// Función para remover dos letras aleatorias y reemplazarlas por _
function removeTwoRandomLettersWithUnderscore(str) {
  if (str.length <= 2) return [str.substring(1), '']; // Si la longitud es 2 o menos, solo remueve la primera letra

  let chars = str.split('');
  let indexesToRemove = [];

  while (indexesToRemove.length < 2) {
    let randomIndex = Math.floor(Math.random() * (chars.length - 1)) + 1; // Evita la primera letra
    if (!indexesToRemove.includes(randomIndex)) {
      indexesToRemove.push(randomIndex);
    }
  }

  indexesToRemove.sort((a, b) => b - a); // Ordena en orden descendente para no cambiar índices al remover

  let letrasEliminadas = [];
  for (let index of indexesToRemove) {
    const letraEliminada = chars[index];
    letrasEliminadas.push(letraEliminada);
    chars.splice(index, 1, '_'); // Reemplaza la letra eliminada por _
  }

  return [chars.join(''), letrasEliminadas];
}


/////////////////////////////////

// Nueva ruta para verificar si un nombre existe en la base de datos
app.post('/verificar-nombre', async (req, res) => {
  try {
    const { nombres } = req.body;
    const presentacion = await Alumno.findOne({ nombres });

    if (presentacion) {
      // Si se encuentra la presentación con el nombre, enviamos una respuesta positiva
      res.json({
        existe: true,
        mensaje: 'Nombre encontrado',
        usuario: {
          _id: presentacion._id, // Agregamos el ID del usuario
          nombres: presentacion.nombres,
          apellidos: presentacion.apellidos,
        },
      });
    } else {
      // Si no se encuentra, enviamos una respuesta negativa
      res.json({ existe: false, mensaje: 'Nombre no encontrado' });
    }
  } catch (error) {
    console.error('Error al verificar nombre:', error);
    res.status(500).json({ error: 'Error al verificar nombre' });
  }
});


// Nueva ruta para registrar un nuevo alumno
app.post('/registrar-alumno', async (req, res) => {
  try {
    const { nombres, apellidos, sexo } = req.body;
    
    // Verifica si ya existe un alumno con ese nombre
    const alumnoExistente = await Alumno.findOne({ nombres });
    if (alumnoExistente) {
      return res.json({ success: false, mensaje: 'El nombre ya existe' });
    }

    // Crea y guarda el nuevo alumno
    const nuevoAlumno = new Alumno({
      nombres,
      apellidos,
      sexo
    });

    await nuevoAlumno.save();
    res.json({ success: true, mensaje: 'Alumno registrado con éxito' });
  } catch (error) {
    console.error('Error al registrar alumno:', error);
    res.status(500).json({ error: 'Error al registrar alumno' });
  }
});


// Nueva ruta notas del alumno

/*app.post('/registrardatoscomletar', async (req, res) => {
  try {
    const { alumno, hora, palabra, opciones } = req.body;

    // Crea un nuevo documento con el modelo correspondiente
    const nuevoJuego = new Juego({ alumno, hora, palabra, opciones });
    
    await nuevoJuego.save();
    res.status(201).json(nuevoJuego);
  } catch (error) {
    console.error('Error al guardar el juego:', error);
    res.status(500).send('Error al guardar el juego');
  }
});*/


app.post('/registrardatoscomletar', async (req, res) => {
  try {
    const { alumno, hora, palabra, opciones } = req.body;

    // Intenta encontrar el juego del alumno por el ID del alumno y la palabra
    const juegoExistente = await Juego.findOne({ alumno, palabra });

    if (juegoExistente) {
      // Si existe, actualiza el array de opciones
      juegoExistente.opciones.push(...opciones); // Agrega las nuevas opciones
      await juegoExistente.save();
      return res.status(200).json(juegoExistente);
    } else {
      // Si no existe, crea uno nuevo
      const nuevoJuego = new Juego({ alumno, hora, palabra, opciones });
      await nuevoJuego.save();
      return res.status(201).json(nuevoJuego);
    }
  } catch (error) {
    console.error('Error al guardar el juego:', error);
    res.status(500).send('Error al guardar el juego');
  }
});




app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
