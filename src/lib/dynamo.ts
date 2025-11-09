// DynamoDB scaffold removed — AWS SDK references intentionally omitted.
// If you later decide to re-add DynamoDB integration, replace this file
// with a proper `DynamoDBClient` / `DynamoDBDocumentClient` initialization
// and install `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb`.

// Minimal placeholder to avoid import-time crashes in code that still
// imports `docClient`. This will throw if used at runtime so it makes
// accidental server-side calls fail fast and clearly.
export const docClient = {
  send() {
    throw new Error(
      "DynamoDB client removed. Use client-side favoritesLocal or re-add @aws-sdk packages."
    );
  },
} as const;
