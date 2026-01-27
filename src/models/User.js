const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  label: {
    type: String,
    enum: ['casa', 'trabajo', 'otro'],
    default: 'casa'
  },
  nombres: {
    type: String,
    required: true,
    trim: true
  },
  apellidos: {
    type: String,
    required: true,
    trim: true
  },
  dni: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d{8}$/.test(v); // DNI peruano de 8 dígitos
      },
      message: 'DNI debe tener 8 dígitos'
    }
  },
  telefono: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^9\d{8}$/.test(v); // Celular peruano
      },
      message: 'Teléfono debe ser un celular válido (9 dígitos empezando con 9)'
    }
  },
  direccion: {
    type: String,
    required: true,
    trim: true
  },
  referencia: {
    type: String,
    trim: true
  },
  departamento: {
    type: String,
    required: true,
    trim: true
  },
  provincia: {
    type: String,
    required: true,
    trim: true
  },
  distrito: {
    type: String,
    required: true,
    trim: true
  },
  codigoPostal: {
    type: String,
    trim: true
  },
  // Coordenadas del mapa
  ubicacion: {
    latitud: {
      type: Number,
      required: true
    },
    longitud: {
      type: Number,
      required: true
    }
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const userSchema = new mongoose.Schema({
  // Datos básicos
  nombres: {
    type: String,
    required: true,
    trim: true
  },
  apellidos: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: 'Email no válido'
    }
  },
  password: {
    type: String,
    required: function() {
      return !this.isGuest; // Solo requerido si no es guest
    },
    minlength: 6
  },
  
  // Datos personales
  dni: {
    type: String,
    trim: true,
    sparse: true, // Permite múltiples null
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^\d{8}$/.test(v);
      },
      message: 'DNI debe tener 8 dígitos'
    }
  },
  telefono: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^9\d{8}$/.test(v);
      },
      message: 'Teléfono debe ser un celular válido'
    }
  },
  fechaNacimiento: {
    type: Date
  },
  genero: {
    type: String,
    enum: ['masculino', 'femenino', 'otro', 'prefiero_no_decir']
  },

  // Direcciones guardadas (múltiples)
  direcciones: [addressSchema],

  // Tipo de usuario
  role: {
    type: String,
    enum: ['cliente', 'administrador', 'vendedor'],
    default: 'cliente'
  },
  isGuest: {
    type: Boolean,
    default: false
  },

  // Avatar/Foto de perfil
  avatar: {
    type: String,
    default: 'https://ui-avatars.com/api/?name=Usuario'
  },

  // Wishlist (lista de deseos)
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],

  // Preferencias
  preferencias: {
    recibirPromociones: {
      type: Boolean,
      default: true
    },
    recibirNotificaciones: {
      type: Boolean,
      default: true
    },
    tallaPreferida: String,
    marcasFavoritas: [String]
  },

  // Verificación
  emailVerificado: {
    type: Boolean,
    default: false
  },
  telefonoVerificado: {
    type: Boolean,
    default: false
  },
  codigoVerificacion: String,
  codigoExpiracion: Date,

  // Reset password
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  // Seguridad
  intentosLoginFallidos: {
    type: Number,
    default: 0
  },
  bloqueadoHasta: Date,

  // Estado
  activo: {
    type: Boolean,
    default: true
  },
  ultimoAcceso: Date

}, {
  timestamps: true, // createdAt, updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para búsquedas rápidas
userSchema.index({ email: 1 });
userSchema.index({ dni: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// Virtual para nombre completo
userSchema.virtual('nombreCompleto').get(function() {
  return `${this.nombres} ${this.apellidos}`;
});

// Virtual para pedidos del usuario
userSchema.virtual('pedidos', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'usuario'
});

// Encriptar password antes de guardar
userSchema.pre('save', async function(next) {
  // Solo hashear si el password fue modificado
  if (!this.isModified('password')) {
    return next();
  }
  
  // Si es guest, no necesita password
  if (this.isGuest) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para comparar passwords
userSchema.methods.compararPassword = async function(passwordIngresado) {
  return await bcrypt.compare(passwordIngresado, this.password);
};

// Método para generar token de verificación
userSchema.methods.generarCodigoVerificacion = function() {
  const codigo = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
  this.codigoVerificacion = codigo;
  this.codigoExpiracion = Date.now() + 10 * 60 * 1000; // 10 minutos
  return codigo;
};

// Método para limpiar datos sensibles al enviar al cliente
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.codigoVerificacion;
  delete user.resetPasswordToken;
  delete user.intentosLoginFallidos;
  return user;
};

// Método estático para convertir guest a usuario registrado
userSchema.statics.convertirGuestARegistrado = async function(userId, datosRegistro) {
  const user = await this.findById(userId);
  if (!user || !user.isGuest) {
    throw new Error('Usuario no válido para conversión');
  }
  
  user.password = datosRegistro.password;
  user.isGuest = false;
  user.emailVerificado = false;
  
  await user.save();
  return user;
};

module.exports = mongoose.model('User', userSchema);