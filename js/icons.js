// Inline neon outline icons — 24px grid, stroked, colored via currentColor.
const paths = {
  gamepad: '<path d="M6 12h4M8 10v4"/><circle cx="15.5" cy="11" r="0.6" fill="currentColor"/><circle cx="17.5" cy="13" r="0.6" fill="currentColor"/><path d="M7 6h10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.3 2.1L14.5 15h-5l-1.2 1.6A3.5 3.5 0 0 1 2 14.5V11a5 5 0 0 1 5-5Z"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 1 3.5 10.9c-.8.6-1.2 1.3-1.3 2.1h-4.4c-.1-.8-.5-1.5-1.3-2.1A6 6 0 0 1 12 3Z"/>',
  chart: '<path d="M4 20h16"/><path d="M6 16l4-5 3 3 5-7"/><path d="M15 7h3v3"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20c1.3-3.3 4.1-5 7.5-5s6.2 1.7 7.5 5"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
  rocket: '<path d="M12 15c-1-3 0-7.5 3.5-10.5 2-1.7 4.5-2 4.5-2s-.3 2.5-2 4.5C15 10.5 10.5 12 7.5 11"/><path d="M9 15c-2 .5-3.5 3-3.5 3s2.5-.5 3-2.5M14.5 9.5a1.5 1.5 0 1 0 .01 0"/><path d="M7.5 11 5 13.5 7 14M12 15l2.5-2.5L15 17l-2.5 2z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  github: '<path d="M12 2.5a9.5 9.5 0 0 0-3 18.5c.5.1.7-.2.7-.5v-1.7c-2.7.6-3.3-1.2-3.3-1.2-.4-1.1-1-1.4-1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.1-.2-4.4-1.1-4.4-4.7 0-1 .4-1.9 1-2.6-.1-.2-.4-1.2.1-2.5 0 0 .8-.3 2.6 1a9 9 0 0 1 4.8 0c1.8-1.3 2.6-1 2.6-1 .5 1.3.2 2.3.1 2.5.6.7 1 1.6 1 2.6 0 3.6-2.3 4.5-4.4 4.7.3.3.6.9.6 1.8v2.6c0 .3.2.6.7.5A9.5 9.5 0 0 0 12 2.5Z"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
  play: '<path d="M7 4.5v15l13-7.5Z"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
};

export function icon(name, cls = '') {
  const d = paths[name] || paths.folder;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}
