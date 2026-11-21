# syntax=docker/dockerfile:1
# Imagem do BFF. A etapa de build compila o TypeScript; a final leva só o dist/ e as
# dependências de produção e roda como o usuário "node" da imagem oficial. A config entra
# por variável de ambiente (src/config.ts); SESSION_KEY é obrigatória.

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:24-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
# node direto (sem npm start) para o SIGTERM chegar ao processo e o encerramento ser gracioso.
CMD ["node", "dist/server.js"]
