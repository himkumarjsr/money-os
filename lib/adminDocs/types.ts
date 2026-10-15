/**
 * Content model for the admin console's system documentation (/admin).
 * Rendered only by server components behind the admin check, so none of it
 * ships in a public JS bundle. Text supports `inline code` with backticks.
 */

export type ApiDoc = {
  method:
    | "GET"
    | "POST"
    | "PUT"
    | "DELETE"
    | "GET/POST"
    | "POST/DELETE"
    | "RPC"
    | "SQL";
  path: string;
  summary: string;
  auth: string;
  rateLimit?: string;
  /** Query string parameters, as [name, meaning]. */
  query?: ReadonlyArray<readonly [string, string]>;
  /** JSON request body example. */
  request?: string;
  /** JSON (or other) success response example. */
  response?: string;
  /** Error responses, as [status, meaning]. */
  errors?: ReadonlyArray<readonly [string, string]>;
  /** Where the apps call it from. */
  callers?: string;
  notes?: string;
};

export type DocBlock =
  | { kind: "h"; text: string }
  | { kind: "p"; text: string }
  | { kind: "list"; items: readonly string[]; ordered?: boolean }
  | {
      kind: "table";
      head: readonly string[];
      rows: ReadonlyArray<readonly string[]>;
    }
  | { kind: "code"; title?: string; code: string }
  | { kind: "diagram"; title: string; code: string }
  | { kind: "callout"; tone: "info" | "warn"; text: string }
  | { kind: "api"; api: ApiDoc };

export type DocGroup =
  | "Start here"
  | "Architecture"
  | "User journeys"
  | "Features"
  | "Admin";

export type DocSection = {
  id: string;
  title: string;
  group: DocGroup;
  summary: string;
  blocks: readonly DocBlock[];
};
