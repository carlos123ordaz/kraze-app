const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variante: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  cantidad: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  // Guardar información del producto en el momento de agregarlo
  // para evitar problemas si el producto cambia de precio
  precioUnitario: {
    type: Number,
    required: true
  },
  talla: String,
  color: String,
  sku: String
}, {
  timestamps: true
});

const cartSchema = new mongoose.Schema({
  // Usuario (null si es carrito de guest/sesión)
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true // Permite null para carritos de guests
  },

  // Para carritos de guests/sesión
  sessionId: {
    type: String,
    sparse: true
  },

  // Items del carrito
  items: [cartItemSchema],

  // Cupón aplicado
  cupon: {
    codigo: String,
    descuento: Number,
    tipo: {
      type: String,
      enum: ['porcentaje', 'monto_fijo']
    },
    valido: {
      type: Boolean,
      default: true
    }
  },

  // Totales calculados
  totales: {
    subtotal: {
      type: Number,
      default: 0
    },
    descuentos: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },

  // Metadata
  ultimaActividad: {
    type: Date,
    default: Date.now
  },

  // Estado
  activo: {
    type: Boolean,
    default: true
  },

  // Para recuperar carritos abandonados
  convertidoAOrden: {
    type: Boolean,
    default: false
  },
  ordenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
cartSchema.index({ usuario: 1 });
cartSchema.index({ sessionId: 1 });
cartSchema.index({ ultimaActividad: 1 });
cartSchema.index({ activo: 1 });
cartSchema.index({ convertidoAOrden: 1 });

// Índice compuesto para buscar carrito activo de un usuario
cartSchema.index({ usuario: 1, activo: 1 });

// Virtual para cantidad total de items
cartSchema.virtual('cantidadTotal').get(function() {
  return this.items.reduce((total, item) => total + item.cantidad, 0);
});

// Middleware para actualizar ultimaActividad en cada cambio
cartSchema.pre('save', function(next) {
  this.ultimaActividad = new Date();
  next();
});

// Método para agregar item al carrito
cartSchema.methods.agregarItem = async function(productoId, varianteId, cantidad = 1) {
  const Product = mongoose.model('Product');
  const producto = await Product.findById(productoId);

  if (!producto || !producto.disponible) {
    throw new Error('Producto no disponible');
  }

  const variante = producto.variantes.id(varianteId);
  if (!variante || !variante.activo) {
    throw new Error('Variante no disponible');
  }

  // Verificar stock
  const verificacion = producto.verificarDisponibilidad(varianteId, cantidad);
  if (!verificacion.disponible) {
    throw new Error(verificacion.mensaje);
  }

  // Verificar si el item ya existe en el carrito
  const itemExistente = this.items.find(item =>
    item.producto.toString() === productoId.toString() &&
    item.variante.toString() === varianteId.toString()
  );

  if (itemExistente) {
    // Actualizar cantidad
    const nuevaCantidad = itemExistente.cantidad + cantidad;
    const verificacionNueva = producto.verificarDisponibilidad(varianteId, nuevaCantidad);
    
    if (!verificacionNueva.disponible) {
      throw new Error(verificacionNueva.mensaje);
    }

    itemExistente.cantidad = nuevaCantidad;
  } else {
    // Agregar nuevo item
    const precioUnitario = producto.precioFinal + (variante.precioAdicional || 0);
    
    this.items.push({
      producto: productoId,
      variante: varianteId,
      cantidad,
      precioUnitario,
      talla: variante.talla,
      color: variante.color.nombre,
      sku: variante.sku
    });
  }

  this.calcularTotales();
  await this.save();
  return this;
};

// Método para actualizar cantidad de un item
cartSchema.methods.actualizarCantidad = async function(itemId, nuevaCantidad) {
  if (nuevaCantidad < 1) {
    throw new Error('La cantidad debe ser al menos 1');
  }

  const item = this.items.id(itemId);
  if (!item) {
    throw new Error('Item no encontrado en el carrito');
  }

  // Verificar stock disponible
  const Product = mongoose.model('Product');
  const producto = await Product.findById(item.producto);

  if (!producto) {
    throw new Error('Producto no encontrado');
  }

  const verificacion = producto.verificarDisponibilidad(item.variante, nuevaCantidad);
  if (!verificacion.disponible) {
    throw new Error(verificacion.mensaje);
  }

  item.cantidad = nuevaCantidad;
  this.calcularTotales();
  await this.save();
  return this;
};

// Método para remover item
cartSchema.methods.removerItem = async function(itemId) {
  const item = this.items.id(itemId);
  if (!item) {
    throw new Error('Item no encontrado en el carrito');
  }

  this.items.pull(itemId);
  this.calcularTotales();
  await this.save();
  return this;
};

// Método para limpiar carrito
cartSchema.methods.limpiar = async function() {
  this.items = [];
  this.cupon = undefined;
  this.calcularTotales();
  await this.save();
  return this;
};

// Método para aplicar cupón
cartSchema.methods.aplicarCupon = async function(codigo) {
  const Coupon = mongoose.model('Coupon');
  const cupon = await Coupon.findOne({ codigo, activo: true });

  if (!cupon) {
    throw new Error('Cupón no válido');
  }

  // Verificar validez del cupón
  const validacion = await cupon.validarCupon(this.totales.subtotal, this.usuario);
  if (!validacion.valido) {
    throw new Error(validacion.mensaje);
  }

  this.cupon = {
    codigo: cupon.codigo,
    descuento: cupon.descuento,
    tipo: cupon.tipo,
    valido: true
  };

  this.calcularTotales();
  await this.save();
  return this;
};

// Método para remover cupón
cartSchema.methods.removerCupon = async function() {
  this.cupon = undefined;
  this.calcularTotales();
  await this.save();
  return this;
};

// Método para calcular totales
cartSchema.methods.calcularTotales = function() {
  // Calcular subtotal
  this.totales.subtotal = this.items.reduce((sum, item) => {
    return sum + (item.precioUnitario * item.cantidad);
  }, 0);

  // Calcular descuento del cupón
  let descuentoCupon = 0;
  if (this.cupon && this.cupon.valido) {
    if (this.cupon.tipo === 'porcentaje') {
      descuentoCupon = this.totales.subtotal * (this.cupon.descuento / 100);
    } else if (this.cupon.tipo === 'monto_fijo') {
      descuentoCupon = Math.min(this.cupon.descuento, this.totales.subtotal);
    }
  }

  this.totales.descuentos = descuentoCupon;
  this.totales.total = this.totales.subtotal - this.totales.descuentos;

  return this.totales;
};

// Método para verificar disponibilidad de todos los items
cartSchema.methods.verificarDisponibilidadItems = async function() {
  const Product = mongoose.model('Product');
  const itemsNoDisponibles = [];

  for (const item of this.items) {
    const producto = await Product.findById(item.producto);

    if (!producto || !producto.disponible) {
      itemsNoDisponibles.push({
        item,
        razon: 'Producto no disponible'
      });
      continue;
    }

    const verificacion = producto.verificarDisponibilidad(item.variante, item.cantidad);
    if (!verificacion.disponible) {
      itemsNoDisponibles.push({
        item,
        razon: verificacion.mensaje,
        stockDisponible: verificacion.stockDisponible
      });
    }
  }

  return {
    todosDisponibles: itemsNoDisponibles.length === 0,
    itemsNoDisponibles
  };
};

// Método para actualizar precios desde productos actuales
cartSchema.methods.actualizarPrecios = async function() {
  const Product = mongoose.model('Product');

  for (const item of this.items) {
    const producto = await Product.findById(item.producto);
    if (producto) {
      const variante = producto.variantes.id(item.variante);
      if (variante) {
        item.precioUnitario = producto.precioFinal + (variante.precioAdicional || 0);
      }
    }
  }

  this.calcularTotales();
  await this.save();
  return this;
};

// Método para mergear carrito de guest con carrito de usuario
cartSchema.methods.mergearConCarrito = async function(otroCarrito) {
  if (!otroCarrito || otroCarrito.items.length === 0) {
    return this;
  }

  const Product = mongoose.model('Product');

  for (const otroItem of otroCarrito.items) {
    // Verificar disponibilidad
    const producto = await Product.findById(otroItem.producto);
    if (!producto || !producto.disponible) continue;

    const verificacion = producto.verificarDisponibilidad(otroItem.variante, otroItem.cantidad);
    if (!verificacion.disponible) continue;

    // Buscar si ya existe en este carrito
    const itemExistente = this.items.find(item =>
      item.producto.toString() === otroItem.producto.toString() &&
      item.variante.toString() === otroItem.variante.toString()
    );

    if (itemExistente) {
      // Sumar cantidades si es posible
      const nuevaCantidad = itemExistente.cantidad + otroItem.cantidad;
      const verificacionNueva = producto.verificarDisponibilidad(otroItem.variante, nuevaCantidad);
      
      if (verificacionNueva.disponible) {
        itemExistente.cantidad = nuevaCantidad;
      }
    } else {
      // Agregar nuevo item
      this.items.push(otroItem);
    }
  }

  this.calcularTotales();
  await this.save();

  // Eliminar el otro carrito
  await otroCarrito.remove();

  return this;
};

// Método estático para limpiar carritos abandonados
cartSchema.statics.limpiarCarritosAbandonados = async function(diasInactividad = 30) {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - diasInactividad);

  const resultado = await this.deleteMany({
    ultimaActividad: { $lt: fechaLimite },
    convertidoAOrden: false,
    activo: true
  });

  return resultado.deletedCount;
};

// Método estático para obtener carritos abandonados (para remarketing)
cartSchema.statics.obtenerCarritosAbandonados = async function(horasInactividad = 24) {
  const fechaLimite = new Date();
  fechaLimite.setHours(fechaLimite.getHours() - horasInactividad);

  return await this.find({
    ultimaActividad: { $lt: fechaLimite },
    convertidoAOrden: false,
    activo: true,
    usuario: { $ne: null }, // Solo carritos de usuarios registrados
    'items.0': { $exists: true } // Que tengan al menos un item
  }).populate('usuario', 'email nombres apellidos');
};

module.exports = mongoose.model('Cart', cartSchema);