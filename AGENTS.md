<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Frontend-only by user request: all app data lives in `src/lib/store.tsx` (React context persisted to localStorage); do not add a backend unless asked.
- Pure money logic (balance, payment validation, aggregations) lives in `src/lib/finance.ts` and is unit-tested in `src/test/finance.test.ts` — keep it free of React/browser APIs.
- Demo seed data is generated deterministically in `src/lib/seed.ts` (seeded PRNG) so server and client render the same output.
- `AppShell` renders page content only after the store hydrates from localStorage, to avoid timezone/storage hydration mismatches.
- Libraries used by pages are listed in vite.config.ts optimizeDeps.include so the dev server pre-bundles them once; when adding a new UI library, add it there (prevents duplicate-React crashes).
