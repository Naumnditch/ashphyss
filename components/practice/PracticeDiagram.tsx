'use client';

/**
 * Routes a problems.question_image_url internal key ("diagram:<name>") to the
 * component that draws it. Keeps PracticeSession from having to know about
 * every diagram set — add a new set here and the practice engine picks it up.
 */

import { MomentumDiagram } from '@/components/practice/MomentumDiagrams';
import { CoulombDiagram } from '@/components/practice/CoulombDiagrams';

export function PracticeDiagram({ diagramKey }: { diagramKey: string }) {
  const key = diagramKey.replace(/^diagram:/, '');
  if (key.startsWith('momentum-')) return <MomentumDiagram diagramKey={key} />;
  if (key.startsWith('coulomb-')) return <CoulombDiagram diagramKey={key} />;
  return null;
}
