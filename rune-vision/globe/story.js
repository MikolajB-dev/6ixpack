/*
  The story: one step per runestone, in the order the visitor plays them.
  Edit the texts freely. `slot` must match a place id in settings.js.

    riddle    shown first: hints where the rune should go
    question  shown once the right rune is on the right place
    answers   4 answers: knob dot up = A, right = B, down = C, left = D
    correct   the letter of the right answer
    clue      shown when the visitor locks in a wrong answer
    fact      shown after the right answer
*/
export const STORY = [
  {
    slot: 'jelling',
    riddle: 'Begin at home. Find the royal seat in Jutland, where Harald raised a great stone for his father and mother.',
    question: 'Who was Harald Bluetooth\'s brother?',
    answers: ['Olaf Tryggvason', 'Knut (Knud Danaást)', 'Erik the Red', 'Leif Erikson'],
    correct: 'B',
    clue: 'He shares his name with a later king who ruled England, Denmark and Norway: Cnut the Great.',
    fact: 'Knut died young, so Harald became king after their father, Gorm the Old.',
  },
  {
    slot: 'yorba',
    riddle: 'Sail west, past the edge of the known world, to a Californian town where an American president was born.',
    question: 'The Bluetooth logo is made from…',
    answers: ['A lightning bolt and a B', 'Two crossed Viking axes', 'A ship and its sail', 'Harald\'s initials in runes, ᚼ and ᛒ'],
    correct: 'D',
    clue: 'Think of the king\'s initials, H and B, written in Viking runes.',
    fact: 'The runes ᚼ (H) and ᛒ (B) are joined together into one symbol.',
  },
  {
    slot: 'tokyo',
    riddle: 'Go east to where the sun rises first. In the capital of the island empire, a copy of Harald\'s stone stands at the Danish embassy.',
    question: 'What does Harald proclaim on the great Jelling stone?',
    answers: ['He discovered a land across the ocean', 'He founded the city of Copenhagen', 'He won all of Denmark and Norway and made the Danes Christian', 'He invented the runic alphabet'],
    correct: 'C',
    clue: 'The stone is often called "Denmark\'s baptism certificate".',
    fact: 'The great Jelling stone was raised around 965 and is on the UNESCO World Heritage list.',
  },
];
