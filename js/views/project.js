import { el, artOrPlaceholder, statusDot, navigate } from '../components.js';
import { icon } from '../icons.js';
import { getData, bySlug } from '../data.js';

export async function renderProject(container, slug) {
  const data = await getData();
  const p = bySlug(data, slug);
  if (!p) {
    container.append(el('div.empty-state', {}, `Project "${slug}" not found.`));
    return;
  }

  const actions = el('div.detail-actions', {});
  if (p.links.demo) {
    actions.append(el('a.btn.btn-solid', { href: p.links.demo, target: '_blank', rel: 'noopener' },
      el('span', { html: icon('play') }), 'Live Demo'));
  }
  if (p.links.github && !p.links.githubPrivate) {
    actions.append(el('a.btn', { href: p.links.github, target: '_blank', rel: 'noopener' },
      el('span', { html: icon('github') }), 'GitHub'));
  }
  if (p.links.githubPrivate) {
    actions.append(el('span.chip-lock', { title: 'The source for this project is in a private repository' },
      el('span', { html: icon('lock') }), 'Private repository'));
  }
  if (!p.links.github && p.category !== 'idea') {
    actions.append(el('span.chip-lock', { title: 'This project lives outside GitHub' },
      el('span', { html: icon('folder') }), 'Local project'));
  }

  const facts = [];
  if (p.detected.lastActivity) facts.push(el('span', {}, el('b', {}, 'last activity '), p.detected.lastActivity));
  if (p.detected.primaryLanguage) facts.push(el('span', {}, el('b', {}, 'language '), p.detected.primaryLanguage));
  if (p.difficulty) facts.push(el('span', {}, el('b', {}, 'complexity '), p.difficulty));
  if (p.platform) facts.push(el('span', {}, el('b', {}, 'platform '), p.platform));
  if (p.estimatedCompletion) facts.push(el('span', {}, el('b', {}, 'progress '), p.estimatedCompletion));

  container.append(
    el('div.detail-hero', {}, artOrPlaceholder(p, 'detail-art')),
    el('div.container.detail-head', {},
      el('h1.detail-title', {}, p.title),
      el('div.detail-meta-row', {},
        statusDot(p),
        el('span.badge', {}, p.category.toUpperCase())),
      el('div.detail-desc', {}, p.description.map((para) => el('p', {}, para))),
      p.features.length ? el('h2.detail-section', {}, 'Features') : null,
      p.features.length ? el('ul.feature-list', {}, p.features.map((f) => el('li', {}, f))) : null,
      el('h2.detail-section', {}, 'Technology'),
      el('div.detail-badges', {}, p.tags.map((t) => el('span.badge.badge-tech', {}, t))),
      actions,
      facts.length ? el('div.detail-facts', {}, facts) : null,
      el('a.back-link', { href: backHash(p), onclick: (e) => { e.preventDefault(); navigate(backHash(p)); } },
        el('span', { html: icon('back') }), backLabel(p))));
}

function backHash(p) {
  return { game: '#/games', app: '#/apps', idea: '#/ideas' }[p.category] ?? '#/projects';
}
function backLabel(p) {
  return { game: 'All games', app: 'All apps', idea: 'All ideas' }[p.category] ?? 'All projects';
}
