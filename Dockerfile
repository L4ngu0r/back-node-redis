FROM node:slim

RUN mkdir /usr/src/app
ADD . /usr/src/app

WORKDIR /usr/src/app

RUN npm install

EXPOSE 9001

CMD ["node", "server.js"]