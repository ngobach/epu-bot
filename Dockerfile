FROM node:alpine
MAINTAINER thanbaiks

ADD . /app
WORKDIR /app
RUN npm install && npm run gulp-build

EXPOSE 5000
CMD ["node", "index.js"]
