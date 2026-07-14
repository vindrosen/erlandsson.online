import { el } from '../components.js';
import { icon } from '../icons.js';

export function renderContact(container) {
  container.append(
    el('div.static-page', {},
      el('h1', {}, 'Contact'),
      el('p.lead', {}, "Let's connect and build something great."),
      el('div.contact-cards', {},
        el('a.contact-card', { href: 'mailto:robert.erlandsson@gmail.com' },
          el('span', { html: icon('mail') }),
          el('h3', {}, 'Email'),
          el('p', {}, 'robert.erlandsson@gmail.com')),
        el('a.contact-card', { href: 'https://github.com/vindrosen', target: '_blank', rel: 'noopener' },
          el('span', { html: icon('github') }),
          el('h3', {}, 'GitHub'),
          el('p', {}, 'github.com/vindrosen')))));
}
