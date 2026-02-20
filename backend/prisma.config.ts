import { defineConfig } from '@prisma/cli';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    db: {
      provider: 'mysql',
      url: process.env.DATABASE_URL,
    },
  },
});
