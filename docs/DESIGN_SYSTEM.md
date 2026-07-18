# Finkoin Design System

Living design reference derived from the current codebase (`components/`, app pages).

## Brand Colors

| Token          | Hex                   | Typical use                                    |
| -------------- | --------------------- | ---------------------------------------------- |
| Primary Purple | `#534AB7`             | CTAs, active nav, icons, focus rings           |
| Dark Purple    | `#3C3489`             | Emphasized purple text / safety pulse          |
| Light Purple   | `#EEEDFE`             | Icon wells, BackLink chip, soft fills          |
| Medium Purple  | `#AFA9EC` / `#D4D2F5` | Soft borders / pulse accents                   |
| Success Green  | `#1D9E75`             | Positive balances, checklist OK                |
| Success Light  | `#E1F5EE`             | Success surfaces (where used)                  |
| Warning Orange | `#BA7517`             | Warning accents                                |
| Warning Light  | `#FFF3E0`             | Warning surfaces                               |
| Error Red      | `#E24B4A`             | Owe amounts, errors, checklist fail            |
| Error Light    | `#FCEBEB`             | Error surfaces                                 |
| Background     | `#F7F7F4`             | App page canvas (split/tracker/profile shells) |
| Card           | `#FFFFFF`             | Cards / sheets                                 |
| Border         | `#E8E6F0`             | Inputs, cards, bottom-nav top border           |
| Border Light   | `#F0EFF8`             | Subtle dividers                                |
| Text Primary   | `#111110`             | Headings / ink                                 |
| Text Secondary | `#5F5E5A`             | Body secondary                                 |
| Text Muted     | `#9B9A94`             | Captions / empty states                        |

Brand shadow commonly used: `rgba(83,74,183,0.25)`.

## Typography

- Stack: system UI / `-apple-system` / Tailwind defaults on most surfaces
- Headings: `font-bold` / `font-extrabold` (700–800)
- Body: 400–500
- Labels: often `font-semibold` + uppercase tracking on section labels

Approximate scale in product UI:

| Role    | Size    |
| ------- | ------- |
| Display | 32–52px |
| H1      | 24–28px |
| H2      | 20–22px |
| H3      | 17–18px |
| Body    | 14–15px |
| Small   | 12–13px |
| Caption | 10–11px |

## Spacing

- Base unit: 4px
- Common: 8, 12, 16, 20, 24, 32, 40, 48px
- Mobile bottom clearance for bottom nav: ~`pb-24` / `pb-[90px]` / `pb-28`

## Border Radius

| Token  | Value                   |
| ------ | ----------------------- |
| Small  | 8px                     |
| Medium | 12px (`rounded-xl`)     |
| Large  | 14–16px (`rounded-2xl`) |
| XLarge | 20–24px (`rounded-3xl`) |
| Round  | 50% (avatars)           |

## Components (inventory)

### App chrome

| File                                                       | Purpose                                      |
| ---------------------------------------------------------- | -------------------------------------------- |
| `components/global-navbar.tsx`                             | Desktop nav, profile menu, mobile bottom nav |
| `components/AppInitializer.tsx`                            | Auth + gamification boot                     |
| `components/AuthSessionSync.tsx`                           | Cross-tab / visibility session sync          |
| `components/FinancialStoreAuthSync.tsx`                    | Hydrate financial store per user             |
| `components/NotificationBell.tsx`                          | Inbox dropdown                               |
| `components/MorningTipPopup.tsx`                           | Once-per-day tip popup                       |
| `components/PWAInstallPrompt.tsx`                          | Install banner                               |
| `components/ReferralCapture.tsx`                           | `?ref=` capture                              |
| `components/GoogleAnalytics.tsx` / `ClarityScript.tsx`     | Telemetry                                    |
| `components/TrackImpression.tsx` / `AnalyticsBehavior.tsx` | Impression + scroll depth                    |

### UI primitives (`components/ui/`)

| File                                                              | Purpose                                                  |
| ----------------------------------------------------------------- | -------------------------------------------------------- |
| `BottomSheet.tsx`                                                 | Mobile sheet; optional fullscreen; drag/backdrop close   |
| `BackLink.tsx`                                                    | History back + `fallbackHref`; `BackHref` static variant |
| `PrivateAmount.tsx`                                               | Masked ₹ with eye toggle                                 |
| `AppIcon.tsx`                                                     | Brand icon set                                           |
| `MoneyInput.tsx` / `NumberInput.tsx`                              | Money/number inputs                                      |
| `LoginSheet.tsx`                                                  | Optional login bottom sheet                              |
| `brand-logo.tsx`                                                  | FK mark + wordmark                                       |
| `button.tsx` / `ChipSelector.tsx` / `Toast.tsx`                   | Shared controls                                          |
| `AnimateOnScroll.tsx` / `ScrollSection.tsx` / `SectionToggle.tsx` | Motion / layout helpers                                  |
| `SpeedoMeter.tsx` / `GoalCard.tsx`                                | Result visuals                                           |

### Domain folders

| Folder                      | Role                                       |
| --------------------------- | ------------------------------------------ |
| `auth/ProtectedGate.tsx`    | Client auth gate → `/login?redirect=`      |
| `forms/`                    | 7-step analyse onboarding                  |
| `analyse/`                  | Consent + paywall + error boundary         |
| `tracker/`                  | Expense modals + Month Safety Pulse        |
| `split/InviteLinkShare.tsx` | Copy + WhatsApp invite link                |
| `profile/ProfileAssets.tsx` | Editable assets sync                       |
| `landing/`                  | Home hero, quick tools, below-fold, footer |
| `calculators/`              | SIP/SWP/EMI/tax/FIRE/etc.                  |
| `finkoin/`                  | AI plan / optimizer sections               |
| `learn/`                    | Guides + tax education                     |
| `policies/`                 | Policy vault client                        |
| `feedback/`                 | Feedback modal                             |

## Screen Patterns

- **Bottom sheet modal** — `BottomSheet` (calculators mobile)
- **Card list** — Split groups, tracker buckets, profile assets rows
- **FAB / center Track** — Bottom nav center item → `/tracker`
- **Tab / chip navigation** — Calculator categories; tracker buckets
- **Empty states** — Split “no groups”, checklist unlock copy
- **Loading states** — ProtectedGate spinner, analyse AI status copy
- **Error states** — Join invalid token, API error toasts/alerts

## Mobile First Rules

- Min touch target: **44×44px** on critical Split / CTA controls
- Inputs: prefer **16px** font size to reduce iOS zoom
- Bottom padding for bottom nav: **~80–90px** + safe-area
- Use `env(safe-area-inset-*)` on sheets/modals
- Prefer `overflow-x-hidden` + `min-w-0` on profile/split to prevent PWA horizontal lock
- Deep links: `/calculators?calc=sip|swp|emi` auto-open mobile sheet
