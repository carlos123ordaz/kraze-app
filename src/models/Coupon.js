const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  // Código del cupón (único)
  codigo: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },

  // Descripción
  descripcion: {
    type: String,
    required: true,
    trim: true
  },

  // Tipo de descuento
  tipo: {
    type: String,
    enum: ['porcentaje', 'monto_fijo', 'envio_gratis'],
    required: true
  },

  // Valor del descuento
  descuento: {
    type: Number,
    required: function() {
      return this.tipo !== 'envio_gratis';
    },
    min: 0
  },

  // Restricciones de uso
  restricciones: {
    // Monto mínimo de compra
    montoMinimo: {
      type: Number,
      min: 0,
      default: 0
    },

    // Monto máximo de descuento (para porcentajes)
    descuentoMaximo: {
      type: Number,
      min: 0
    },

    // Productos específicos
    productos: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],

    // Categorías específicas
    categorias: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],

    // Colecciones específicas
    colecciones: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collection'
    }],

    // Primer pedido del usuario
    soloPrimerPedido: {
      type: Boolean,
      default: false
    },

    // Solo para usuarios específicos
    usuariosPermitidos: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],

    // Excluir productos en oferta
    excluirOfertas: {
      type: Boolean,
      default: false
    }
  },

  // Límites de uso
  limites: {
    // Número máximo de usos totales
    usosMaximos: {
      type: Number,
      min: 1
    },

    // Número de usos actuales
    usosActuales: {
      type: Number,
      default: 0
    },

    // Máximo de usos por usuario
    usosMaximosPorUsuario: {
      type: Number,
      default: 1,
      min: 1
    }
  },

  // Vigencia
  vigencia: {
    fechaInicio: {
      type: Date,
      required: true,
      default: Date.now
    },
    fechaFin: {
      type: Date,
      required: true
    }
  },

  // Estado
  activo: {
    type: Boolean,
    default: true
  },

  // Historial de usos
  historialUsos: [{
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    orden: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    fecha: {
      type: Date,
      default: Date.now
    },
    montoDescuento: Number
  }],

  // Metadata
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notas: String

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
couponSchema.index({ codigo: 1 });
couponSchema.index({ activo: 1 });
couponSchema.index({ 'vigencia.fechaInicio': 1, 'vigencia.fechaFin': 1 });
couponSchema.index({ 'limites.usosActuales': 1, 'limites.usosMaximos': 1 });

// Virtual para saber si está vigente
couponSchema.virtual('vigente').get(function() {
  const ahora = new Date();
  return ahora >= this.vigencia.fechaInicio && ahora <= this.vigencia.fechaFin;
});

// Virtual para saber si tiene usos disponibles
couponSchema.virtual('tieneUsosDisponibles').get(function() {
  if (!this.limites.usosMaximos) return true;
  return this.limites.usosActuales < this.limites.usosMaximos;
});

