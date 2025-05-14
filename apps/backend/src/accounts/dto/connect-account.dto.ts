// This DTO is for the body of POST /accounts/:id/connect
// Based on legacy _legacy/analytodon/pages/api/accounts/connect.ts (handlePost)
// serverURL and timezone are already part of the AccountEntity,
// so we might not need them in the DTO if we fetch the account by :id.
// However, legacy code implies they might be re-validated or used.
// For now, let's assume we only need the account ID from the path.
// If client needs to override serverURL or timezone during connect, add them here.

export class ConnectAccountBodyDto {
  // No body fields strictly required if all info comes from AccountEntity via :id
  // and callback URL is constructed server-side.
  // If redirect URI needs to be dynamic from client, add it here.
}
