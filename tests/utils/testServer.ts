import http from 'http'
import { NextRequest } from 'next/server'

export type ParamsMode = 'promise' | 'plain' | 'none'

export type NextRouteHandler = (req: NextRequest, context: any) => Promise<Response> | Response

interface RouteDef {
  method: string
  path: string
  handler: NextRouteHandler
  paramsMode?: ParamsMode
}

interface CompiledRoute extends RouteDef {
  regex: RegExp
  paramNames: string[]
}

function compile(path: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = []
  const pattern = path
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        paramNames.push(segment.slice(1))
        return '([^/]+)'
      }
      return segment
    })
    .join('/')
  return { regex: new RegExp(`^${pattern}/?$`), paramNames }
}

export function createNextTestServer(routeDefs: RouteDef[]) {
  const routes: CompiledRoute[] = routeDefs.map((r) => {
    const { regex, paramNames } = compile(r.path)
    return { ...r, regex, paramNames }
  })

  return http.createServer(async (req, res) => {
    try {
      const chunks: Buffer[] = []
      for await (const chunk of req) chunks.push(chunk as Buffer)
      const rawBody = Buffer.concat(chunks)

      const url = new URL(req.url || '/', 'http://localhost')
      const matched = routes.find((r) => r.method === req.method && r.regex.test(url.pathname))

      if (!matched) {
        res.statusCode = 404
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ error: `No test route registered for ${req.method} ${url.pathname}` }))
        return
      }

      const execed = matched.regex.exec(url.pathname)!
      const params: Record<string, string> = {}
      matched.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(execed[i + 1])
      })

      const headers = new Headers()
      for (const [key, value] of Object.entries(req.headers)) {
        if (Array.isArray(value)) headers.set(key, value.join(','))
        else if (value) headers.set(key, value)
      }

      const init: RequestInit = { method: req.method, headers }
      if (rawBody.length > 0) {
        ;(init as any).body = rawBody
      }

      const nextReq = new NextRequest(url.toString(), init as any)

      let context: any = {}
      const mode = matched.paramsMode ?? 'promise'
      if (mode === 'promise') context = { params: Promise.resolve(params) }
      else if (mode === 'plain') context = { params }

      const response = await matched.handler(nextReq, context)
      const text = await response.text()

      res.statusCode = response.status
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== 'content-length') res.setHeader(key, value)
      })
      res.end(text)
    } catch (err: any) {
      res.statusCode = 500
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ error: 'Test harness error', details: err?.message }))
    }
  })
}