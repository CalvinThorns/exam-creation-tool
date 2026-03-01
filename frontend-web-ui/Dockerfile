FROM openapitools/openapi-generator-cli as api-generator
WORKDIR /app
COPY swagger.yaml ./swagger.yaml
RUN docker-entrypoint.sh generate -i ./swagger.yaml -g typescript-axios -o ./generated

FROM node:24-alpine as build-stage
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . ./

COPY --from=api-generator /app/generated ./src/api/generated

RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 