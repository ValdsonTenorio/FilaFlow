'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, apiClient } from '@/lib/api-client';
import { env } from '@/lib/env';

type Entry = {
  id: string;
  displayName: string;
  status: 'WAITING' | 'IN_SERVICE' | 'CALLED';
  position: number;
  createdAt: string;
};
type Queue = { id: string; name: string; status: string; entries: Entry[] };

export default function QueueAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string>();
  const [queue, setQueue] = useState<Queue>();
  const [error, setError] = useState<string>();
  const [working, setWorking] = useState(false);
  const load = (queueId: string) =>
    apiClient<Queue>(`/queues/${encodeURIComponent(queueId)}`)
      .then(setQueue)
      .catch((reason) =>
        setError(
          reason instanceof ApiError
            ? reason.message
            : 'Não foi possível carregar a fila.',
        ),
      );
  useEffect(() => {
    void params.then(({ id: queueId }) => {
      setId(queueId);
      return load(queueId);
    });
  }, [params]);
  useEffect(() => {
    if (!id) return;
    const stream = new EventSource(
      `${env.NEXT_PUBLIC_API_URL}/queues/${encodeURIComponent(id)}/events`,
      { withCredentials: true },
    );
    stream.onmessage = () => void load(id);
    stream.onerror = () => stream.close();
    return () => stream.close();
  }, [id]);
  const action = async (path: string) => {
    if (!id) return;
    setWorking(true);
    setError(undefined);
    try {
      await apiClient<void>(path, { method: 'POST' });
      await load(id);
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : 'Não foi possível atualizar o atendimento.',
      );
    } finally {
      setWorking(false);
    }
  };
  if (!queue)
    return (
      <section className="panel">
        <p>{error ?? 'Carregando fila…'}</p>
      </section>
    );
  const current = queue.entries.find(
    (entry) => entry.status === 'IN_SERVICE' || entry.status === 'CALLED',
  );
  const waiting = queue.entries.filter((entry) => entry.status === 'WAITING');
  return (
    <section className="dashboard">
      <Link className="text-link" href="/dashboard">
        ← Todas as filas
      </Link>
      <header className="dashboard-header">
        <p className="eyebrow">ATENDIMENTO</p>
        <h1>{queue.name}</h1>
      </header>
      {current ? (
        <section className="panel current-entry">
          <p className="eyebrow">EM ATENDIMENTO</p>
          <h2>{current.displayName}</h2>
          <div>
            <button
              disabled={working}
              onClick={() =>
                void action(`/queues/${id}/entries/${current.id}/complete`)
              }
            >
              Finalizar
            </button>
            <button
              className="copy-button"
              disabled={working}
              onClick={() =>
                void action(`/queues/${id}/entries/${current.id}/no-show`)
              }
            >
              Ausência
            </button>
            <button
              className="copy-button"
              disabled={working}
              onClick={() =>
                void action(`/queues/${id}/entries/${current.id}/cancel`)
              }
            >
              Cancelar
            </button>
          </div>
        </section>
      ) : (
        <button
          disabled={working || waiting.length === 0}
          onClick={() => void action(`/queues/${id}/attendance/next`)}
        >
          {working ? 'Atualizando…' : 'Chamar próximo'}
        </button>
      )}
      <section className="panel">
        <h2>Aguardando ({waiting.length})</h2>
        {waiting.length ? (
          <ol className="waiting-list">
            {waiting.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.position}</strong>
                <span>{entry.displayName}</span>
                <button
                  className="copy-button"
                  disabled={working}
                  onClick={() =>
                    void action(`/queues/${id}/entries/${entry.id}/cancel`)
                  }
                >
                  Cancelar
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="loading">Não há clientes aguardando.</p>
        )}
      </section>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
