import { getProfile, updateProfile } from '../services/userService.js';
import { removeAvatar, replaceAvatar } from '../services/avatarService.js';
import { validateProfileBody } from '../validators/profileValidator.js';
import { HttpError } from '../middlewares/httpError.js';

export async function getMyProfile(req, res) {
  const profile = await getProfile(req.user.id);
  res.json({ success: true, data: { profile } });
}

export async function updateMyProfile(req, res) {
  const changes = validateProfileBody(req.body);
  const profile = await updateProfile(req.user.id, changes);
  res.json({ success: true, data: { profile } });
}

export async function uploadMyAvatar(req, res) {
  if (!req.file) {
    throw new HttpError(400, 'AVATAR_REQUIRED', 'Vui lòng chọn một ảnh để tải lên.');
  }
  const profile = await replaceAvatar(req.user.id, req.file);
  res.json({ success: true, data: { profile } });
}

export async function deleteMyAvatar(req, res) {
  const profile = await removeAvatar(req.user.id);
  res.json({ success: true, data: { profile } });
}
