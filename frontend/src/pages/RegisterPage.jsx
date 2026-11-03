import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import AuthLink from '../components/AuthLink.jsx';
import PasswordStrength from '../components/PasswordStrength.jsx';
import TextField from '../components/TextField.jsx';
import { PATHS } from '../routes/paths.js';
import { safeRedirect } from '../routes/safeRedirect.js';
import { ApiError } from '../services/apiClient.js';
import { registerAccount } from '../services/authApi.js';
import {
  validateConfirmPassword,
  validateEmail,
  validatePassword,
  validateRegisterForm,
} from '../utils/authValidation.js';

const FIELD_ORDER = ['email', 'password', 'confirmPassword'];
const EMPTY_VALUES = { email: '', password: '', confirmPassword: '' };
const GENERIC_ERROR = 'Không thể đăng ký lúc này. Vui lòng thử lại.';

function omit(object, key) {
  const { [key]: removed, ...rest } = object;
  return removed === undefined ? object : rest;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = safeRedirect(searchParams.get('redirect'));
  const formRef = useRef(null);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [errors, setErrors] = useState({});
  const [emailTaken, setEmailTaken] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Đăng ký — Try-on';
  }, []);

  function focusFirstInvalid(fieldErrors) {
    const first = FIELD_ORDER.find((name) => fieldErrors[name]);
    if (first) formRef.current?.elements.namedItem(first)?.focus();
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => omit(current, name));
    setFormError('');
    if (name === 'email') setEmailTaken(false);
  }

  // Báo lỗi sớm khi rời ô (chỉ khi đã nhập); ô trống chờ tới lúc bấm Đăng ký.
  function handleBlur(event) {
    const { name, value } = event.target;
    if (value === '') return;

    const validators = {
      email: () => validateEmail(value),
      password: () => validatePassword(value),
      confirmPassword: () => validateConfirmPassword(values.password, value),
    };
    const message = validators[name]();
    setErrors((current) => (message ? { ...current, [name]: message } : omit(current, name)));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const fieldErrors = validateRegisterForm(values);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      focusFirstInvalid(fieldErrors);
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const { user } = await registerAccount({ ...values, email: values.email.trim() });
      const loginPath = redirectParam
        ? `${PATHS.login}?redirect=${encodeURIComponent(redirectParam)}`
        : PATHS.login;
      navigate(loginPath, { replace: true, state: { registered: true, email: user.email } });
    } catch (error) {
      setSubmitting(false);
      if (!(error instanceof ApiError)) {
        setFormError(GENERIC_ERROR);
        return;
      }
      if (error.code === 'VALIDATION_ERROR' && error.fields) {
        setErrors(error.fields);
        focusFirstInvalid(error.fields);
      } else if (error.code === 'EMAIL_EXISTS') {
        setErrors({ email: error.message });
        setEmailTaken(true);
        focusFirstInvalid({ email: error.message });
      } else {
        setFormError(error.message);
      }
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold text-ink">Tạo tài khoản</h1>
      <p className="mt-2 text-sm text-ink-soft">Đăng ký để thử đồ bằng chính hình ảnh của bạn.</p>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
        {formError && (
          <p
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {formError}
          </p>
        )}

        <TextField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="ban@example.com"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={submitting}
          error={
            errors.email && emailTaken ? (
              <>
                {errors.email}{' '}
                <AuthLink to="login" variant="text" redirect={redirectParam}>
                  Đăng nhập
                </AuthLink>
              </>
            ) : (
              errors.email
            )
          }
        />

        <TextField
          label="Mật khẩu"
          name="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={submitting}
          error={errors.password}
        >
          <PasswordStrength password={values.password} />
        </TextField>

        <TextField
          label="Xác nhận mật khẩu"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={submitting}
          error={errors.confirmPassword}
        />

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors duration-200 hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Đang tạo tài khoản…' : 'Đăng ký'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Đã có tài khoản?{' '}
        <AuthLink to="login" variant="text" redirect={redirectParam}>
          Đăng nhập
        </AuthLink>
      </p>
    </>
  );
}
