FROM node:18-alpine3.16

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm i -g typescript@4.9.4
RUN npm i

COPY . .
RUN npm run build-compile

EXPOSE 4444
CMD [ "node", "dist/index.js" ]

