// erlandsson.online — boot + hash router
import { renderHome } from './views/home.js';
import { renderCategory } from './views/category.js';
import { renderProject } from './views/project.js';
import { renderAbout } from './views/about.js';
import { renderContact } from './views/contact.js';
import { el } from './components.js';

const app = document.getElementById('app');

const routes = [
  { re: /^#?\/?$|^#\/home$/, view: (c) => renderHome(c), nav: 'home' },
  { re: /^#\/games$/, view: (c) => renderCategory(c, 'games'), nav: 'games' },
  { re: /^#\/apps$/, view: (c) => renderCategory(c, 'apps'), nav: 'apps' },
  { re: /^#\/ideas$/, view: (c) => renderCategory(c, 'ideas'), nav: 'ideas' },
  { re: /^#\/projects$/, view: (c) => renderCategory(c, 'projects'), nav: null },
  { re: /^#\/project\/([^/]+)$/, view: (c, m) => renderProject(c, m[1]), nav: null },
  { re: /^#\/about$/, view: (c) => renderAbout(c), nav: 'about' },
  { re: /^#\/contact$/, view: (c) => renderContact(c), nav: 'contact' },
];

function currentRoute() {
  const h = location.hash || '#/';
  for (const r of routes) {
    const match = h.match(r.re);
    if (match) return { ...r, match };
  }
  return { ...routes[0], match: [] };
}

async function render() {
  const route = currentRoute();
  app.innerHTML = '';
  setActiveNav(route.nav);
  closeMenu();
  try {
    await route.view(app, route.match);
  } catch (err) {
    console.error(err);
    app.append(el('div.empty-state', {}, 'Something went wrong loading the portfolio data.'));
  }
  window.scrollTo({ top: 0 });
}

function setActiveNav(key) {
  document.querySelectorAll('#nav-links a').forEach((a) => {
    a.classList.toggle('active', a.dataset.nav === key);
  });
}

/* Mobile menu */
const navLinks = document.getElementById('nav-links');
const navToggle = document.getElementById('nav-toggle');
function closeMenu() {
  navLinks.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
}
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
});

/* Boot */
document.getElementById('footer-year').textContent = String(new Date().getFullYear());
window.addEventListener('hashchange', render);
render();
