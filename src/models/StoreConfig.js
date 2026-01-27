const mongoose = require('mongoose');

const storeConfigSchema = new mongoose.Schema({
  // Solo habrá un documento de configuración
  _id: {
    type: String,
    default: 'store_config'
  },

  // Información de la tienda
  tienda: {
    nombre: {
      type: String,
      required: true,
      default: 'Mi Tienda de Ropa'
    },
    slogan: String,
    descripcion: String,
    logo: String,
    favicon: String,
    email: {
      type: String,
      required: true
    },
    telefono: String,
    whatsapp: String,
    direccion: String
  },

  // Redes sociales
  redesSociales: {
    facebook: String,
    instagram: String,
    tiktok: String,
    twitter: String,
    youtube: String,
    pinterest: String
  },

  // Configuración de moneda
  moneda: {
    codigo: {
      type: String,
      default: 'PEN'
    },
    simbolo: {
      type: String,
      default: 'S/'
    },
    nombre: {
      type: String,
      default: 'Sol Peruano'
    }
  },

  // Métodos de pago habilitados
  metodosPago: {
    contraEntrega: {
      habilitado: {
        type: Boolean,
        default: true
      },
      descripcion: String
    },
    yape: {
      habilitado: {
        type: Boolean,
        default: true
      },
      numero: String,
      qrCode: String,
      descripcion: String
    },
    mercadoPago: {
      habilitado: {
        type: Boolean,
        default: false
      },
      publicKey: String,
      accessToken: String,
      descripcion: String
    },
    transferencia: {
      habilitado: {
        type: Boolean,
        default: false
      },
      banco: String,
      numeroCuenta: String,
      cci: String,
      titular: String,
      descripcion: String
    }
  },

  // Configuración de envío
  envio: {
    habilitarCalculoAutomatico: {
      type: Boolean,
      default: true
    },
    habilitarRecojo: {
      type: Boolean,
      default: false
    },
    direccionRecojo: String,
    horarioRecojo: String
  },

  // Configuración de stock
  stock: {
    mostrarStockDisponible: {
      type: Boolean,
      default: true
    },
    permitirComprasSinStock: {
      type: Boolean,
      default: false
    },
    mensajeSinStock: {
      type: String,
      default: 'Producto agotado'
    }
  },

  // Configuración de reviews
  reviews: {
    requierenAprobacion: {
      type: Boolean,
      default: true
    },
    permitirImagenes: {
      type: Boolean,
      default: true
    },
    requiereCompra: {
      type: Boolean,
      default: true
    }
  },

  // Configuración de checkout
  checkout: {
    permitirGuestCheckout: {
      type: Boolean,
      default: true
    },
    requiereDNI: {
      type: Boolean,
      default: true
    },
    requiereTelefono: {
      type: Boolean,
      default: true
    },
    camposAdicionales: [{
      nombre: String,
      tipo: {
        type: String,
        enum: ['text', 'textarea', 'number', 'select']
      },
      requerido: Boolean,
      opciones: [String]
    }]
  },

  // SEO
  seo: {
    metaTitulo: String,
    metaDescripcion: String,
    palabrasClave: [String],
    googleAnalyticsId: String,
    facebookPixelId: String,
    googleTagManagerId: String
  },

  // Configuración de email
  email: {
    remitente: String,
    nombreRemitente: String,
    notificarNuevaOrden: {
      type: Boolean,
      default: true
    },
    notificarStockBajo: {
      type: Boolean,
      default: true
    },
    notificarNuevoReview: {
      type: Boolean,
      default: true
    },
    emailsNotificacion: [String]
  },

  // Google Cloud Storage
  storage: {
    bucket: String,
    carpetaProductos: {
      type: String,
      default: 'productos'
    },
    carpetaReviews: {
      type: String,
      default: 'reviews'
    },
    carpetaComprobantes: {
      type: String,
      default: 'comprobantes'
    }
  },

  // Configuración de mantenimiento
  mantenimiento: {
    activo: {
      type: Boolean,
      default: false
    },
    mensaje: String,
    ipPermitidas: [String]
  },

  // Términos y políticas
  legal: {
    terminosCondiciones: String,
    politicaPrivacidad: String,
    politicaDevolucion: String,
    politicaEnvio: String,
    politicaCookies: String
  },

  // Banner y promociones
  banners: [{
    titulo: String,
    descripcion: String,
    imagen: String,
    enlace: String,
    activo: {
      type: Boolean,
      default: true
    },
    orden: {
      type: Number,
      default: 0
    }
  }],

  // Horario de atención
  horarioAtencion: {
    lunes: { abierto: Boolean, horario: String },
    martes: { abierto: Boolean, horario: String },
    miercoles: { abierto: Boolean, horario: String },
    jueves: { abierto: Boolean, horario: String },
    viernes: { abierto: Boolean, horario: String },
    sabado: { abierto: Boolean, horario: String },
    domingo: { abierto: Boolean, horario: String }
  },

  // Configuración de newsletter
  newsletter: {
    habilitado: {
      type: Boolean,
      default: true
    },
    mailchimpApiKey: String,
    mailchimpListId: String
  },

  // Límites y restricciones
  limites: {
    maxProductosPorOrden: {
      type: Number,
      default: 50
    },
    maxImagenesPorProducto: {
      type: Number,
      default: 10
    },
    maxImagenesPorReview: {
      type: Number,
      default: 5
    }
  }

}, {
  timestamps: true
});

// Método para obtener configuración (singleton)
storeConfigSchema.statics.obtenerConfig = async function() {
  let config = await this.findById('store_config');
  
  if (!config) {
    config = await this.create({ _id: 'store_config' });
  }
  
  return config;
};

// Método para actualizar configuración
storeConfigSchema.statics.actualizarConfig = async function(datos) {
  return await this.findByIdAndUpdate(
    'store_config',
    { $set: datos },
    { new: true, upsert: true }
  );
};

module.exports = mongoose.model('StoreConfig', storeConfigSchema);