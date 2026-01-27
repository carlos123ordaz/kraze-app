const mongoose = require('mongoose');

const shippingZoneSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  tipo: {
    type: String,
    enum: ['lima', 'provincia', 'personalizado'],
    required: true
  },
  
  // Departamentos incluidos en esta zona
  departamentos: [{
    type: String,
    trim: true
  }],

  // Provincias específicas (opcional, para mayor precisión)
  provincias: [{
    departamento: String,
    provincia: String
  }],

  // Distritos específicos (para Lima)
  distritos: [{
    type: String,
    trim: true
  }],

  // Costos de envío
  costo: {
    type: Number,
    required: true,
    min: 0
  },

  // Envío gratis si el subtotal supera este monto
  envioGratisDesde: {
    type: Number,
    min: 0
  },

  // Tiempo estimado de entrega
  tiempoEntrega: {
    minDias: {
      type: Number,
      required: true,
      min: 1
    },
    maxDias: {
      type: Number,
      required: true,
      min: 1
    }
  },

  // Empresas de courier disponibles para esta zona
  couriers: [{
    nombre: String,
    costoAdicional: {
      type: Number,
      default: 0
    },
    activo: {
      type: Boolean,
      default: true
    }
  }],

  // Restricciones
  restricciones: {
    pesoMaximo: Number, // en kg
    dimensionesMaximas: {
      largo: Number, // en cm
      ancho: Number,
      alto: Number
    }
  },

  // Configuración
  activo: {
    type: Boolean,
    default: true
  },
  orden: {
    type: Number,
    default: 0
  },

  // Descripción para el cliente
  descripcion: String,
  notaImportante: String

}, {
  timestamps: true
});

// Índices
shippingZoneSchema.index({ tipo: 1 });
shippingZoneSchema.index({ activo: 1 });
shippingZoneSchema.index({ orden: 1 });

// Método para verificar si un departamento está en esta zona
shippingZoneSchema.methods.incluyeDepartamento = function(departamento) {
  if (this.tipo === 'lima') {
    return departamento.toLowerCase() === 'lima';
  }
  
  if (this.tipo === 'provincia') {
    return departamento.toLowerCase() !== 'lima';
  }

  return this.departamentos.some(dept => 
    dept.toLowerCase() === departamento.toLowerCase()
  );
};

// Método para calcular costo de envío
shippingZoneSchema.methods.calcularCosto = function(subtotal, peso, dimensiones) {
  // Verificar si califica para envío gratis
  if (this.envioGratisDesde && subtotal >= this.envioGratisDesde) {
    return {
      costo: 0,
      envioGratis: true,
      zona: this.nombre
    };
  }

  // Verificar restricciones de peso
  if (this.restricciones.pesoMaximo && peso > this.restricciones.pesoMaximo) {
    return {
      error: true,
      mensaje: `El peso excede el máximo permitido de ${this.restricciones.pesoMaximo}kg para esta zona`
    };
  }

  // Verificar restricciones de dimensiones
  if (this.restricciones.dimensionesMaximas && dimensiones) {
    const { largo, ancho, alto } = this.restricciones.dimensionesMaximas;
    if (dimensiones.largo > largo || dimensiones.ancho > ancho || dimensiones.alto > alto) {
      return {
        error: true,
        mensaje: 'Las dimensiones del paquete exceden lo permitido para esta zona'
      };
    }
  }

  return {
    costo: this.costo,
    envioGratis: false,
    zona: this.nombre,
    tiempoEntrega: `${this.tiempoEntrega.minDias}-${this.tiempoEntrega.maxDias} días`
  };
};

// Método estático para obtener zona por ubicación
shippingZoneSchema.statics.obtenerZonaPorUbicacion = async function(departamento, provincia, distrito) {
  // Primero buscar zona personalizada más específica
  let zona = await this.findOne({
    tipo: 'personalizado',
    activo: true,
    $or: [
      { distritos: distrito },
      { 'provincias.provincia': provincia },
      { departamentos: departamento }
    ]
  }).sort({ orden: 1 });

  if (zona) return zona;

  // Buscar por tipo (Lima o Provincia)
  const esLima = departamento.toLowerCase() === 'lima';
  zona = await this.findOne({
    tipo: esLima ? 'lima' : 'provincia',
    activo: true
  }).sort({ orden: 1 });

  return zona;
};

// Método estático para crear zonas por defecto
shippingZoneSchema.statics.crearZonasPorDefecto = async function() {
  const zonasPorDefecto = [
    {
      nombre: 'Lima Metropolitana',
      tipo: 'lima',
      departamentos: ['Lima'],
      costo: 10,
      envioGratisDesde: 150,
      tiempoEntrega: {
        minDias: 2,
        maxDias: 4
      },
      descripcion: 'Envío a Lima Metropolitana y Callao',
      orden: 1,
      activo: true
    },
    {
      nombre: 'Provincias',
      tipo: 'provincia',
      departamentos: [
        'Arequipa', 'Cusco', 'Trujillo', 'Piura', 'Chiclayo', 
        'Iquitos', 'Tacna', 'Puno', 'Ayacucho', 'Huancayo',
        'Cajamarca', 'Ica', 'Junín', 'Amazonas', 'Ancash',
        'Apurímac', 'Huancavelica', 'Huánuco', 'Lambayeque',
        'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco',
        'San Martín', 'Tumbes', 'Ucayali'
      ],
      costo: 15,
      envioGratisDesde: 200,
      tiempoEntrega: {
        minDias: 4,
        maxDias: 7
      },
      descripcion: 'Envío a todo el Perú (excepto Lima Metropolitana)',
      orden: 2,
      activo: true
    }
  ];

  for (const zona of zonasPorDefecto) {
    await this.findOneAndUpdate(
      { tipo: zona.tipo },
      zona,
      { upsert: true, new: true }
    );
  }

  return zonasPorDefecto;
};

module.exports = mongoose.model('ShippingZone', shippingZoneSchema);