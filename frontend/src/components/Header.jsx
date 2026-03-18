import { NavLink, useLocation } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../utils/media';

const baseNavItems = [
  { to: '/about', label: 'Biz haqimizda' },
  { to: '/masters', label: 'Ustalarni qidirish' },
  { to: '/elonlar', label: "Ish e'lonlari" },
  { to: '/blog', label: 'Blog' },
];

function Header() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { isAuthenticated, logout, user } = useAuth();
  const navItems = [...baseNavItems];

  return (
    <header className={`site-header${isHome ? ' site-header-home' : ''}`}>
      <div className="container header-inner">
        <NavLink to="/" className="brand">
          <span className="brand-logo-wrap">
            <img
              src="/brand/logo-transparent.png"
              alt="Ustazor logo"
              className="brand-logo"
            />
          </span>
          <span>
            <span className="brand-text">Ustazor</span>
            <span className="brand-subtitle">Ishonchli Usta Platformasi</span>
          </span>
        </NavLink>

        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-link${isActive ? ' nav-link-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          {isAuthenticated ? (
            <>
              <NavLink to="/profile" className="user-chip">
                {user?.profile_photo_url || user?.profile_photo ? (
                  <img
                    src={resolveMediaUrl(user.profile_photo_url || user.profile_photo, { userType: user?.user_type })}
                    alt="Profil rasmi"
                    className="user-chip-avatar"
                  />
                ) : (
                  <UserRound size={14} />
                )}
                {user?.full_name || user?.email || 'Foydalanuvchi'}
              </NavLink>
              <button className="button button-ghost" onClick={logout} type="button">
                Chiqish
              </button>
            </>
          ) : (
            <>
              <NavLink to="/auth/login" className="button button-ghost">
                Kirish
              </NavLink>
              <NavLink to="/auth/register" className="button button-primary">
                Ro'yxatdan o'tish
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
