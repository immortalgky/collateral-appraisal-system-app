import { useEffect, useRef } from 'react';
import { useAuthStore } from '@features/auth/store.ts';
import { useNavigate } from 'react-router-dom';

function CallbackPage() {
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();
  const isProcessing = useRef(false);

  useEffect(() => {
    // Guard against double execution (React StrictMode)
    if (isProcessing.current) return;
    isProcessing.current = true;

    const baseApiUrl = import.meta.env.VITE_API_URL;
    const baseAppUrl = import.meta.env.VITE_APP_URL;
    const code = new URLSearchParams(window.location.search).get('code');
    const state = new URLSearchParams(window.location.search).get('state');
    const storedState = sessionStorage.getItem('oauth_state');
    const codeVerifier = sessionStorage.getItem('pkce_code_verifier');

    // Clear sessionStorage immediately to prevent reuse
    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('pkce_code_verifier');

    if (state !== storedState || !code || !codeVerifier) {
      console.error('Invalid state or missing code');
      navigate('/login');
      return;
    }

    fetch(`${baseApiUrl}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grantType: 'authorization_code',
        clientId: 'spa',
        code,
        codeVerifier,
        redirectUri: `${baseAppUrl}/callback`,
      }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Token exchange failed');
        return res.json();
      })
      .then(tokens => {
        login(
          {
            id: '',
            name: '',
            firstName: '',
            lastName: '',
            email: '',
            username: '',
            avatarUrl: '',
            position: '',
            department: '',
            roles: [],
            permissions: [],
          },
          tokens.accessToken,
        );
        navigate('/');
      })
      .catch(error => {
        console.error('Token exchange error:', error);
        navigate('/login');
      });
  }, [login, navigate]);

  return <p>Processing login...</p>;
}

export default CallbackPage;
