import "dotenv/config";
import { createApp }  from "./app.js";
import { prisma }     from "./lib/prisma.js";
import { logger }     from "./lib/logger.js";

const app  = createApp();
const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  logger.info('OrcaBuild API iniciada', { port: PORT });
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('Servidor encerrado');
  process.exit(0);
});