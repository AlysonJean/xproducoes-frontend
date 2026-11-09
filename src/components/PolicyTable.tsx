import React from 'react';

// D8c (aprovada em 02/11/2026), parte 4: as tabelas da Política de Privacidade ("dado, para quê, base legal, prazo" e
// os serviços usados) e da Política de Cookies. No celular, cada linha vira um bloco com o nome da coluna antes de
// cada valor (data-label), para não precisar rolar a tabela de lado; do tamanho md para cima, é uma tabela comum.
// A primeira coluna é o cabeçalho da linha (th scope="row").

interface PolicyTableProps {
  caption: string;
  columns: readonly string[];
  rows: readonly (readonly React.ReactNode[])[];
}

export const PolicyTable: React.FC<PolicyTableProps> = ({ caption, columns, rows }) => (
  <table className="w-full border-collapse text-left text-sm">
    <caption className="sr-only">{caption}</caption>
    <thead className="hidden md:table-header-group">
      <tr className="border-b border-border">
        {columns.map((column) => (
          <th key={column} scope="col" className="p-3 align-bottom font-semibold text-foreground">
            {column}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, rowIndex) => (
        <tr key={rowIndex} className="block border-b border-border py-3 md:table-row md:py-0">
          {row.map((cell, cellIndex) => {
            const label = columns[cellIndex];
            const className =
              'block py-1 align-top text-muted-foreground md:table-cell md:p-3 before:block before:font-semibold before:text-foreground before:content-[attr(data-label)] md:before:hidden';
            return cellIndex === 0 ? (
              <th key={cellIndex} scope="row" data-label={label} className={`${className} font-semibold text-foreground`}>
                {cell}
              </th>
            ) : (
              <td key={cellIndex} data-label={label} className={className}>
                {cell}
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  </table>
);
