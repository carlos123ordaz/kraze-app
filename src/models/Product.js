const mongoose = require('mongoose');

// Sub-esquema para variantes (tallas, colores)
const variantSchema = new mongoose.Schema({
  talla: {
    type: String,
    required: true,
    uppercase: true,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40', 'UNICA']
  },
  color: {
    nombre: {
      type: String,
      required: true,
      trim: true
    },
    codigoHex: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: 'Código hexadecimal de color no válido'
      }
    }
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  precioAdicional: {
    type: Number,
    default: 0,
    min: 0
  },
  imagenes: [{
    url: {
      type: String,
      required: true
    },
    alt: String,
    esPrincipal: {
      type: Boolean,
      default: false
    }
  }],
  activo: {
    type: Boolean,
    default: true
  }
}, { _id: true });

const productSchema = new mongoose.Schema({
  // Información básica
  nombre: {
    type: String,
    required: [true, 'El nombre del producto es requerido'],
    trim: true,
    maxlength: [200, 'El nombre no puede exceder 200 caracteres']
  },
  slug: {
    type: String,
    // required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  descripcionCorta: {
    type: String,
    required: true,
    trim: true,
    maxlength: [300, 'La descripción corta no puede exceder 300 caracteres']
  },
  descripcionCompleta: {
    type: String,
    required: true,
    trim: true
  },

  // Categorización
  categoria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategoria: {
    type: String,
    trim: true
  },
  colecciones: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collection'
  }],
  
  // Etiquetas y filtros
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  genero: {
    type: String,
    enum: ['hombre', 'mujer', 'unisex', 'nino', 'nina'],
    required: true
  },
  temporada: {
    type: String,
    enum: ['verano', 'invierno', 'otono', 'primavera', 'todo_el_ano']
  },
  marca: {
    type: String,
    trim: true
  },

  // Precios en soles peruanos (PEN)
  precio: {
    type: Number,
    required: [true, 'El precio es requerido'],
    min: [0, 'El precio no puede ser negativo']
  },
  precioAnterior: {
    type: Number,
    min: 0
  },
  descuento: {
    porcentaje: {
      type: Number,
      min: 0,
      max: 100
    },
    fechaInicio: Date,
    fechaFin: Date,
    activo: {
      type: Boolean,
      default: false
    }
  },

  // Variantes (tallas y colores)
  variantes: [variantSchema],

  // Stock global (suma de todas las variantes)
  stockTotal: {
    type: Number,
    default: 0,
    min: 0
  },

  // Imágenes principales del producto
  imagenesPrincipales: [{
    url: {
      type: String,
      required: true
    },
    alt: String,
    orden: {
      type: Number,
      default: 0
    }
  }],

  // Características del producto
  caracteristicas: {
    material: String,
    composicion: String,
    cuidados: [String],
    ajuste: {
      type: String,
      enum: ['slim', 'regular', 'loose', 'oversized']
    },
    largo: String,
    peso: String
  },

  // Medidas (guía de tallas)
  guiaTallas: [{
    talla: String,
    pecho: String,
    cintura: String,
    cadera: String,
    largo: String
  }],

  // SEO
  seo: {
    metaTitulo: {
      type: String,
      maxlength: 60
    },
    metaDescripcion: {
      type: String,
      maxlength: 160
    },
    palabrasClave: [String]
  },

  // Ratings y reviews
  rating: {
    promedio: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    total: {
      type: Number,
      default: 0
    },
    distribucion: {
      cinco: { type: Number, default: 0 },
      cuatro: { type: Number, default: 0 },
      tres: { type: Number, default: 0 },
      dos: { type: Number, default: 0 },
      uno: { type: Number, default: 0 }
    }
  },

  // Estadísticas
  estadisticas: {
    vistas: {
      type: Number,
      default: 0
    },
    ventasTotales: {
      type: Number,
      default: 0
    },
    enCarritos: {
      type: Number,
      default: 0
    },
    enWishlists: {
      type: Number,
      default: 0
    }
  },

  // Estado y disponibilidad
  estado: {
    type: String,
    enum: ['borrador', 'activo', 'agotado', 'descontinuado'],
    default: 'borrador'
  },
  disponible: {
    type: Boolean,
    default: true
  },
  destacado: {
    type: Boolean,
    default: false
  },
  nuevo: {
    type: Boolean,
    default: false
  },

  // Productos relacionados
  productosRelacionados: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],

  // Fechas importantes
  fechaLanzamiento: {
    type: Date,
    default: Date.now
  },

  // Administración
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  modificadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para búsquedas y filtros
productSchema.index({ nombre: 'text', descripcionCorta: 'text', tags: 'text' });
productSchema.index({ categoria: 1 });
productSchema.index({ precio: 1 });
productSchema.index({ 'rating.promedio': -1 });
productSchema.index({ 'estadisticas.ventasTotales': -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ slug: 1 });
productSchema.index({ estado: 1, disponible: 1 });
productSchema.index({ genero: 1 });

