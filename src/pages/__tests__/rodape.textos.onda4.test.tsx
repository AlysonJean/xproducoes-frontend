import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import WarrantyPage from '../WarrantyPage';
import LicensesPage from '../LicensesPage';
import { SUPPORT_EMAIL } from '../../data/site';

// Onda 4 da auditoria de 19/11 (F3-20 e F5-17, textos aprovados por Alyson em 24/11): a Garantia diz o que o contrato
// de locação diz (cláusulas 4ª e 6ª) e Licenças não manda mais a um "repositório público".
const abrir = (ui: React.ReactNode) => render(<HelmetProvider><MemoryRouter>{ui}</MemoryRouter></HelmetProvider>);
const texto = () => document.body.textContent?.replace(/\s+/g, ' ') ?? '';

describe('Rodapé: Garantia e Licenças', () => {
  it('Garantia: troca do equipamento com defeito (cláusula 4ª) e danos pela cláusula 6ª, com os prazos do contrato', () => {
    abrir(<WarrantyPage />);
    expect(texto()).toContain('a equipe o substitui sempre que possível (cláusula 4ª do contrato de locação)');
    expect(texto()).toContain('Desgaste natural, defeito do equipamento e falha da nossa equipe não são cobrados de você.');
    expect(texto()).toContain('avisamos com fotos em até 48 horas depois do evento ou da devolução, e você pode contestar em até 5 dias úteis');
    expect(texto()).not.toContain('Garantimos a operação dos equipamentos');
  });

  it('Licenças: bibliotecas de código aberto, fontes e fotos, com o e-mail do site; sem "repositório público"', () => {
    abrir(<LicensesPage />);
    expect(texto()).toContain('bibliotecas de código aberto (entre elas React, Vike e Tailwind CSS)');
    expect(texto()).toContain('licença SIL Open Font');
    expect(screen.getByRole('link', { name: SUPPORT_EMAIL })).toHaveAttribute('href', `mailto:${SUPPORT_EMAIL}`);
    expect(texto()).not.toContain('repositório');
  });
});
