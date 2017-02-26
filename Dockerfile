FROM node:alpine
MAINTAINER thanbaiks

ADD . /app
WORKDIR /app
RUN npm install

EXPOSE 5000
CMD ["node", "index.js"]
