import Link from 'next/link';

export default function HomePage() {
  return <section className="hero"><p className="eyebrow">FILAS DIGITAIS PARA PEQUENOS NEGÓCIOS</p><h1>Atendimento organizado.<br /><span>Espera mais leve.</span></h1><p className="hero-copy">Uma base segura para acompanhar cada atendimento, proteger os dados da sua empresa e evoluir no ritmo do seu negócio.</p><div className="hero-actions"><Link className="button-link" href="/cadastro">Começar agora</Link><Link className="text-link" href="/login">Já tenho uma conta</Link></div></section>;
}
