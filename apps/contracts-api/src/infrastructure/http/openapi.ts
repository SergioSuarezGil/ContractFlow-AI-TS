import { type INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function setupOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("ContractFlow AI — Contracts API")
    .setDescription(
      "REST API for personal service contracts, documents, comparison jobs, and reports.",
    )
    .setVersion("1.0.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Keycloak access token (realm contractflow)",
      },
      "bearer",
    )
    .addTag("contracts")
    .addTag("documents")
    .addTag("comparisons")
    .addTag("jobs")
    .addTag("reports")
    .addTag("health")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document, {
    jsonDocumentUrl: "docs-json",
    yamlDocumentUrl: "docs-yaml",
  });
}
