import Header from './Header';
import Footer from './Footer';
import ToastContainer from './ToastContainer';
import { useLocation } from 'react-router-dom';

function AppShell({ children }) {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isChat = location.pathname.startsWith('/chat');
  const isProfile = location.pathname.startsWith('/profile');
  const isOrders = location.pathname.startsWith('/orders');
  const mainClassName = isHome
    ? 'page-content-home'
    : (isChat || isProfile || isOrders)
      ? 'container container-chat page-content'
      : 'container page-content';

  return (
    <div className="app-frame">
      <Header />
      <main className={mainClassName}>{children}</main>
      <Footer />
      <ToastContainer />
    </div>
  );
}

export default AppShell;
