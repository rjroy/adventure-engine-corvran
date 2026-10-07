---
title: Monorepo setup fragility exposed by clean rebuild
date: 2026-03-31
status: complete
tags: [build, typescript, monorepo, module-resolution, eslint, workspace]
modules: [shared, backend, web]
---

# Retro: Monorepo Setup Repair

## Summary

Wiping `node_modules` and `dist` (both transient, both gitignored) broke typecheck and build. The failures revealed multiple setup problems baked in from the initial monorepo scaffold. Repairs touched import conventions, package exports, build automation, and lint coverage.

## What Went Well

- The `.gitignore` was correct from the start. `dist/`, `node_modules/`, `.tsbuildinfo`, `.next/` were all excluded.
- The root `tsconfig.json` project references were correctly ordered (shared, backend, web).
- Tests were comprehensive (459 across both packages), which gave confidence that import changes didn't break runtime behavior.

## What Could Improve

- The initial scaffold mixed module resolution conventions. All three tsconfigs used `moduleResolution: "bundler"`, but imports used `.js` extensions (a `node16`/`nodenext` convention). This worked by accident because Bun resolves both, and `dist/` existing masked the webpack incompatibility.
- The shared package exported source (`./src/index.ts`) instead of compiled output. This forced Next.js to resolve and transpile raw TypeScript from a dependency, which is fragile and non-standard.
- No `postinstall` hook meant `bun install` left the workspace in a broken state when `dist/` was missing. The shared package's compiled output is a build dependency for both backend (typecheck) and web (webpack), but nothing ensured it existed after install.
- The shared package had no eslint config and was excluded from the root lint script. One-third of the codebase was unlinted.
- Stale `.tsbuildinfo` files survived the `dist/` wipe, causing `tsc --build` to skip rebuilding shared because it thought nothing changed.

## Lessons Learned

- When `moduleResolution` is `"bundler"`, never use `.js` extensions in TypeScript imports. They're a `node16`/`nodenext` convention that happens to work in some runtimes but breaks bundlers that resolve source directly.
- A workspace package's `exports` field should point to compiled output (`dist/`), not source. Pointing to source couples consumers to the package's internal build toolchain.
- `bun install` (or `npm install`) should leave the workspace in a buildable state. If compiled output from one package is needed by others, a `postinstall` script that runs the build is the safety net.
- Stale `.tsbuildinfo` files are invisible landmines after wiping `dist/`. `tsc --build --clean` before `tsc --build` is the only reliable recovery. The `postinstall` hook running `tsc --build` handles this because it rebuilds unconditionally when output is missing.
- Every package in a workspace needs lint coverage. Gaps in lint don't announce themselves; they just let problems accumulate silently.

## Artifacts

- No spec or plan existed for this work. It was reactive repair driven by build failure.
