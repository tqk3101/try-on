import { useEffect, useRef, useState } from 'react';
import { checkAvatarFile } from '../../utils/avatarCheck.js';
import {
  FIELD_ORDER,
  isFormDirty,
  toFormValues,
  validateProfileForm,
} from '../../utils/profileValidation.js';
import { useAuth } from '../../auth/authContext.js';
import { useToast } from '../toastContext.js';
import TextField from '../TextField.jsx';
import AvatarField from './AvatarField.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

const CLIENT_ERROR_CODES = [
  'VALIDATION_ERROR',
  'FILE_TOO_LARGE',
  'UNSUPPORTED_FILE_TYPE',
  'INVALID_UPLOAD',
  'AVATAR_REQUIRED',
];

function omit(object, key) {
  const { [key]: removed, ...rest } = object;
  return removed === undefined ? object : rest;
}

/** Lỗi tải ảnh -> { message, retryable } (400/413/415 cần chọn lại ảnh, còn lại cho thử lại). */
function toAvatarError(error) {
  return { message: error.message, retryable: !CLIENT_ERROR_CODES.includes(error.code) };
}

/**
 * Form hồ sơ + khối ảnh. Sở hữu: giá trị ô nhập, ảnh đang chờ lưu (objectURL), toast kết quả.
 * Dữ liệu và thao tác đi qua props từ useProfile (ProfilePage); form không gọi API trực tiếp.
 */
