const authController = require('./authController');
const productController = require('./productController');
const cartController = require('./cartController');
const orderController = require('./orderController');
const reviewController = require('./reviewController');
const categoryController = require('./categoryController');
const collectionController = require('./collectionController');
const couponController = require('./couponController');
const shippingController = require('./shippingController');
const adminController = require('./adminController');
const storeConfigController = require('./storeConfigController');

module.exports = {
  authController,
  productController,
  cartController,
  orderController,
  reviewController,
  categoryController,
  collectionController,
  couponController,
  shippingController,
  adminController,
  storeConfigController
};