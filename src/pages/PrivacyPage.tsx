import { Link } from 'react-router-dom';
import { PageLayout } from '../components/layouts/PageLayout';
import { PolicyTable } from '../components/PolicyTable';
import {
  PRIVACY_POLICY_DESCRIPTION,
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_TITLE,
  type PrivacyPolicyBlock,
  type PrivacyPolicyLink,
} from '../data/privacyPolicy';

// D8c (aprovada em 02/11/2026), parte 4: a página pública /privacidade, escrita a partir de src/data/privacyPolicy.ts
// (o mesmo arranjo da Política de reserva: o texto é dado, a página só desenha). A versão anterior citava um provedor
// de pagamento e a finalidade "personalizar a experiência", que não existem, e não trazia CNPJ, base legal, prazos,
// serviços usados, transferência para fora do Brasil, cookies nem fotos do mural.

const linkClass = 'text-primary hover:underline underline-offset-4 break-all';

const PolicyLinkView = ({ link }: { link: PrivacyPolicyLink }) =>
  link.href.startsWith('/') ? (
    <Link to={link.href} className={linkClass}>
      {link.label}
    </Link>
  ) : (
    <a href={link.href} className={linkClass}>
      {link.label}
    </a>
  );

const Block = ({ block }: { block: PrivacyPolicyBlock }) => {
  if (block.kind === 'paragraph') {
    const content = (
      <>
        {block.text}
        {block.link && (
          <>
            {' '}
            <PolicyLinkView link={block.link} />.
          </>
        )}
      </>
    );
    // Art. 33, VIII: a transferência do Google Analytics vem em destaque, como no aviso de cookies.
    return block.highlight ? (
      <p className="rounded-md border border-primary/40 bg-primary/5 p-4 font-semibold leading-relaxed text-foreground">
        {content}
      </p>
    ) : (
      <p className="text-muted-foreground leading-relaxed">{content}</p>
    );
  }
  if (block.kind === 'list') {
    return (
      <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return <PolicyTable caption={block.caption} columns={block.columns} rows={block.rows} />;
};

export const PrivacyPage = () => (
  <PageLayout title={PRIVACY_POLICY_TITLE} description={PRIVACY_POLICY_DESCRIPTION}>
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-xl p-5 sm:p-8 space-y-8 border border-border">
        {PRIVACY_POLICY_SECTIONS.map((section, index) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-titulo`}>
            <h2 id={`${section.id}-titulo`} className="text-2xl font-semibold text-foreground mb-4">
              {index + 1}. {section.title}
            </h2>
            <div className="space-y-4">
              {section.blocks.map((block, blockIndex) => (
                <Block key={blockIndex} block={block} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  </PageLayout>
);
