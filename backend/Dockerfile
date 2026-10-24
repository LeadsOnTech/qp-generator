FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 4000

# On first deploy in Coolify Terminal, run: npx prisma migrate deploy && npm run seed
CMD ["npm", "start"]
