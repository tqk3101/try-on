import { getProfile } from '../services/userService.js';

export async function getMyProfile(req, res) {
  const user = await getProfile(req.user.id);
  res.json({ success: true, data: { user } });
}
