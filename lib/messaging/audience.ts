/** Classes and courses a bulk message can be aimed at (for the filter pickers and labels). */

import { query } from '@/lib/db/client';

export interface AudienceOptions {
  sections: { id: string; name: string }[];
  courses: { id: string; title: string }[];
}

export async function audienceOptions(): Promise<AudienceOptions> {
  const [sections, courses] = await Promise.all([
    query(`SELECT id, name FROM sections ORDER BY name`),
    query(`SELECT id, title FROM courses ORDER BY title`),
  ]);
  return {
    sections: sections.rows.map((r) => ({ id: r.id, name: r.name })),
    courses: courses.rows.map((r) => ({ id: r.id, title: r.title })),
  };
}

export function nameMaps(o: AudienceOptions) {
  return {
    sectionNames: Object.fromEntries(o.sections.map((s) => [s.id, s.name])),
    courseNames: Object.fromEntries(o.courses.map((c) => [c.id, c.title])),
  };
}
