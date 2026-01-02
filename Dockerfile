FROM node:20-alpine
EXPOSE 8080
WORKDIR /app
COPY ./package.json .
COPY ./package-lock.json .
RUN npm install --legacy-peer-deps
COPY . .
CMD ["npm", "run", "start:prod"]
