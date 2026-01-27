const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre de la categoría es requerido'],
    trim: true,
    unique: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
    // No es required porque se genera automáticamente
  },
  descripcion: {
    type: String,
    trim: true
  },

  // Jerarquía de categorías
  padre: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  nivel: {
    type: Number,
    default: 0 // 0 = categoría principal, 1 = subcategoría, etc.
  },

  // Imagen de la categoría
  imagen: {
    url: String,
    alt: String
  },
  icono: {
    type: String // Nombre del icono (ej: 'shirt', 'pants')
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

  // Ordenamiento y visibilidad
  orden: {
    type: Number,
    default: 0
  },
  mostrarEnMenu: {
    type: Boolean,
    default: true
  },
  mostrarEnHome: {
    type: Boolean,
    default: false
  },

  // Estado
  activo: {
    type: Boolean,
    default: true
  },

  // Filtros específicos para esta categoría
  filtrosPersonalizados: [{
    nombre: String,
    tipo: {
      type: String,
      enum: ['rango', 'checkbox', 'radio']
    },
    opciones: [String]
  }]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
categorySchema.index({ slug: 1 });
categorySchema.index({ padre: 1 });
categorySchema.index({ orden: 1 });
categorySchema.index({ activo: 1 });

// Virtual para subcategorías
categorySchema.virtual('subcategorias', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'padre'
});

// Virtual para productos
categorySchema.virtual('productos', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'categoria'
});

// Virtual para contar productos
categorySchema.virtual('cantidadProductos', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'categoria',
  count: true
});

// Middleware para generar slug automáticamente
categorySchema.pre('save', function(next) {
  // Generar slug si no existe o si el nombre cambió
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

// Middleware para establecer el nivel según la jerarquía
categorySchema.pre('save', async function(next) {
  if (this.isModified('padre')) {
    if (this.padre) {
      const categoriaPadre = await this.constructor.findById(this.padre);
      if (categoriaPadre) {
        this.nivel = categoriaPadre.nivel + 1;
      }
    } else {
      this.nivel = 0;
    }
  }
  next();
});

// Método para obtener ruta completa de la categoría
categorySchema.methods.obtenerRuta = async function() {
  let ruta = [this];
  let actual = this;

  while (actual.padre) {
    actual = await this.constructor.findById(actual.padre);
    if (!actual) break;
    ruta.unshift(actual);
  }

  return ruta;
};

// Método para obtener todas las subcategorías (recursivo)
categorySchema.methods.obtenerTodasSubcategorias = async function() {
  const subcategorias = await this.constructor.find({ padre: this._id });
  let todasSubs = [...subcategorias];

  for (const sub of subcategorias) {
    const subsDeEsta = await sub.obtenerTodasSubcategorias();
    todasSubs = todasSubs.concat(subsDeEsta);
  }

  return todasSubs;
};

module.exports = mongoose.model('Category', categorySchema);