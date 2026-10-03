'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiError, apiClient } from '@/lib/api-client';
import { env } from '@/lib/env';

type PublicQueue = { name: string; status: 'OPEN'; waiting: number };
type EntryConfirmation = {
  queueName: string;
  firstName: string;
  position: number;
  publicToken: string;
};
type CustomerStatus = {
  queueName: string;
  status: string;
  position: number | null;
  ahead: number;
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
  const [customerStatus, setCustomerStatus] = useState<CustomerStatus>();

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

  useEffect(() => {
    if (!confirmation) return;
    const refresh = () =>
      apiClient<CustomerStatus>(
        `/queues/public/entries/${encodeURIComponent(confirmation.publicToken)}`,
      )
        .then(setCustomerStatus)
        .catch(() => setError('Não foi possível atualizar seu atendimento.'));
    void refresh();
    const stream = new EventSource(
      `${env.NEXT_PUBLIC_API_URL}/queues/public/entries/${encodeURIComponent(confirmation.publicToken)}/events`,
      { withCredentials: true },
    );
    stream.onmessage = () => void refresh();
    stream.onerror = () => stream.close();
    return () => stream.close();
  }, [confirmation]);

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
        {customerStatus?.status === 'IN_SERVICE' ? (
          <>
            <strong className="position">É sua vez!</strong>
            <span>Dirija-se ao atendimento.</span>
          </>
        ) : (
          <>
            <strong className="position">
              {customerStatus?.position ?? confirmation.position}
            </strong>
            <span>
              {customerStatus
                ? `${customerStatus.ahead} pessoa${customerStatus.ahead === 1 ? '' : 's'} à frente`
                : 'Sua posição atual'}
            </span>
          </>
        )}
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
