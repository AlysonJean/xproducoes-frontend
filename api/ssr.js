import { renderPage } from 'vike/server'

export default async function handler(request, response) {
  try {
    const { url } = request

    const pageContextInit = {
      urlOriginal: url,
    }

    const pageContext = await renderPage(pageContextInit)
    const { httpResponse } = pageContext

    if (!httpResponse) {
      return response.status(200).end()
    }

    const { body, statusCode, headers } = httpResponse
    headers.forEach(([name, value]) => response.setHeader(name, value))
    return response.status(statusCode).send(body)
  } catch (error) {
    console.error('[SSR_HANDLER_ERROR]', error)
    return response.status(500).send('<p>An error occurred.</p>')
  }
}
