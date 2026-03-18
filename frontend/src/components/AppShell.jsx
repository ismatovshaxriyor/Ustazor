import Header from './Header';
import Footer from './Footer';
import { useLocation } from 'react-router-dom';

function AppShell({ children }) {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const mainClassName = isHome ? 'page-content-home' : 'container page-content';

  return (
    <div className="app-frame">
      <Header />
      <main className={mainClassName}>{children}</main>
      <Footer />
    </div>
  );
}

export default AppShell;
