import type { CrewMember } from '../types';

const CREW_CATCHPHRASES: Record<CrewMember, string> = {
  luffy: 'YOSH!',
  zoro: 'Nothing happened.',
  nami: 'Money!',
  sanji: 'All Blue~',
  robin: 'How dark...',
  franky: 'SUPER!',
  chopper: "I'm not happy at all!",
  usopp: 'I am Captain Usopp!',
  brook: 'Yohohoho!',
};

const TOOL_MESSAGES: Record<string, string[]> = {
  Read: [
    '{name} reads {detail}',
    '{name}: Let me check this...',
    '{name} is studying {detail}',
  ],
  Write: [
    '{name} writes {detail}',
    '{name}: Creating something new!',
    'Gomu Gomu no... CODE WRITE!',
  ],
  Edit: [
    '{name} edits {detail}',
    '{name}: Fixing it up!',
    '{name} at the workshop!',
  ],
  Bash: [
    '{name}: Full speed ahead!',
    '{name} runs {detail}',
    '{name}: Execute!',
  ],
  Grep: [
    '{name}: Can you see it from up there?!',
    '{name} searches for {detail}',
    '{name} is on the lookout!',
  ],
  Glob: [
    '{name} scans the horizon...',
    '{name}: Finding the treasure!',
    '{name} explores {detail}',
  ],
  Agent: [
    '{name}: Sending out the sub-crew!',
    '{name}: Nakama, assemble!',
    '{name} dispatches {detail}',
  ],
  done: [
    '{name}: {catchphrase}',
    '{name}: We did it, crew!',
    '{name}: Mission accomplished!',
    '{name}: YOSH! Done!',
  ],
  thinking: [
    '{name}: Hmm...',
    "{name}: Captain's orders received!",
    '{name}: New mission!',
    '{name}: Let me think...',
  ],
  idle: [
    '{name}: Sanji! MEAT!',
    '{name}: Time for a break~',
    "{name}: Where's the food?",
    '{name}: *munch munch*',
  ],
};

export function getCrewMessage(
  crewMember: CrewMember,
  tool: string,
  detail: string
): string {
  const messages = TOOL_MESSAGES[tool] ?? TOOL_MESSAGES['thinking']!;
  const template = messages[Math.floor(Math.random() * messages.length)]!;
  const name = capitalize(crewMember);
  const catchphrase = CREW_CATCHPHRASES[crewMember];

  return template
    .replace('{name}', name)
    .replace('{detail}', detail || '...')
    .replace('{catchphrase}', catchphrase);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
