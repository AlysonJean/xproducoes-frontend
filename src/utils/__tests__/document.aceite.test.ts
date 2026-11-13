import { describe, it, expect } from 'vitest';
import {
  formatCnpj,
  formatCpf,
  formatDocument,
  isValidCnpj,
  isValidCpf,
  maskDocument,
  normalizeDocument,
  onlyDigits,
} from '../document';

// Aceite online (13/11/2026): o CPF e o CNPJ de quem contrata são conferidos no site antes de ir ao servidor, com a
// mesma conta dos dígitos verificadores (o servidor refaz e responde fieldErrors se discordar). O CNPJ alfanumérico
// (Receita Federal, desde julho de 2026) entra na conta: letra vale o código ASCII menos 48.
describe('CPF', () => {
  it.each(['529.982.247-25', '52998224725', '111.444.777-35', '123.456.789-09'])('%s é válido', (cpf) => {
    expect(isValidCpf(cpf)).toBe(true);
  });

  it.each([
    ['dígito verificador errado', '529.982.247-24'],
    ['segundo dígito errado', '111.444.777-34'],
    ['todos iguais', '111.111.111-11'],
    ['todos zero', '000.000.000-00'],
    ['curto', '529.982.247'],
    ['longo', '529.982.247-251'],
    ['vazio', ''],
  ])('%s: inválido (%s)', (_caso, cpf) => {
    expect(isValidCpf(cpf)).toBe(false);
  });
});

describe('CNPJ', () => {
  it.each(['55.343.824/0001-56', '55343824000156', '11.222.333/0001-81', '12.ABC.345/01DE-35', '12abc34501de35'])(
    '%s é válido',
    (cnpj) => {
      expect(isValidCnpj(cnpj)).toBe(true);
    },
  );

  it.each([
    ['primeiro dígito errado', '55.343.824/0001-66'],
    ['segundo dígito errado', '11.222.333/0001-80'],
    ['alfanumérico com dígito errado', '12.ABC.345/01DE-34'],
    ['letra no dígito verificador', '12.ABC.345/01DE-3A'],
    ['todos iguais', '11.111.111/1111-11'],
    ['curto', '11.222.333/0001'],
    ['um CPF não é CNPJ', '529.982.247-25'],
  ])('%s: inválido (%s)', (_caso, cnpj) => {
    expect(isValidCnpj(cnpj)).toBe(false);
  });
});

describe('formatação e máscara', () => {
  it('só números, documento normalizado e pontuação', () => {
    expect(onlyDigits('(31) 99976-0416')).toBe('31999760416');
    expect(normalizeDocument('12.abc.345/01de-35')).toBe('12ABC34501DE35');
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
    expect(formatCnpj('55343824000156')).toBe('55.343.824/0001-56');
    expect(formatCnpj('12abc34501de35')).toBe('12.ABC.345/01DE-35');
    expect(formatDocument('52998224725')).toBe('529.982.247-25');
    expect(formatDocument('55343824000156')).toBe('55.343.824/0001-56');
    expect(formatDocument('123')).toBe('123');
  });

  it('a máscara esconde as pontas do CPF e o meio do CNPJ', () => {
    expect(maskDocument('529.982.247-25')).toBe('***.982.247-**');
    expect(maskDocument('55343824000156')).toBe('55.343.***/****-56');
    expect(maskDocument('529.982.247-25')).not.toContain('529');
  });
});
