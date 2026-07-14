import { el, projectCard } from '../components.js';
import { getData, byCategory, allProjects } from '../data.js';

const META = {
  games: { category: 'game', title: 'Games', sub: 'Browser games and interactive experiences — most of them zero-dependency and playable on any device.' },
  apps: { category: 'app', title: 'Apps', sub: 'Web applications, self-hosted services and productivity tools.' },
  ideas: { category: 'idea', title: 'Ideas', sub: 'Future projects and concepts on the drawing board.' },
  projects: { category: null, title: 'All Projects', sub: 'Everything — games, apps and ideas, newest first.' },
};

export async function renderCategory(container, key) {
  const meta = META[key];
  const data = await getData();
  const list = meta.category ? byCategory(data, meta.category) : allProjects(data);

  container.append(
    el('div.container', {},
      el('h1.section-title', {}, meta.title),
      el('p.section-sub', {}, meta.sub),
      list.length
        ? el('div.card-grid', {}, list.map(projectCard))
        : el('div.empty-state', {}, 'Nothing here yet — check back soon.')));
}
