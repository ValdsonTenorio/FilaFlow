import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'FilaFlow',
  description: 'Filas digitais simples, seguras e organizadas.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><header className="site-header"><Link className="brand" href="/">Fila<span>Flow</span></Link><nav aria-label="Navegação principal"><Link href="/login">Entrar</Link><Link className="nav-cta" href="/cadastro">Criar conta</Link></nav></header><main>{children}</main></body></html>;
}
