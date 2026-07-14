// Shared DOM helpers + UI components.
import { icon } from './icons.js';
import { statusLabel } from './data.js';

export function el(spec, attrs = {}, ...children) {
  const [tag, ...classes] = spec.split('.');
  const node = document.createElement(tag || 'div');
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null) continue;
    if (k === 'class') node.className = node.className ? `${node.className} ${v}` : v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

export const navigate = (hash) => { location.hash = hash; };

export function statusDot(p) {
  return el('span.status', {},
    el('span', { class: `dot dot-${p.status}` }),
    statusLabel(p));
}

export function artOrPlaceholder(p, cls = 'card-art') {
  if (p.art) return el('img', { class: cls, src: p.art, alt: p.title, loading: 'lazy' });
  const initials = p.title.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
  return el('div.card-art-placeholder', {}, el('span', {}, initials));
}

export function projectCard(p) {
  const openExternal = (url) => (e) => { e.stopPropagation(); window.open(url, '_blank', 'noopener'); };

  const actions = [];
  if (p.links.demo) {
    actions.push(el('button.mini-btn.demo', { onclick: openExternal(p.links.demo), title: 'Open live demo' },
      el('span', { html: icon('play') }), 'Demo'));
  }
  if (p.links.github && !p.links.githubPrivate) {
    actions.push(el('button.mini-btn', { onclick: openExternal(p.links.github), title: 'View source on GitHub' },
      el('span', { html: icon('github') }), 'GitHub'));
  }

  return el('article.project-card', {
    onclick: () => navigate(`#/project/${p.slug}`),
    role: 'link', tabindex: '0',
    onkeydown: (e) => { if (e.key === 'Enter') navigate(`#/project/${p.slug}`); },
  },
    el('div.card-art-wrap', {},
      artOrPlaceholder(p),
      el('div.card-status-corner', {}, statusDot(p))),
    el('div.card-body', {},
      el('h3.card-title', {},
        p.title,
        p.links.githubPrivate ? el('span', { html: icon('lock'), title: 'Private repository' }) : null),
      el('p.card-tagline', {}, p.tagline),
      el('div.card-badges', {},
        p.tags.slice(0, 4).map((t) => el('span.badge.badge-tech', {}, t))),
      actions.length ? el('div.card-actions', {}, actions) : null));
}

export function categoryCard({ title, text, hash, icn, color }) {
  return el('article.category-card', { class: `glow-${color}`, onclick: () => navigate(hash), role: 'link', tabindex: '0',
    onkeydown: (e) => { if (e.key === 'Enter') navigate(hash); } },
    el('div.cat-icon', { class: `ic-${color}`, html: icon(icn) }),
    el('h3', {}, title),
    el('p', {}, text),
    el('span.cat-explore', {}, 'Explore', el('span', { html: icon('arrow') })));
}

export function nowStrip(data) {
  const slot = (label, icn, project, sub) => {
    if (!project) return null;
    return el('div.now-item', { onclick: () => navigate(`#/project/${project.slug}`) },
      el('div.now-icon.ic-blue', { html: icon(icn) }),
      el('div', {},
        el('div.now-label', {}, label),
        el('div.now-name', {}, project.title),
        el('div.now-sub', {}, sub),
        statusDot(project)));
  };
  const find = (ref) => ref ? data.projects.find((p) => p.slug === ref.slug) : null;
  const catLabel = { game: 'Game', app: 'App', idea: 'Idea' };

  const current = find(data.now.current);
  const latestGame = find(data.now.latestGame);
  const newApp = find(data.now.newApp);
  const nextIdea = find(data.now.nextIdea);

  return el('section.now-strip', {},
    el('h2.now-title', {}, 'NOW'),
    el('div.now-items', {},
      slot('Current project', 'rocket', current, catLabel[current?.category] ?? ''),
      slot('Latest game', 'gamepad', latestGame, 'Game'),
      slot('New app', 'phone', newApp, 'App'),
      slot('Next idea', 'bulb', nextIdea, 'Concept'),
      el('div.now-item', { onclick: () => navigate('#/projects') },
        el('div.now-icon.ic-teal', { html: icon('target') }),
        el('div', {},
          el('div.now-label', {}, 'Project status'),
          el('div.now-name', {}, String(data.now.projectCount)),
          el('div.now-sub', {}, 'Projects'),
          el('span.status', {}, el('span.dot.dot-live'), 'Live & in progress')))));
}
