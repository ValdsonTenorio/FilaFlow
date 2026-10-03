'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

type PublicQueue = { name: string; status: string; waiting: number };

export default function PublicQueuePage({ params }: { params: Promise<{ slug: string }> }) {
  const [queue, setQueue] = useState<PublicQueue>();
  const [error, setError] = useState(false);
  useEffect(() => { void params.then(({ slug }) => apiClient<PublicQueue>(`/queues/public/${encodeURIComponent(slug)}`).then(setQueue).catch(() => setError(true))); }, [params]);
  if (error) return <section className="panel"><h1>Fila indisponível</h1><p>Confira o link e tente novamente.</p></section>;
  if (!queue) return <section className="panel"><p>Carregando fila…</p></section>;
  return <section className="panel queue-public"><p className="eyebrow">FILA PÚBLICA</p><h1>{queue.name}</h1><p className="queue-status">{queue.status === 'OPEN' ? 'Aberta para atendimento' : 'Temporariamente indisponível'}</p><strong>{queue.waiting}</strong><span>pessoas aguardando</span></section>;
}
