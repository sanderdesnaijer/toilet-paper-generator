This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Set the site URL env var so metadata, sitemap, and robots point to the right domain:

```bash
cp .env.example .env.local
```

Generate social images from `public/logo.jpg`:

```bash
npm run generate:og
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by [commitlint](https://commitlint.js.org/). Every commit message must follow this format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Description                                          | Version Bump |
| ---------- | ---------------------------------------------------- | ------------ |
| `feat`     | A new feature                                        | Minor        |
| `fix`      | A bug fix                                            | Patch        |
| `docs`     | Documentation only changes                           | -            |
| `style`    | Code style changes (formatting, semicolons, etc.)    | -            |
| `refactor` | Code change that neither fixes a bug nor adds a feat | -            |
| `perf`     | A code change that improves performance              | Patch        |
| `test`     | Adding or updating tests                             | -            |
| `build`    | Changes to the build system or dependencies          | -            |
| `ci`       | Changes to CI configuration files and scripts        | -            |
| `chore`    | Other changes that don't modify src or test files    | -            |
| `revert`   | Reverts a previous commit                            | Patch        |

### Breaking Changes

To trigger a **major** version bump, either:

- Add `!` after the type/scope: `feat!: redesign entire UI`
- Include a `BREAKING CHANGE:` footer in the commit body

### Examples

```bash
feat: add toilet paper roll animation
fix: correct paper texture rendering
docs: update README with commit conventions
feat(ui)!: redesign the generator layout
```

## Static export (FTP / static hosting)

The build produces a static site you can upload to any FTP host or static file server:

```bash
npm run build
```

Upload the contents of the **`out`** folder to your server (e.g. via FTP). The site will work at your domain root; use the same directory structure (e.g. `index.html` at root, `roll/index.html` for the roll page).

**Note:** In this static build, the “Print” button does not send to a network printer (that requires a Node server). To enable printer support, run the app with a server: replace `src/app/actions.ts` with the implementation from `src/app/actions.server.ts`, remove `output: "export"` from `next.config.ts`, then `npm run build` and `npm run start`.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
