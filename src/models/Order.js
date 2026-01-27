const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variante: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  nombre: {
    type: String,
    required: true
  },
  talla: {
    type: String,
    required: true
  },
  color: {
    nombre: String,
    codigoHex: String
  },
  sku: {
    type: String,
    required: true
  },
  imagen: String,
  cantidad: {
    type: Number,
    required: true,
    min: 1
  },
  precioUnitario: {
    type: Number,
    required: true,
    min: 0
  },
  precioTotal: {
    type: Number,
    required: true,
    min: 0
  },
  descuento: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  // Número de orden único
  numeroOrden: {
    type: String,
    // required: true,
    unique: true,
    uppercase: true
  },

  // Usuario (null si es guest checkout)
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  esGuest: {
    type: Boolean,
    default: false
  },

  // Información del cliente
  cliente: {
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
      lowercase: true,
      trim: true
    },
    telefono: {
      type: String,
      required: true,
      trim: true
    },
    dni: {
      type: String,
      required: true,
      trim: true
    }
  },

  // Dirección de envío
  direccionEnvio: {
    direccion: {
      type: String,
      required: true,
      trim: true
    },
    referencia: String,
    departamento: {
      type: String,
      required: true
    },
    provincia: {
      type: String,
      required: true
    },
    distrito: {
      type: String,
      required: true
    },
    codigoPostal: String,
    ubicacion: {
      latitud: Number,
      longitud: Number
    }
  },

  // Items del pedido
  items: {
    type: [orderItemSchema],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'El pedido debe tener al menos un producto'
    }
  },

  // Montos (en soles peruanos PEN)
  montos: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    descuentos: {
      type: Number,
      default: 0,
      min: 0
    },
    costoEnvio: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },

  // Cupón aplicado
  cupon: {
    codigo: String,
    descuento: Number,
    tipo: {
      type: String,
      enum: ['porcentaje', 'monto_fijo']
    }
  },

  // Método de pago
  metodoPago: {
    tipo: {
      type: String,
      enum: ['contra_entrega', 'yape', 'mercado_pago', 'transferencia'],
      required: true
    },
    estado: {
      type: String,
      enum: ['pendiente', 'pagado', 'fallido', 'reembolsado'],
      default: 'pendiente'
    },
    fechaPago: Date,
    
    // Para Yape
    numeroYape: String,
    comprobanteYape: String,
    
    // Para Mercado Pago
    mercadoPagoId: String,
    mercadoPagoEstado: String,
    
    // Para transferencia
    numeroOperacion: String,
    comprobanteBanco: String,
    
    transaccionId: String
  },

  // Método de envío
  envio: {
    zona: {
      type: String,
      required: true,
      enum: ['lima', 'provincia']
    },
    costo: {
      type: Number,
      required: true
    },
    empresaCourier: String,
    numeroSeguimiento: String,
    tiempoEstimado: String, // Ej: "3-5 días hábiles"
    instruccionesEspeciales: String
  },

  // Estado del pedido
  estado: {
    type: String,
    enum: [
      'pendiente_pago',
      'confirmado',
      'procesando',
      'enviado',
      'en_transito',
      'en_reparto',
      'entregado',
      'cancelado',
      'devolucion_solicitada',
      'devuelto',
      'reembolsado'
    ],
    default: 'pendiente_pago'
  },

  // Historial de estados
  historialEstados: [{
    estado: {
      type: String,
      required: true
    },
    comentario: String,
    fecha: {
      type: Date,
      default: Date.now
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Notas y comentarios
  notasCliente: String,
  notasInternas: String,

  // Facturación
  facturacion: {
    requiereFactura: {
      type: Boolean,
      default: false
    },
    ruc: String,
    razonSocial: String,
    direccionFiscal: String
  },

  // Seguimiento
  seguimiento: {
    ordenCreada: Date,
    pagoConfirmado: Date,
    pedidoProcesado: Date,
    pedidoEnviado: Date,
    pedidoEntregado: Date
  },

  // Calificación del servicio
  calificacionServicio: {
    calificacion: {
      type: Number,
      min: 1,
      max: 5
    },
    comentario: String,
    fecha: Date
  },

  // Información adicional
  ip: String,
  userAgent: String,
  origen: {
    type: String,
    enum: ['web', 'mobile', 'admin'],
    default: 'web'
  },

  // Cancelación/Devolución
  cancelacion: {
    fecha: Date,
    razon: String,
    canceladoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  devolucion: {
    fecha: Date,
    razon: String,
    estado: {
      type: String,
      enum: ['solicitada', 'aprobada', 'rechazada', 'completada']
    },
    montoReembolsado: Number
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
orderSchema.index({ numeroOrden: 1 });
orderSchema.index({ usuario: 1, createdAt: -1 });
orderSchema.index({ estado: 1 });
orderSchema.index({ 'cliente.email': 1 });
orderSchema.index({ 'metodoPago.tipo': 1 });
orderSchema.index({ 'metodoPago.estado': 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'items.producto': 1 });

// Middleware para generar número de orden único
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.numeroOrden) {
    try {
      const fecha = new Date();
      const año = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      
      // Obtener la fecha de inicio y fin del día actual
      const inicioDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0);
      const finDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59, 999);
      
      // Contar órdenes del día (usar countDocuments en lugar de count)
      const ordenesHoy = await this.constructor.countDocuments({
        createdAt: {
          $gte: inicioDia,
          $lte: finDia
        }
      });
      
      const contador = String(ordenesHoy + 1).padStart(4, '0');
      this.numeroOrden = `ORD-${año}${mes}${dia}-${contador}`;
      
      // Si el número ya existe (caso de concurrencia), agregar timestamp
      const existe = await this.constructor.findOne({ numeroOrden: this.numeroOrden });
      if (existe) {
        const timestamp = Date.now().toString().slice(-4);
        this.numeroOrden = `ORD-${año}${mes}${dia}-${contador}-${timestamp}`;
      }
    } catch (error) {
      console.error('Error generando numeroOrden:', error);
      // Generar número de respaldo con timestamp
      const timestamp = Date.now();
      this.numeroOrden = `ORD-${timestamp}`;
    }
  }
  next();
});

