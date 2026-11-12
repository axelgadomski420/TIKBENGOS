FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /src
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /src/target/elif-0.0.1-SNAPSHOT.jar app.jar
RUN mkdir -p /app/uploads
VOLUME /app/uploads
EXPOSE 8087
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
