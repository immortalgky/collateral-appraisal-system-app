import { useEffect } from 'react';
import { useAuthStore } from '@features/auth/store.ts';
import { useNavigate } from 'react-router-dom';

function CallbackPage() {
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    const state = new URLSearchParams(window.location.search).get('state');
    const storedState = sessionStorage.getItem('oauth_state');
    const codeVerifier = sessionStorage.getItem('pkce_code_verifier');

    if (state !== storedState || !code || !codeVerifier) {
      console.error('Invalid state or missing code');
      return;
    }

    fetch('https://localhost:7111/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grantType: 'authorization_code',
        clientId: 'spa',
        code,
        codeVerifier: codeVerifier,
        redirectUri: 'https://localhost:3000/callback',
      }),
    })
      .then(res => res.json())
      .then(tokens => {
        console.log('Tokens:', tokens);

        // Store tokens and redirect to dashboard
        login({ id: '', name: '', email: '', role: '' }, tokens.accessToken);
        navigate('/');
      });
  }, []);

  return <p>Processing login...</p>;
}

export default CallbackPage;