// Virtual para precio con descuento
productSchema.virtual('precioFinal').get(function() {
  if (this.descuento && this.descuento.activo) {
    const ahora = new Date();
    if ((!this.descuento.fechaInicio || ahora >= this.descuento.fechaInicio) &&
        (!this.descuento.fechaFin || ahora <= this.descuento.fechaFin)) {
      return this.precio - (this.precio * this.descuento.porcentaje / 100);
    }
  }
  return this.precio;
});

// Virtual para saber si hay descuento activo
productSchema.virtual('tieneDescuento').get(function() {
  if (!this.descuento || !this.descuento.activo) return false;
  const ahora = new Date();
  return (!this.descuento.fechaInicio || ahora >= this.descuento.fechaInicio) &&
         (!this.descuento.fechaFin || ahora <= this.descuento.fechaFin);
});

// Virtual para reviews
productSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'producto'
});

// Middleware para generar slug automáticamente
productSchema.pre('save', function(next) {
  if (this.isModified('nombre') && !this.slug) {
    this.slug = this.nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
      .replace(/\s+/g, '-') // Espacios a guiones
      .replace(/-+/g, '-') // Múltiples guiones a uno
      .trim();
  }
  next();
});

// Middleware para actualizar stockTotal antes de guardar
productSchema.pre('save', function(next) {
  if (!this.slug || this.isModified('nombre')) {
    this.slug = this.nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  next();
});

// Método para actualizar rating
productSchema.methods.actualizarRating = async function() {
  const Review = mongoose.models.Review || mongoose.model('Review');
  const stats = await Review.aggregate([
    {
      $match: {
        producto: this._id,
        aprobado: true
      }
    },
    {
      $group: {
        _id: null,
        promedio: { $avg: '$calificacion' },
        total: { $sum: 1 },
        cinco: {
          $sum: { $cond: [{ $eq: ['$calificacion', 5] }, 1, 0] }
        },
        cuatro: {
          $sum: { $cond: [{ $eq: ['$calificacion', 4] }, 1, 0] }
        },
        tres: {
          $sum: { $cond: [{ $eq: ['$calificacion', 3] }, 1, 0] }
        },
        dos: {
          $sum: { $cond: [{ $eq: ['$calificacion', 2] }, 1, 0] }
        },
        uno: {
          $sum: { $cond: [{ $eq: ['$calificacion', 1] }, 1, 0] }
        }
      }
    }
  ]);

  if (stats.length > 0) {
    this.rating = {
      promedio: Math.round(stats[0].promedio * 10) / 10,
      total: stats[0].total,
      distribucion: {
        cinco: stats[0].cinco,
        cuatro: stats[0].cuatro,
        tres: stats[0].tres,
        dos: stats[0].dos,
        uno: stats[0].uno
      }
    };
  } else {
    this.rating = {
      promedio: 0,
      total: 0,
      distribucion: { cinco: 0, cuatro: 0, tres: 0, dos: 0, uno: 0 }
    };
  }

  await this.save();
};

// Método para verificar disponibilidad de variante
productSchema.methods.verificarDisponibilidad = function(varianteId, cantidad) {
  const variante = this.variantes.id(varianteId);
  if (!variante || !variante.activo) {
    return { disponible: false, mensaje: 'Variante no disponible' };
  }
  if (variante.stock < cantidad) {
    return { 
      disponible: false, 
      mensaje: `Solo hay ${variante.stock} unidades disponibles`,
      stockDisponible: variante.stock
    };
  }
  return { disponible: true };
};

// Método para reducir stock
productSchema.methods.reducirStock = async function(varianteId, cantidad) {
  const variante = this.variantes.id(varianteId);
  if (!variante) {
    throw new Error('Variante no encontrada');
  }
  if (variante.stock < cantidad) {
    throw new Error('Stock insuficiente');
  }
  
  variante.stock -= cantidad;
  this.estadisticas.ventasTotales += cantidad;
  await this.save();
};

module.exports = mongoose.model('Product', productSchema);