import { useAuth } from '../auth/authContext.js';
import LandingHeader from '../components/landing/LandingHeader.jsx';
import Hero from '../components/landing/Hero.jsx';
import Features from '../components/landing/Features.jsx';
import HowItWorks from '../components/landing/HowItWorks.jsx';
import Categories from '../components/landing/Categories.jsx';
import CtaBand from '../components/landing/CtaBand.jsx';
import LandingFooter from '../components/landing/LandingFooter.jsx';

export default function LandingPage() {
  const { user, logout } = useAuth();

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Bỏ qua tới nội dung chính
      </a>
      <LandingHeader user={user} onLogout={logout} />
      <main id="main">
        <Hero />
        <Features />
        <HowItWorks />
        <Categories />
        <CtaBand />
      </main>
      <LandingFooter />
    </>
  );
}
