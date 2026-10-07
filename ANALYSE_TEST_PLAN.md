# Analyse feature — test plan (Tasks 1–3)

One place to track open questions for Cursor and the test cases to run before Task 4/7 starts. Check items off as you go.

## Open questions for Cursor (answer before checking off below)

- [ ] Did the Task 1 Tracker Security-bucket fix cover web, mobile, or both?
- [ ] What was in the stray `FINKOIN_SYSTEM.md` diff (Task 2)? Committed, discarded, or still pending?
- [ ] Is it intended that in a tight-budget scenario, the nearest-deadline goal ends up the *most* underfunded (Task 3)?
- [ ] Did the "grow wealth" example actually exercise the 1.5× primary-goal weighting, or did it skip it?
- [ ] Is the "Not now" → recoverable-via-hide/restore fix (marriage/baby prompt) done yet?
- [ ] Is PDF/optimizer still showing only 1 goal fixed, or still pending?

## Task 1 — data bug fixes

- [ ] Regenerate PDF from the original flagged profile → all 5 buckets show, sum to 100%
- [ ] Tracker (web) shows Security bucket; old "Insurance premium" entries reclassified automatically
- [ ] Tracker (mobile) — same check
- [ ] Retirement SIP number: get formula from Cursor, verify ₹1cr/25yr ≈ ₹15k/month independently
- [ ] Mobile: AI cache in SecureStore (check on real device, not simulator)
- [ ] Mobile: SecureStore failure → falls back to memory, not plaintext AsyncStorage
- [ ] Mobile: old plaintext AsyncStorage copies actually deleted after migration
- [ ] Mobile: PDF temp file deleted after share sheet closes
- [ ] Web: signed-in user — report + AI plan restore correctly in a new tab
- [ ] Web: guest — confirm half-filled form is lost on tab close (expected trade-off, just confirm you're OK with it)

## Task 2 — goal detection

- [ ] Bachelor account → sees "Planning to get married?" prompt
- [ ] Married, no kids → sees "Planning a baby?" prompt (not the marriage one)
- [ ] Married, 2+ kids of different ages → separate education/marriage cards per kid, correct years
- [ ] Renting → home-purchase goal; no car → vehicle goal; has loans → debt-free goal; supports parents → eldercare goal; retirement always shows
- [ ] Edit sheet: child's goal — only amount editable, year locked
- [ ] Edit sheet: debt-free and eldercare — not editable at all
- [ ] Hide retirement/debt-free → confirm genuinely impossible
- [ ] Hide any other goal → "Show N hidden" link appears → restore works
- [ ] Answer "Not now" on marriage/baby prompt → goal appears in hidden list → restore re-asks the question (fix from earlier — confirm it landed)
- [ ] Old pre-1.1 saved report still loads with no crash

## Task 3 — multi-goal funding

- [ ] Comfortable-surplus scenario: every goal reaches 100%, leftover becomes general SIP
- [ ] Tight-budget scenario: every goal still gets at least the 5% floor
- [ ] Change "primary goal" in the form → split visibly shifts (confirms 1.5× weighting is wired in)
- [ ] Debt-free goal stays outside the split; "clear debt" choice routes ~80% of budget to prepayment
- [ ] Fix plan "Goal plan" card shows every goal with amount, share, funded-%, instrument, shortfall — on both web and mobile
- [ ] 12-month plan order: safety steps → goals → extra EMI (if loans) → general SIP

## After this

Once everything above is checked and the open questions are answered, that's the green light for Task 4 (per-goal AI advice) and Task 7 (life map / net-worth trajectory).
