# One container: the built client and the game server (co-op and arena rooms over WebSocket).
# docker build -t sush . && docker run -p 8787:8787 -v sush-data:/data sush
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV PORT=8787 DATA=/data
VOLUME /data
EXPOSE 8787
CMD ["npx", "tsx", "server/main.ts"]
