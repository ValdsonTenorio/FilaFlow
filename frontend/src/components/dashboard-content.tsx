'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ApiError, apiClient } from '@/lib/api-client';

type CurrentUser = { id: string; email: string };
type CurrentOrganization = {
  id: string;
  name: string;
  slug: string;
  role: string;
};
type Queue = {
  id: string;
  name: string;
  publicSlug: string;
  status: 'OPEN' | 'PAUSED' | 'CLOSED';
  createdAt: string;
  waiting: number;
};

export function DashboardContent() {
  const [user, setUser] = useState<CurrentUser>();
  const [organization, setOrganization] = useState<CurrentOrganization>();
  const [queues, setQueues] = useState<Queue[]>();
  const [error, setError] = useState<string>();
  const [isCreating, setIsCreating] = useState(false);

  const publicBaseUrl = useMemo(
    () => (typeof window === 'undefined' ? '' : window.location.origin),
    [],
  );

  async function loadDashboard() {
    try {
      const [currentUser, currentOrganization, currentQueues] =
        await Promise.all([
          apiClient<CurrentUser>('/users/me'),
          apiClient<CurrentOrganization>('/organizations/current'),
          apiClient<Queue[]>('/queues'),
        ]);
      setUser(currentUser);
      setOrganization(currentOrganization);
      setQueues(currentQueues);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) return;
      setError('Não foi possível carregar suas filas. Tente novamente.');
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function createQueue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setError(undefined);
    const name = String(new FormData(event.currentTarget).get('name') ?? '');
    try {
      await apiClient<Queue>('/queues', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      event.currentTarget.reset();
      await loadDashboard();
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : 'Não foi possível criar a fila.',
      );
    } finally {
      setIsCreating(false);
    }
  }

  if (!user || !organization)
    return (
      <section className="panel">
        <h1>Seu painel está protegido</h1>
        <p>Entre para consultar as filas da sua empresa.</p>
        <Link className="button-link" href="/login">
          Entrar
        </Link>
      </section>
    );

  return (
    <section className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">{organization.role}</p>
          <h1>{organization.name}</h1>
          <p>Conectado como {user.email}</p>
        </div>
      </header>
      <section className="queue-create panel">
        <h2>Nova fila</h2>
        <form onSubmit={createQueue}>
          <label htmlFor="queue-name">Nome da fila</label>
          <div>
            <input
              id="queue-name"
              name="name"
              minLength={2}
              maxLength={120}
              required
              placeholder="Ex.: Atendimento geral"
            />
            <button type="submit" disabled={isCreating}>
              {isCreating ? 'Criando…' : 'Criar fila'}
            </button>
          </div>
        </form>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>
      <section aria-labelledby="queues-heading">
        <div className="section-title">
          <h2 id="queues-heading">Filas da empresa</h2>
          {queues && <span>{queues.length}</span>}
        </div>
        {queues === undefined && <p className="loading">Carregando filas…</p>}
        {queues?.length === 0 && (
          <div className="queue-empty">
            <span aria-hidden="true">◌</span>
            <h2>Nenhuma fila criada</h2>
            <p>
              Crie a primeira fila para compartilhar um link público com seus
              clientes.
            </p>
          </div>
        )}
        <div className="queue-grid">
          {queues?.map((queue) => (
            <QueueCard
              key={queue.id}
              queue={queue}
              publicBaseUrl={publicBaseUrl}
            />
          ))}
        </div>
      </section>
    </section>
  );
}

function QueueCard({
  queue,
  publicBaseUrl,
}: {
  queue: Queue;
  publicBaseUrl: string;
}) {
  const link = `${publicBaseUrl}/fila/${queue.publicSlug}`;
  const [copied, setCopied] = useState(false);
  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }
  return (
    <article className="queue-card">
      <div className="queue-card-top">
        <div>
          <h3>{queue.name}</h3>
          <span className={`status status-${queue.status.toLowerCase()}`}>
            {queue.status === 'OPEN' ? 'Ativa' : 'Inativa'}
          </span>
        </div>
        <strong>
          {queue.waiting}
          <small> aguardando</small>
        </strong>
      </div>
      <div className="queue-share">
        <QRCodeSVG
          value={link}
          size={92}
          bgColor="transparent"
          fgColor="#30d8e8"
          level="M"
        />
        <div>
          <label>Link público</label>
          <a href={link} target="_blank" rel="noreferrer">
            {link}
          </a>
          <button
            className="copy-button"
            type="button"
            onClick={() => void copyLink()}
          >
            {copied ? 'Link copiado' : 'Copiar link'}
          </button>
          <Link className="text-link" href={`/dashboard/fila/${queue.id}`}>
            Abrir atendimento
          </Link>
        </div>
      </div>
    </article>
  );
}
