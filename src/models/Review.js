
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Producto y usuario
  producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pedido: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true // Solo pueden comentar si compraron
  },

  // Calificación
  calificacion: {
    type: Number,
    required: [true, 'La calificación es requerida'],
    min: [1, 'La calificación mínima es 1'],
    max: [5, 'La calificación máxima es 5']
  },

  // Comentario
  titulo: {
    type: String,
    trim: true,
    maxlength: [100, 'El título no puede exceder 100 caracteres']
  },
  comentario: {
    type: String,
    required: [true, 'El comentario es requerido'],
    trim: true,
    minlength: [10, 'El comentario debe tener al menos 10 caracteres'],
    maxlength: [1000, 'El comentario no puede exceder 1000 caracteres']
  },

  // Aspectos específicos del producto de ropa
  aspectos: {
    calidad: {
      type: Number,
      min: 1,
      max: 5
    },
    tallaje: {
      type: String,
      enum: ['muy_pequeno', 'pequeno', 'perfecto', 'grande', 'muy_grande']
    },
    comodidad: {
      type: Number,
      min: 1,
      max: 5
    },
    calce: {
      type: String,
      enum: ['ajustado', 'perfecto', 'holgado']
    }
  },

  // Información adicional
  tallaComprada: {
    type: String,
    trim: true
  },
  alturaUsuario: {
    type: String, // Ej: "1.70m"
    trim: true
  },
  pesoUsuario: {
    type: String, // Ej: "65kg"
    trim: true
  },

  // Imágenes adjuntas por el usuario
  imagenes: [{
    url: {
      type: String,
      required: true
    },
    descripcion: String
  }],

  // Utilidad del review
  utilidad: {
    util: {
      type: Number,
      default: 0
    },
    noUtil: {
      type: Number,
      default: 0
    }
  },

  // Votos de usuarios (para evitar múltiples votos)
  votosUsuarios: [{
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    voto: {
      type: String,
      enum: ['util', 'no_util']
    }
  }],

  // Moderación
  aprobado: {
    type: Boolean,
    default: false // Requiere aprobación del admin
  },
  revisadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  fechaRevision: Date,
  reportado: {
    type: Boolean,
    default: false
  },
  reportes: [{
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    razon: String,
    fecha: {
      type: Date,
      default: Date.now
    }
  }],

  // Respuesta del vendedor
  respuestaVendedor: {
    comentario: String,
    fecha: Date,
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // Verificación
  compraVerificada: {
    type: Boolean,
    default: true
  },

  // Estado
  activo: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
reviewSchema.index({ producto: 1, createdAt: -1 });
reviewSchema.index({ usuario: 1 });
reviewSchema.index({ pedido: 1 });
reviewSchema.index({ calificacion: -1 });
reviewSchema.index({ 'utilidad.util': -1 });
reviewSchema.index({ aprobado: 1 });

// Índice compuesto para evitar reviews duplicados
reviewSchema.index({ producto: 1, usuario: 1, pedido: 1 }, { unique: true });

// Virtual para porcentaje de utilidad
reviewSchema.virtual('porcentajeUtilidad').get(function() {
  const total = this.utilidad.util + this.utilidad.noUtil;
  if (total === 0) return 0;
  return Math.round((this.utilidad.util / total) * 100);
});

// Middleware: Actualizar rating del producto después de guardar
reviewSchema.post('save', async function() {
  try {
    const Product = mongoose.models.Product || mongoose.model('Product');
    const producto = await Product.findById(this.producto);
    if (producto) {
      await producto.actualizarRating();
    }
  } catch (error) {
    console.error('Error actualizando rating:', error);
  }
});

// Middleware: Actualizar rating del producto después de eliminar
reviewSchema.post('remove', async function() {
  try {
    const Product = mongoose.models.Product || mongoose.model('Product');
    const producto = await Product.findById(this.producto);
    if (producto) {
      await producto.actualizarRating();
    }
  } catch (error) {
    console.error('Error actualizando rating:', error);
  }
});

// Método para votar utilidad
reviewSchema.methods.votarUtilidad = async function(userId, voto) {
  // Verificar si el usuario ya votó
  const yaVoto = this.votosUsuarios.find(v => 
    v.usuario.toString() === userId.toString()
  );

  if (yaVoto) {
    // Remover voto anterior
    if (yaVoto.voto === 'util') {
      this.utilidad.util--;
    } else {
      this.utilidad.noUtil--;
    }

    // Si es el mismo voto, eliminarlo (toggle)
    if (yaVoto.voto === voto) {
      this.votosUsuarios = this.votosUsuarios.filter(v => 
        v.usuario.toString() !== userId.toString()
      );
    } else {
      // Cambiar voto
      yaVoto.voto = voto;
      if (voto === 'util') {
        this.utilidad.util++;
      } else {
        this.utilidad.noUtil++;
      }
    }
  } else {
    // Nuevo voto
    this.votosUsuarios.push({ usuario: userId, voto });
    if (voto === 'util') {
      this.utilidad.util++;
    } else {
      this.utilidad.noUtil++;
    }
  }

  await this.save();
  return this;
};

// Método para reportar review
reviewSchema.methods.reportar = async function(userId, razon) {
  this.reportado = true;
  this.reportes.push({
    usuario: userId,
    razon,
    fecha: new Date()
  });
  await this.save();
};

// Método estático para verificar si el usuario puede dejar review
reviewSchema.statics.puedeDejarReview = async function(userId, productoId) {
  const Order = mongoose.models.Order || mongoose.model('Order');
  
  // Buscar si el usuario compró el producto
  const pedidosConProducto = await Order.find({
    usuario: userId,
    estado: 'entregado',
    'items.producto': productoId
  });

  if (pedidosConProducto.length === 0) {
    return {
      puede: false,
      razon: 'Debes comprar el producto para poder dejar una reseña'
    };
  }

  // Verificar si ya dejó review para este producto
  const reviewExistente = await this.findOne({
    usuario: userId,
    producto: productoId
  });

  if (reviewExistente) {
    return {
      puede: false,
      razon: 'Ya dejaste una reseña para este producto'
    };
  }

  return {
    puede: true,
    pedidoId: pedidosConProducto[0]._id
  };
};

module.exports = mongoose.model('Review', reviewSchema);