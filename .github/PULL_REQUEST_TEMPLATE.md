<!-- .github/PULL_REQUEST_TEMPLATE.md -->
<!-- This appears automatically on every PR -->

## What does this PR do?
<!-- One line description -->


## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] UI change
- [ ] Performance improvement
- [ ] Database change

---

## Developer checklist

### Code quality
- [ ] `npm run build` passes locally
- [ ] No TypeScript errors
- [ ] No `console.log` left in code
- [ ] No hardcoded API keys or secrets
- [ ] No commented-out code blocks

### Testing
- [ ] Tested on UAT (uat.finkoin.com)
- [ ] Tested on mobile view
- [ ] Tested on desktop view
- [ ] Tested when logged out
- [ ] Tested when logged in

### Database (if DB changes)
- [ ] SQL migration run in Supabase
- [ ] RLS policies added/updated
- [ ] Tested with actual user data
- [ ] No breaking changes to existing data

### UI/UX
- [ ] Matches Finkoin purple theme (#534AB7)
- [ ] No emojis (Tabler icons used instead)
- [ ] Mobile responsive
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Empty states handled

### Security
- [ ] No sensitive data in client code
- [ ] API routes have proper auth checks
- [ ] Supabase RLS not bypassed
- [ ] User can only access their own data

### Performance
- [ ] No unnecessary API calls added
- [ ] Caching used where appropriate
- [ ] No large images without optimization

---

## Screenshots (if UI change)
<!-- Before and After screenshots here -->
Before:

After:

---

## Supabase changes (if any)
<!-- List any SQL run in Supabase -->
```sql
-- paste SQL here
```

---

## Linked issue
<!-- Closes #issue_number -->