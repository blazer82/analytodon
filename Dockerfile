FROM node:lts

RUN mkdir -p /usr/src
WORKDIR /usr/src

COPY . /usr/src

# RUN wget https://s3.amazonaws.com/rds-downloads/rds-combined-ca-bundle.pem

RUN npm ci

RUN npm i sass

RUN npm run build
EXPOSE 80
CMD npm run start
