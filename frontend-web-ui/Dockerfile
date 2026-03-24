FROM openapitools/openapi-generator-cli:v7.16.0 AS api-generator
WORKDIR /app
COPY swagger.yaml ./swagger.yaml
RUN docker-entrypoint.sh generate -i ./swagger.yaml -g typescript-axios -o ./generated

FROM node:24-alpine AS build-stage
WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_EXAMS_API_URL=/api/exams
ARG VITE_TASKS_API_URL=/api

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_EXAMS_API_URL=${VITE_EXAMS_API_URL}
ENV VITE_TASKS_API_URL=${VITE_TASKS_API_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./

COPY --from=api-generator /app/generated ./src/api/generated

RUN npm run build

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
	CMD nginx -t >/dev/null 2>&1 || exit 1
CMD ["nginx", "-g", "daemon off;"] 