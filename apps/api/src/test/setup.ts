// Test setup — runs after each test file's framework is loaded
// Truncation happens per-test to guarantee a clean slate

afterAll(async () => {
  // Disconnect prisma after each test file to avoid open handles
  const { prisma } = await import('../lib/prisma')
  await prisma.$disconnect()
})
