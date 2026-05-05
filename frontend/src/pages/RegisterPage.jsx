import { useEffect } from 'react';
import { SignUp } from '@clerk/react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <section className="auth-shell reveal-up">
      <article className="auth-card card">
        <h2>Ro`yxatdan o`tish</h2>
        <p className="auth-subtitle">
          Ro`yxatdan o`ting.
        </p>

        <div className="clerk-wrap">
          <SignUp
            path="/auth/register"
            routing="path"
            signInUrl="/auth/login"
            forceRedirectUrl="/"
          />
        </div>

        <div className="auth-links">
          <Link to="/auth/login">Akkauntingiz bormi? Kirish</Link>
        </div>
      </article>
    </section>
  );
}

export default RegisterPage;
