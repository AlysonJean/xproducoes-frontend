
import React from 'react';

export function Page({ is404 }: { is404: boolean }) {
  if (is404) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-20 bg-gray-50 px-4 sm:px-6 lg:px-8">
        <h1 className="text-9xl font-extrabold text-blue-600">404</h1>
        <h2 className="mt-4 text-3xl font-bold text-gray-900 tracking-tight sm:text-5xl">Página não encontrada</h2>
        <p className="mt-2 text-base text-gray-500 max-w-lg text-center">
            Desculpe, não conseguimos encontrar a página que você está procurando. Talvez ela tenha sido movida ou excluída.
        </p>
        <div className="mt-10">
          <a href="/" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
            Voltar para a Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-20 bg-red-50 px-4 sm:px-6 lg:px-8">
      <h1 className="text-9xl font-extrabold text-red-600">500</h1>
      <h2 className="mt-4 text-3xl font-bold text-gray-900 tracking-tight sm:text-5xl">Erro Interno</h2>
      <p className="mt-2 text-base text-gray-500 max-w-lg text-center">
          Algo deu errado no nosso servidor. Estamos trabalhando para corrigir isso.
      </p>
      <div className="mt-10">
          <a href="/" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200">
            Tentar Novamente
          </a>
      </div>
    </div>
  );
}
