---
name: sveltekit
description: "Build full-stack web applications with SvelteKit — file-based routing, SSR, SSG, API routes, and form actions in one framework."
category: frontend
risk: safe
source: community
date_added: "2026-03-18"
author: suhaibjanjua
tags: [svelte, sveltekit, fullstack, ssr, ssg, typescript]
tools: [claude, cursor, gemini]
---

# SvelteKit Full-Stack Development

## Overview

SvelteKit is the official full-stack framework built on top of Svelte. It provides file-based routing, server-side rendering (SSR), static site generation (SSG), API routes, and progressive form actions — all with Svelte's compile-time reactivity model that ships zero runtime overhead to the browser. Use this skill when building fast, modern web apps where both DX and performance matter.

## When to Use This Skill

- Use when building a new full-stack web application with Svelte
- Use when you need SSR or SSG with fine-grained control per route
- Use when migrating a SPA to a framework with server capabilities
- Use when working on a project that needs file-based routing and collocated API endpoints
- Use when the user asks about `+page.svelte`, `+layout.svelte`, `load` functions, or form actions

## How It Works

### Step 1: Project Setup

```bash
npm create svelte@latest my-app
cd my-app
npm install
npm run dev
```

Directory structure:

```
src/
  routes/
    +page.svelte        <- Root page component
    +layout.svelte      <- Root layout (wraps all pages)
    +error.svelte       <- Error boundary
  lib/
    server/             <- Server-only code (never bundled to client)
    components/         <- Shared components
  app.html              <- HTML shell
static/                 <- Static assets
```

### Step 2: File-Based Routing

Every `+page.svelte` file in `src/routes/` maps directly to a URL:

```
src/routes/+page.svelte          -> /
src/routes/about/+page.svelte    -> /about
src/routes/blog/[slug]/+page.svelte  -> /blog/:slug
src/routes/shop/[...path]/+page.svelte -> /shop/* (catch-all)
```

### Step 3: Loading Data with `load` Functions

```typescript
// src/routes/blog/[slug]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const post = await fetch(`/api/posts/${params.slug}`).then(r => r.json());

  if (!post) {
    error(404, 'Post not found');
  }

  return { post };
};
```

### Step 4: API Routes (Server Endpoints)

```typescript
// src/routes/api/posts/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const limit = Number(url.searchParams.get('limit') ?? 10);
  const posts = await db.post.findMany({ take: limit });
  return json(posts);
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const post = await db.post.create({ data: body });
  return json(post, { status: 201 });
};
```

### Step 5: Form Actions

```typescript
// src/routes/contact/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const email = data.get('email');

    if (!email) {
      return fail(400, { email, missing: true });
    }

    await sendEmail(String(email));
    redirect(303, '/thank-you');
  }
};
```

### Step 6: Layouts and Nested Routes

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from './$types';
  export let data: LayoutData;
</script>

<nav>
  <a href="/">Home</a>
  <a href="/blog">Blog</a>
  {#if data.user}
    <a href="/dashboard">Dashboard</a>
  {/if}
</nav>

<slot />
```

### Step 7: Rendering Modes

```typescript
// src/routes/docs/+page.ts
export const prerender = true;   // Static
export const ssr = true;         // Server-side rendering
export const csr = false;        // Disable client-side hydration
```

## Best Practices

- Use `+page.server.ts` for database/auth logic — it never ships to the client
- Use `$lib/server/` for shared server-only modules
- Use form actions for mutations instead of client-side `fetch`
- Type all `load` return values with generated `$types`
- Use `event.locals` in hooks to pass server-side context to load functions
- Don't import server-only code in `+page.svelte` or `+layout.svelte` directly
- Don't store sensitive state in stores — use `locals` on the server
- Don't skip `use:enhance` on forms

## Security & Safety Notes

- All code in `+page.server.ts`, `+server.ts`, and `$lib/server/` runs exclusively on the server
- Always validate and sanitize form data before database writes
- Use `error(403)` or `redirect(303)` from `@sveltejs/kit`
- Set `httpOnly: true` and `secure: true` on all auth cookies
- CSRF protection is built-in for form actions

## Common Pitfalls

- **Problem:** Store value is `undefined` on first SSR render
  **Solution:** Populate the store from the `load` function return value

- **Problem:** Form action does not redirect after submit
  **Solution:** Use `redirect(303, '/path')` from `@sveltejs/kit`

- **Problem:** `locals.user` is undefined inside a `+page.server.ts` load function
  **Solution:** Set `event.locals.user` in `src/hooks.server.ts` before the `resolve()` call