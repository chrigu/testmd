import { render } from 'svelte/server';

const pages = import.meta.glob('/src/routes/kb/**/+page.svx', { eager: true });

export function renderPages() {
  return Object.entries(pages).map(([path, page]: [string, any]) => {
    const { body, head } = render(page.default);
    return {
      route: path.replace('/src/routes/', '').replace('/+page.svx', ''),
      body,
      head,
    };
  });
}
