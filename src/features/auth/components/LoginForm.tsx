import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import Card from '@shared/components/Card';
import { isValidEmail } from '@shared/utils/validationUtils';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
  isLoading: boolean;
}

const makeValidationSchema = (t: TFunction<'auth'>) => ({
  validateEmail: (email: string): string | undefined => {
    if (!email) return t('validation.emailRequired');
    if (!isValidEmail(email)) return t('validation.emailInvalid');
    return undefined;
  },
  validatePassword: (password: string): string | undefined => {
    if (!password) return t('validation.passwordRequired');
    return undefined;
  },
});

function LoginForm({ onSubmit, isLoading }: LoginFormProps) {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = (): boolean => {
    const schema = makeValidationSchema(t);
    const newErrors: { email?: string; password?: string } = {};

    const emailError = schema.validateEmail(email);
    if (emailError) newErrors.email = emailError;

    const passwordError = schema.validatePassword(password);
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(email, password);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label={t('fields.email')}
            type="email"
            placeholder={t('placeholders.email')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            error={errors.email}
            required
          />

          <Input
            label={t('fields.password')}
            type="password"
            placeholder={t('placeholders.password')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            error={errors.password}
            required
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                {t('form.rememberMe')}
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="text-blue-600 hover:text-blue-800">
                {t('form.forgotPassword')}
              </a>
            </div>
          </div>

          <Button type="submit" fullWidth isLoading={isLoading}>
            {t('form.signIn')}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default LoginForm;
