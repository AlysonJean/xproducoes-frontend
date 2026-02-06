import ReactDOM from 'react-dom/client'
import { PageShell } from './PageShell'
import type { OnRenderClientAsync } from 'vike/types'
import { BrowserRouter } from 'react-router-dom'

export const onRenderClient: OnRenderClientAsync = async (pageContext): ReturnType<OnRenderClientAsync> => {
  const { Page, pageProps } = pageContext
  if (!Page) throw new Error('Client-side render() hook expects pageContext.Page to be defined')
  
  const root = document.getElementById('root')
  if (!root) throw new Error('DOM element #root not found')
  
  ReactDOM.hydrateRoot(
    root,
    <PageShell pageContext={pageContext}>
      <BrowserRouter future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}>
        <Page {...pageProps} />
      </BrowserRouter>
    </PageShell>
  )
}
