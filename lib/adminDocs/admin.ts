import type { DocSection } from "./types";

export const adminAccessSection: DocSection = {
  id: "admin-access",
  title: "Admin access",
  group: "Admin",
  summary:
    "Who can open this console, what each admin can see and get free, and the API behind it.",
  blocks: [
    {
      kind: "list",
      items: [
        "Admins are listed by email in `private.console_admins` (migration 053). The first admin is himkumarjsr@gmail.com.",
        "Only the super admin (`private.console_super_admins`, migration 060; set with SQL only) can open this page, add or remove admins, or change what they get (migration 062). An invite works before the person has an account: access starts the first time they sign in with that email, once Supabase has confirmed it.",
        "Per admin, the super admin ticks which console sections they can open (one by one, or all including future ones) and which features they get free: `fixplan_free` (Fix Plan without paying) and `pro_free` (all Pro, which also passes any `fixplan_free` check). Keys live in `private.console_permissions`; this page is never grantable.",
        "New admins start with nothing ticked. Admins who existed before migration 062 were given all sections so nothing changed for them. Removing an admin removes their permissions too.",
        "The sidebar only lists an admin's sections and other sections return 404, on the server. Sections that read live data (Analyse logs, Plan checklist) are checked again in the database.",
        "Nobody can remove a super admin from here, so there is always one left.",
        "Console admin is separate from `users.is_admin` (which only skips the Pro paywall and shows the FK summary on `/rewards`).",
        "The page is rendered on the server only after the database confirms the caller is an admin; anyone else gets a 404. It is `noindex`, disallowed in robots.txt, and refuses to render inside the installed PWA. The native app has no admin screens.",
      ],
    },
    {
      kind: "api",
      api: {
        method: "GET",
        path: "/api/admin/admins",
        summary: "List console admins with their permissions.",
        auth: "Session; super admin (others get 404)",
        response: `{ "admins": [{ "email": "himkumarjsr@gmail.com", "invitedBy": "seed", "createdAt": "…", "hasAccount": true, "isSuper": true, "perms": [] }] }`,
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
        auth: "Session; super admin",
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
        auth: "Session; super admin",
        rateLimit: "30/hr per admin",
        query: [["email", "Admin to remove"]],
        response: `{ "admins": [ … ] }`,
        errors: [
          ["400", "Invalid email / you cannot remove a super admin"],
          ["401", "Not authenticated"],
          ["404", "Not the super admin"],
        ],
      },
    },
    {
      kind: "api",
      api: {
        method: "PUT",
        path: "/api/admin/admins",
        summary:
          "Replace one admin's permission keys. Returns the updated list.",
        auth: "Session; super admin",
        rateLimit: "120/hr",
        request: `{ "email": "tester@example.com", "perms": ["section:overview", "fixplan_free"] }`,
        response: `{ "admins": [ … ] }`,
        errors: [
          [
            "400",
            "Unknown permission / not an admin yet / target is super admin",
          ],
          ["401", "Not authenticated"],
          ["404", "Not the super admin"],
        ],
      },
    },
    {
      kind: "api",
      api: {
        method: "RPC",
        path: "admin_console_is_admin() · admin_console_list() · admin_console_list_access() · admin_console_grant(p_email) · admin_console_revoke(p_email) · admin_console_set_permissions(p_email, p_perms) · admin_console_my_permissions() · admin_has_permission(p_key)",
        summary:
          "Invoker wrappers over SECURITY DEFINER functions in the private schema. Each one checks the caller's confirmed email. `admin_has_permission` and `admin_console_my_permissions` answer for the caller only (true / `{*}` for the super admin); the fix plan purchase check uses `admin_has_permission('fixplan_free')`. Servers with the service role can ask about any email with `private.console_email_has_permission(email, key)`.",
        auth: "authenticated role only (anon has no EXECUTE); managing admins is super admin only",
        errors: [
          ["42501", "Admins only / Super admin only"],
          [
            "22023",
            "Invalid email / unknown permission / removing a super admin",
          ],
        ],
      },
    },
  ],
};

export const analyseLogsSection: DocSection = {
  id: "analyse-logs",
  title: "Analyse logs",
  group: "Admin",
  summary:
    "Every generated report with its form answers, in-between numbers and checks, newest first.",
  blocks: [
    {
      kind: "list",
      items: [
        "One row in `public.analyse_logs` (migration 057) each time a signed-in user submits the Analyse form or changes their profile from a goal card, on web, PWA, iOS and Android.",
        "Each row holds the form answers, the profile, the steps the report is built from (safety fund sources, goals, earmarks, surplus breakdown, priority steps, goal strategies, money score) and the report itself.",
        "`checks` lists numbers in that report that disagree with each other (surplus breakdown, a ₹0/month step, the retirement SIP). Use the filter to see only those reports.",
        "Users can only add their own rows; nobody but a console admin can read them. Logging runs a second after the report shows and never blocks it.",
        "Click a row for its calculation sheet: what the user entered, the monthly money flow line by line, safety funds (target = essential outgo × months), goals, plan steps in order and the money score. Numbers that don't match their formula are marked in red; the raw JSON is under Raw data.",
        'On the website the same sheet is printed to the browser console (Inspect → Console → "Finkoin Analyse") for every report, signed in or not, and the full data is on `window.__finkoinAnalyseLog`.',
      ],
    },
    {
      kind: "api",
      api: {
        method: "RPC",
        path: "admin_console_analyse_logs(p_limit, p_email, p_only_checks)",
        summary:
          "Latest analyse logs, optionally for one email or only with checks.",
        auth: "Session; console admin with the Analyse logs section (others get 42501)",
        callers: "This page, on the server",
      },
    },
  ],
};
