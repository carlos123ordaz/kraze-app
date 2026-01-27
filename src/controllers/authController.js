const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

exports.registrar = async (req, res) => {
  try {
    const { nombres, apellidos, email, password, dni, telefono } = req.body;

    const existente = await User.findOne({ email });
    if (existente) {
      return res.status(400).json({
        success: false,
        mensaje: 'El email ya está registrado'
      });
    }

    const usuario = await User.create({
      nombres,
      apellidos,
      email,
      password,
      dni,
      telefono,
      role: 'cliente'
    });

    const codigo = usuario.generarCodigoVerificacion();
    await usuario.save();

    const token = generarToken(usuario._id);

    res.status(201).json({
      success: true,
      token,
      usuario,
      codigoVerificacion: codigo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        mensaje: 'Por favor ingrese email y password'
      });
    }

    const usuario = await User.findOne({ email }).select('+password');

    if (!usuario) {
      return res.status(401).json({
        success: false,
        mensaje: 'Credenciales inválidas'
      });
    }

    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > Date.now()) {
      return res.status(423).json({
        success: false,
        mensaje: 'Cuenta bloqueada temporalmente. Intente más tarde.'
      });
    }

    const passwordCorrecto = await usuario.compararPassword(password);

    if (!passwordCorrecto) {
      usuario.intentosLoginFallidos += 1;
      
      if (usuario.intentosLoginFallidos >= 5) {
        usuario.bloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000);
      }
      
      await usuario.save();

      return res.status(401).json({
        success: false,
        mensaje: 'Credenciales inválidas'
      });
    }

    usuario.intentosLoginFallidos = 0;
    usuario.bloqueadoHasta = undefined;
    usuario.ultimoAcceso = new Date();
    await usuario.save();

    const token = generarToken(usuario._id);

    res.status(200).json({
      success: true,
      token,
      usuario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.verificarEmail = async (req, res) => {
  try {
    const { codigo } = req.body;

    const usuario = await User.findOne({
      _id: req.usuario.id,
      codigoVerificacion: codigo,
      codigoExpiracion: { $gt: Date.now() }
    });

    if (!usuario) {
      return res.status(400).json({
        success: false,
        mensaje: 'Código inválido o expirado'
      });
    }

    usuario.emailVerificado = true;
    usuario.codigoVerificacion = undefined;
    usuario.codigoExpiracion = undefined;
    await usuario.save();

    res.status(200).json({
      success: true,
      mensaje: 'Email verificado exitosamente',
      usuario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.reenviarCodigo = async (req, res) => {
  try {
    const usuario = await User.findById(req.usuario.id);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        mensaje: 'Usuario no encontrado'
      });
    }

    if (usuario.emailVerificado) {
      return res.status(400).json({
        success: false,
        mensaje: 'El email ya está verificado'
      });
    }

    const codigo = usuario.generarCodigoVerificacion();
    await usuario.save();

    res.status(200).json({
      success: true,
      mensaje: 'Código enviado',
      codigoVerificacion: codigo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerPerfil = async (req, res) => {
  try {
    const usuario = await User.findById(req.usuario.id)
      .populate('wishlist', 'nombre precio imagenesPrincipales');

    res.status(200).json({
      success: true,
      usuario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarPerfil = async (req, res) => {
  try {
    const camposPermitidos = {
      nombres: req.body.nombres,
      apellidos: req.body.apellidos,
      telefono: req.body.telefono,
      dni: req.body.dni,
      fechaNacimiento: req.body.fechaNacimiento,
      genero: req.body.genero,
      avatar: req.body.avatar
    };

    Object.keys(camposPermitidos).forEach(key => 
      camposPermitidos[key] === undefined && delete camposPermitidos[key]
    );

    const usuario = await User.findByIdAndUpdate(
      req.usuario.id,
      camposPermitidos,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      usuario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNuevo } = req.body;

    const usuario = await User.findById(req.usuario.id).select('+password');

    const passwordCorrecto = await usuario.compararPassword(passwordActual);

    if (!passwordCorrecto) {
      return res.status(401).json({
        success: false,
        mensaje: 'Password actual incorrecto'
      });
    }

    usuario.password = passwordNuevo;
    await usuario.save();

    const token = generarToken(usuario._id);

    res.status(200).json({
      success: true,
      mensaje: 'Password actualizado',
      token
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.agregarDireccion = async (req, res) => {
  try {
    const usuario = await User.findById(req.usuario.id);

    const esDefault = usuario.direcciones.length === 0;

    usuario.direcciones.push({
      ...req.body,
      isDefault: esDefault
    });

    await usuario.save();

    res.status(200).json({
      success: true,
      direcciones: usuario.direcciones
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarDireccion = async (req, res) => {
  try {
    const usuario = await User.findById(req.usuario.id);
    const direccion = usuario.direcciones.id(req.params.direccionId);

    if (!direccion) {
      return res.status(404).json({
        success: false,
        mensaje: 'Dirección no encontrada'
      });
    }

    Object.keys(req.body).forEach(key => {
      if (key !== '_id') {
        direccion[key] = req.body[key];
      }
    });

    await usuario.save();

    res.status(200).json({
      success: true,
      direcciones: usuario.direcciones
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.eliminarDireccion = async (req, res) => {
  try {
    const usuario = await User.findById(req.usuario.id);
    usuario.direcciones.pull(req.params.direccionId);
    await usuario.save();

    res.status(200).json({
      success: true,
      direcciones: usuario.direcciones
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.establecerDireccionDefault = async (req, res) => {
  try {
    const usuario = await User.findById(req.usuario.id);

    usuario.direcciones.forEach(dir => {
      dir.isDefault = dir._id.toString() === req.params.direccionId;
    });

    await usuario.save();

    res.status(200).json({
      success: true,
      direcciones: usuario.direcciones
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.agregarAWishlist = async (req, res) => {
  try {
    const usuario = await User.findById(req.usuario.id);

    if (usuario.wishlist.includes(req.params.productoId)) {
      return res.status(400).json({
        success: false,
        mensaje: 'El producto ya está en tu wishlist'
      });
    }

    usuario.wishlist.push(req.params.productoId);
    await usuario.save();

    await usuario.populate('wishlist', 'nombre precio imagenesPrincipales');

    res.status(200).json({
      success: true,
      wishlist: usuario.wishlist
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.removerDeWishlist = async (req, res) => {
  try {
    const usuario = await User.findById(req.usuario.id);
    usuario.wishlist.pull(req.params.productoId);
    await usuario.save();

    await usuario.populate('wishlist', 'nombre precio imagenesPrincipales');

    res.status(200).json({
      success: true,
      wishlist: usuario.wishlist
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerWishlist = async (req, res) => {
  try {
    const usuario = await User.findById(req.usuario.id)
      .populate('wishlist', 'nombre precio imagenesPrincipales slug rating');

    res.status(200).json({
      success: true,
      wishlist: usuario.wishlist
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};