export default function ProfileForm({
  profile,
  saveText,
  saveAvatar,
  removeAvatar,
  refreshAvatarUrl,
}) {
  const { showToast } = useToast();
  const { updateUser } = useAuth();
  const formRef = useRef(null);
  const [values, setValues] = useState(() => toFormValues(profile));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState('');
  const [pending, setPending] = useState(null); // { file, previewUrl, warning, accepted }
  const [avatarError, setAvatarError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pickIdRef = useRef(0);
  const previewRef = useRef(null);

  // Mọi objectURL tạo ra đều được revoke khi đổi ảnh / bỏ ảnh / unmount (kể cả đăng xuất).
  function releasePreview() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
  }
  useEffect(() => releasePreview, []);

  function replacePending(next) {
    releasePreview();
    previewRef.current = next?.previewUrl ?? null;
    setPending(next);
  }

  const busy = saving || Boolean(avatarBusy);
  const hasPendingImage = Boolean(pending?.accepted);
  const dirty = isFormDirty(values, profile) || hasPendingImage;
  const needsMeasurements = profile.heightCm == null || profile.weightKg == null;

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => omit(prev, name));
  }

  function focusFirstError(fieldErrors) {
    const first = FIELD_ORDER.find((name) => fieldErrors[name]);
    if (first) formRef.current?.elements.namedItem(first)?.focus();
  }

  async function handlePick(file) {
    const pickId = ++pickIdRef.current;
    setAvatarError(null);
    const result = await checkAvatarFile(file);
    if (pickId !== pickIdRef.current) {
      if (result.ok) URL.revokeObjectURL(result.previewUrl);
      return;
    }
    if (!result.ok) {
      setAvatarError({ message: result.error, retryable: false });
      return;
    }
    replacePending({
      file,
      previewUrl: result.previewUrl,
      warning: result.warning,
      accepted: !result.warning,
    });
  }

  function handleDiscardPending() {
    pickIdRef.current += 1;
    setAvatarError(null);
    replacePending(null);
  }

  // Trả về { ok, message }; lỗi được giữ trong avatarError để hiện dưới khung ảnh.
  async function uploadPending(file) {
    setAvatarBusy('uploading');
    setAvatarError(null);
    try {
      await saveAvatar(file);
      replacePending(null);
      return { ok: true };
    } catch (error) {
      setAvatarError(toAvatarError(error));
      return { ok: false, message: error.message };
    } finally {
      setAvatarBusy('');
    }
  }

  async function handleRetryUpload() {
    if (!pending?.accepted) return;
    const result = await uploadPending(pending.file);
    if (result.ok) showToast('Đã cập nhật ảnh.');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy || !dirty) return;

    const { errors: fieldErrors, payload } = validateProfileForm(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      focusFirstError(fieldErrors);
      return;
    }

    const textChanged = isFormDirty(values, profile);
    setSaving(true);
    setAvatarError(null);

    if (textChanged) {
      try {
        const saved = await saveText(payload);
        setValues(toFormValues(saved));
        updateUser({ displayName: saved.displayName });
      } catch (error) {
        setSaving(false);
        if (error.code === 'VALIDATION_ERROR' && error.fields) {
          setErrors(error.fields);
          focusFirstError(error.fields);
        } else {
          showToast(error.message || 'Không thể lưu hồ sơ. Vui lòng thử lại.');
        }
        return;
      }
    }

    if (hasPendingImage) {
      const file = pending.file;
      setSaving(false);
      const uploaded = await uploadPending(file);
      if (uploaded.ok) {
        showToast(textChanged ? 'Đã lưu hồ sơ.' : 'Đã cập nhật ảnh.');
      } else {
        showToast(
          textChanged
            ? `Đã lưu thông tin, nhưng chưa tải được ảnh: ${uploaded.message}`
            : `Chưa tải được ảnh: ${uploaded.message}`,
        );
      }
      return;
    }

    setSaving(false);
    showToast('Đã lưu hồ sơ.');
  }

  async function handleConfirmDelete() {
    setAvatarBusy('deleting');
    try {
      await removeAvatar();
      setConfirmOpen(false);
      showToast('Đã xoá ảnh.');
    } catch (error) {
      setConfirmOpen(false);
      showToast(error.message || 'Không thể xoá ảnh. Vui lòng thử lại.');
    } finally {
      setAvatarBusy('');
    }
  }

  return (
    <>
      {needsMeasurements && (
        <div
          role="status"
          className="mb-6 rounded-2xl border border-accent/30 bg-blush/60 px-4 py-3 text-sm text-ink"
        >
          <p className="font-semibold">Hoàn thiện hồ sơ để bắt đầu thử đồ</p>
          <p className="mt-0.5 text-ink-soft">
            Nhập chiều cao, cân nặng và tải ảnh toàn thân để phòng thử đồ hoạt động chính xác.
          </p>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} noValidate aria-busy={busy}>
        <div className="grid gap-8 md:grid-cols-[16rem_1fr] md:items-start lg:grid-cols-[18rem_1fr] lg:gap-12">
          <AvatarField
            savedUrl={profile.avatarUrl}
            pending={pending}
            error={avatarError}
            busy={avatarBusy}
            onPick={handlePick}
            onAcceptPending={() => setPending((p) => (p ? { ...p, accepted: true } : p))}
            onDiscardPending={handleDiscardPending}
            onRemoveSaved={() => setConfirmOpen(true)}
            onRetryUpload={handleRetryUpload}
            onSavedImageError={refreshAvatarUrl}
          />

          <div className="space-y-5 rounded-3xl bg-surface p-6 shadow-card sm:p-8">
            <TextField
              label="Email"
              name="email"
              type="email"
              value={profile.email}
              readOnly
              hint="Email dùng để đăng nhập và không thể thay đổi."
              className="[&_input]:bg-sand/50 [&_input]:text-ink-soft"
            />
            <TextField
              label="Tên hiển thị"
              name="displayName"
              value={values.displayName}
              onChange={handleChange}
              error={errors.displayName}
              autoComplete="nickname"
              maxLength={80}
              readOnly={saving}
            />
            <TextField
              label="Số điện thoại (không bắt buộc)"
              name="phone"
              type="tel"
              inputMode="tel"
              value={values.phone}
              onChange={handleChange}
              error={errors.phone}
              autoComplete="tel"
              placeholder="0912 345 678"
              readOnly={saving}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                label="Chiều cao (cm)"
                name="heightCm"
                inputMode="decimal"
                value={values.heightCm}
                onChange={handleChange}
                error={errors.heightCm}
                autoComplete="off"
                placeholder="162"
                readOnly={saving}
              />
              <TextField
                label="Cân nặng (kg)"
                name="weightKg"
                inputMode="decimal"
                value={values.weightKg}
                onChange={handleChange}
                error={errors.weightKg}
                autoComplete="off"
                placeholder="50,5"
                readOnly={saving}
              />
            </div>

            <button
              type="submit"
              disabled={!dirty || busy}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors duration-200 hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-40"
            >
              {saving ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="Xoá ảnh toàn thân?"
        description="Bạn cần tải ảnh mới để dùng tính năng thử đồ."
        confirmLabel="Xoá ảnh"
        busy={avatarBusy === 'deleting'}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
