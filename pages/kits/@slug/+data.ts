// https://vike.dev/data
import type { PageContextServer } from 'vike/types'

export type Data = {
  kit: {
    name: string
    description: string
    imageUrl: string
    price: number
    slug: string
  }
}

export const data = async (pageContext: PageContextServer): Promise<Data> => {
  const { slug } = pageContext.routeParams
  
  try {
    // Fetch from local API (assuming running on same host)
    // In production this should use an environment variable or internal service call
    const response = await fetch(`http://localhost:3000/api/kits/${slug}`)
    if (!response.ok) throw new Error('Failed to fetch kit')
    
    const kit = await response.json()
    return { kit }
  } catch (e) {
    console.error('SSR Data Error:', e)
    // Fallback or let client handle 404
    return { 
        kit: {
            name: 'Kit não encontrado', 
            description: '', 
            imageUrl: '', 
            price: 0,
            slug: slug || ''
        } 
    }
  }
}
