FROM node:14-buster-slim AS deps
RUN mkdir /opt/deps/
WORKDIR /opt/deps/
COPY package.json package-lock.json /opt/deps/
RUN npm install

FROM node:14-buster-slim AS build
RUN mkdir /opt/build/
WORKDIR /opt/build/
COPY --from=deps /opt/deps/node_modules /opt/build/node_modules/
COPY . /opt/build
RUN npm run build

FROM nginx:stable as production
COPY --from=build /opt/build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD /bin/sh -c "envsubst < /etc/nginx/conf.d/site.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"
