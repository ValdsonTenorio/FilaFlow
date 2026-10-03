'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiError, apiClient } from '@/lib/api-client';

type PublicQueue = { name: string; status: 'OPEN'; waiting: number };
type EntryConfirmation = {
  queueName: string;
  firstName: string;
  position: number;
};

export default function PublicQueuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState<string>();
  const [queue, setQueue] = useState<PublicQueue>();
  const [confirmation, setConfirmation] = useState<EntryConfirmation>();
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void params.then(({ slug: currentSlug }) => {
      setSlug(currentSlug);
      return apiClient<PublicQueue>(
        `/queues/public/${encodeURIComponent(currentSlug)}`,
      )
        .then(setQueue)
        .catch(() => setError('Esta fila não está disponível.'));
    });
  }, [params]);

  async function enterQueue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slug) return;
    setError(undefined);
    setIsSubmitting(true);
    try {
      const firstName = String(
        new FormData(event.currentTarget).get('firstName') ?? '',
      );
      setConfirmation(
        await apiClient<EntryConfirmation>(
          `/queues/public/${encodeURIComponent(slug)}/entries`,
          { method: 'POST', body: JSON.stringify({ firstName }) },
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : 'Não foi possível entrar na fila.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (error && !queue)
    return (
      <section className="public-card">
        <h1>Fila indisponível</h1>
        <p>{error}</p>
      </section>
    );
  if (!queue)
    return (
      <section className="public-card">
        <p>Carregando fila…</p>
      </section>
    );
  if (confirmation)
    return (
      <section className="public-card confirmation">
        <p className="eyebrow">ENTRADA CONFIRMADA</p>
        <h1>Olá, {confirmation.firstName}!</h1>
        <p>
          Você entrou na fila <strong>{confirmation.queueName}</strong>.
        </p>
        <strong className="position">{confirmation.position}</strong>
        <span>Sua posição atual</span>
      </section>
    );
  return (
    <section className="public-card">
      <p className="eyebrow">FILA DIGITAL</p>
      <h1>{queue.name}</h1>
      <p>
        {queue.waiting} pessoa{queue.waiting === 1 ? '' : 's'} aguardando.
      </p>
      <form className="entry-form" onSubmit={enterQueue}>
        <label htmlFor="firstName">Seu primeiro nome</label>
        <input
          id="firstName"
          name="firstName"
          autoComplete="given-name"
          minLength={1}
          maxLength={50}
          required
          placeholder="Como podemos chamar você?"
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Entrando…' : 'Entrar na fila'}
        </button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
