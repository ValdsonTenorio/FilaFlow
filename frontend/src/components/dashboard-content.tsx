'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, apiClient } from '@/lib/api-client';

type CurrentUser = { id: string; email: string };
type CurrentOrganization = { id: string; name: string; slug: string; role: string };

export function DashboardContent() {
  const [user, setUser] = useState<CurrentUser>();
  const [organization, setOrganization] = useState<CurrentOrganization>();

  useEffect(() => {
    Promise.all([apiClient<CurrentUser>('/users/me'), apiClient<CurrentOrganization>('/organizations/current')])
      .then(([currentUser, currentOrganization]) => { setUser(currentUser); setOrganization(currentOrganization); })
      .catch((reason: unknown) => { if (!(reason instanceof ApiError && reason.status === 401)) return; });
  }, []);

  if (!user || !organization) return <section className="panel"><h1>Seu painel está protegido</h1><p>Entre para consultar as filas da sua empresa.</p><Link className="button-link" href="/login">Entrar</Link></section>;
  return <section className="panel"><p className="eyebrow">{organization.role}</p><h1>{organization.name}</h1><p>Conectado como {user.email}. A fundação da fila está pronta para as próximas operações.</p><div className="queue-empty"><span aria-hidden="true">◌</span><h2>Nenhuma fila criada</h2><p>Os fluxos operacionais serão adicionados sobre esta base isolada por empresa.</p></div></section>;
}
