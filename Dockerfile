FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm i
COPY tsconfig.json ./
COPY sql ./sql
COPY src ./src
RUN npm run build
ENV NODE_ENV=production
CMD ["npm","start"]
