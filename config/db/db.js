const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB conectado wey');
  } catch (err) {
    console.error('Error de conexión a MongoDB:', err.message);
    process.exit(1);  // Salir si hay error
  }
};

module.exports = connectDB;