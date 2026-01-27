/**
 * Modelos de MongoDB para Ecommerce de Ropa
 * 
 * Este archivo exporta todos los modelos del sistema
 */

const User = require('./User');
const Product = require('./Product');
const Category = require('./Category');
const Collection = require('./Collection');
const Review = require('./Review');
const Order = require('./Order');
const Cart = require('./Cart');
const ShippingZone = require('./ShippingZone');
const Coupon = require('./Coupon');
const StoreConfig = require('./StoreConfig');

module.exports = {
  User,
  Product,
  Category,
  Collection,
  Review,
  Order,
  Cart,
  ShippingZone,
  Coupon,
  StoreConfig
};