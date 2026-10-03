import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';

export default function RegisterPage() {
  return <section className="auth-page"><div><p className="eyebrow">COMECE COM SEGURANÇA</p><h1>Crie sua operação</h1><p>Sua empresa nasce isolada e pronta para as próximas etapas.</p></div><AuthForm mode="register" /><p className="auth-switch">Já possui uma conta? <Link href="/login">Entrar</Link></p></section>;
}
