import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { redirectToLogin } from '@features/auth/utils/auth.ts';

function LoginPage() {
  const { t } = useTranslation('auth');

  useEffect(() => {
    redirectToLogin();
  }, []);

  return <div>{t('page.redirecting')}</div>;
}

export default LoginPage;
