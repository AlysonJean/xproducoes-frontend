import App from '../../../src/App'
import React from 'react'
import type { Data } from './+data'
import { useData } from 'vike-react/useData'

export function Page() {
  return <App />
}

// Export specific documentProps for this page based on fetched data
// Vike puts data from +data.ts into pageContext.data
export const documentProps = (pageContext: { data: Data }) => {
  const { kit } = pageContext.data
  const priceFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kit.price)
  
  return {
    title: `Aluguel de ${kit.name} - X Produções`,
    description: `Alugue ${kit.name} por apenas ${priceFormatted}! ${kit.description.slice(0, 150)}...`,
    image: kit.imageUrl || '/xproducoes-logo.svg' // Ensure this is absolute or relative to domain
  }
}
