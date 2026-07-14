import { el } from '../components.js';
import { getData } from '../data.js';

export async function renderAbout(container) {
  const data = await getData();
  const live = data.counts.live;
  const total = data.counts.total;

  container.append(
    el('div.static-page', {},
      el('h1', {}, 'About Me'),
      el('p.lead', {}, 'I\'m Robert Erlandsson — a developer in Sweden who builds things because ideas are cheap and shipped projects are not.'),
      el('p', {}, `This site currently tracks ${total} projects, ${live} of them released. The pattern behind most of them: find a real problem in everyday life — a pantry that needs managing, kids learning to read, a music collection held hostage by streaming services — and build the tool that solves it.`),
      el('p', {}, 'I like both ends of the spectrum: heavyweight self-hosted systems in .NET and TypeScript with proper databases and test suites, and tiny zero-dependency games that fit in a single HTML file and run on any tablet. AI is a recurring ingredient, but always on a leash — it suggests, deterministic code decides.'),
      el('div.skill-groups', {},
        skillGroup('Backend', ['C# / ASP.NET Core', 'Node.js / Fastify', 'Python / Flask', 'SQLite / EF Core']),
        skillGroup('Frontend', ['Vanilla JS (no build)', 'React / TypeScript', 'Blazor', 'PWA / offline-first']),
        skillGroup('Games', ['HTML5 Canvas', 'WebAudio synthesis', 'Procedural generation', 'Touch-first design']),
        skillGroup('AI & APIs', ['OpenAI / Anthropic', 'Local LLMs (Ollama)', 'Whisper ASR', 'API integrations'])),
      el('p', {}, 'Everything here was built in my own time, for real use — by me, my family or anyone who finds it useful.')));
}

function skillGroup(title, items) {
  return el('div.skill-group', {},
    el('h3', {}, title),
    el('div.card-badges', {}, items.map((i) => el('span.badge.badge-tech', {}, i))));
}
