'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, apiClient } from '@/lib/api-client';

type AuthMode = 'login' | 'register';

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsSubmitting(true);
    const data = new FormData(event.currentTarget);
    const payload = {
      email: String(data.get('email') ?? ''),
      password: String(data.get('password') ?? ''),
      ...(mode === 'register'
        ? { organizationName: String(data.get('organizationName') ?? '') }
        : {}),
    };

    try {
      await apiClient(`/auth/${mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.replace('/dashboard');
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : 'Não foi possível concluir a solicitação.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      {mode === 'register' && (
        <label>
          Nome da empresa
          <input
            name="organizationName"
            required
            minLength={2}
            maxLength={120}
            autoComplete="organization"
          />
        </label>
      )}
      <label>
        E-mail
        <input
          name="email"
          type="email"
          required
          maxLength={320}
          autoComplete="email"
        />
      </label>
      <label>
        Senha
        <input
          name="password"
          type="password"
          required
          minLength={mode === 'register' ? 12 : 1}
          maxLength={128}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
      </label>
      {mode === 'register' && (
        <p className="hint">
          Use 12 ou mais caracteres, com maiúscula, minúscula e número.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? 'Aguarde…'
          : mode === 'login'
            ? 'Entrar'
            : 'Criar conta'}
      </button>
    </form>
  );
}
