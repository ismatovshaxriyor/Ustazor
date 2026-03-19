import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LogOut, Menu, MessageCircle, UserRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
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
  const { unreadCount } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = [...baseNavItems];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className={`site-header${isHome ? ' site-header-home' : ''}`}>
      <div className="container header-inner">
        <NavLink to="/" className="brand" onClick={closeMobileMenu}>
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

        <button
          type="button"
          className="mobile-menu-toggle header-icon-action"
          aria-label={mobileMenuOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className={`main-nav${mobileMenuOpen ? ' mobile-open' : ''}`} aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-link${isActive ? ' nav-link-active' : ''}`
              }
              onClick={closeMobileMenu}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={`header-actions${mobileMenuOpen ? ' mobile-open' : ''}`}>
          {isAuthenticated ? (
            <>
              <NavLink
                to="/profile"
                className="header-icon-action header-icon-labeled"
                aria-label="Profil"
                title="Profil"
                onClick={closeMobileMenu}
              >
                <span className="header-icon-glyph">
                  {user?.profile_photo_url || user?.profile_photo ? (
                    <img
                      src={resolveMediaUrl(user.profile_photo_url || user.profile_photo, { userType: user?.user_type })}
                      alt="Profil rasmi"
                      className="header-icon-avatar"
                    />
                  ) : (
                    <UserRound size={18} />
                  )}
                </span>
                <span className="header-icon-label" aria-hidden="true">Profil</span>
              </NavLink>
              <NavLink
                to="/chat"
                className="header-icon-action header-icon-labeled header-chat-icon"
                aria-label="Chat"
                title="Chat"
                onClick={closeMobileMenu}
              >
                <span className="header-icon-glyph">
                  <MessageCircle size={18} />
                </span>
                <span className="header-icon-label" aria-hidden="true">Chat</span>
                {unreadCount > 0 && (
                  <span className="header-unread-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </NavLink>
              <button
                className="header-icon-action header-icon-labeled"
                onClick={() => { logout(); closeMobileMenu(); }}
                type="button"
                aria-label="Chiqish"
                title="Chiqish"
              >
                <span className="header-icon-glyph">
                  <LogOut size={18} />
                </span>
                <span className="header-icon-label" aria-hidden="true">Chiqish</span>
              </button>
            </>
          ) : (
            <>
              <NavLink to="/auth/login" className="button button-ghost" onClick={closeMobileMenu}>
                Kirish
              </NavLink>
              <NavLink to="/auth/register" className="button button-primary" onClick={closeMobileMenu}>
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
