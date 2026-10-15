import type { DocSection } from "./types";

export const adminAccessSection: DocSection = {
  id: "admin-access",
  title: "Admin access",
  group: "Admin",
  summary:
    "Who can open this console, how invites work, and the API behind it.",
  blocks: [
    {
      kind: "list",
      items: [
        "Admins are listed by email in `private.console_admins` (migration 053). The first admin is himkumarjsr@gmail.com.",
        "Only an admin can add or remove admins. An invite works before the person has an account: access starts the first time they sign in with that email, once Supabase has confirmed it.",
        "Nobody can remove their own access, so there is always at least one admin.",
        "Console admin is separate from `users.is_admin` (which only skips the Pro paywall and shows the FK summary on `/rewards`).",
        "The page is rendered on the server only after the database confirms the caller is an admin; anyone else gets a 404. It is `noindex`, disallowed in robots.txt, and refuses to render inside the installed PWA. The native app has no admin screens.",
      ],
    },
    {
      kind: "api",
      api: {
        method: "GET",
        path: "/api/admin/admins",
        summary: "List console admins.",
        auth: "Session; console admin (others get 404)",
        response: `{ "admins": [{ "email": "himkumarjsr@gmail.com", "invitedBy": "seed", "createdAt": "…", "hasAccount": true }] }`,
        errors: [
          ["401", "Not authenticated"],
          ["404", "Not an admin"],
        ],
      },
    },
    {
      kind: "api",
      api: {
        method: "POST",
        path: "/api/admin/admins",
        summary: "Invite an admin by email. Returns the updated list.",
        auth: "Session; console admin",
        rateLimit: "30/hr per admin",
        request: `{ "email": "teammate@example.com" }`,
        response: `{ "admins": [ … ] }`,
        errors: [
          ["400", "Enter a valid email address"],
          ["401", "Not authenticated"],
          ["404", "Not an admin"],
          ["429", "Rate limited"],
        ],
      },
    },
    {
      kind: "api",
      api: {
        method: "DELETE",
        path: "/api/admin/admins?email=…",
        summary: "Remove an admin. Returns the updated list.",
        auth: "Session; console admin",
        rateLimit: "30/hr per admin",
        query: [["email", "Admin to remove"]],
        response: `{ "admins": [ … ] }`,
        errors: [
          ["400", "Invalid email / you cannot remove your own admin access"],
          ["401", "Not authenticated"],
          ["404", "Not an admin"],
        ],
      },
    },
    {
      kind: "api",
      api: {
        method: "RPC",
        path: "admin_console_is_admin() · admin_console_list() · admin_console_grant(p_email) · admin_console_revoke(p_email)",
        summary:
          "Invoker wrappers over SECURITY DEFINER functions in the private schema. Each one checks the caller's confirmed email against the list.",
        auth: "authenticated role only (anon has no EXECUTE)",
        errors: [
          ["42501", "Admins only"],
          ["22023", "Invalid email / removing yourself"],
        ],
      },
    },
  ],
};
