import { useEffect } from 'react';
import ProfileForm from '../components/profile/ProfileForm.jsx';
import { useProfile } from '../features/profile/useProfile.js';

function ProfileSkeleton() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Đang tải hồ sơ…</span>
      <div
        aria-hidden="true"
        className="grid gap-8 md:grid-cols-[16rem_1fr] lg:grid-cols-[18rem_1fr]"
      >
        <div className="mx-auto aspect-[3/4] w-full max-w-64 rounded-[2rem] bg-sand md:mx-0" />
        <div className="space-y-5 rounded-3xl bg-surface p-6 shadow-card sm:p-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <div className="mb-2 h-4 w-28 rounded bg-sand" />
              <div className="h-12 rounded-2xl bg-sand" />
            </div>
          ))}
          <div className="h-12 w-40 rounded-full bg-sand" />
        </div>
      </div>
    </div>
  );
}

function ProfileLoadError({ message, onRetry }) {
  return (
    <div role="alert" className="rounded-3xl bg-surface p-6 text-center shadow-card sm:p-10">
      <h2 className="font-display text-2xl font-semibold text-ink">Không tải được hồ sơ</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-8 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
      >
        Thử lại
      </button>
    </div>
  );
}

/** Trang /profile (trong RequireAuth + MainLayout). Dữ liệu qua features/profile. */
export default function ProfilePage() {
  const { status, profile, error, reload, saveText, saveAvatar, removeAvatar, refreshAvatarUrl } =
    useProfile();

  useEffect(() => {
    document.title = 'Hồ sơ — Try-on';
  }, []);

  return (
    <section aria-labelledby="profile-title">
      <h1 id="profile-title" className="font-display text-3xl font-semibold text-ink">
        Hồ sơ của tôi
      </h1>
      <p className="mb-6 mt-2 text-sm text-ink-soft">
        Số đo và ảnh toàn thân giúp phòng thử đồ cho kết quả sát với bạn nhất.
      </p>

      {status === 'loading' && <ProfileSkeleton />}
      {status === 'error' && <ProfileLoadError message={error} onRetry={reload} />}
      {status === 'ready' && (
        <ProfileForm
          key={profile.id}
          profile={profile}
          saveText={saveText}
          saveAvatar={saveAvatar}
          removeAvatar={removeAvatar}
          refreshAvatarUrl={refreshAvatarUrl}
        />
      )}
    </section>
  );
}
