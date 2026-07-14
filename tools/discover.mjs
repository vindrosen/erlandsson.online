#!/usr/bin/env node
// discover.mjs — scans the local dev folder + GitHub (gh CLI), merges with curated
// content and writes data/projects.json. Zero dependencies, Node >= 18.
//
// Usage (from Erlandsson.online/):  node tools/discover.mjs
//
// New projects are appended to content/overrides.json as stubs (curated: false)
// so they appear on the site immediately and can be polished later.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = join(SITE_ROOT, 'content', 'config.json');
const OVERRIDES_PATH = join(SITE_ROOT, 'content', 'overrides.json');
const IDEAS_PATH = join(SITE_ROOT, 'content', 'ideas.json');
const OUTPUT_PATH = join(SITE_ROOT, 'data', 'projects.json');

const config = readJson(CONFIG_PATH);
const overrides = existsSync(OVERRIDES_PATH) ? readJson(OVERRIDES_PATH) : {};
const ideas = existsSync(IDEAS_PATH) ? readJson(IDEAS_PATH) : [];
const scanRoot = resolve(SITE_ROOT, config.scanRoot);

function readJson(p) { return JSON.parse(readFileSync(p, 'utf8')); }

function run(cmd, args, cwd) {
  try {
    return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function slugify(name) {
  return name.toLowerCase()
    .replace(/[äå]/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function globMatch(name, patterns) {
  return patterns.some((p) => {
    if (p.endsWith('*')) return name.toLowerCase().startsWith(p.slice(0, -1).toLowerCase());
    return name.toLowerCase() === p.toLowerCase();
  });
}

/* ---------------- Local scan ---------------- */

function listFiles(dir, depth) {
  // Shallow recursive listing (skips heavy folders) for manifest detection.
  const out = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name.startsWith('.') || ['node_modules', 'bin', 'obj', 'dist', '__pycache__', 'uploads', 'wwwroot'].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (depth > 0) out.push(...listFiles(p, depth - 1));
    } else {
      out.push(p);
    }
  }
  return out;
}

const DEP_TAGS = {
  react: 'React', vite: 'Vite', typescript: 'TypeScript', express: 'Express',
  fastify: 'Fastify', tailwindcss: 'Tailwind CSS', 'drizzle-orm': 'Drizzle',
  'socket.io': 'Socket.IO', sqlite3: 'SQLite', 'better-sqlite3': 'SQLite',
  openai: 'OpenAI API', '@anthropic-ai/sdk': 'Anthropic API', flask: 'Flask',
};

function detectTech(dir) {
  const files = listFiles(dir, 2);
  const rel = (p) => p.slice(dir.length + 1).replace(/\\/g, '/');
  const manifests = [];
  const tech = new Set();

  for (const f of files) {
    const r = rel(f);
    const base = r.split('/').pop().toLowerCase();
    if (base === 'package.json') {
      manifests.push(r);
      try {
        const pkg = JSON.parse(readFileSync(f, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        tech.add('JavaScript');
        for (const [dep, tag] of Object.entries(DEP_TAGS)) if (deps[dep]) tech.add(tag);
        if (deps.typescript) { tech.delete('JavaScript'); tech.add('TypeScript'); }
      } catch { /* unparsable package.json — skip */ }
    } else if (base.endsWith('.csproj')) {
      manifests.push(r);
      tech.add('C#');
      try {
        const xml = readFileSync(f, 'utf8');
        const tfm = xml.match(/<TargetFramework>net(\d+)\.\d+<\/TargetFramework>/);
        if (tfm) tech.add(`.NET ${tfm[1]}`);
        if (/Microsoft\.AspNetCore|Sdk="Microsoft\.NET\.Sdk\.Web"/.test(xml)) tech.add('ASP.NET Core');
        if (/Microsoft\.AspNetCore\.Components|Blazor/i.test(xml)) tech.add('Blazor');
        if (/Microsoft\.EntityFrameworkCore/.test(xml)) tech.add('EF Core');
        if (/Sqlite/i.test(xml)) tech.add('SQLite');
      } catch { /* unreadable csproj — skip */ }
    } else if (base === 'requirements.txt' || base === 'pyproject.toml') {
      manifests.push(r);
      tech.add('Python');
      try {
        const txt = readFileSync(f, 'utf8').toLowerCase();
        if (txt.includes('flask')) tech.add('Flask');
      } catch { /* ignore */ }
    } else if (base === 'sw.js' || base === 'manifest.webmanifest' || base === 'manifest.json') {
      if (r.split('/').length === 1 && base !== 'manifest.json') tech.add('PWA');
      if (base === 'sw.js' && r.split('/').length === 1) tech.add('PWA');
    } else if (base.endsWith('.razor')) {
      tech.add('Blazor');
    }
  }

  // Single-file / vanilla sites: root html without any package manifest
  const rootHtml = files.filter((f) => rel(f).indexOf('/') === -1 && f.toLowerCase().endsWith('.html'));
  if (rootHtml.length && !manifests.some((m) => m.endsWith('package.json') || m.endsWith('.csproj'))) {
    if (!tech.has('Python')) tech.add('JavaScript');
    manifests.push(...rootHtml.map(rel));
  }

  return { tech: [...tech], manifests: manifests.slice(0, 8) };
}

function readmeExcerpt(dir) {
  for (const name of ['README.md', 'readme.md', 'Readme.md']) {
    const p = join(dir, name);
    if (!existsSync(p)) continue;
    try {
      const lines = readFileSync(p, 'utf8').split(/\r?\n/);
      const para = [];
      for (const line of lines) {
        const t = line.trim();
        if (!t || t.startsWith('#') || t.startsWith('![') || t.startsWith('<') || t.startsWith('[!')) {
          if (para.length) break;
          continue;
        }
        para.push(t);
      }
      const text = para.join(' ');
      if (text) return text.length > 220 ? text.slice(0, 217) + '…' : text;
    } catch { /* unreadable README */ }
  }
  return null;
}

function newestMtime(dir) {
  let newest = 0;
  for (const f of listFiles(dir, 1)) {
    try {
      const m = statSync(f).mtimeMs;
      if (m > newest) newest = m;
    } catch { /* ignore */ }
  }
  return newest ? new Date(newest).toISOString().slice(0, 10) : null;
}

function scanLocal() {
  const results = [];
  for (const entry of readdirSync(scanRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;
    if (globMatch(entry.name, config.excludeFolders)) continue;
    const dir = join(scanRoot, entry.name);

    const remoteUrl = run('git', ['-C', dir, 'config', '--get', 'remote.origin.url']);
    const lastCommit = run('git', ['-C', dir, 'log', '-1', '--format=%cI']);
    let repoName = null;
    if (remoteUrl) {
      const m = remoteUrl.match(/[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
      if (m) repoName = m[2];
    }
    const { tech, manifests } = detectTech(dir);

    results.push({
      folder: entry.name,
      dir,
      repoName,
      lastLocalCommit: lastCommit ? lastCommit.slice(0, 10) : null,
      mtime: lastCommit ? null : newestMtime(dir),
      tech,
      manifests,
      excerpt: readmeExcerpt(dir),
    });
  }
  return results;
}

/* ---------------- GitHub ---------------- */

function fetchGitHub() {
  const raw = run('gh', [
    'repo', 'list', config.githubUser, '--limit', '200', '--json',
    'name,isPrivate,description,homepageUrl,pushedAt,primaryLanguage,repositoryTopics,url',
  ]);
  if (raw === null) {
    console.error('ERROR: `gh repo list` failed — is the GitHub CLI installed and authenticated?');
    process.exit(1);
  }
  return JSON.parse(raw).filter((r) => !globMatch(r.name, config.excludeRepos));
}

async function probeDemo(repo) {
  // Public repos without homepageUrl: check for a GitHub Pages deployment.
  const url = `https://${config.githubUser}.github.io/${repo}/`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(timer);
    return res.ok ? url : null;
  } catch {
    return null;
  }
}

/* ---------------- Merge ---------------- */

function normName(s) { return slugify(s || ''); }

function findArt(slug) {
  for (const ext of ['webp', 'png']) {
    if (existsSync(join(SITE_ROOT, 'assets', 'art', `${slug}.${ext}`))) return `assets/art/${slug}.${ext}`;
  }
  return null;
}

async function build() {
  const locals = scanLocal();
  const repos = fetchGitHub();
  const repoByName = new Map(repos.map((r) => [r.name.toLowerCase(), r]));
  const claimed = new Set();
  const merged = [];

  for (const loc of locals) {
    let repo = null;
    if (loc.repoName && repoByName.has(loc.repoName.toLowerCase())) {
      repo = repoByName.get(loc.repoName.toLowerCase());
    } else if (config.aliases[loc.folder] && repoByName.has(config.aliases[loc.folder].toLowerCase())) {
      repo = repoByName.get(config.aliases[loc.folder].toLowerCase());
    } else {
      for (const r of repos) {
        if (normName(r.name) === normName(loc.folder)) { repo = r; break; }
      }
    }
    if (repo) claimed.add(repo.name.toLowerCase());
    merged.push({ local: loc, repo });
  }
  for (const repo of repos) {
    if (!claimed.has(repo.name.toLowerCase())) merged.push({ local: null, repo });
  }

  // Assemble project entries
  const projects = [];
  const newStubs = [];
  for (const { local, repo } of merged) {
    const slug = slugify(repo ? repo.name : local.folder);
    const detected = {
      hasLocal: !!local,
      localFolder: local ? local.folder : null,
      hasGitHub: !!repo,
      repoName: repo ? repo.name : null,
      visibility: repo ? (repo.isPrivate ? 'PRIVATE' : 'PUBLIC') : null,
      primaryLanguage: repo?.primaryLanguage?.name ?? null,
      techStack: local ? local.tech : [],
      manifests: local ? local.manifests : [],
      lastLocalCommit: local ? local.lastLocalCommit : null,
      lastPushed: repo ? repo.pushedAt.slice(0, 10) : null,
      lastActivity: [local?.lastLocalCommit, repo?.pushedAt?.slice(0, 10), local?.mtime]
        .filter(Boolean).sort().pop() ?? null,
    };
    if (detected.primaryLanguage && !detected.techStack.length) detected.techStack = [detected.primaryLanguage];

    let ov = overrides[slug];
    if (!ov) {
      const nameGuess = (repo ? repo.name : local.folder).replace(/[-_]+/g, ' ').trim();
      const hint = `${nameGuess} ${repo?.description ?? ''} ${local?.excerpt ?? ''}`.toLowerCase();
      ov = {
        title: nameGuess.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        category: /\b(game|spel|spelet|catch|command|run|bowl)\b/.test(hint) ? 'game' : 'app',
        status: 'in-development',
        tagline: repo?.description ?? local?.excerpt ?? '',
        description: [],
        features: [],
        tags: [],
        curated: false,
      };
      overrides[slug] = ov;
      newStubs.push(slug);
    }
    if (ov.hidden) continue;

    let demo = ov.demo ?? repo?.homepageUrl ?? null;
    if (!demo && repo && !repo.isPrivate) demo = await probeDemo(repo.name);

    projects.push({
      slug,
      title: ov.title,
      category: ov.category,
      status: ov.status,
      statusLabel: ov.statusLabel ?? null,
      tagline: ov.tagline,
      description: ov.description ?? [],
      features: ov.features ?? [],
      tags: [...new Set([...(ov.tags ?? []), ...detected.techStack])],
      platform: ov.platform ?? 'web',
      difficulty: ov.difficulty ?? null,
      estimatedCompletion: ov.estimatedCompletion ?? null,
      featured: ov.featured ?? false,
      art: findArt(slug),
      links: {
        github: repo ? repo.url : null,
        githubPrivate: repo ? repo.isPrivate : false,
        demo,
      },
      detected,
      curated: ov.curated !== false,
    });
  }

  // Ideas (curated-only entries)
  for (const idea of ideas) {
    const slug = idea.slug.startsWith('idea-') ? idea.slug : `idea-${slugify(idea.slug)}`;
    projects.push({
      slug,
      title: idea.title,
      category: 'idea',
      status: idea.status ?? 'planning',
      statusLabel: idea.statusLabel ?? null,
      tagline: idea.tagline ?? '',
      description: idea.description ?? [],
      features: idea.features ?? [],
      tags: idea.tags ?? [],
      platform: idea.platform ?? 'web',
      difficulty: null,
      estimatedCompletion: idea.estimatedCompletion ?? null,
      featured: idea.featured ?? false,
      art: findArt(slug),
      links: { github: null, githubPrivate: false, demo: null },
      detected: {
        hasLocal: false, localFolder: null, hasGitHub: false, repoName: null,
        visibility: null, primaryLanguage: null, techStack: [], manifests: [],
        lastLocalCommit: null, lastPushed: null, lastActivity: null,
      },
      curated: true,
    });
  }

  projects.sort((a, b) => a.slug.localeCompare(b.slug));

  /* ---- NOW strip ---- */
  const visible = projects;
  const byActivity = (list) => [...list].sort((a, b) =>
    (b.detected.lastActivity ?? '').localeCompare(a.detected.lastActivity ?? ''));
  const pick = (key, fallback) => {
    const overridden = config.now?.[key];
    if (overridden && visible.some((p) => p.slug === overridden)) return { slug: overridden, overridden: true };
    const f = fallback();
    return f ? { slug: f.slug, overridden: false } : null;
  };
  const now = {
    current: pick('current', () =>
      byActivity(visible.filter((p) => p.category !== 'idea' && p.status === 'in-development'))[0]
      ?? byActivity(visible.filter((p) => p.category !== 'idea' && p.status === 'live'))[0]),
    latestGame: pick('latestGame', () =>
      byActivity(visible.filter((p) => p.category === 'game' && p.status === 'live'))[0]
      ?? byActivity(visible.filter((p) => p.category === 'game'))[0]),
    newApp: pick('newApp', () =>
      byActivity(visible.filter((p) => p.category === 'app' && p.status === 'live'))[0]
      ?? byActivity(visible.filter((p) => p.category === 'app'))[0]),
    nextIdea: pick('nextIdea', () => {
      const list = visible.filter((p) => p.category === 'idea');
      return list.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))[0] ?? null;
    }),
    projectCount: visible.length,
  };

  const counts = {
    total: visible.length,
    games: visible.filter((p) => p.category === 'game').length,
    apps: visible.filter((p) => p.category === 'app').length,
    ideas: visible.filter((p) => p.category === 'idea').length,
    live: visible.filter((p) => p.status === 'live').length,
  };

  /* ---- Write output + stubs ---- */
  const output = { schemaVersion: 1, generatedAt: new Date().toISOString(), counts, now, projects };
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n');
  console.log(`Wrote ${OUTPUT_PATH}: ${projects.length} projects (${counts.games} games, ${counts.apps} apps, ${counts.ideas} ideas)`);

  if (newStubs.length) {
    writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2) + '\n');
    console.log(`\nWARNING: ${newStubs.length} new project(s) added as stubs in content/overrides.json — please curate:`);
    for (const s of newStubs) console.log(`  - ${s}`);
  }
  const uncurated = projects.filter((p) => !p.curated).map((p) => p.slug);
  if (uncurated.length) {
    console.log(`\nUncurated projects (curated: false): ${uncurated.join(', ')}`);
  }
}

await build();
