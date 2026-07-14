// Data layer — fetches data/projects.json once and answers queries.
let cache = null;

export async function getData() {
  if (!cache) {
    const res = await fetch('data/projects.json');
    if (!res.ok) throw new Error(`Failed to load projects.json (${res.status})`);
    cache = await res.json();
  }
  return cache;
}

export function byCategory(data, category) {
  const list = data.projects.filter((p) => p.category === category);
  return sortForGrid(list);
}

export function allProjects(data) {
  return sortForGrid(data.projects);
}

export function bySlug(data, slug) {
  return data.projects.find((p) => p.slug === slug) || null;
}

function sortForGrid(list) {
  return [...list].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return (b.detected.lastActivity ?? '').localeCompare(a.detected.lastActivity ?? '');
  });
}

export const STATUS_LABELS = {
  live: 'Released',
  'in-development': 'In Development',
  planning: 'Planning',
  paused: 'Paused',
  archived: 'Archived',
};

export function statusLabel(p) {
  return p.statusLabel || STATUS_LABELS[p.status] || p.status;
}
