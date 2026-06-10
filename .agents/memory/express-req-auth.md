---
name: Express req.auth typing
description: How to augment Express Request with custom properties (like req.auth) in this monorepo
---

## Rule
Create `artifacts/<name>/src/types/express.d.ts` with the global namespace approach, and add `"express"` to `types` in `tsconfig.json`.

```ts
// src/types/express.d.ts
import "express";
declare global {
  namespace Express {
    interface Request {
      auth?: { userId: number; role: string };
    }
  }
}
```

```json
// tsconfig.json
{ "compilerOptions": { "types": ["node", "express"] } }
```

**Why:** `declare module "express-serve-static-core"` fails because that submodule path isn't directly resolvable when `types` is restricted to `["node"]`. The `global namespace Express` approach works because `@types/express` registers it globally.

**How to apply:** Any api-server artifact that needs custom properties on `req` should follow this pattern.
