# erlandsson.online

Personal portfolio for Robert Erlandsson — auto-generated from the projects in this
development folder and the `vindrosen` GitHub account.

**Stack:** zero-dependency static site (vanilla JS, hash router) + a zero-dependency
Node discovery script. No build step, no frameworks. Deployable to any static host.

## How it works

```
tools/discover.mjs        scans ..\ + GitHub (gh CLI) ──┐
content/config.json       excludes, aliases, NOW overrides │
content/overrides.json    curated copy per project         ├──▶  data/projects.json
content/ideas.json        concept/idea entries            ─┘        │
                                                                    ▼
index.html + js/ + css/   static site renders everything from projects.json
```

- **Local scan**: every folder in `..\` (except `excludeFolders`) is profiled —
  manifests, tech stack, git remote, last commit.
- **GitHub**: `gh repo list vindrosen` (requires an authenticated GitHub CLI).
  Coursework repos are filtered by `excludeRepos` (supports `*` suffix globs).
- **Merge**: local folders and repos are matched by remote URL, then the `aliases`
  map, then normalized name. Private repos get a lock badge and no public link.
- **Curated copy wins**: fields in `overrides.json` are never overwritten once
  `"curated": true`. Machine-detected facts (`detected` block) refresh every run.

## Updating the site (the whole workflow)

```powershell
cd Erlandsson.online
node tools/discover.mjs      # rescans local + GitHub, rewrites data/projects.json
```

- **New project appeared?** It's added automatically as a stub (`"curated": false`)
  in `content/overrides.json` and shows up on the site immediately. Polish its
  title/tagline/description/features/status in `overrides.json`, set
  `"curated": true`, and re-run the script.
- **Generate its artwork** (via the bildgen MCP in Claude Code): 1536x1024, opaque,
  save as `art/<slug>.webp`, then re-encode into the site:

  ```powershell
  # from Utveckling\ — bildgen saves to assets\generated\
  & "Robebox2\node_modules\ffmpeg-static\ffmpeg.exe" -y -i "assets\generated\art\<slug>.webp" -c:v libwebp -q:v 82 "Erlandsson.online\assets\art\<slug>.webp"
  ```

  Shared style phrase for consistent art:
  > cinematic sci-fi concept art, dark deep-space palette on near-black background,
  > neon blue and teal accent lighting with subtle violet glow, volumetric light,
  > high detail, wide establishing shot, no text, no words, no letters, no logos, no UI

- **Hide a project**: set `"hidden": true` in its overrides entry.
- **Pin the NOW strip**: set slugs in `config.json → now`
  (`current`, `latestGame`, `newApp`, `nextIdea`).
- Commit + push — GitHub Pages redeploys automatically.

## Local preview

```powershell
python -m http.server 8080 --directory Erlandsson.online
# then open http://localhost:8080
```

(Must be served over HTTP — `fetch` of projects.json does not work from `file://`.)

## Custom domain (later)

1. Add a `CNAME` file containing `erlandsson.online` to the repo root.
2. DNS: `A` records for the apex → GitHub Pages IPs (185.199.108–111.153),
   `CNAME` record for `www` → `vindrosen.github.io`.
3. Enable **Enforce HTTPS** in the repo's Pages settings.

## Brand

Colors `#090B10 / #121722 / #3BA8FF / #2EF2D4 / #7A6BFF / #AAB4C5 / #F6F8FA`,
fonts Orbitron / Inter / JetBrains Mono — defined as CSS custom properties in
`css/tokens.css`. Reference mockup in `assets/docs/Design.png`.
