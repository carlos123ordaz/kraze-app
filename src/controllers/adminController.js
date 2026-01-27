const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Review = require('../models/Review');

exports.obtenerDashboard = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const hace30Dias = new Date(hoy);
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const [
      ordenesHoy,
      ordenesTotales,
      usuariosNuevos,
      usuariosTotales,
      productosActivos,
      reviewsPendientes,
      estadisticasMes
    ] = await Promise.all([
      Order.countDocuments({
        createdAt: { $gte: hoy },
        estado: { $ne: 'cancelado' }
      }),
      Order.countDocuments({ estado: { $ne: 'cancelado' } }),
      User.countDocuments({ createdAt: { $gte: hoy } }),
      User.countDocuments({ role: 'cliente' }),
      Product.countDocuments({ estado: 'activo', disponible: true }),
      Review.countDocuments({ aprobado: false, activo: true }),
      Order.obtenerEstadisticas(hace30Dias, new Date())
    ]);

    const ventasPorDia = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: hace30Dias },
          estado: { $ne: 'cancelado' }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          ventas: { $sum: '$montos.total' },
          ordenes: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const productosMasVendidos = await Product.find({ 
      estado: 'activo' 
    })
      .sort({ 'estadisticas.ventasTotales': -1 })
      .limit(10)
      .select('nombre slug estadisticas.ventasTotales imagenesPrincipales precio');

    res.status(200).json({
      success: true,
      dashboard: {
        resumen: {
          ordenesHoy,
          ordenesTotales,
          usuariosNuevos,
          usuariosTotales,
          productosActivos,
          reviewsPendientes
        },
        estadisticasMes,
        ventasPorDia,
        productosMasVendidos
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerEstadisticasVentas = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, agruparPor = 'dia' } = req.query;

    const inicio = fechaInicio ? new Date(fechaInicio) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fin = fechaFin ? new Date(fechaFin) : new Date();

    let formato;
    switch (agruparPor) {
      case 'hora':
        formato = '%Y-%m-%d %H:00';
        break;
      case 'dia':
        formato = '%Y-%m-%d';
        break;
      case 'mes':
        formato = '%Y-%m';
        break;
      case 'año':
        formato = '%Y';
        break;
      default:
        formato = '%Y-%m-%d';
    }

    const estadisticas = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: inicio, $lte: fin },
          estado: { $ne: 'cancelado' }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: formato, date: '$createdAt' } },
          totalVentas: { $sum: '$montos.total' },
          totalOrdenes: { $sum: 1 },
          promedioOrden: { $avg: '$montos.total' },
          productosVendidos: { $sum: { $sum: '$items.cantidad' } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const metodosPago = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: inicio, $lte: fin },
          estado: { $ne: 'cancelado' }
        }
      },
      {
        $group: {
          _id: '$metodoPago.tipo',
          total: { $sum: 1 },
          monto: { $sum: '$montos.total' }
        }
      }
    ]);

    const estadoOrdenes = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: inicio, $lte: fin }
        }
      },
      {
        $group: {
          _id: '$estado',
          total: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      periodo: { inicio, fin },
      estadisticas,
      metodosPago,
      estadoOrdenes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerProductosBajoStock = async (req, res) => {
  try {
    const limite = req.query.limite || 10;

    const productos = await Product.aggregate([
      { $match: { estado: 'activo' } },
      { $unwind: '$variantes' },
      {
        $match: {
          'variantes.activo': true,
          'variantes.stock': { $lt: Number(limite) }
        }
      },
      {
        $group: {
          _id: '$_id',
          nombre: { $first: '$nombre' },
          slug: { $first: '$slug' },
          stockMinimo: { $min: '$variantes.stock' },
          variantes: {
            $push: {
              talla: '$variantes.talla',
              color: '$variantes.color.nombre',
              stock: '$variantes.stock',
              sku: '$variantes.sku'
            }
          }
        }
      },
      { $sort: { stockMinimo: 1 } }
    ]);

    res.status(200).json({
      success: true,
      total: productos.length,
      productos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerUsuariosActivos = async (req, res) => {
  try {
    const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const usuariosActivos = await User.countDocuments({
      ultimoAcceso: { $gte: hace30Dias }
    });

    const usuariosNuevos = await User.countDocuments({
      createdAt: { $gte: hace30Dias }
    });

    const usuariosPorRol = await User.aggregate([
      {
        $group: {
          _id: '$role',
          total: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      usuariosActivos,
      usuariosNuevos,
      usuariosPorRol
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerTopProductos = async (req, res) => {
  try {
    const tipo = req.query.tipo || 'vendidos';
    const limite = req.query.limite || 10;

    let sort = {};

    switch (tipo) {
      case 'vendidos':
        sort = { 'estadisticas.ventasTotales': -1 };
        break;
      case 'vistos':
        sort = { 'estadisticas.vistas': -1 };
        break;
      case 'valorados':
        sort = { 'rating.promedio': -1, 'rating.total': -1 };
        break;
      case 'wishlist':
        sort = { 'estadisticas.enWishlists': -1 };
        break;
      default:
        sort = { 'estadisticas.ventasTotales': -1 };
    }

    const productos = await Product.find({ estado: 'activo' })
      .sort(sort)
      .limit(Number(limite))
      .select('nombre slug precio imagenesPrincipales estadisticas rating');

    res.status(200).json({
      success: true,
      productos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerReporteInventario = async (req, res) => {
  try {
    const inventario = await Product.aggregate([
      { $match: { estado: 'activo' } },
      { $unwind: '$variantes' },
      {
        $group: {
          _id: null,
          totalProductos: { $sum: 1 },
          stockTotal: { $sum: '$variantes.stock' },
          valorInventario: {
            $sum: { $multiply: ['$precio', '$variantes.stock'] }
          },
          productosSinStock: {
            $sum: {
              $cond: [{ $eq: ['$variantes.stock', 0] }, 1, 0]
            }
          }
        }
      }
    ]);

    const productosPorCategoria = await Product.aggregate([
      { $match: { estado: 'activo' } },
      {
        $lookup: {
          from: 'categories',
          localField: 'categoria',
          foreignField: '_id',
          as: 'categoriaInfo'
        }
      },
      { $unwind: '$categoriaInfo' },
      {
        $group: {
          _id: '$categoriaInfo.nombre',
          total: { $sum: 1 },
          stock: { $sum: '$stockTotal' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      inventario: inventario[0] || {},
      productosPorCategoria
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};