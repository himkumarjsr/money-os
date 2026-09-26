# Finkoin Project Context Cache
Generated: 2026-09-26 · PWA source: `main@e42852c` · Mobile source: `mobile-app@1c958cf` (mobile/ exists ONLY on mobile-app)
Refresh when stale: compare `git rev-parse --short origin/main` / `origin/mobile-app` to the SHAs above. If they differ, re-read only the files changed since then (`git diff --stat <sha>..origin/main`).
Deep docs (read only when needed): FINKOIN_SYSTEM.md (3.5k lines, business rules) · docs/PWA_COMPLETE_AUDIT.md (per-screen interactions) · docs/MOBILE_BUILD_PLAN.md · docs/MOBILE_CURRENT_STATE.md
Format: `a|b|c` rows. Status: C=complete P=partial PH=placeholder B=broken U=unused X=not built. Purity: pure=no DOM/IO (portable to RN), web/io=browser/Supabase/storage, server=Node/Next server only.

## Architecture Summary
### Stack
- Web/PWA: Next.js 14 App Router, React 18, TS, Tailwind 3, framer-motion, zustand 5, react-hook-form+zod, recharts, jsPDF, xlsx; next-pwa (prod only, `worker/index.js` push handlers, `/offline` fallback). Deployed on Vercel; crons `0 3 * * *` UTC → `/api/notifications/deliver-tip`, `/api/obligations/reminders`.
- Backend: Supabase (Auth email+Google, Postgres+RLS, Realtime, Storage `avatars`), Groq (AI fix plan, RAG via RPC `search_by_keywords`), Razorpay (₹99 unlock), Resend (emails), web-push (VAPID), GA4 + Clarity.
- Mobile: Expo SDK 54, expo-router 6 (typed routes), RN 0.81.5 New Arch, React 19.1, zustand, zod, supabase-js w/ SecureStore/AsyncStorage (`mobile/lib/storage.ts`). Scheme `finkoin://`, id `com.finkoin.app`.
- Canonical host `https://www.finkoin.com` (`NEXT_PUBLIC_SITE_URL`). Version 0.4.0. Tests: vitest (`lib/*.test.ts`, `tests/unit`), Playwright (`tests/e2e`).
### Data flow
- Deterministic first: form → `normalizeAnalyseFormValues` → `analyseFinances` (financialEngine) → `buildPriorityPlan` (priorityEngine) → AI only adds text (`/api/ai/analyse`, merged, engine numbers authoritative). AI cache `localStorage finkoin_ai_cache` keyed by `hashProfile`, 30d.
- Canonical analyse storage = `user_analyse_snapshots.payload` {profile,result,submittedAt,version,aiPlan?,analysis?}. `user_analysis` only for `ai_fix_plan`/cache. Encrypted copy → `/api/financial-data` → `user_financial_data` (AES-256-GCM, server key).
- Client-heavy: Analyse, Tracker, Obligations, Notifications, Gamification, Leaderboard, Policies talk to Supabase directly under RLS. Split mutations + AI + payments + push + feedback go through `/api/*`.
- Split balances: `lib/splitBalances.ts` (computeNetBalances + simplifyDebts) server-side via `GET /api/split/balances`. Open invite marker email `__open__@finkoin.invite`.
### Auth
- Web: `@supabase/ssr` browser client (storageKey `finkoin-auth-token`), `middleware.ts` refreshes cookies (skips `/`, never redirects). Pages gated client-side by `ProtectedGate` (waits `hasInitialized`) → `/login?redirect=`.
- `AppInitializer`: persist rehydrate → `initAuth()` → gamification fetch/streak/realtime. `logout()` → POST `/api/auth/sign-out` + clears `finkoin-auth`, `finkoin-financial*`, `finkoin_ai_cache`, `finkoin-gamification`.
- **All authed API routes are cookie-only** (`lib/apiGuard.ts#getAuthedUser`); only `/api/razorpay/verify-payment` reads `Authorization: Bearer`. Mobile cannot call them until Bearer support is added.
- Recovery (main): reset email → `/auth/callback?type=recovery` or `AuthRecoveryRedirect`/`lib/authRecovery.ts` → `/auth/update-password`.
### Branches
- `main`: PWA, latest. `mobile/` was deleted from main by `950748f` ("revert native app code"). Merging main→mobile-app naively deletes mobile/.
- `mobile-app`: mobile/ + docs; its app/ components/ lib/ store/ are 17 commits behind main. Mobile copies of analyse-form-schema, financialEngine, priorityEngine, universal-buckets, formatters are STALE vs main.
- Other remotes: production, calculator-input-fix, improve-tax-flow, test/github-actions.

## Screen Inventory
### PWA (main) — route|file|status notes
/about|app/about/page.tsx|C founder JSON-LD
/analyse/fixplan|app/analyse/fixplan/page.tsx|C AI plan (cache→/api/ai/analyse), priorities, debts, goals, FD, PDF
/analyse|app/analyse/page.tsx|C logged-out marketing; logged-in ConsentModal→7-step AnalyseOnboardingForm
/analyse/result|app/analyse/result/page.tsx|C score, net worth, 5 buckets, gauges, safety net, cashflow, paywall ₹99, feedback
/auth/callback|app/auth/callback/page.tsx|C PKCE exchange, recovery→update-password, referral apply
/auth/reset-password|app/auth/reset-password/page.tsx|C
/auth/update-password|app/auth/update-password/page.tsx|C (reworked on main)
/blog/[slug]|app/blog/[slug]/page.tsx|C SSG
/blog|app/blog/page.tsx|C
/calculator|app/calculator/page.tsx|C legacy arithmetic calc
/calculators/[id]|app/calculators/[id]/page.tsx|C 20 ids (see Calculator ids)
/calculators|app/calculators/page.tsx|C hub; ?calc= opens BottomSheet on mobile
/calculators/tax-regime-2026|app/calculators/tax-regime-2026/page.tsx|C FY25-26 old vs new, Personal CA wizard, ITR hint, ₹99 deep report
/careers|app/careers/page.tsx|PH coming soon
/contact|app/contact/page.tsx|C
/goals|app/goals/page.tsx|PH mostly coming soon
/insurance|app/insurance/page.tsx|P compare shell
/investments|app/investments/page.tsx|P read-only rollup
/kyc|app/kyc/page.tsx|P mock PAN
/leaderboard|app/leaderboard/page.tsx|C leaderboard_view, 5-min cache, realtime
/learn/[id]|app/learn/[id]/page.tsx|C SSG, rich/custom guides, FAQ, share
/learn|app/learn/page.tsx|C 41 articles, 6 category chips
/legal/disclaimer|app/legal/disclaimer/page.tsx|C
/legal/privacy|app/legal/privacy/page.tsx|C DPDP
/legal/refund|app/legal/refund/page.tsx|C
/legal/terms|app/legal/terms/page.tsx|C
/login|app/login/page.tsx|C login/signup/reset modes + Google
/notifications|app/notifications/page.tsx|C NEW on main: NotificationsClient inbox page
/offline|app/offline/page.tsx|C workbox fallback
/optimizer|app/optimizer/page.tsx|C AI plan view + PDF
/|app/page.tsx|C home: hero carousel, mobile quick tools (SIP,SWP,Split,Tax,EMI,Portfolio,Analyse), below-fold, testimonials
/plans|app/plans/page.tsx|P Razorpay TODOs
/policies|app/policies/page.tsx|P PolicyVaultClient CRUD user_policies
/portfolio|app/portfolio/page.tsx|P demo data
/press|app/press/page.tsx|PH
/pricing|app/pricing/page.tsx|PH
/privacy|app/privacy/page.tsx|C redirect→/legal/privacy
/profile|app/profile/page.tsx|P ProfileAssets editor, checklist, referral; KYC/Aadhaar coming soon
/refer|app/refer/page.tsx|C referral code/share
/rewards|app/rewards/page.tsx|C gamification row
/settings|app/settings/page.tsx|C name, avatar, pw reset, notif prefs, push, export, delete
/split/[groupId]/add-expense|app/split/[groupId]/add-expense/page.tsx|C equal/exact/percentage/shares, ?edit=
/split/[groupId]|app/split/[groupId]/page.tsx|C tabs expenses/members/settlements, settle, invite, realtime
/split/join|app/split/join/page.tsx|C ?token=|?code=, Android open-in-app
/split|app/split/page.tsx|C groups, 2-step create→open invite link
/terms|app/terms/page.tsx|C redirect→/legal/terms
/tracker/[month]|app/tracker/[month]/page.tsx|C YYYY-MM history
/tracker|app/tracker/page.tsx|C consent, month nav (last-Friday unlock), buckets, Safety Pulse, CC bills, obligations
Requested-but-nonexistent: /signup→/login?mode=signup · /tax (no ITR auto-fill) · /calculators/home-loan→home · emi-calculator→emi · emergency-fund→emergency · fire-number→fire · fd-calculator (none; nearest po-td) · retirement-calculator (none; nearest fire)
Calculator ids (`app/calculators/calculator-config.ts`): investment[sip,swp,ppf,emergency,fire] loans[emi,home,car] life[rentbuy,rentcar,whencar] postoffice[po,po-savings,po-td,po-rd,nsc,po-kvp,po-mis,po-scss,po-ssy] tax[tax-regime→/calculators/tax-regime-2026]. Unknown id→notFound().
Shell (`app/layout.tsx`): PwaBootSplash, ReferralCapture, AppInitializer{ScrollToTop, RouteChangeLoader, AuthSessionSync, AuthRecoveryRedirect, PwaLaunchHandler, SplitInviteResume, FinancialStoreAuthSync, GlobalNavbar, RenewalReminderBanner, main, MorningTipPopup, PushPermissionPrompt, FeedbackPopupManager, Footer, ReferralSuccessToast, Toast}, GoogleAnalytics, ClarityScript.
Web bottom nav (in global-navbar.tsx): Home / · Report /analyse · [Track /tracker raised] · Calculators /calculators · Profile /profile. Safe-area `bottom:max(10px,env(safe-area-inset-bottom))`.

