# Stage 1: Build the frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend
FROM gradle:8-jdk23 AS backend-builder
WORKDIR /app
COPY build.gradle settings.gradle ./
COPY src/ ./src/
COPY --from=frontend-builder /app/frontend/build ./src/main/resources/static
RUN gradle shadowJar --no-daemon

# Stage 3: Final image
FROM eclipse-temurin:23-jre-alpine
WORKDIR /app
COPY --from=backend-builder /app/build/libs/TempMon-*.jar ./app.jar
EXPOSE 9247
CMD ["java", "-jar", "app.jar"]