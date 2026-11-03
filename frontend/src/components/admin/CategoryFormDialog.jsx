import { useEffect, useRef, useState } from 'react';
import { createAdminCategory, updateAdminCategory } from '../../services/adminApi.js';
import FormDialog from '../FormDialog.jsx';
import TextField from '../TextField.jsx';

const NAME_MAX_LENGTH = 50;
const MESSAGES = {
  required: 'Vui lòng nhập tên danh mục.',
  tooLong: 'Tên danh mục tối đa 50 ký tự.',
  generic: 'Không thể lưu danh mục. Vui lòng thử lại.',
};

/** Cùng quy tắc chuẩn hoá với server: NFC, trim, gộp khoảng trắng. */
const normalizeName = (value) => value.normalize('NFC').trim().replace(/\s+/g, ' ');

function validateName(name) {
  if (name === '') return MESSAGES.required;
  if ([...name].length > NAME_MAX_LENGTH) return MESSAGES.tooLong;
  return '';
}

/**
 * Hộp thoại thêm / sửa danh mục. `category` = null là thêm. Component được mount lại (key) mỗi lần mở
 * để state form luôn mới. Không cập nhật lạc quan: chỉ gọi `onSaved(category, mode)` khi server trả OK.
 * 404 (đã bị xoá ở nơi khác) -> `onNotFound()`.
 */
export default function CategoryFormDialog({ open, category, onClose, onSaved, onNotFound }) {
  const isEdit = Boolean(category);
  const [value, setValue] = useState(category?.name ?? '');
  const [fieldError, setFieldError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);
  const inputRef = useRef(null);

  // Sau khi gửi xong (ô hết bị khoá) đưa focus về ô tên nếu có lỗi trường.
  useEffect(() => {
    if (fieldError && !busy) inputRef.current?.focus();
  }, [fieldError, busy]);

  async function handleSubmit() {
    if (submittingRef.current) return;
    const name = normalizeName(value);
    const clientError = validateName(name);
    setFormError('');
    if (clientError) {
      setFieldError(clientError);
      return;
    }
    setFieldError('');
    if (isEdit && name === category.name) {
      onClose();
      return;
    }

    submittingRef.current = true;
    setBusy(true);
    try {
      const data = isEdit
        ? await updateAdminCategory(category.id, { name })
        : await createAdminCategory({ name });
      onSaved(data.category, isEdit ? 'edit' : 'create');
    } catch (error) {
      if (error.status === 404 && error.code === 'CATEGORY_NOT_FOUND') {
        onNotFound();
      } else if (error.code === 'VALIDATION_ERROR' && error.fields?.name) {
        setFieldError(error.fields.name);
      } else if (error.code === 'CATEGORY_EXISTS') {
        setFieldError(error.message);
      } else if (error.status !== 401) {
        // 401: apiClient đã xử lý phiên hết hạn, không hiện thêm lỗi.
        setFormError(error.message || MESSAGES.generic);
      }
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <FormDialog
      open={open}
      title={isEdit ? 'Sửa danh mục' : 'Thêm danh mục'}
      busy={busy}
      error={formError}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <TextField
        ref={inputRef}
        label="Tên danh mục"
        name="name"
        autoFocus
        autoComplete="off"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (fieldError) setFieldError('');
        }}
        error={fieldError}
        hint="Tối đa 50 ký tự. Không phân biệt chữ hoa, chữ thường."
      />
    </FormDialog>
  );
}
