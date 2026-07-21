import { el, categoryCard, nowStrip } from '../components.js';
import { getData } from '../data.js';
import { heroBackdrop, heroStatus } from '../hero-scene.js';

export async function renderHome(container) {
  const data = await getData();

  const hero = el('section.hero', {},
    heroBackdrop(),
    el('div.hero-content', {},
      el('h1.hero-name', {}, 'Robert', el('br'), 'Erlandsson'),
      el('p.hero-tagline', {}, 'Building ideas that become reality'),
      el('p.hero-blurb', {}, 'I build web apps, games and digital tools. Exploring technology, creating solutions and building the future.'),
      heroStatus(),
      el('a.btn', { href: '#/projects' }, 'Explore Projects')));

  const cats = el('div.container.home-cards', {},
    el('div.category-grid', {},
      categoryCard({ title: 'Games', text: 'Browser games and interactive experiences.', hash: '#/games', icn: 'gamepad', color: 'blue' }),
      categoryCard({ title: 'Apps', text: 'Web applications and productivity tools.', hash: '#/apps', icn: 'phone', color: 'teal' }),
      categoryCard({ title: 'Ideas', text: 'Future projects and concepts in development.', hash: '#/ideas', icn: 'bulb', color: 'purple' }),
      categoryCard({ title: 'Projects', text: "A collection of things I'm working on.", hash: '#/projects', icn: 'chart', color: 'teal' }),
      categoryCard({ title: 'About Me', text: 'Background, skills and experience.', hash: '#/about', icn: 'person', color: 'blue' }),
      categoryCard({ title: 'Contact', text: "Let's connect and build something great.", hash: '#/contact', icn: 'mail', color: 'blue' })),
    nowStrip(data));

  container.append(hero, cats);
}
