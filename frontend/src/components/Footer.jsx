import { Link } from 'react-router-dom';

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-shell">
        <div className="footer-top">
          <div className="footer-col">
            <p className="footer-brand">
              <img src="/brand/logo-transparent.png" alt="Ustazor logo" className="footer-logo" />
              Ustazor
            </p>
            <p className="footer-note">
              Usta va mijozlarni bir platformada ishonchli bog`laymiz. Hozircha test rejimida
              ishlayapmiz.
            </p>
          </div>

          <div className="footer-col">
            <h4>Support</h4>
            <ul className="footer-list">
              <li>Email: support@ustazor.uz</li>
              <li>Telefon: +998 90 000 00 00</li>
              <li>Ish vaqti: 09:00 - 18:00</li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Ijtimoiy tarmoqlar</h4>
            <ul className="footer-list">
              <li>
                <a href="#" className="footer-link">Telegram</a>
              </li>
              <li>
                <a href="#" className="footer-link">Instagram</a>
              </li>
              <li>
                <a href="#" className="footer-link">YouTube</a>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Platforma</h4>
            <ul className="footer-list">
              <li><Link to="/about" className="footer-link">Biz haqimizda</Link></li>
              <li><Link to="/blog" className="footer-link">Blog</Link></li>
              <li><Link to="/terms" className="footer-link">Terms of Service</Link></li>
              <li><Link to="/privacy" className="footer-link">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>{`© ${year} Ustazor`}</p>
          <p>Kontentlar bosqichma-bosqich to`ldiriladi.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
