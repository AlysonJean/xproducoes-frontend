export default async function handler(request, response) {
  try {
    const { renderPage } = await import('vike/server')
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
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    return response.status(500).send('<p>An error occurred.</p>')
  }
}