## Component Inventory
### PWA (main) — name|file|lines|props (— = none/internal)
AnalyticsBehavior|components/AnalyticsBehavior.tsx|57L|—
AppInitializer|components/AppInitializer.tsx|88L|children:React.ReactNode
AuthRecoveryRedirect|components/AuthRecoveryRedirect.tsx|30L|—
AuthSessionSync|components/AuthSessionSync.tsx|69L|—
Breadcrumb|components/Breadcrumb.tsx|58L|items:BreadcrumbItem[]
ClarityScript|components/ClarityScript.tsx|27L|—
FeedbackFormButton|components/FeedbackFormButton.tsx|31L|—
FeedbackPopupManager|components/FeedbackPopupManager.tsx|141L|—
FeedbackWidget|components/FeedbackWidget.tsx|305L|pageContext:string, onClose?:() => void
FinancialStoreAuthSync|components/FinancialStoreAuthSync.tsx|23L|—
GoogleAnalytics|components/GoogleAnalytics.tsx|62L|—
MorningTipPopup|components/MorningTipPopup.tsx|272L|—
MotionLazyProvider|components/MotionLazyProvider.tsx|15L|children:React.ReactNode
NotificationBell|components/NotificationBell.tsx|365L|—
PWAInstallPrompt|components/PWAInstallPrompt.tsx|338L|—
PushPermissionPrompt|components/PushPermissionPrompt.tsx|130L|—
PwaBootSplash|components/PwaBootSplash.tsx|59L|—
PwaLaunchHandler|components/PwaLaunchHandler.tsx|38L|—
ReferralCapture|components/ReferralCapture.tsx|34L|—
ReferralSuccessToast|components/ReferralSuccessToast.tsx|29L|—
RenewalReminderBanner|components/RenewalReminderBanner.tsx|116L|—
ScrollToTopOnRouteChange|components/ScrollToTopOnRouteChange.tsx|21L|—
SplitInviteResume|components/SplitInviteResume.tsx|45L|—
Testimonials|components/Testimonials.tsx|146L|—
TrackImpression|components/TrackImpression.tsx|53L|component_id:string, threshold?:number, className?:string, children:React.ReactNode
AnalyseAdvisorModal|components/analyse/AnalyseAdvisorModal.tsx|94L|open:boolean, step:number, stepTitle:string, stepCount:number, onClose:() => void, children:React.ReactNode
ConsentModal|components/analyse/ConsentModal.tsx|297L|onAccept:() => void, onDecline:() => void
analyse-result-error-boundary|components/analyse/analyse-result-error-boundary.tsx|37L|children:ReactNode }
paywall-modal|components/analyse/paywall-modal.tsx|323L|open:boolean, onClose:() => void, priceLabel?:string, title?:string, subtitle?:string, checkoutDescription?:string, bulletPoints?:string[], navigateAfterUnlock?:string
ProtectedGate|components/auth/ProtectedGate.tsx|97L|children:ReactNode
CarLoanCalculator|components/calculators/CarLoanCalculator.tsx|503L|—
EMICalculator|components/calculators/EMICalculator.tsx|466L|—
EmergencyFundCalculator|components/calculators/EmergencyFundCalculator.tsx|123L|—
FIRECalculator|components/calculators/FIRECalculator.tsx|220L|—
HomeLoanCalculator|components/calculators/HomeLoanCalculator.tsx|490L|—
NSCCalculator|components/calculators/NSCCalculator.tsx|4L|—
PPFCalculator|components/calculators/PPFCalculator.tsx|184L|—
PostOfficeCalculator|components/calculators/PostOfficeCalculator.tsx|100L|—
RentVsBuyCalculator|components/calculators/RentVsBuyCalculator.tsx|109L|—
RentVsOwnCarCalculator|components/calculators/RentVsOwnCarCalculator.tsx|96L|—
SIPCalculator|components/calculators/SIPCalculator.tsx|229L|—
SWPCalculator|components/calculators/SWPCalculator.tsx|222L|—
TaxRegimeCalculator|components/calculators/TaxRegimeCalculator.tsx|5214L|—
TaxTeachTooltip|components/calculators/TaxTeachTooltip.tsx|77L|content:TaxTeachContent, ariaLabel?:string
ToggleSection|components/calculators/ToggleSection.tsx|170L|id:string, emoji?:string, icon?:AppIconName, title:string, subtitle:string, oneLiner?:string, isOn:boolean, onToggle:(val: boolean) => void, children:ReactNode
WhenToBuyCarCalculator|components/calculators/WhenToBuyCarCalculator.tsx|86L|—
calculator-ui|components/calculators/calculator-ui.tsx|329L|exports SliderField{label,value,min,max,step?,onChange,suffix?,prefix?,format?,unitType?}, ResultStat, Insight{tone,children}, CALCULATOR_MONEY_MAX, todayInputValue
compound-interest-calculator|components/calculators/compound-interest-calculator.tsx|104L|— [UNUSED]
lazy-calculators|components/calculators/lazy-calculators.tsx|118L|—
schemeCalculators|components/calculators/postOffice/schemeCalculators.tsx|545L|scheme:PoSchemeId
spending-trend-chart|components/calculators/spending-trend-chart.tsx|56L|— [UNUSED]
FeedbackModal|components/feedback/FeedbackModal.tsx|471L|open:boolean, onClose:() => void, source?:string
MonthlyAllocationPieChart|components/finkoin/MonthlyAllocationPieChart.tsx|65L|pieAgg:MonthlyAllocationPieSlice[], totalPie:number
finkoin-ai-plan-view|components/finkoin/finkoin-ai-plan-view.tsx|816L|plan:FinkoinAIPlan, variant:"summary" | "full", profile?:FinancialProfile | null, surplusMonthly?:number
optimizer-full-sections|components/finkoin/optimizer-full-sections.tsx|907L|kvp:FinkoinKvpStrategy | undefined, ladder:ReturnType<typeof computeMisladder>
ObligationDateFields|components/forms/ObligationDateFields.tsx|196L|month?:number, day?:number, onMonth:(m: number | undefined) => void, onDay:(d: number | undefined) => void, hint?:string, label:string
analyse-onboarding-form|components/forms/analyse-onboarding-form.tsx|4129L|—
onboarding-step-basics|components/forms/onboarding-step-basics.tsx|71L|— [UNUSED]
onboarding-step-complete|components/forms/onboarding-step-complete.tsx|45L|— [UNUSED]
onboarding-step-goals|components/forms/onboarding-step-goals.tsx|82L|— [UNUSED]
onboarding-wizard|components/forms/onboarding-wizard.tsx|53L|— [UNUSED]
global-navbar|components/global-navbar.tsx|833L|— header nav, NotificationBell, profile panel, bottom nav
AnalyseMarketingLanding|components/landing/AnalyseMarketingLanding.tsx|189L|—
FeatureCardsCarousel|components/landing/FeatureCardsCarousel.tsx|173L|features:readonly Feature[]
Footer|components/landing/Footer.tsx|249L|—
HomeHeroCarousel|components/landing/HomeHeroCarousel.tsx|232L|—
HomeMobileQuickTools|components/landing/HomeMobileQuickTools.tsx|92L|—
HomePageBelowFold|components/landing/HomePageBelowFold.tsx|353L|—
HomePageClient|components/landing/HomePageClient.tsx|102L|children:ReactNode
SplitMarketingLanding|components/landing/SplitMarketingLanding.tsx|186L|—
CompoundInterestGuide|components/learn/CompoundInterestGuide.tsx|227L|—
EmergencyFundGuide|components/learn/EmergencyFundGuide.tsx|298L|—
Form16ItrGuide|components/learn/Form16ItrGuide.tsx|150L|—
IndexFundGuide|components/learn/IndexFundGuide.tsx|426L|—
LearnArticleLayout|components/learn/LearnArticleLayout.tsx|69L|toc:LearnTocItem[], asideNote?:ReactNode, children:ReactNode
LearnFaqAccordion|components/learn/LearnFaqAccordion.tsx|66L|faqs:LearnFaq[], subtitle?:string, searchPlaceholder?:string
LearnRichArticleRenderer|components/learn/LearnRichArticleRenderer.tsx|155L|rich:RichArticle; articleId: string
LearnSimpleArticle|components/learn/LearnSimpleArticle.tsx|44L|article:LearnArticle, toc:LearnTocItem[], asideNote?:ReactNode, children:ReactNode
SipCroreGuide|components/learn/SipCroreGuide.tsx|153L|—
TermInsuranceVsEndowmentGuide|components/learn/TermInsuranceVsEndowmentGuide.tsx|176L|—
article-share|components/learn/article-share.tsx|14L|title:string; path: string
article-tracker|components/learn/article-tracker.tsx|7L|articleId:string
learn-hub|components/learn/learn-hub.tsx|101L|articles:LearnArticle[]
share-button|components/learn/share-button.tsx|3L|—
IncomeTaxGuideFY2526|components/learn/tax/IncomeTaxGuideFY2526.tsx|586L|—
OldVsNewRegimeGuideFY2526|components/learn/tax/OldVsNewRegimeGuideFY2526.tsx|246L|—
TaxFaqAccordion|components/learn/tax/TaxFaqAccordion.tsx|13L|faqs:TaxFaq[]
TaxRegimeToggle|components/learn/tax/TaxRegimeToggle.tsx|121L|—
EmergencyFundLearnEmbed|components/learn/tools/EmergencyFundLearnEmbed.tsx|32L|—
HomeLoanPrepayEmbed|components/learn/tools/HomeLoanPrepayEmbed.tsx|192L|—
LearnToolEmbed|components/learn/tools/LearnToolEmbed.tsx|60L|title:string, subtitle?:string, fullToolHref:string, fullToolLabel?:string, analyseHref?:string, children:ReactNode
SipCroreCalculatorEmbed|components/learn/tools/SipCroreCalculatorEmbed.tsx|113L|—
TaxRegimeLearnEmbed|components/learn/tools/TaxRegimeLearnEmbed.tsx|62L|—
NotificationsClient|components/notifications/NotificationsClient.tsx|417L|—
PolicyVaultClient|components/policies/PolicyVaultClient.tsx|924L|—
ProfileAssets|components/profile/ProfileAssets.tsx|907L|profile:FinancialProfile | null, analysis:AnalysisResult | null
CalculatorRelatedLinks|components/seo/CalculatorRelatedLinks.tsx|58L|links?:RelatedLink[]
InviteLinkShare|components/split/InviteLinkShare.tsx|81L|inviteUrl:string, groupName:string
AddExpenseModal|components/tracker/AddExpenseModal.tsx|1030L|onClose:() => void, onSaved:(saved?: {, defaultDate?:string, maxDate?:string, defaultBucket?:string, defaultSubcategory?:string, defaultAmount?:number, defaultDescript…
AddObligationForm|components/tracker/AddObligationForm.tsx|270L|onSave:(data: ObligationFormPayload) => Pr…, onClose:() => void, initial?:Partial<ObligationFormPayload> | null, submitLabel?:string
CollapsiblePanel|components/tracker/CollapsiblePanel.tsx|117L|title:string, subtitle?:string, icon:AppIconName, open:boolean, onToggle:() => void, children:ReactNode, headerRight?:ReactNode, defaultBorder?:boolean
CreditCardBillReminder|components/tracker/CreditCardBillReminder.tsx|592L|previousTransactions:Txn[], currentTransactions?:Txn[], cards?:SavedCreditCard[], monthName?:string, year?:number, monthlySalary?:number, onPayBill?:(amount: number, l…
ExpenseTable|components/tracker/ExpenseTable.tsx|247L|transactions:TrackerTransactionRow[], onChanged:() => void, onEdit?:(txn: TrackerTransactionRow) => void
MonthSafetyPulse|components/tracker/MonthSafetyPulse.tsx|406L|pulse:SafetyPulseResult, previousMonthLabel?:string | null, forceVisible?:boolean, children?:ReactNode
MonthSummary|components/tracker/MonthSummary.tsx|70L|title:string, bucketTotals:Record<string, number>, totalSpent:number
ObligationsChecklist|components/tracker/ObligationsChecklist.tsx|562L|userId:string, checklistMonth?:Date, learnedSuggestion?:Learned | null, onDismissLearn?:() => void, analyseCompleted?:boolean, defaultOpen?:boolean
PurpleCashAudit|components/tracker/PurpleCashAudit.tsx|271L|transactions:Txn[], profileMonthlyIncome?:number [UNUSED]
TrackerConsent|components/tracker/TrackerConsent.tsx|290L|onAccept:() => void
TrackerIcons|components/tracker/TrackerIcons.tsx|376L|name:TrackerIconName, size?:number, color?:string, className?:string
AnimateOnScroll|components/ui/AnimateOnScroll.tsx|120L|children:React.ReactNode, variant?:VariantName, delay?:number, className?:string, aboveFold?:boolean
AppIcon|components/ui/AppIcon.tsx|395L|name:AppIconName, size?:number, color?:string, strokeWidth?:number, className?:string
BackLink|components/ui/BackLink.tsx|82L|fallbackHref?:string, label?:string, className?:string, forceHref?:string, replace?:boolean
BottomSheet|components/ui/BottomSheet.tsx|153L|isOpen:boolean, onClose:() => void, title:string, children:React.ReactNode, fullscreen?:boolean, closeOnBackdrop?:boolean, closeOnDrag?:boolean
BrandPageLoader|components/ui/BrandPageLoader.tsx|156L|fullScreen?:boolean, label?:string, size?:"md" | "sm" | "xs", minHeight?:string | number, inline?:boolean, bare?:boolean, className?:string
ChipSelector|components/ui/ChipSelector.tsx|38L|options:Option[], selected:string[], onChange:(selected: string[]) => void [UNUSED]
FieldTooltip|components/ui/FieldTooltip.tsx|113L|text:string, label?:string
GoalCard|components/ui/GoalCard.tsx|29L|id:string, icon:string, title:string, subtitle:string, selected:boolean, onSelect:(id: string) => void [UNUSED]
LoginSheet|components/ui/LoginSheet.tsx|356L|open:boolean, onClose:() => void [UNUSED]
MoneyInput|components/ui/MoneyInput.tsx|227L|id,label,labelAction?,error?,helper?,required?,optional?,hint?,min?,max? + input attrs (forwardRef, RHF)
NumberInput|components/ui/NumberInput.tsx|135L|label?:string, value:number, onChange:(value: number) => void, placeholder?:string, helper?:string, suffix?:string, min?:number, max?:number, step?:number, disabled?:b…
PrivateAmount|components/ui/PrivateAmount.tsx|138L|value:number, children:ReactNode, masked?:string, valueClassName?:string, valueStyle?:CSSProperties, eyeColor?:string, eyeSize?:number, gap?:number, label?:string, ali…
RouteChangeLoader|components/ui/RouteChangeLoader.tsx|67L|—
ScrollSection|components/ui/ScrollSection.tsx|23L|children:React.ReactNode [UNUSED]
SectionToggle|components/ui/SectionToggle.tsx|51L|label:string, sublabel?:string, icon?:string, defaultOpen?:boolean, children?:ReactNode [UNUSED]
ShareButton|components/ui/ShareButton.tsx|153L|title:string, url?:string, path?:string, contentType?:string, contentId?:string, className?:string, compact?:boolean, text?:string
SpeedoMeter|components/ui/SpeedoMeter.tsx|861L|needs,wants,loans,investment,kind,amount,income,capFraction,rangeMultiplier,capLabel,title?,singleScore?,singleTone?
Toast|components/ui/Toast.tsx|24L|—
brand-logo|components/ui/brand-logo.tsx|33L|className?:string, priority?:boolean, size?:"header" | "nav"
button|components/ui/button.tsx|78L|className, variant, size, type
### Mobile (mobile-app) — name|file|props|status
AppHeader|mobile/components/AppHeader.tsx|homeOnLogo?:boolean|C
NotificationBell|mobile/components/NotificationBell.tsx|—|C no realtime
ProfileMenu|mobile/components/ProfileMenu.tsx|visible:boolean, onClose:() => void|P many items open website
ResultCard|mobile/components/analyse/ResultCard.tsx|score:number, title?:string, subtitle?:string|U
StepIndicator|mobile/components/analyse/StepIndicator.tsx|current:number, total:number, labels?:string[]|U
DailyTip|mobile/components/home/DailyTip.tsx|emoji?:string | null, title:string, content:string|U
QuickTools|mobile/components/home/QuickTools.tsx|—|U superseded
HeroCarousel|mobile/components/landing/HeroCarousel.tsx|—|C
LandingHeader|mobile/components/landing/LandingHeader.tsx|—|C re-export AppHeader
QuickTools|mobile/components/landing/QuickTools.tsx|—|P Split tile→Home bug; calc tiles not deep-linked
TopPicks|mobile/components/landing/TopPicks.tsx|—|C
FinkoinTabBar|mobile/components/navigation/FinkoinTabBar.tsx|BottomTabBarProps|C safe-area
AddExpenseSheet|mobile/components/tracker/AddExpenseSheet.tsx|visible:boolean, onClose:() => void, onSaved:() => void, defaultDate:string, maxDate?:string, defaultBucket?:string, defaultSubcategory?:string, defaultAmount?:number,…|U full web-parity sheet
BucketCard|mobile/components/tracker/BucketCard.tsx|name:string, spent:number, budget?:number, emoji?:string|U
MonthSafetyPulse|mobile/components/tracker/MonthSafetyPulse.tsx|pulse:SafetyPulseResult, previousMonthLabel?:string | null, forceVisible?:boolean, children?:ReactNode|U (+TrackerNestedPanels)
TrackerConsent|mobile/components/tracker/TrackerConsent.tsx|onAccept:() => void|U
AppIcon|mobile/components/ui/AppIcon.tsx|name:AppIconName, size?:number, color?:string, strokeWidth?:number|C subset
BrandLogo|mobile/components/ui/BrandLogo.tsx|size?:number, withWordmark?:boolean, style?:ViewStyle|C
Button|mobile/components/ui/Button.tsx|label:string, onPress:() => void, variant?:"primary" | "secondary" | "danger" …, loading?:boolean, disabled?:boolean, style?:ViewStyle, textStyle?:TextStyle, fullWidth…|C
Card|mobile/components/ui/Card.tsx|children,style?,padding?,elevated? + ViewProps|C
Chip|mobile/components/ui/Chip.tsx|label:string, selected?:boolean, onPress:() => void, style?:ViewStyle|U
HealthScoreRing|mobile/components/ui/HealthScoreRing.tsx|score:number, size?:number, strokeWidth?:number|U
Input|mobile/components/ui/Input.tsx|label?,helper?,error?,prefix?,style? + TextInputProps|C 16px
LoadingSpinner|mobile/components/ui/LoadingSpinner.tsx|full?:boolean|U
MoneyInput|mobile/components/ui/MoneyInput.tsx|label?:string, value?:string | number | null, onChange?:(v: string) => void, onChangeValue?:(n: number | null) => void, placeholder?:string, helper?:string, error?:string|C
PrivacyEye|mobile/components/ui/PrivacyEye.tsx|open:boolean, size?:number, color?:string|U (EyeIcon, SectionPrivacyEye)
ResultStat|mobile/components/ui/ResultStat.tsx|label:string, value:string, hint?:string, accent?:boolean|C
SegmentControl|mobile/components/ui/SegmentControl.tsx|options:Option[], value:string, onChange:(v: string) => void|U
SliderField|mobile/components/ui/SliderField.tsx|label:string, value:number, min:number, max:number, step?:number, onChange:(v: number) => void, format?:(v: number) => string|C

## Store Inventory
### PWA (main) — name|persist|state|actions
authStore|finkoin-auth (user,isLoggedIn)|user{id,name,phone,email,photoURL,panVerified,aadhaarVerified,subscriptionTier free|pro|promax,subscriptionExpiry,createdAt,referralCode,referredBy,isAdmin?,fkBalance?},isLoggedIn,isLoading,hasInitialized,subscriptionTier,userId|setUser,updateUser,setLoading,setSubscription,logout,initAuth,signUpWithEmail,signInWithEmail,refreshUser; helper applyPersistedAuthBootstrap
financialStore (alias use-financial-store)|finkoin-financial:<uid>|analysis(draft),lastSubmission(FinancialProfile),result(AnalysisResult),profile,currentStep,aiPlan(FinkoinAIPlan),hasHydrated|setAnalysis,setFullAnalysis(runs analyseFinances),updateProfile,setResult,setAiPlan,setCurrentStep,hydrateFromSnapshot,runAnalysis,clearSubmission,resetAll,resetStore,setHasHydrated
splitStore|no (2-min TTL cache)|groups,activeGroup,expenses,settlements,balances(edges),netBalances,loading,lastFetched|fetchGroups(uid,email,force?),fetchGroupDetail(id)→GET /api/split/balances,createGroup→POST groups,inviteMember{groupId,groupName,invitedEmail?,linkOnly?}→POST invite,addExpense→POST expenses,editExpense→PUT,settleUp→POST settle,deleteGroup→DELETE groups?groupId,deleteExpense→DELETE expenses/[id],leaveGroup→DELETE members,clearActive; helpers getMyNetBalance,getMyBalanceFromEdges
gamificationStore|finkoin-gamification|fkBalance,totalEarned,lastLoginDate,badges,streakDays,rank,percentile,lastFetched,earnedActions,toastMessage|fetchGamification(5-min),addFK(uid,amt,reason,ref?)→gamification+users.fk_balance+fk_transactions,subscribeToRealtime(uid)→unsub,updateLoginStreak,earnTokens,awardBadge,hasEarnedAction,markEarnedAction,clearToast
notificationStore|no|notifications[{id,title,content,emoji,category,is_read,shown_as_popup,created_at}],unreadCount,loading|fetchNotifications(20 newest),markAllRead,markRead(id) NEW,markPopupShown,getTodayUnshownPopup,getById(id) NEW
obligationStore|no|obligations,checklist(status pending|paid|skipped|auto_debit + joined obligation),currentMonth,loading,totalObligated,totalPaid,totalPending|fetchObligations,fetchChecklist(uid,month?),addObligation,updateObligation,closeObligation(id,month?) NEW,deleteObligation(id,month?),markPaid(id,amt),markUnpaid,markSkipped,resetAllObligations,generateChecklist→rpc generate_monthly_checklist,syncFromHealthCheck(uid,submission) upsert onConflict user_id,title,category; helper monthStartIso
portfolioStore|no|lastAnalysis(demo funds)|setLastAnalysis
use-app-store|no|onboardingStep|setOnboardingStep [legacy, unused wizard]
### Mobile (mobile-app)
authStore|finkoin-auth-mobile (appStorage)|user,isLoggedIn,isLoading,hasInitialized|initAuth,signIn,signUp,signInWithGoogle,handleIncomingAuthUrl,signOut,refreshUser; export createSessionFromUrl|P no reset/referral/gamification
financialStore|user-scoped appStorage|same as web|same as web|U never imported
splitStore|no|same shape as web|fetchGroups,fetchGroupDetail,createGroup,inviteLink(invite_code),addExpense,editExpense,settleUp,deleteGroup,deleteExpense,leaveGroup,joinByCode,clearActive — DIRECT Supabase writes, no API|C (siteBase default https://finkoin.com not www)
notificationStore|no|notifications,unreadCount,loading|fetchNotifications,markAllRead|P
MISSING on mobile: obligationStore, gamificationStore, portfolioStore

## API Route Inventory
method|path|auth|tables/rpc|returns
POST|/api/ai/analyse|cookie+rl10/hr|-|{priorityPlan,explanations,knowledgeUsed,isFallback?}; 503 no GROQ key; 400 missing; uses rpc search_by_keywords via lib/rag
POST|/api/auth/sign-out|public|-|{ok} clears cookies
POST,GET|/api/feedback|cookie+rl10/hr|feedback,fk_transactions,gamification|POST {success} (+50 FK if authed); GET featured testimonials
POST,GET|/api/financial-data|cookie+rl30/hr|user_financial_data|POST {success} (encrypt submission); GET {data} decrypted
POST,GET|/api/notifications/deliver-tip|cron-secret|user_notifications,user_tip_history,users|rpc get_next_tip_for_user → inbox+web push; {delivered}
POST,DELETE|/api/notifications/push-subscribe|cookie|notification_preferences,push_subscriptions|POST/DELETE {ok} (endpoint,keys)
GET,POST|/api/notifications/send-daily-tip|cron-secret|finance_tips,notification_preferences,users|Resend emails summary
POST|/api/notifications/send-test-tip|cron-secret|finance_tips|summary; body {email?}
POST|/api/notifications/welcome-tip|cookie|finance_tips,notification_preferences|{ok}
POST,GET|/api/obligations/reminders|cron-secret|financial_obligations,user_notifications|inserts user_notifications category obligation_reminder
GET|/api/razorpay/checkout-config|public|-|{keyId} | 503
POST|/api/razorpay/create-order|cookie+rl15/hr|-|{orderId,amount:9900,currency:INR}
POST|/api/razorpay/verify-payment|cookie+bearer|users|{ok}; HMAC verify → users.subscription_tier=pro (Bearer token auth)
GET|/api/split/balances|cookie|split_expenses,split_group_members,split_settlements|{net,edges} ?groupId= membership-checked
PUT,DELETE|/api/split/expenses/[expenseId]|cookie|split_expense_shares,split_expenses,split_groups|PUT {expense} creator-only; DELETE soft is_deleted=true
POST|/api/split/expenses|cookie|split_expense_shares,split_expenses,split_group_members,split_groups|{expense,shares}; body groupId,title,amount,category,paidByEmail,paidByName,splitType,expenseDate,notes?,includedMembers[],exactAmounts?,percentages?,shareCounts?
DELETE|/api/split/groups/[groupId]|cookie|split_expense_shares,split_expenses,split_group_members,split_groups,split_invitations,split_settlements|hard delete (active admin)
POST,DELETE|/api/split/groups|cookie|split_group_members,split_groups|POST {success,groupId} body name,emoji?,type?,displayName?; DELETE ?groupId soft is_active=false (creator)
POST|/api/split/invite|cookie+rl30/hr|split_group_members,split_groups,split_invitations|{inviteUrl,token,emailSent,emailError?,linkOnly}; body groupId,groupName?,invitedEmail?,linkOnly?
POST|/api/split/join|cookie|split_group_members,split_groups,split_invitations|{success,groupId,groupName}; body {token}|{code}
DELETE|/api/split/members|cookie|split_expenses,split_group_members,split_groups,split_settlements|DELETE ?groupId&email → status=left; 409 if unsettled
POST|/api/split/settle|cookie+rl60/hr|split_group_members,split_groups,split_settlements|settlement row; body groupId,toEmail,amount,paymentMethod?,notes?
GET|/api/testimonials|public|app_feedback,users|testimonials (app_feedback+users)

## Supabase Table Inventory
name|key-columns|rls|defined-in
users|id PK→auth.users,name,email,phone,subscription_tier,subscription_expiry,fk_balance,referral_code,referred_by,avatar_url,pan_verified,aadhaar_verified,is_admin,data_consent_given/_at/_version|Y own|001,003 (+live cols)
gamification|user_id PK,fk_balance,total_earned,badges jsonb,streak_days,last_login,weekly_tokens|Y own, realtime|003
fk_transactions|user_id,amount,reason,reference_id,created_at|Y|live only
leaderboard_view|VIEW user_id,rank,name(anon),tokens|—|live only
referrals|referrer_id,referred_id,signed_up_at,tokens_awarded (001 names stale)|?|001
user_stats|user_id PK,…counters|?|001 (lightly used)
user_analyse_snapshots|user_id PK,payload jsonb,updated_at|Y own|002,005 — CANONICAL analyse data
user_analysis|user_id unique,profile_hash,profile,analysis_result,ai_fix_plan,projection,ai_generated_at|Y own|003,005 (mobile wrongly uses as primary)
user_financial_data|user_id,encrypted_data,iv,auth_tag,encryption_version,data_hash|Y|live only (via /api/financial-data)
expense_transactions|id PK,user_id,date,amount,category,subcategory,description,bucket,payment_method(default cash),month text,year int|Y own|manual/expense_tracker.sql (NO title column)
tracker_consent|user_id PK,consent_given,consent_at,consent_version(v2)|Y|manual/expense_tracker.sql
user_credit_cards|id PK,user_id,nickname,last4,billing_day,due_day|Y|manual/tracker_credit_cards.sql,037
financial_obligations|id PK,user_id,title,category,amount,frequency,due_day,due_month,due_date,source,is_active,remind_days_before,notes; UNIQUE(user_id,title,category)|Y, realtime|036
obligation_checklist|id PK,user_id,obligation_id→financial_obligations,checklist_month date,expected_amount,status,paid_at,paid_amount; UNIQUE(user_id,obligation_id,checklist_month)|Y|036 + rpc generate_monthly_checklist(p_user_id,p_month)
user_policies|id PK,user_id,policy_type,insurer_name,policy_number,plan_name,cover_amount,premium_amount,premium_frequency,renewal_date,purchase_date,nominee_name,status|Y own|003_user_policies,004
notification_preferences|id PK,user_id,email_consent,push_consent,morning_tips,weekly_summary,payment_alerts,marketing,preferred_time,timezone,push_token,declined_at|Y|008,009
push_subscriptions|id PK,user_id,endpoint,p256dh,auth,user_agent|Y|035
user_notifications|id,user_id,tip_id,title,content,emoji,category,is_read,shown_as_popup,created_at|Y, realtime INSERT|live only
user_tip_history|user_id,tip_id,delivered_at|Y|live only
finance_tips|id PK,title,content,category,day_of_week,is_active|read-all|008 (+rpc get_next_tip_for_user)
feedback|id,user_id,rating,message,page_context,score_at_time,is_approved,is_featured|Y|live only
app_feedback|id PK,user_id,rating,message,context,answers jsonb|Y|006,007
insurance_clicks|id PK,user_id,insurance_type,insurer_name,recommended_cover,monthly_premium,user_age,city,fk_tokens_used,clicked_at|Y insert-own|003
finkoin_knowledge|id PK,category,subcategory,title,content,keywords[],applies_when,priority_context[],embedding vector(384),is_active|Y public read|003 (+rpc search_by_keywords) may be absent
split_groups|id,name,emoji,group_type,created_by,invite_code,is_active,currency,created_at,updated_at|Y|live only
split_group_members|id,group_id,user_id,email,display_name,role admin|member,status pending|active|left,joined_at,left_at|Y, realtime|live only
split_expenses|id,group_id,title,amount,currency,category,paid_by_email,paid_by_name,paid_by_user_id,split_type,expense_date,notes,created_by,is_deleted|Y, realtime|live only
split_expense_shares|id,expense_id,member_email,user_id,amount,is_settled,settled_at|Y, realtime|live only
split_invitations|id,group_id,token,invited_email(or __open__@finkoin.invite),status pending|accepted,expires_at(+7d)|Y|live only
split_settlements|id,group_id,from_email,to_email,amount,payment_method,notes,status completed,completed_at|Y, realtime|live only
tax_documents|user_id,…|?|live only, no app code path
financial_profiles|legacy, do not write|?|legacy
storage:avatars|bucket for users.avatar_url|policies in manual/referral_code_avatars.sql|manual
Trigger `handle_new_user()` on signup → users + gamification (FK seed 50) + user_stats.

## Shared Lib Functions
One line per exported function: name|file|purity. Data exports listed per file. `mob` = already copied into mobile/lib (⚠stale = differs from main).
### lib/aiProviderMessages.ts [pure] data:AI_TIMEOUT_NOTICE
parseGroqRetryInText|lib/aiProviderMessages.ts|pure
formatAiRateLimitNotice|lib/aiProviderMessages.ts|pure
formatAiTimeoutNotice|lib/aiProviderMessages.ts|pure
### lib/aiService.ts [web/io]
generateFallbackPlan|lib/aiService.ts|web/io
getAIFixPlan|lib/aiService.ts|web/io
### lib/amortisation.ts [pure] mob
generateAmortisationTable|lib/amortisation.ts|pure
calculateOutstanding|lib/amortisation.ts|pure
### lib/analyse-form-schema.ts [pure] mob⚠stale deps:zod data:LIFE_STAGE_VALUES,LIFE_STAGE_LABELS,CITY_TIER_VALUES,CITY_TIER_LABELS,PRIMARY_GOAL_VALUES,PRIMARY_GOAL_LABELS,PREMIUM_FREQUENCY_VALUES,KID_GENDER_VALUES
newAnalyseRowId|lib/analyse-form-schema.ts|pure
clearLegacyLoanScalars|lib/analyse-form-schema.ts|pure
parseMoneyInput|lib/analyse-form-schema.ts|pure
toMonthlyEquivalent|lib/analyse-form-schema.ts|pure
lastSubmissionToFormPartial|lib/analyse-form-schema.ts|pure
fillDraftGapsFromProfile|lib/analyse-form-schema.ts|pure
mergeAnalyseDraftWithProfile|lib/analyse-form-schema.ts|pure
financialProfileToFormValues|lib/analyse-form-schema.ts|pure
coalesceInsuranceToggles|lib/analyse-form-schema.ts|pure
normalizeAnalyseFormValues|lib/analyse-form-schema.ts|pure
### lib/analyseUserScenarioFixture.ts [pure]
buildUserAnalyseScenarioForm|lib/analyseUserScenarioFixture.ts|pure
buildUserAnalyseScenarioProfile|lib/analyseUserScenarioFixture.ts|pure
### lib/analysisSnapshotValidation.ts [pure]
isValidStoredAnalysis|lib/analysisSnapshotValidation.ts|pure
### lib/analytics.ts [web/io] data:Analytics
### lib/analyticsContext.ts [web/io]
getAppSurface|lib/analyticsContext.ts|web/io
getDeviceCategory|lib/analyticsContext.ts|web/io
getAnalyticsContext|lib/analyticsContext.ts|web/io
### lib/animations.ts [pure] data:fadeUp,fadeIn,staggerContainer,scaleIn,slideInLeft,slideInRight
### lib/apiGuard.ts [server] deps:next/server+@supabase/supabase-js
getAuthedUser|lib/apiGuard.ts|server
unauthorized|lib/apiGuard.ts|server
tooManyRequests|lib/apiGuard.ts|server
rateLimit|lib/apiGuard.ts|server
clientKeyFromHeaders|lib/apiGuard.ts|server
### lib/auth.ts [web/io] deps:@/store/authStore
signInWithGoogle|lib/auth.ts|web/io
sendOTP|lib/auth.ts|web/io
verifyOTP|lib/auth.ts|web/io
bootstrapAuthUser|lib/auth.ts|web/io
signOut|lib/auth.ts|web/io
signUpWithEmail|lib/auth.ts|web/io
signInWithEmail|lib/auth.ts|web/io
getCurrentUser|lib/auth.ts|web/io
onAuthChange|lib/auth.ts|web/io
### lib/authRecovery.ts [web/io] deps:@supabase/supabase-js data:AUTH_RECOVERY_PATH
isRecoveryAuthUrl|lib/authRecovery.ts|web/io
completeAuthSessionFromUrl|lib/authRecovery.ts|web/io
authRecoveryRedirectUrl|lib/authRecovery.ts|web/io
### lib/authSession.ts [web/io] deps:@/store/authStore
hasSupabaseSession|lib/authSession.ts|web/io
resolveAuthenticated|lib/authSession.ts|web/io
recoverAuthSession|lib/authSession.ts|web/io
### lib/blogContent.ts [pure] data:BLOG_ARTICLES
getBlogArticle|lib/blogContent.ts|pure
### lib/bodyScrollLock.ts [web/io]
lockBodyScroll|lib/bodyScrollLock.ts|web/io
clearBodyScrollLocks|lib/bodyScrollLock.ts|web/io
### lib/bucket-breakdown.ts [pure]
getBucketBreakdown|lib/bucket-breakdown.ts|pure
### lib/cache.ts [web/io]
hashProfile|lib/cache.ts|web/io
enginePlanFingerprint|lib/cache.ts|web/io
isCachedAiStale|lib/cache.ts|web/io
getCachedPlan|lib/cache.ts|web/io
setCachedPlan|lib/cache.ts|web/io
clearCache|lib/cache.ts|web/io
saveToSupabase|lib/cache.ts|web/io
loadFromSupabase|lib/cache.ts|web/io
### lib/calculatorInput.ts [pure] data:CALCULATOR_MONEY_MAX
stepDecimals|lib/calculatorInput.ts|pure
snapToStep|lib/calculatorInput.ts|pure
clampToRange|lib/calculatorInput.ts|pure
clampCalculatorValue|lib/calculatorInput.ts|pure
formatCalculatorFieldValue|lib/calculatorInput.ts|pure
### lib/cn.ts [pure] deps:clsx
cn|lib/cn.ts|pure
### lib/data/blog-fire-number-india.ts [pure]
### lib/data/blog-old-vs-new-tax-roi-2026.ts [pure]
### lib/encryption.ts [server] deps:crypto
encrypt|lib/encryption.ts|server
decrypt|lib/encryption.ts|server
hashData|lib/encryption.ts|server
encryptSensitiveFields|lib/encryption.ts|server
### lib/expense-bucket-recommendations.ts [pure]
getExpenseBucketRows|lib/expense-bucket-recommendations.ts|pure
### lib/exportExcel.ts [web/io] deps:xlsx
downloadAmortisationExcel|lib/exportExcel.ts|web/io
### lib/feedbackPrompt.ts [web/io]
productKeyFromPath|lib/feedbackPrompt.ts|web/io
hasAskedForProduct|lib/feedbackPrompt.ts|web/io
markFeedbackAsked|lib/feedbackPrompt.ts|web/io
### lib/finance.ts [pure]
compoundInterest|lib/finance.ts|pure
formatCurrency|lib/finance.ts|pure
### lib/financialEngine.ts [pure] mob⚠stale
computeRealEmergencyFund|lib/financialEngine.ts|pure
totalLoanLiabilities|lib/financialEngine.ts|pure
medicalEmergencyTarget|lib/financialEngine.ts|pure
isMetroCity|lib/financialEngine.ts|pure
getSavingsTargetPercent|lib/financialEngine.ts|pure
getDebtSafeLimitPercent|lib/financialEngine.ts|pure
monthlyTotalIncome|lib/financialEngine.ts|pure
monthlySavingsContributions|lib/financialEngine.ts|pure
monthlyInsuranceTotal|lib/financialEngine.ts|pure
monthlyLivingExpenses|lib/financialEngine.ts|pure
housingAndEmiTotal|lib/financialEngine.ts|pure
monthlyTotalExpenses|lib/financialEngine.ts|pure
calculateTermNeeded|lib/financialEngine.ts|pure
assessTermCover|lib/financialEngine.ts|pure
analyseFinances|lib/financialEngine.ts|pure
### lib/financialOptimizer.ts [pure]
buildOptimizerAnalysisFromProfile|lib/financialOptimizer.ts|pure
optimizeFinances|lib/financialOptimizer.ts|pure
### lib/finkoinAiPlan.ts [pure]
isValidFinkoinAIPlan|lib/finkoinAiPlan.ts|pure
buildFallbackFinkoinPlan|lib/finkoinAiPlan.ts|pure
### lib/fireCalculator.ts [pure] data:FIRE_WITHDRAWAL_RATE,FIRE_MULTIPLIER
sipFutureValue|lib/fireCalculator.ts|pure
wealthAtYears|lib/fireCalculator.ts|pure
yearsToReachWealth|lib/fireCalculator.ts|pure
computeFireNumbers|lib/fireCalculator.ts|pure
### lib/formatINR.ts [pure]
formatINR|lib/formatINR.ts|pure
formatCompactINR|lib/formatINR.ts|pure
### lib/formatters.ts [pure] mob⚠stale
formatIndian|lib/formatters.ts|pure
formatIndianCompact|lib/formatters.ts|pure
formatInWords|lib/formatters.ts|pure
parseIndianInput|lib/formatters.ts|pure
handleMoneyInput|lib/formatters.ts|pure
formatSliderLabel|lib/formatters.ts|pure
### lib/generatePDF.ts [web/io] deps:jspdf
downloadOptimizerPDF|lib/generatePDF.ts|web/io
### lib/googleFeedbackForm.ts [web/io]
mirrorFeedbackToGoogleForm|lib/googleFeedbackForm.ts|web/io
### lib/gtag.ts [web/io] data:GA_MEASUREMENT_ID
isGaEnabled|lib/gtag.ts|web/io
trackEvent|lib/gtag.ts|web/io
trackCta|lib/gtag.ts|web/io
trackImpression|lib/gtag.ts|web/io
trackScrollDepth|lib/gtag.ts|web/io
trackShare|lib/gtag.ts|web/io
trackToolOpen|lib/gtag.ts|web/io
trackNavClick|lib/gtag.ts|web/io
### lib/knowledgeBase/entries.ts [pure] data:KNOWLEDGE_BASE
### lib/knowledgeBase/index.ts [pure]
### lib/knowledgeBase/retriever.ts [pure]
retrieveRelevantKnowledge|lib/knowledgeBase/retriever.ts|pure
formatKnowledgeForPrompt|lib/knowledgeBase/retriever.ts|pure
### lib/kycVerification.ts [pure]
validatePAN|lib/kycVerification.ts|pure
verifyPAN|lib/kycVerification.ts|pure
### lib/learnArticleFaqs.ts [web/io] deps:@/components/learn/LearnFaqAccordion
getLearnArticleFaqs|lib/learnArticleFaqs.ts|web/io
tocWithFaq|lib/learnArticleFaqs.ts|web/io
### lib/learnContent.ts [pure] data:learnArticles,learnArticleById,learnCategories
### lib/learnRichArticles.ts [pure]
getRichLearnArticle|lib/learnRichArticles.ts|pure
isRichLearnArticle|lib/learnRichArticles.ts|pure
### lib/learnSeo.ts [pure] data:LEARN_SEO_OVERRIDES
getLearnSeoOverride|lib/learnSeo.ts|pure
### lib/localDate.ts [pure]
localISODate|lib/localDate.ts|pure
localYesterdayISODate|lib/localDate.ts|pure
msUntilNextLocalMidnight|lib/localDate.ts|pure
### lib/netWorth.ts [pure] data:netWorthMetricTones
buildNetWorth|lib/netWorth.ts|pure
getNetWorthStanding|lib/netWorth.ts|pure
netWorthSectionTone|lib/netWorth.ts|pure
### lib/obligationLearn.ts [pure]
decideObligationLearn|lib/obligationLearn.ts|pure
candidateFromExpense|lib/obligationLearn.ts|pure
shouldLearnObligationFromExpense|lib/obligationLearn.ts|pure
### lib/obligationReminders.ts [pure]
daysUntilMonthlyDueDay|lib/obligationReminders.ts|pure
shouldSendObligationReminder|lib/obligationReminders.ts|pure
obligationReminderEmoji|lib/obligationReminders.ts|pure
buildObligationReminderCopy|lib/obligationReminders.ts|pure
### lib/optimizer-format.ts [pure]
fmt|lib/optimizer-format.ts|pure
fmtWords|lib/optimizer-format.ts|pure
### lib/payment.ts [web/io]
canAccessFixPlan|lib/payment.ts|web/io
redeemFKTokens|lib/payment.ts|web/io
### lib/postOfficeSchemes.ts [pure] data:PO_RATES_PERIOD,PO_RATES_SOURCE,PO_RATES
poTdRate|lib/postOfficeSchemes.ts|pure
poTdMaturity|lib/postOfficeSchemes.ts|pure
poRdMaturity|lib/postOfficeSchemes.ts|pure
poNscMaturity|lib/postOfficeSchemes.ts|pure
poKvpMaturity|lib/postOfficeSchemes.ts|pure
poMisMonthly|lib/postOfficeSchemes.ts|pure
poScssQuarterly|lib/postOfficeSchemes.ts|pure
poSavingsYearly|lib/postOfficeSchemes.ts|pure
poSsyMaturity|lib/postOfficeSchemes.ts|pure
### lib/priorityEngine.ts [pure] mob⚠stale
buildPriorityPlan|lib/priorityEngine.ts|pure
### lib/profileAssetsPatch.ts [pure] data:CASH_CATALOG,INVESTMENT_CATALOG,PHYSICAL_CATALOG,LIABILITY_CATALOG
catalogForSection|lib/profileAssetsPatch.ts|pure
getScalarAssetValue|lib/profileAssetsPatch.ts|pure
patchScalarAsset|lib/profileAssetsPatch.ts|pure
upsertUnifiedLoan|lib/profileAssetsPatch.ts|pure
removeUnifiedLoan|lib/profileAssetsPatch.ts|pure
upsertCustomInvestment|lib/profileAssetsPatch.ts|pure
removeCustomInvestment|lib/profileAssetsPatch.ts|pure
### lib/pwaLaunch.ts [web/io]
isStandalonePwa|lib/pwaLaunch.ts|web/io
isAndroidUserAgent|lib/pwaLaunch.ts|web/io
isIosUserAgent|lib/pwaLaunch.ts|web/io
isMobileUserAgent|lib/pwaLaunch.ts|web/io
tryOpenHttpsInAndroidApp|lib/pwaLaunch.ts|web/io
markPwaOpenAttempted|lib/pwaLaunch.ts|web/io
hasPwaOpenAttempted|lib/pwaLaunch.ts|web/io
shouldOfferOpenInApp|lib/pwaLaunch.ts|web/io
### lib/rag/retriever.ts [server]
buildKeywords|lib/rag/retriever.ts|server
retrieveKnowledge|lib/rag/retriever.ts|server
formatForPrompt|lib/rag/retriever.ts|server
### lib/referralRewards.ts [web/io] deps:@supabase/supabase-js+@/store/authStore+@/store/gamificationStore data:REFERRAL_PENDING_STORAGE_KEY,STORAGE_KEY,FINKOIN_REFERRAL_SUCCESS_KEY
loginHrefPreserveRef|lib/referralRewards.ts|web/io
peekPendingReferralCode|lib/referralRewards.ts|web/io
consumePendingReferralCode|lib/referralRewards.ts|web/io
clearPendingReferralStorage|lib/referralRewards.ts|web/io
applyPendingReferralRewards|lib/referralRewards.ts|web/io
### lib/renderBlogBody.tsx [web/io] deps:next/link+react
renderBlogBody|lib/renderBlogBody.tsx|web/io
### lib/seo.ts [web/io] data:FINKOIN_TAGLINE,FINKOIN_TAGLINE_SUB,FINKOIN_TAGLINE_FULL,DEFAULT_OG_IMAGE_PATH,OG_IMAGE_WIDTH,OG_IMAGE_HEIGHT,SEO_CONFIG
absoluteOgUrl|lib/seo.ts|web/io
socialImageTags|lib/seo.ts|web/io
generatePageMeta|lib/seo.ts|web/io
SITE_URL|lib/seo.ts|web/io
### lib/sipGoal.ts [pure] data:CRORE
sipMaturityAmount|lib/sipGoal.ts|pure
monthlySipForGoal|lib/sipGoal.ts|pure
### lib/siteUrl.ts [web/io]
getPublicSiteUrl|lib/siteUrl.ts|web/io
### lib/speedo-meter-buckets.ts [pure]
buildSpeedoMeterProps|lib/speedo-meter-buckets.ts|pure
### lib/splitAuthRedirect.ts [web/io] data:FINKOIN_SPLIT_TOKEN_KEY,FINKOIN_SPLIT_REDIRECT_KEY
saveSplitInviteToken|lib/splitAuthRedirect.ts|web/io
saveSplitInviteRedirect|lib/splitAuthRedirect.ts|web/io
sanitizeAppPath|lib/splitAuthRedirect.ts|web/io
peekPostLoginPath|lib/splitAuthRedirect.ts|web/io
clearSplitInviteRedirect|lib/splitAuthRedirect.ts|web/io
resolvePostLoginPath|lib/splitAuthRedirect.ts|web/io
### lib/splitBalances.ts [pure] mob
computeNetBalances|lib/splitBalances.ts|pure
simplifyDebts|lib/splitBalances.ts|pure
computeGroupBalances|lib/splitBalances.ts|pure
netFor|lib/splitBalances.ts|pure
### lib/splitExpenseNotify.ts [web/io] deps:@supabase/supabase-js
buildSplitExpensePushCopy|lib/splitExpenseNotify.ts|web/io
recipientUserIdsForSplitExpense|lib/splitExpenseNotify.ts|web/io
notifySplitExpenseAdded|lib/splitExpenseNotify.ts|web/io
### lib/splitInvite.ts [pure] mob data:OPEN_SPLIT_INVITE_EMAIL
isOpenSplitInvite|lib/splitInvite.ts|pure
### lib/splitShares.ts [pure] mob
computeSplitShares|lib/splitShares.ts|pure
### lib/subscriptionBypass.ts [pure]
canBypassProPaywall|lib/subscriptionBypass.ts|pure
### lib/supabase.ts [web/io] deps:@supabase/ssr+@supabase/supabase-js data:isConfigured,isSupabaseConfigured,supabase
getSupabase|lib/supabase.ts|web/io
### lib/supabaseClient.ts [web/io]
### lib/supabaseServer.ts [server] deps:@supabase/ssr+@supabase/supabase-js+next/headers data:supabaseAdmin
createSupabaseServerClient|lib/supabaseServer.ts|server
getSupabaseAdmin|lib/supabaseServer.ts|server
### lib/syncProfileAssets.ts [web/io] deps:@/store/financialStore
ensureEditableProfile|lib/syncProfileAssets.ts|web/io
syncProfileAssets|lib/syncProfileAssets.ts|web/io
### lib/taxCalculatorHelpers.ts [pure]
gratuityTaxableExempt|lib/taxCalculatorHelpers.ts|pure
leaveEncashmentTaxableExemptIllustrative|lib/taxCalculatorHelpers.ts|pure
ltaSplit|lib/taxCalculatorHelpers.ts|pure
rentalTaxableIncomeIllustrative|lib/taxCalculatorHelpers.ts|pure
businessIncomeIllustrative|lib/taxCalculatorHelpers.ts|pure
pensionAnnualFromMonthly|lib/taxCalculatorHelpers.ts|pure
commutedPensionExemptIllustrative|lib/taxCalculatorHelpers.ts|pure
familyPensionExemptAnnual|lib/taxCalculatorHelpers.ts|pure
rsuVestingIncomeAnnual|lib/taxCalculatorHelpers.ts|pure
rsuSaleGain|lib/taxCalculatorHelpers.ts|pure
### lib/taxMissedDeductionAlerts.ts [pure]
buildMissedDeductionAlerts|lib/taxMissedDeductionAlerts.ts|pure
### lib/taxRegimeComparisonFY2026.ts [pure]
salaryAnnualFromMonthly|lib/taxRegimeComparisonFY2026.ts|pure
hraSalaryBaseAnnual|lib/taxRegimeComparisonFY2026.ts|pure
sumOrdinaryGross|lib/taxRegimeComparisonFY2026.ts|pure
sumEquityStcg|lib/taxRegimeComparisonFY2026.ts|pure
sumEquityLtcg|lib/taxRegimeComparisonFY2026.ts|pure
computeIllustrativeEquityCgTax|lib/taxRegimeComparisonFY2026.ts|pure
computeIllustrativePropertyLtcgTax|lib/taxRegimeComparisonFY2026.ts|pure
computeIllustrativeLotteryTax|lib/taxRegimeComparisonFY2026.ts|pure
computeScheduleRateTax|lib/taxRegimeComparisonFY2026.ts|pure
calculateSlabTax|lib/taxRegimeComparisonFY2026.ts|pure
calculateTax|lib/taxRegimeComparisonFY2026.ts|pure
addSurchargeAndCess|lib/taxRegimeComparisonFY2026.ts|pure
calculateHRAExemption|lib/taxRegimeComparisonFY2026.ts|pure
calculate80GGIllustrative|lib/taxRegimeComparisonFY2026.ts|pure
computeOldRegime|lib/taxRegimeComparisonFY2026.ts|pure
computeNewRegime|lib/taxRegimeComparisonFY2026.ts|pure
compareRegimes|lib/taxRegimeComparisonFY2026.ts|pure
getDeduction80GGComputed|lib/taxRegimeComparisonFY2026.ts|pure
### lib/taxTeachContent.ts [pure] data:TEACH
### lib/tracker-categories.ts [pure] mob data:TRACKER_ICON_COLOR,TRACKER_CATEGORIES,TRACKER_TOTAL_EXCLUDED_SUBCATEGORIES
countsTowardTrackerTotals|lib/tracker-categories.ts|pure
pickerSubcategories|lib/tracker-categories.ts|pure
findSubcategory|lib/tracker-categories.ts|pure
### lib/trackerCashAudit.ts [pure]
reasonLabel|lib/trackerCashAudit.ts|pure
buildCashAudit|lib/trackerCashAudit.ts|pure
logCashAudit|lib/trackerCashAudit.ts|pure
### lib/trackerCreditCards.ts [web/io] mob(RN-patched) data:TRACKER_CONSENT_VERSION,TRACKER_CONSENT_STORAGE_KEY,DEFAULT_DUE_OFFSET_DAYS
creditCardBillPaymentDescription|lib/trackerCreditCards.ts|web/io
displayExpenseDescription|lib/trackerCreditCards.ts|web/io
parsePayBillLabel|lib/trackerCreditCards.ts|web/io
loadHiddenCreditCardDueIds|lib/trackerCreditCards.ts|web/io
hideCreditCardDueLine|lib/trackerCreditCards.ts|web/io
isCreditCardDueLineHidden|lib/trackerCreditCards.ts|web/io
normalizeLast4|lib/trackerCreditCards.ts|web/io
formatCreditCardLabel|lib/trackerCreditCards.ts|web/io
encodeCreditCardPaymentMethod|lib/trackerCreditCards.ts|web/io
isCreditCardPaymentMethod|lib/trackerCreditCards.ts|web/io
parseCreditCardPaymentMethod|lib/trackerCreditCards.ts|web/io
displayPaymentMethod|lib/trackerCreditCards.ts|web/io
isCashRailPaymentMethod|lib/trackerCreditCards.ts|web/io
isCreditCardCharge|lib/trackerCreditCards.ts|web/io
countsTowardCashSpend|lib/trackerCreditCards.ts|web/io
sumCashSpend|lib/trackerCreditCards.ts|web/io
sumOnCardsSpend|lib/trackerCreditCards.ts|web/io
suggestDueDayFromBilling|lib/trackerCreditCards.ts|web/io
getLastStatementWindow|lib/trackerCreditCards.ts|web/io
getNextDueDate|lib/trackerCreditCards.ts|web/io
getMostRecentDueDate|lib/trackerCreditCards.ts|web/io
summarizeCreditCardBills|lib/trackerCreditCards.ts|web/io
buildCreditCardPaySuggestions|lib/trackerCreditCards.ts|web/io
isCreditCardBillPayment|lib/trackerCreditCards.ts|web/io
billPaymentMatchesCard|lib/trackerCreditCards.ts|web/io
buildCreditCardBillStatuses|lib/trackerCreditCards.ts|web/io
loadSavedCreditCards|lib/trackerCreditCards.ts|web/io
saveCreditCards|lib/trackerCreditCards.ts|web/io
upsertSavedCreditCard|lib/trackerCreditCards.ts|web/io
deleteSavedCreditCard|lib/trackerCreditCards.ts|web/io
loadCreditCardsMerged|lib/trackerCreditCards.ts|web/io
persistCreditCardToDb|lib/trackerCreditCards.ts|web/io
deleteCreditCardFromDb|lib/trackerCreditCards.ts|web/io
creditCardObligationTitle|lib/trackerCreditCards.ts|web/io
syncCreditCardBillObligation|lib/trackerCreditCards.ts|web/io
deactivateCreditCardObligation|lib/trackerCreditCards.ts|web/io
deactivateAllCreditCardObligations|lib/trackerCreditCards.ts|web/io
isCreditCardBillDismissed|lib/trackerCreditCards.ts|web/io
dismissCreditCardBillReminder|lib/trackerCreditCards.ts|web/io
hasTrackerConsentLocal|lib/trackerCreditCards.ts|web/io
setTrackerConsentLocal|lib/trackerCreditCards.ts|web/io
### lib/trackerMonthIncome.ts [pure] data:SAVINGS_CARRY_FORWARD_DESC,EXPENSE_SUBCATEGORY_TO_OBLIGATION
monthHasStarted|lib/trackerMonthIncome.ts|pure
lastFridayOfMonth|lib/trackerMonthIncome.ts|pure
isNextTrackerMonthUnlocked|lib/trackerMonthIncome.ts|pure
trackerForwardLimit|lib/trackerMonthIncome.ts|pure
sumLoggedIncome|lib/trackerMonthIncome.ts|pure
sumSalaryIncome|lib/trackerMonthIncome.ts|pure
primarySalaryAmount|lib/trackerMonthIncome.ts|pure
isSavingsCarryForwardTxn|lib/trackerMonthIncome.ts|pure
sumSavingsCarryForward|lib/trackerMonthIncome.ts|pure
primarySavingsCarryForward|lib/trackerMonthIncome.ts|pure
listSavingsCarryForward|lib/trackerMonthIncome.ts|pure
sumCanonicalMonthIncome|lib/trackerMonthIncome.ts|pure
computeMonthLeftover|lib/trackerMonthIncome.ts|pure
salaryPocketTotal|lib/trackerMonthIncome.ts|pure
planMonthIncomeFromPrior|lib/trackerMonthIncome.ts|pure
planAutoIncomeCleanup|lib/trackerMonthIncome.ts|pure
### lib/trackerObligationSync.ts [pure] data:OBLIGATION_HINTS
obligationCategoryFromExpense|lib/trackerObligationSync.ts|pure
isCreditCardObligationExpense|lib/trackerObligationSync.ts|pure
obligationMatchScore|lib/trackerObligationSync.ts|pure
expenseCoversChecklistItem|lib/trackerObligationSync.ts|pure
findPendingChecklistForExpense|lib/trackerObligationSync.ts|pure
planObligationExpenseSync|lib/trackerObligationSync.ts|pure
### lib/trackerProfileIncome.ts [web/io] deps:@supabase/supabase-js
getProfileMonthlySalaryCached|lib/trackerProfileIncome.ts|web/io
invalidateProfileMonthlySalaryCache|lib/trackerProfileIncome.ts|web/io
### lib/trackerSafetyPulse.ts [pure] mob
previousCalendarMonth|lib/trackerSafetyPulse.ts|pure
computeMonthSafetyPulse|lib/trackerSafetyPulse.ts|pure
### lib/universal-buckets.ts [pure] mob⚠stale data:BUCKET_CAPS,BASE_UNIVERSAL_CAPS
getInsurancePremiumsMonthly|lib/universal-buckets.ts|pure
hasHomeLoan|lib/universal-buckets.ts|pure
getUniversalCaps|lib/universal-buckets.ts|pure
getUniversalBucketStatus|lib/universal-buckets.ts|pure
getUniversalBucketActuals|lib/universal-buckets.ts|pure
getUniversalBucketRows|lib/universal-buckets.ts|pure
getEpfContributionMonthly|lib/universal-buckets.ts|pure
getInHandOutflow|lib/universal-buckets.ts|pure
getUnallocatedIncome|lib/universal-buckets.ts|pure
getInsuranceGuideline|lib/universal-buckets.ts|pure
getInsuranceCriticalFloor|lib/universal-buckets.ts|pure
### lib/userAnalyseSnapshot.ts [web/io]
upsertUserAnalyseSnapshot|lib/userAnalyseSnapshot.ts|web/io
fetchUserAnalyseSnapshot|lib/userAnalyseSnapshot.ts|web/io
### lib/userPolicies.ts [web/io] data:POLICY_TYPES,POLICY_TYPE_LABELS,INSURER_SUGGESTIONS,FINKOIN_AGENT_CODE
getSupabaseAuthUserId|lib/userPolicies.ts|web/io
fromUserPolicyRow|lib/userPolicies.ts|web/io
insurerRenewalWebsite|lib/userPolicies.ts|web/io
insurerFormDownloadUrl|lib/userPolicies.ts|web/io
formatPolicyCover|lib/userPolicies.ts|web/io
formatTermCoverForResult|lib/userPolicies.ts|web/io
formatHealthCoverForResult|lib/userPolicies.ts|web/io
emptyPolicyForm|lib/userPolicies.ts|web/io
policyToForm|lib/userPolicies.ts|web/io
fetchUserPolicies|lib/userPolicies.ts|web/io
fetchUpcomingRenewals|lib/userPolicies.ts|web/io
startOfLocalDay|lib/userPolicies.ts|web/io
parseLocalDate|lib/userPolicies.ts|web/io
daysUntilRenewal|lib/userPolicies.ts|web/io
formatRenewalDayMonth|lib/userPolicies.ts|web/io
insertUserPolicy|lib/userPolicies.ts|web/io
updateUserPolicy|lib/userPolicies.ts|web/io
### lib/webPush.ts [server] deps:@supabase/supabase-js+web-push
isWebPushConfigured|lib/webPush.ts|server
sendWebPush|lib/webPush.ts|server
sendWebPushToUser|lib/webPush.ts|server
### lib/webPushClient.ts [web/io]
isWebPushSupported|lib/webPushClient.ts|web/io
getWebPushPublicKey|lib/webPushClient.ts|web/io
getCurrentPushSubscription|lib/webPushClient.ts|web/io
enableWebPush|lib/webPushClient.ts|web/io
disableWebPush|lib/webPushClient.ts|web/io
mobile-only libs: mobile/lib/supabase.ts (RN client), storage.ts (appStorage SecureStore+AsyncStorage), googleAuth.ts, cryptoPolyfill.ts (PKCE SHA-256), calcEngines.ts (simplified calcs: sipMaturityAmount,swpDurationMonths,monthlyEmi,compareTaxRegimesSimple,fireNumber,yearsToFire,emergencyFundTarget,annualCompoundMature,monthlyCompoundMature,lumpSumCompound,rentVsBuySummary)

## Design Tokens
Colors (web DESIGN_SYSTEM == mobile/constants/theme.ts Colors):
primary #534AB7 · primaryDark #3C3489 · primaryLight #EEEDFE · primaryMedium #AFA9EC · softBorder #D4D2F5 · accent #7F77DD
success #1D9E75 · successDark #047857 · successLight #E1F5EE · successText #1D5C3A
warning #BA7517 · warningLight #FFF3E0 · error #E24B4A · errorLight #FCEBEB · errorText #791F1F
background #F7F7F4 · backgroundDeep #EEF2FF · card #FFFFFF · border #E8E6F0 · borderLight #F0EFF8 · borderIndigo #C7D2FE
textPrimary #111110 · textSecondary #5F5E5A · textMuted #9B9A94 · white #FFFFFF · slate300 #CBD5E1 · slate800 #1E293B · indigo600 #4F46E5 · violet600 #7C3AED · blue600 #2563EB
CSS vars (globals.css): --color-primary #534ab7 · --color-success #1d9e75 · --color-warning #ba7517 · --color-danger #e24b4a · --color-surface #fff · --color-surface-alt #f4f3f8 · --color-muted #6b6680 · --color-border #e2dff0 · --color-text #1a1824 · --ring-primary rgba(83,74,183,.35)
Brand shadow rgba(83,74,183,0.25); login card shadow 0 8px 48px rgba(83,74,183,0.12); focus ring 0 0 0 3px rgba(83,74,183,0.1)
Score badge: Critical <40 bg #FDEDED text #991B1B · Warning <70 #FFF4E5/#92400E · Good #DCFCE7/#166534. Hero label #D5D0FA.
Safety Pulse: safe bg #F3F1FC border #D4D2F5 badge #E8E6F8/#3C3489 · tight #F7F4FF/#C9C2F0 badge #EEE9FF/#534AB7 · over #FBF5F5/#F0D4D4 badge #FDEDED/#991B1B · unknown #F7F7F4/#E8E6F0 badge #EEEDFE/#534AB7
Tracker buckets (color|cap%): needs #534AB7|30 · wants #6B63C9|5 · habits #7A72D4|0 · loans #5B54B0|40 · investment #4F48A8|20 · income #534AB7|0. Cash-used bar: ≤70% #6BCB77, ≤90% #FFD93D, >90% #FF6B6B
Analyse bucket caps: needs 30 · wants 5 · security(insurance premiums) 5 · loans 40 · investment 20; status good ≤cap, warning ≤1.15×cap, critical >1.15×cap
Split: owe #E24B4A · owed #1D9E75. Insight: good emerald-50/200/900 · warn amber · bad red.
Spacing (mobile Spacing): xs4 sm8 md12 lg16 xl20 xxl24 xxxl32; web base 4px, gutters 16px; bottom-nav clearance web pb-20/pb-24/pb-[90px], mobile paddingBottom 120
Radius: sm8 md12 lg14 xl16 xxl20 round999; inputs 10–12, auth card 24, sheets 20 20 0 0
FontSize (mobile): xs10 sm11 md13 base15 lg17 xl20 xxl24 xxxl32. Web: labels 14/500 #5F5E5A, section titles 11/700 uppercase #534AB7, helper 12 #9B9A94, H1 22–32/800. Font: Inter (var(--font-inter)).
Inputs: height 48 (mobile MoneyInput 52), border 1.5 #E8E6F0 → focus #534AB7; globals.css forces 16px !important on inputs ≤768px (15px ≥768px). Mobile Input 16px.
Touch ≥44×44. Primary button 52h radius 14. Sheets maxHeight 90vh, zIndex 1000, padding 24. Shadows (mobile): card #000 0,2 .06 r8 e2 · strong #534AB7 0,4 .2 r12 e6.
Taglines: FINKOIN_TAGLINE 'Know it. Fix it. Grow it.' · SUB 'Your complete money life.' Manifest theme/bg #534AB7, lang en-IN.

## Known Issues
BRANCH: main deleted mobile/ (950748f); mobile-app is 17 commits behind main in app/components/lib/store
STALE: mobile/lib analyse-form-schema, financialEngine, priorityEngine, universal-buckets, formatters differ from main → mobile scores ≠ PWA
API: every authed /api route is cookie-only (lib/apiGuard.ts getAuthedUser); mobile can't call ai/analyse, financial-data, feedback FK, razorpay create-order, split/*, push-subscribe
MOBILE DATA: Report/form/tracker use user_analysis; PWA canonical is user_analyse_snapshots → web users see empty mobile Report
MOBILE TRACKER: insert sends `title` column (not in expense_transactions schema) → likely insert failure
MOBILE TRACKER: query .lte('date','YYYY-MM-31') invalid for 30-day months/Feb; payment_method hardcoded 'cash'; bucket map has non-existent 'savings'; no consent gate
MOBILE: 12 built components unwired (AddExpenseSheet, MonthSafetyPulse, TrackerConsent, BucketCard, ResultCard, StepIndicator, HealthScoreRing, Chip, SegmentControl, LoadingSpinner, PrivacyEye, DailyTip); financialStore unused
MOBILE NAV: landing QuickTools 'Split' → /(tabs) (home); calc tiles don't select tool; ProfileMenu opens website for Split/Policies/Goals/Investments/Leaderboard/Rewards/Refer/Settings
MOBILE SPLIT: direct Supabase writes bypass server checks (share validation, rate limits, settle self-check, leave-with-balance 409, push notify); invites via invite_code only (no token links); siteBase default non-www
MOBILE AUTH: no password reset / recovery route; login lacks ≥6-char rule and `next` redirect
MOBILE: fixplan & profile are placeholders; no realtime channels; no split/join deep link; no https App Links; .env.example lacks EXPO_PUBLIC_SITE_URL + Google client id
MOBILE: react-native-razorpay / expo-notifications need EAS dev build (not Expo Go); push needs server sender for notification_preferences.push_token
DOC DRIFT: FINKOIN_SYSTEM §37 lists GET /api/split/groups, GET groups/[id], GET members — not implemented
DOC DRIFT: learn article FK rewards removed (article-tracker.tsx no-op) but §15 still claims them
WEB: no ITR auto-fill (/tax); no FD or retirement calculator
WEB: unused components onboarding-wizard(+steps), LoginSheet, GoalCard, ChipSelector, SectionToggle, ScrollSection, compound-interest-calculator, spending-trend-chart, PurpleCashAudit
WEB: production console.log in /analyse/result handleUnlockClick and /login referral logic
WEB: /plans Razorpay TODO x2; /goals,/pricing,/careers,/press placeholders; /portfolio demo data; KYC mock; insurance compare incomplete
WEB: priorityEngine allocationPlan always empty
WEB: rate limiter is in-memory per instance (not global)
WEB: Testimonials component calls GET /api/feedback; separate GET /api/testimonials exists (duplication)
DB: split_*, user_notifications, fk_transactions, feedback, user_financial_data, leaderboard_view not in supabase/migrations (live/manual only)
DB: referrals migration column names (referrer_user_id) stale vs live (referrer_id)
HOOKS: .husky/pre-commit runs full lint+coverage+e2e+build (heavy); husky inactive when node_modules absent

## Mobile Build Status
Tabs: Home · Report · [Track] · Split · Profile (+hidden Calculators). Root Stack; (auth) modal group. Only deep link handled: finkoin://auth/callback.
name|file|status
Login|app/(auth)/login.tsx|P no forgot pw, no ≥6 rule, no next
Sign up|app/(auth)/signup.tsx|C
Forgot password|app/(auth)/forgot-password.tsx|X P0
Auth callback|app/auth/callback.tsx|C (no recovery branch)
Update password|app/auth/update-password.tsx|X P0
Home|app/(tabs)/index.tsx|C
Report|app/(tabs)/analyse.tsx|P wrong table, score+issues only
Analyse consent|app/analyse/consent.tsx|X P0
Analyse form|app/analyse/form.tsx|P 35/~100 fields, no zod, writes user_analysis
Analyse result|app/analyse/result.tsx|X P0
Fix plan|app/analyse/fixplan.tsx|PH needs Bearer API
Tracker|app/(tabs)/tracker.tsx|B likely failing insert/query
Tracker month|app/tracker/[month].tsx|X P1
Split list|app/(tabs)/split.tsx|C no realtime
Group detail|app/split/[groupId]/index.tsx|C no realtime/email invite
Add expense|app/split/[groupId]/add-expense.tsx|C text date field
Split join|app/split/join.tsx|X P0
Calculators hub|app/(tabs)/calculators.tsx|P 20 tools inline, simplified engines
Calculator detail|app/calculators/[id].tsx|X P1
Tax calculator|app/calculators/tax-regime.tsx|P simplified inline only
Profile|app/(tabs)/profile.tsx|PH
Settings|app/settings.tsx|X P1
Notifications|components/NotificationBell.tsx (+ app/notifications.tsx X)|C modal; page X (new on web)
Morning tip|components/MorningTipSheet.tsx|X P1
Legal|app/legal/[doc].tsx|X P1 (Play Store)
Learn hub / article|app/learn/index.tsx, [id].tsx|X P2
Leaderboard / Rewards / Refer|app/leaderboard.tsx, rewards.tsx, refer.tsx|X P2
Investments / Optimizer|app/investments.tsx, optimizer.tsx|X P2
Policies|app/policies/index.tsx, [id].tsx|X P2
Blog / Goals / Portfolio / Insurance / KYC / Plans|app/blog/*, goals, portfolio, insurance, kyc, plans|X P3
Totals: screens 7 C / 9 P-PH-B / 26 X of 42 · components 9 C / 24 P-U / 55 X of 88 · stores 1/7 C · integrations 5/25 C (see docs/MOBILE_PROGRESS.md)
Installed (mobile/package.json): expo ~54.0.35, expo-router ~6.0.24, react 19.1.0, react-native 0.81.5, @supabase/supabase-js ^2.112.0, zustand ^5.0.14, zod ^3.25.76, expo-auth-session, expo-web-browser, expo-linking, expo-secure-store, @react-native-async-storage/async-storage, expo-crypto, expo-constants, expo-font, expo-status-bar, @expo/vector-icons, react-native-svg 15.12.1, reanimated ~4.1.1, worklets 0.5.1, gesture-handler ~2.28.0, safe-area-context ~5.6.0, screens ~4.16.0, @react-native-community/slider 5.0.1, url-polyfill, get-random-values. Not installed: notifications, clipboard, sharing, print, image-picker, datetimepicker, netinfo, razorpay, jest-expo, eas.json.
Next files (Sprint 1): mobile/lib/userAnalyseSnapshot.ts → (tabs)/analyse.tsx → analyse/form.tsx snapshot write → copy localDate/trackerMonthIncome/trackerObligationSync/obligationLearn → store/obligationStore.ts → ui/BottomSheet.tsx → tracker/TrackerIcons.tsx → rebuild (tabs)/tracker.tsx → fix QuickTools/ProfileMenu → (auth)/forgot-password.tsx. Parallel web: Bearer in lib/apiGuard.ts.
