FROM node:alpine
MAINTAINER thanbaiks

ADD . /app
WORKDIR /app

EXPOSE 5000
CMD ["node", "index.js"]
