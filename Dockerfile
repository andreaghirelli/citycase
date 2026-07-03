FROM node:22.13-bookworm-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --include=dev

COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "start"]
