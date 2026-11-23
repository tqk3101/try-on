import * as cartService from '../services/cartService.js';
import {
  validateAddItemBody,
  validateProductIdParam,
  validateSetQuantityBody,
} from '../validators/cartValidator.js';

export async function getCart(req, res) {
  res.json({ success: true, data: { cart: await cartService.getCart(req.user.id) } });
}

export async function postCartItem(req, res) {
  const { productId, quantity } = validateAddItemBody(req.body);
  const { created, cart, item } = await cartService.addItem(req.user.id, productId, quantity);
  res.status(created ? 201 : 200).json({ success: true, data: { cart, item } });
}

export async function putCartItem(req, res) {
  const productId = validateProductIdParam(req.params.productId);
  const { quantity } = validateSetQuantityBody(req.body);
  const cart = await cartService.setQuantity(req.user.id, productId, quantity);
  res.json({ success: true, data: { cart } });
}

export async function deleteCartItem(req, res) {
  const productId = validateProductIdParam(req.params.productId);
  const cart = await cartService.removeItem(req.user.id, productId);
  res.json({ success: true, data: { cart } });
}
