const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre de la colección es requerido'],
    trim: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  descripcion: {
    type: String,
    trim: true
  },

  // Tipo de colección
  tipo: {
    type: String,
    enum: ['manual', 'automatica', 'destacada'],
    default: 'manual'
  },

  // Reglas para colecciones automáticas
  reglasAutomaticas: {
    ordenarPor: {
      type: String,
      enum: ['mas_vendidos', 'mas_recientes', 'mejor_valorados', 'precio_bajo', 'precio_alto'],
      default: 'mas_vendidos'
    },
    limite: {
      type: Number,
      default: 20
    },
    filtros: {
      categoria: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
      },
      genero: {
        type: String,
        enum: ['hombre', 'mujer', 'unisex', 'nino', 'nina']
      },
      tags: [String],
      precioMinimo: Number,
      precioMaximo: Number,
      nuevo: Boolean,
      destacado: Boolean,
      conDescuento: Boolean
    }
  },

  // Productos manuales (para colecciones manuales)
  productos: [{
    producto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    orden: {
      type: Number,
      default: 0
    }
  }],

  // Imagen de portada
  imagen: {
    url: String,
    alt: String
  },
  banner: {
    url: String,
    alt: String
  },

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

  // Configuración de visualización
  configuracion: {
    mostrarEnHome: {
      type: Boolean,
      default: false
    },
    mostrarEnMenu: {
      type: Boolean,
      default: false
    },
    colorTema: {
      type: String,
      default: '#000000'
    },
    icono: String
  },

  // Fechas de vigencia
  fechaInicio: {
    type: Date
  },
  fechaFin: {
    type: Date
  },

  // Ordenamiento
  orden: {
    type: Number,
    default: 0
  },

  // Estado
  activo: {
    type: Boolean,
    default: true
  },

  // Estadísticas
  estadisticas: {
    vistas: {
      type: Number,
      default: 0
    },
    clics: {
      type: Number,
      default: 0
    }
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
collectionSchema.index({ slug: 1 });
collectionSchema.index({ tipo: 1 });
collectionSchema.index({ activo: 1 });
collectionSchema.index({ orden: 1 });
collectionSchema.index({ fechaInicio: 1, fechaFin: 1 });

// Virtual para verificar si está vigente
collectionSchema.virtual('vigente').get(function() {
  const ahora = new Date();
  const inicioValido = !this.fechaInicio || ahora >= this.fechaInicio;
  const finValido = !this.fechaFin || ahora <= this.fechaFin;
  return inicioValido && finValido;
});

// Middleware para generar slug
collectionSchema.pre('save', function(next) {
  if (this.isModified('nombre') && !this.slug) {
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

// Método para obtener productos de la colección
collectionSchema.methods.obtenerProductos = async function() {
  const Product = mongoose.models.Product || mongoose.model('Product');

  if (this.tipo === 'manual') {
    // Productos manuales ordenados
    const productosIds = this.productos
      .sort((a, b) => a.orden - b.orden)
      .map(p => p.producto);
    
    return await Product.find({
      _id: { $in: productosIds },
      estado: 'activo',
      disponible: true
    });
  } else if (this.tipo === 'automatica') {
    // Construir query según reglas
    const query = {
      estado: 'activo',
      disponible: true
    };

    const reglas = this.reglasAutomaticas;

    if (reglas.filtros.categoria) {
      query.categoria = reglas.filtros.categoria;
    }
    if (reglas.filtros.genero) {
      query.genero = reglas.filtros.genero;
    }
    if (reglas.filtros.tags && reglas.filtros.tags.length > 0) {
      query.tags = { $in: reglas.filtros.tags };
    }
    if (reglas.filtros.precioMinimo !== undefined) {
      query.precio = { $gte: reglas.filtros.precioMinimo };
    }
    if (reglas.filtros.precioMaximo !== undefined) {
      query.precio = { ...query.precio, $lte: reglas.filtros.precioMaximo };
    }
    if (reglas.filtros.nuevo !== undefined) {
      query.nuevo = reglas.filtros.nuevo;
    }
    if (reglas.filtros.destacado !== undefined) {
      query.destacado = reglas.filtros.destacado;
    }
    if (reglas.filtros.conDescuento) {
      query['descuento.activo'] = true;
    }

    // Ordenamiento
    let sort = {};
    switch (reglas.ordenarPor) {
      case 'mas_vendidos':
        sort = { 'estadisticas.ventasTotales': -1 };
        break;
      case 'mas_recientes':
        sort = { createdAt: -1 };
        break;
      case 'mejor_valorados':
        sort = { 'rating.promedio': -1 };
        break;
      case 'precio_bajo':
        sort = { precio: 1 };
        break;
      case 'precio_alto':
        sort = { precio: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    return await Product.find(query)
      .sort(sort)
      .limit(reglas.limite || 20);
  }

  return [];
};

// Método para agregar producto (colección manual)
collectionSchema.methods.agregarProducto = async function(productoId, orden = null) {
  if (this.tipo !== 'manual') {
    throw new Error('Solo se pueden agregar productos manualmente a colecciones manuales');
  }

  // Verificar si el producto ya está en la colección
  const yaExiste = this.productos.some(p => 
    p.producto.toString() === productoId.toString()
  );

  if (yaExiste) {
    throw new Error('El producto ya está en esta colección');
  }

  const nuevoOrden = orden !== null ? orden : this.productos.length;
  
  this.productos.push({
    producto: productoId,
    orden: nuevoOrden
  });

  await this.save();
  return this;
};

// Método para remover producto (colección manual)
collectionSchema.methods.removerProducto = async function(productoId) {
  if (this.tipo !== 'manual') {
    throw new Error('Solo se pueden remover productos manualmente de colecciones manuales');
  }

  this.productos = this.productos.filter(p => 
    p.producto.toString() !== productoId.toString()
  );

  await this.save();
  return this;
};

// Método estático para crear colecciones predefinidas
collectionSchema.statics.crearColeccionesPredefinidas = async function() {
  const coleccionesPredefinidas = [
    {
      nombre: 'Los Más Vendidos',
      slug: 'mas-vendidos',
      descripcion: 'Los productos más populares de nuestra tienda',
      tipo: 'automatica',
      reglasAutomaticas: {
        ordenarPor: 'mas_vendidos',
        limite: 20
      },
      configuracion: {
        mostrarEnHome: true,
        colorTema: '#FF6B6B'
      }
    },
    {
      nombre: 'Nuevos Arrivals',
      slug: 'nuevos',
      descripcion: 'Las últimas novedades en moda',
      tipo: 'automatica',
      reglasAutomaticas: {
        ordenarPor: 'mas_recientes',
        limite: 20,
        filtros: {
          nuevo: true
        }
      },
      configuracion: {
        mostrarEnHome: true,
        colorTema: '#4ECDC4'
      }
    },
    {
      nombre: 'Ofertas',
      slug: 'ofertas',
      descripcion: 'Productos en promoción',
      tipo: 'automatica',
      reglasAutomaticas: {
        ordenarPor: 'mas_vendidos',
        limite: 30,
        filtros: {
          conDescuento: true
        }
      },
      configuracion: {
        mostrarEnHome: true,
        colorTema: '#FFD93D'
      }
    },
    {
      nombre: 'Mejor Valorados',
      slug: 'mejor-valorados',
      descripcion: 'Productos con las mejores calificaciones',
      tipo: 'automatica',
      reglasAutomaticas: {
        ordenarPor: 'mejor_valorados',
        limite: 20
      },
      configuracion: {
        mostrarEnHome: false,
        colorTema: '#95E1D3'
      }
    }
  ];

  for (const coleccion of coleccionesPredefinidas) {
    await this.findOneAndUpdate(
      { slug: coleccion.slug },
      coleccion,
      { upsert: true, new: true }
    );
  }
};

module.exports = mongoose.model('Collection', collectionSchema);