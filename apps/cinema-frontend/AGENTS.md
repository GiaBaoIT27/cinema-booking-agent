# Frontend checks

After every frontend change, run these commands from `apps/cinema-frontend`, in order:

```sh
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Keep JSX, TypeScript, and object literals readable. Do not cram code onto fewer lines to save space or add formatter ignores to preserve packed code.

Do not hand-edit generated files, including `package-lock.json`, `next-env.d.ts`, `.next/`, `test-results/`, or `*.tsbuildinfo`. Use the generating tool instead.
