import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const res = await fetch('/api/services');
  const services = res.ok ? await res.json() : [];
  return { services };
};
