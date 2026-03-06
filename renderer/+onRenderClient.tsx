import ReactDOM from 'react-dom/client'
import { PageShell } from './PageShell'
import type { OnRenderClientAsync } from 'vike/types'
import { BrowserRouter } from 'react-router-dom'

interface PageContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Page: React.ComponentType<any>
  pageProps: Record<string, unknown>
}

export const onRenderClient: OnRenderClientAsync = async (pageContext): ReturnType<OnRenderClientAsync> => {
  const { Page, pageProps } = pageContext as unknown as PageContext
  if (!Page) throw new Error('Client-side render() hook expects pageContext.Page to be defined')
  
  const root = document.getElementById('root')
  if (!root) throw new Error('DOM element #root not found')
  
  ReactDOM.hydrateRoot(
    root,
    <PageShell pageContext={pageContext}>
      <BrowserRouter>
        <Page {...pageProps} />
      </BrowserRouter>
    </PageShell>
  )
}
