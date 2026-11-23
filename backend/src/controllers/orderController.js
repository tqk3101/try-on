import * as orderService from '../services/orderService.js';
import {
  validateAdminOrderQuery,
  validateCreateOrderBody,
  validateOrderIdParam,
} from '../validators/orderValidator.js';

export async function postOrder(req, res) {
  const input = validateCreateOrderBody(req.body);
  const { created, order } = await orderService.placeOrder(req.user.id, input);
  res.status(created ? 201 : 200).json({ success: true, data: { order } });
}

export async function getOrder(req, res) {
  const orderId = validateOrderIdParam(req.params.id);
  const order = await orderService.getOrderForUser(req.user.id, orderId);
  res.json({ success: true, data: { order } });
}

export async function getAdminOrders(req, res) {
  const query = validateAdminOrderQuery(req.query);
  const { orders, pagination } = await orderService.listOrders(query);
  res.json({ success: true, data: { orders, pagination } });
}

export async function getAdminOrder(req, res) {
  const orderId = validateOrderIdParam(req.params.id);
  const order = await orderService.getOrderForAdmin(orderId);
  res.json({ success: true, data: { order } });
}
