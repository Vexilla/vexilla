FROM node:20-alpine

WORKDIR /home/node/app

COPY . .

RUN apk add curl

RUN npm install

CMD npm run start

# CMD sh
