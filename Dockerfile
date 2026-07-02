FROM oven/bun:1 AS base
WORKDIR /app

# Install only Node.js (needed by Prisma CLI to resolve engines)
RUN apt-get update -y && apt-get install -y --no-install-recommends nodejs npm && rm -rf /var/lib/apt/lists/*

# Copy the monorepo files
COPY . .

# Install dependencies using bun
RUN bun install

# Generate the prisma client using npx (bunx has a known bug with Prisma engine resolution)
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

# Accept a build argument to know which app we are building for
ARG APP_NAME
ENV APP_NAME=${APP_NAME}

# The start command (uses the APP_NAME variable to run the correct app)
CMD bun run --cwd apps/${APP_NAME} $(if [ -f apps/${APP_NAME}/src/index.ts ]; then echo "src/index.ts"; else echo "index.ts"; fi)