// Middleware para agregar al historial de estados cuando cambia el estado
orderSchema.pre('save', function(next) {
  if (this.isModified('estado') && !this.isNew) {
    this.historialEstados.push({
      estado: this.estado,
      fecha: new Date()
    });

    // Actualizar seguimiento
    switch (this.estado) {
      case 'confirmado':
        this.seguimiento.pagoConfirmado = new Date();
        break;
      case 'procesando':
        this.seguimiento.pedidoProcesado = new Date();
        break;
      case 'enviado':
      case 'en_transito':
        this.seguimiento.pedidoEnviado = new Date();
        break;
      case 'entregado':
        this.seguimiento.pedidoEntregado = new Date();
        break;
    }
  }
  next();
});

// Virtual para días desde la orden
orderSchema.virtual('diasDesdeOrden').get(function() {
  if (!this.createdAt) return 0;
  const diff = Date.now() - this.createdAt.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Método para calcular totales
orderSchema.methods.calcularTotales = function() {
  // Calcular subtotal
  this.montos.subtotal = this.items.reduce((sum, item) => {
    return sum + item.precioTotal;
  }, 0);

  // Aplicar descuento de cupón si existe
  let descuentoCupon = 0;
  if (this.cupon && this.cupon.codigo) {
    if (this.cupon.tipo === 'porcentaje') {
      descuentoCupon = this.montos.subtotal * (this.cupon.descuento / 100);
    } else if (this.cupon.tipo === 'monto_fijo') {
      descuentoCupon = this.cupon.descuento;
    }
  }

  this.montos.descuentos = descuentoCupon;

  // Calcular total
  this.montos.total = this.montos.subtotal - this.montos.descuentos + this.montos.costoEnvio;

  return this.montos;
};

// Método para cambiar estado
orderSchema.methods.cambiarEstado = async function(nuevoEstado, comentario, usuarioId) {
  this.estado = nuevoEstado;
  this.historialEstados.push({
    estado: nuevoEstado,
    comentario,
    fecha: new Date(),
    usuario: usuarioId
  });
  await this.save();
  return this;
};

// Método para confirmar pago
orderSchema.methods.confirmarPago = async function(datosPago) {
  this.metodoPago.estado = 'pagado';
  this.metodoPago.fechaPago = new Date();
  
  if (datosPago.transaccionId) {
    this.metodoPago.transaccionId = datosPago.transaccionId;
  }
  if (datosPago.mercadoPagoId) {
    this.metodoPago.mercadoPagoId = datosPago.mercadoPagoId;
  }
  
  this.estado = 'confirmado';
  await this.save();
  return this;
};

// Método para cancelar orden
orderSchema.methods.cancelar = async function(razon, usuarioId) {
  if (['entregado', 'cancelado'].includes(this.estado)) {
    throw new Error('No se puede cancelar este pedido');
  }

  this.estado = 'cancelado';
  this.cancelacion = {
    fecha: new Date(),
    razon,
    canceladoPor: usuarioId
  };

  // Restaurar stock
  const Product = mongoose.model('Product');
  for (const item of this.items) {
    const producto = await Product.findById(item.producto);
    if (producto) {
      const variante = producto.variantes.id(item.variante);
      if (variante) {
        variante.stock += item.cantidad;
        await producto.save();
      }
    }
  }

  await this.save();
  return this;
};

// Método estático para obtener estadísticas
orderSchema.statics.obtenerEstadisticas = async function(fechaInicio, fechaFin) {
  const match = {
    createdAt: {
      $gte: fechaInicio,
      $lte: fechaFin
    },
    estado: { $ne: 'cancelado' }
  };

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalOrdenes: { $sum: 1 },
        totalVentas: { $sum: '$montos.total' },
        ticketPromedio: { $avg: '$montos.total' },
        productosVendidos: {
          $sum: {
            $sum: '$items.cantidad'
          }
        }
      }
    }
  ]);

  return stats[0] || {
    totalOrdenes: 0,
    totalVentas: 0,
    ticketPromedio: 0,
    productosVendidos: 0
  };
};

module.exports = mongoose.model('Order', orderSchema);