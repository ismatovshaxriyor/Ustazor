import { SignIn } from '@clerk/react';
import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const nextPath = searchParams.get('next') || '/';
  const safeNextPath = nextPath.startsWith('/') ? nextPath : '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(safeNextPath, { replace: true });
    }
  }, [isAuthenticated, navigate, safeNextPath]);

  return (
    <section className="auth-shell reveal-up">
      <article className="auth-card card">
        <h2>Tizimga kirish</h2>
        <p className="auth-subtitle">Akkountingizga xavfsiz kiring.</p>

        <div className="clerk-wrap">
          <SignIn
            path="/auth/login"
            routing="path"
            signUpUrl="/auth/register"
            forceRedirectUrl={safeNextPath}
          />
        </div>

        <div className="auth-links">
          <Link to="/auth/register">Ro`yxatdan o`tish sahifasi</Link>
        </div>
      </article>
    </section>
  );
}

export default LoginPage;
