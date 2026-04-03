import { buildApp } from './app'

async function bootstrap() {
  const app = await buildApp()
  const port = Number(process.env.PORT) || 3000
  const host = process.env.HOST || '0.0.0.0'
  await app.listen({ port, host })
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
