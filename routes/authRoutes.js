const express = require('express');
const { loginUser , registerUser } = require('../controllers/authController');

const router = express.Router();
//login
router.post('/login/alumno', loginUser);  // Login de alumno
router.post('/login/profesor', loginUser);  // Login de alumno
router.post('/login/externo', loginUser);  // Login de alumno
//register
router.post('/register/alumno', registerUser);  // Login de alumno
router.post('/register/profesor', registerUser);  // Login de alumno
router.post('/register/externo', registerUser);  // Login de alumno

module.exports = router;
