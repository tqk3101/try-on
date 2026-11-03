import { validateLoginBody, validateRegisterBody } from '../validators/authValidator.js';
import { loginUser, registerUser } from '../services/authService.js';

export async function register(req, res) {
  const credentials = validateRegisterBody(req.body);
  const user = await registerUser(credentials);
  res.status(201).json({ success: true, data: { user } });
}

export async function login(req, res) {
  const credentials = validateLoginBody(req.body);
  const result = await loginUser(credentials);
  res.json({ success: true, data: result });
}
