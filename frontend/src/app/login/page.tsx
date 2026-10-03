import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';

export default function LoginPage() {
  return (
    <section className="auth-page">
      <div>
        <p className="eyebrow">ACESSO SEGURO</p>
        <h1>Bem-vindo de volta</h1>
        <p>Entre para acompanhar as filas da sua empresa.</p>
      </div>
      <AuthForm mode="login" />
      <p className="auth-switch">
        Ainda não usa o FilaFlow? <Link href="/cadastro">Criar conta</Link>
      </p>
    </section>
  );
}
