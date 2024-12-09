const express = require('express');
const authMiddleware = require('../../middlewares/authMiddleware');
const Presentar = require('../../models/Presentar');
const Juego = require('../../models/Juego');
console.log("hola",typeof authMiddleware);  // Debe imprimir 'function' si está importado correctamente

const router = express.Router();

// Se debe marcar la función como 'async' para usar 'await'
router.get('/presentar', authMiddleware, async (req, res) => {
    try {
        const presentaciones = await Presentar.find();  // Usar 'await' en la consulta
        res.json(presentaciones);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los datos de presentación' });
    }
});

// Nueva ruta para obtener una presentación por nombre y aplicar un tipo específico de manipulación
router.get('/completar/:nombre/:tipo',authMiddleware, async (req, res) => {
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


  router.post('/registrardatoscomletar',authMiddleware, async (req, res) => {
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

module.exports = router;


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
  
// Función para reemplazar todas las letras con _
function replaceAllWithUnderscores(str) {
    const letrasEliminadas = str.split('').reverse(); // Guarda todas las letras en un array de manera invertida
    const resultado = '_'.repeat(str.length); // Reemplaza todas las letras por guiones bajos
    return [resultado, letrasEliminadas];
  }
  function validateMissingLetter(letrasEliminadas, missingLetter) {
    return !letrasEliminadas.includes(missingLetter);
  }



