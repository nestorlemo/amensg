export function GET() {
  return Response.json({
    status: 'ok',
    service: 'amensg',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
    version: process.env.npm_package_version ?? '0.1.0',
  })
}
