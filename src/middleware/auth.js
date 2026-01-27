const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.proteger = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        mensaje: 'No autorizado. Token no proporcionado.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await User.findById(decoded.id);

    if (!usuario) {
      return res.status(401).json({
        success: false,
        mensaje: 'Usuario no encontrado'
      });
    }

    if (!usuario.activo) {
      return res.status(401).json({
        success: false,
        mensaje: 'Cuenta desactivada'
      });
    }

    req.usuario = {
      id: usuario._id,
      email: usuario.email,
      role: usuario.role
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      mensaje: 'Token inválido o expirado'
    });
  }
};

exports.autorizarRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.role)) {
      return res.status(403).json({
        success: false,
        mensaje: `El rol ${req.usuario.role} no tiene permiso para acceder a este recurso`
      });
    }
    next();
  };
};

exports.opcional = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await User.findById(decoded.id);

    if (usuario && usuario.activo) {
      req.usuario = {
        id: usuario._id,
        email: usuario.email,
        role: usuario.role
      };
    }

    next();
  } catch (error) {
    next();
  }
};