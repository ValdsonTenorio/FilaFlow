'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { env } from '@/lib/env';

type Panel = {
  name: string;
  current: string | null;
  next: string[];
  updatedAt: string;
};

export default function PublicPanelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState<string>();
  const [panel, setPanel] = useState<Panel>();
  const [error, setError] = useState(false);
  useEffect(() => {
    void params.then(({ slug: value }) => {
      setSlug(value);
      return apiClient<Panel>(
        `/queues/public/${encodeURIComponent(value)}/panel`,
      )
        .then(setPanel)
        .catch(() => setError(true));
    });
  }, [params]);
  useEffect(() => {
    if (!slug) return;
    const refresh = () =>
      apiClient<Panel>(`/queues/public/${encodeURIComponent(slug)}/panel`)
        .then(setPanel)
        .catch(() => setError(true));
    const stream = new EventSource(
      `${env.NEXT_PUBLIC_API_URL}/queues/public/${encodeURIComponent(slug)}/events`,
    );
    stream.onmessage = () => void refresh();
    return () => stream.close();
  }, [slug]);
  if (error)
    return (
      <section className="public-card">
        <h1>Painel indisponível</h1>
      </section>
    );
  if (!panel)
    return (
      <section className="public-card">
        <p>Carregando painel…</p>
      </section>
    );
  return (
    <section className="public-card tv-panel">
      <p className="eyebrow">ACOMPANHAMENTO AO VIVO</p>
      <h1>{panel.name}</h1>
      <p>Em atendimento</p>
      <strong className="position">{panel.current ?? 'Aguardando'}</strong>
      <h2>Próximos</h2>
      <ol>
        {panel.next.length ? (
          panel.next.map((name) => <li key={name}>{name}</li>)
        ) : (
          <li>Sem clientes aguardando</li>
        )}
      </ol>
      <small>
        Atualizado às {new Date(panel.updatedAt).toLocaleTimeString('pt-BR')}
      </small>
    </section>
  );
}
