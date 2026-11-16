import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ContractDocument, ContractTextBlock } from '@/types/contract';

// Semanas 2 e 3 do teste do aceite (16/11/2026): "mostrar o contrato como texto na página, além do PDF" (no celular e nos
// navegadores do WhatsApp e do Instagram o PDF costuma não abrir, e "Abrir em tela cheia" e "Baixar" podem ser
// bloqueados). O texto vem do servidor, tirado do MESMO modelo que desenha o PDF; os dados do contratante ficam só no PDF
// (as respostas da página da proposta não levam dado pessoal). Fechado de início (<details>: abre com toque, Enter ou
// espaço, sem script); as cláusulas em destaque saem como no PDF (CDC, art. 54, § 4º).

function Block({ block }: { block: ContractTextBlock }) {
  if (block.kind === 'item' || block.kind === 'sub') {
    const label = block.kind === 'item' ? block.num : block.letter;
    return (
      <p
        className={cn(
          block.kind === 'sub' && 'pl-6',
          block.highlight && 'rounded-lg border-l-4 border-warning bg-warning/10 p-3 font-semibold text-foreground',
        )}
      >
        <span className="font-semibold">{label}</span> {block.text}
      </p>
    );
  }
  if (block.kind === 'event') {
    return (
      <dl className="space-y-1 rounded-lg bg-muted p-3">
        {block.rows.map((row) => (
          <div key={row.label} className="sm:grid sm:grid-cols-[10rem_1fr] sm:gap-3">
            <dt className="font-semibold">{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <table className="w-full border-collapse text-left">
      <caption className="pb-1 text-left font-semibold">{block.caption}</caption>
      <thead>
        <tr className="border-b border-border">
          <th scope="col" className="py-1.5 pr-3 font-semibold">
            {block.head[0]}
          </th>
          <th scope="col" className="py-1.5 font-semibold">
            {block.head[1]}
          </th>
        </tr>
      </thead>
      <tbody>
        {block.rows.map(([range, value]) => (
          <tr key={range} className="border-b border-border/60">
            <td className="py-1.5 pr-3">{range}</td>
            <td className="py-1.5 font-semibold">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ContractDocumentText({ document }: { document: ContractDocument }) {
  const { annex1, annex2 } = document;
  return (
    <details className="group rounded-lg border-2 border-border bg-card">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 p-4 font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
        Ler o contrato completo nesta página
      </summary>
      <div className="space-y-4 border-t-2 border-border p-4 leading-relaxed" data-testid="contrato-texto">
        <p className="text-muted-foreground">
          É o mesmo texto do PDF. Os seus dados (nome, documento, endereço, e-mail e telefone) aparecem só no PDF.
        </p>
        <div>
          <p className="text-lg font-bold text-foreground">{document.title}</p>
          <p>{document.subtitle}</p>
          <p className="text-muted-foreground">
            Pedido nº {document.code} · Modelo {document.templateVersion}
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground">CONTRATANTE:</p>
          <p className="text-muted-foreground">Os dados que você informou no passo 1, como estão no PDF.</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">CONTRATADA:</p>
          <p>{document.contractor}</p>
        </div>
        <p>{document.intro}</p>
        {document.clauses.map((clause) => (
          <section key={clause.title} className="space-y-2">
            <h4 className="font-bold text-foreground">{clause.title}</h4>
            {clause.blocks.map((block, idx) => (
              <Block key={idx} block={block} />
            ))}
          </section>
        ))}
        {document.closing.map((text) => (
          <p key={text}>{text}</p>
        ))}
        <section className="space-y-2">
          <h4 className="font-bold text-foreground">{annex1.title}</h4>
          <ul className="space-y-2">
            {annex1.groups.map((group) => (
              <li key={group.title}>
                <p className="font-semibold">{group.title}</p>
                <ul className="list-disc pl-6">
                  {group.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p>{annex1.note}</p>
        </section>
        <section className="space-y-2">
          <h4 className="font-bold text-foreground">{annex2.title}</h4>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-1.5 pr-3 font-semibold">
                  Item
                </th>
                <th scope="col" className="py-1.5 text-right font-semibold">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody>
              {annex2.rows.map((row, idx) => (
                <tr key={idx} className="border-b border-border/60 align-top">
                  <td className="py-1.5 pr-3">
                    <span className="font-semibold">{row.label}</span>
                    {row.detail && <span className="block text-muted-foreground">{row.detail}</span>}
                  </td>
                  <td className="whitespace-nowrap py-1.5 text-right font-semibold">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="space-y-1">
            {annex2.totals.map((total) => (
              <div key={total.label} className="flex justify-between gap-3">
                <dt>{total.label}</dt>
                <dd className={cn(total.tone === 'struck' && 'line-through', total.tone === 'green' && 'font-semibold text-success')}>{total.value}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-3 border-t-2 border-border pt-2 text-lg font-bold text-foreground">
              <dt>{annex2.totalLabel}</dt>
              <dd>{annex2.total}</dd>
            </div>
          </dl>
          {annex2.notes.map((note) => (
            <p key={note} className="text-muted-foreground">
              {note}
            </p>
          ))}
        </section>
      </div>
    </details>
  );
}
