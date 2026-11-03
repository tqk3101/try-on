import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import TextField from '../components/TextField.jsx';
import { useAuth } from '../auth/authContext.js';
import { PATHS } from '../routes/paths.js';
import { safeRedirect } from '../routes/safeRedirect.js';
import { ApiError } from '../services/apiClient.js';
import { validateEmail, validateLoginForm } from '../utils/authValidation.js';

const FIELD_ORDER = ['email', 'password'];
const GENERIC_ERROR = 'Không thể đăng nhập lúc này. Vui lòng thử lại.';
const INVALID_CREDENTIALS = 'Email hoặc mật khẩu không đúng.';

const textLinkClass =
  'font-semibold text-accent underline underline-offset-4 transition-colors hover:text-accent-dark';

function omit(object, key) {
  const { [key]: removed, ...rest } = object;
  return removed === undefined ? object : rest;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const formRef = useRef(null);

  // Đọc router state một lần (đến từ đăng ký thành công); xoá ngay để reload/Back không hiện lại banner.
  const [registered] = useState(() => location.state?.registered === true);
  const [values, setValues] = useState(() => ({
    email: typeof location.state?.email === 'string' ? location.state.email : '',
    password: '',
  }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pendingFocus = useRef(registered ? 'password' : null);
  const [focusTick, setFocusTick] = useState(0);

  const redirect = safeRedirect(searchParams.get('redirect'));
  const expired = searchParams.get('reason') === 'expired';
  const registerPath = redirect
    ? `${PATHS.register}?redirect=${encodeURIComponent(redirect)}`
    : PATHS.register;

  useEffect(() => {
    document.title = 'Đăng nhập — Try-on';
  }, []);

  useEffect(() => {
    if (location.state) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [location.state, location.pathname, location.search, navigate]);

  // Đặt focus sau khi ô đã được bật lại (ô đang disabled thì không focus được).
  useEffect(() => {
    if (!pendingFocus.current || submitting) return;
    formRef.current?.elements.namedItem(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  }, [focusTick, submitting]);

  function requestFocus(field) {
    pendingFocus.current = field;
    setFocusTick((n) => n + 1);
  }

  function focusFirstInvalid(fieldErrors) {
    const first = FIELD_ORDER.find((name) => fieldErrors[name]);
    if (first) requestFocus(first);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => omit(current, name));
    setFormError('');
  }

  // Báo lỗi định dạng email sớm khi rời ô (chỉ khi đã nhập).
  function handleBlur(event) {
    const { name, value } = event.target;
    if (name !== 'email' || value === '') return;
    const message = validateEmail(value);
    setErrors((current) => (message ? { ...current, email: message } : omit(current, 'email')));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const fieldErrors = validateLoginForm(values);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      focusFirstInvalid(fieldErrors);
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      // Điều hướng sau đăng nhập do GuestOnly đảm nhiệm (safeRedirect(redirect) ?? /profile).
      await login({ email: values.email.trim(), password: values.password });
    } catch (error) {
      setSubmitting(false);
      if (error instanceof ApiError && error.code === 'INVALID_CREDENTIALS') {
        // Giữ email, xoá mật khẩu, trả focus về ô mật khẩu để nhập lại.
        setValues((current) => ({ ...current, password: '' }));
        setFormError(INVALID_CREDENTIALS);
        requestFocus('password');
      } else if (error instanceof ApiError && error.code === 'VALIDATION_ERROR' && error.fields) {
        setErrors(error.fields);
        focusFirstInvalid(error.fields);
      } else {
        setFormError(error instanceof ApiError ? error.message : GENERIC_ERROR);
      }
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold text-ink">Đăng nhập</h1>
      <p className="mt-2 text-sm text-ink-soft">Chào mừng bạn quay lại với Try-on.</p>

      {registered && (
        <p
          role="status"
          className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          Đăng ký thành công. Vui lòng đăng nhập.
        </p>
      )}
      {expired && !registered && (
        <p
          role="status"
          className="mt-6 rounded-2xl border border-gold/40 bg-sand px-4 py-3 text-sm text-ink"
        >
          Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.
        </p>
      )}

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
          error={errors.email}
        />

        <TextField
          label="Mật khẩu"
          name="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={handleChange}
          disabled={submitting}
          error={errors.password}
        />

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors duration-200 hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Chưa có tài khoản?{' '}
        <Link to={registerPath} className={textLinkClass}>
          Đăng ký
        </Link>
      </p>
    </>
  );
}