// Método para validar cupón
couponSchema.methods.validarCupon = async function(subtotal, userId, items) {
  // Verificar si está activo
  if (!this.activo) {
    return {
      valido: false,
      mensaje: 'Este cupón no está activo'
    };
  }

  // Verificar vigencia
  if (!this.vigente) {
    return {
      valido: false,
      mensaje: 'Este cupón ha expirado o aún no está disponible'
    };
  }

  // Verificar usos totales
  if (!this.tieneUsosDisponibles) {
    return {
      valido: false,
      mensaje: 'Este cupón ha alcanzado su límite de usos'
    };
  }

  // Verificar monto mínimo
  if (this.restricciones.montoMinimo > 0 && subtotal < this.restricciones.montoMinimo) {
    return {
      valido: false,
      mensaje: `El monto mínimo para usar este cupón es S/ ${this.restricciones.montoMinimo}`
    };
  }

  // Si es para usuarios específicos, verificar
  if (this.restricciones.usuariosPermitidos.length > 0) {
    if (!userId || !this.restricciones.usuariosPermitidos.includes(userId)) {
      return {
        valido: false,
        mensaje: 'Este cupón no está disponible para tu cuenta'
      };
    }
  }

  // Verificar si es solo para primer pedido
  if (this.restricciones.soloPrimerPedido && userId) {
    const Order = mongoose.model('Order');
    const pedidosAnteriores = await Order.countDocuments({
      usuario: userId,
      estado: { $ne: 'cancelado' }
    });

    if (pedidosAnteriores > 0) {
      return {
        valido: false,
        mensaje: 'Este cupón es solo para tu primera compra'
      };
    }
  }

  // Verificar usos por usuario
  if (userId) {
    const usosUsuario = this.historialUsos.filter(uso =>
      uso.usuario && uso.usuario.toString() === userId.toString()
    ).length;

    if (usosUsuario >= this.limites.usosMaximosPorUsuario) {
      return {
        valido: false,
        mensaje: 'Ya has usado este cupón el máximo de veces permitido'
      };
    }
  }

  // Verificar restricciones de productos/categorías/colecciones
  if (items && (
    this.restricciones.productos.length > 0 ||
    this.restricciones.categorias.length > 0 ||
    this.restricciones.colecciones.length > 0
  )) {
    const Product = mongoose.model('Product');
    let algunProductoAplica = false;

    for (const item of items) {
      const producto = await Product.findById(item.producto);
      if (!producto) continue;

      // Verificar si el producto tiene descuento y si debemos excluirlo
      if (this.restricciones.excluirOfertas && producto.tieneDescuento) {
        continue;
      }

      // Verificar productos específicos
      if (this.restricciones.productos.length > 0) {
        if (this.restricciones.productos.includes(producto._id)) {
          algunProductoAplica = true;
          break;
        }
      }

      // Verificar categorías
      if (this.restricciones.categorias.length > 0) {
        if (this.restricciones.categorias.includes(producto.categoria)) {
          algunProductoAplica = true;
          break;
        }
      }

      // Verificar colecciones
      if (this.restricciones.colecciones.length > 0) {
        const tieneColeccionPermitida = producto.colecciones.some(col =>
          this.restricciones.colecciones.includes(col)
        );
        if (tieneColeccionPermitida) {
          algunProductoAplica = true;
          break;
        }
      }
    }

    if (!algunProductoAplica) {
      return {
        valido: false,
        mensaje: 'Este cupón no aplica para los productos en tu carrito'
      };
    }
  }

  return {
    valido: true,
    mensaje: 'Cupón válido'
  };
};

// Método para calcular descuento
couponSchema.methods.calcularDescuento = function(subtotal) {
  let descuento = 0;

  if (this.tipo === 'porcentaje') {
    descuento = subtotal * (this.descuento / 100);
    
    // Aplicar límite máximo si existe
    if (this.restricciones.descuentoMaximo) {
      descuento = Math.min(descuento, this.restricciones.descuentoMaximo);
    }
  } else if (this.tipo === 'monto_fijo') {
    descuento = Math.min(this.descuento, subtotal);
  }

  return Math.round(descuento * 100) / 100; // Redondear a 2 decimales
};

// Método para registrar uso
couponSchema.methods.registrarUso = async function(userId, orderId, montoDescuento) {
  this.limites.usosActuales += 1;
  this.historialUsos.push({
    usuario: userId,
    orden: orderId,
    fecha: new Date(),
    montoDescuento
  });
  await this.save();
};

// Método estático para generar código aleatorio
couponSchema.statics.generarCodigoAleatorio = function(longitud = 8) {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';
  for (let i = 0; i < longitud; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
};

// Método estático para crear cupón de bienvenida
couponSchema.statics.crearCuponBienvenida = async function() {
  const codigo = 'BIENVENIDO10';
  
  const cuponExistente = await this.findOne({ codigo });
  if (cuponExistente) return cuponExistente;

  const cupon = await this.create({
    codigo,
    descripcion: '10% de descuento en tu primera compra',
    tipo: 'porcentaje',
    descuento: 10,
    restricciones: {
      montoMinimo: 50,
      descuentoMaximo: 50,
      soloPrimerPedido: true
    },
    limites: {
      usosMaximosPorUsuario: 1
    },
    vigencia: {
      fechaInicio: new Date(),
      fechaFin: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 año
    },
    activo: true
  });

  return cupon;
};

module.exports = mongoose.model('Coupon', couponSchema);