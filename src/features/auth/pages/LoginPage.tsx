import { useEffect } from 'react';
import { redirectToLogin } from '@features/auth/utils/auth.ts';

function LoginPage() {
  useEffect(() => {
    redirectToLogin();
  }, []);

  return <div>Redirecting to login...</div>;
}

export default LoginPage;
