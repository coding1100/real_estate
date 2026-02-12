import { defineConfig, env } from 'prisma/config';
import dotenv from 'dotenv';

// Load environment variables from .env and .env.local (Next.js style)
dotenv.config(); // .env
dotenv.config({ path: '.env.local', override: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});

