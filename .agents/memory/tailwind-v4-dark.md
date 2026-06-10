---
name: Tailwind v4 dark mode
description: How to properly apply permanent dark mode in Tailwind CSS v4
---

## Rule
In Tailwind v4, `dark` is a **variant**, not a utility class. Using `@apply ... dark` will throw "Cannot apply unknown utility class `dark`".

**Fix:** Add the `dark` class to the HTML element at runtime instead:
```tsx
// main.tsx
document.documentElement.classList.add("dark");
```

**Why:** Tailwind v4 changed how variants work — they can't be used as standalone utilities in `@apply` directives.

**How to apply:** Any project using Tailwind v4 that wants to force dark mode permanently should add the class to `<html>` in main.tsx, not via `@apply`.
