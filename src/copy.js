// FROZEN COPY (verbatim, do not alter). Mirrors CLAUDE.md section 5. Surfaced
// diegetically in the world; never rewritten. No em-dashes anywhere.

export const wordmark = 'Katabasis'

export const hero =
  'Katabasis treats every trading strategy as noise until cost and luck are ruled out as the explanation.'

export const chapters = [
  {
    id: 'threshold',
    numeral: 'I',
    title: 'The Threshold',
    paragraphs: [
      'Most trading strategies that look profitable are not. A backtest curves upward when a strategy has been picked, out of many, for the slice of history it happens to fit. It holds up because a backtest pays none of the costs of real trading. Neither flaw is visible in the result. Both appear once real capital is at risk.',
      'Every candidate arrives looking the same: a clean equity curve and a plausible story. Telling them apart is the entire problem.',
    ],
  },
  {
    id: 'descent',
    numeral: 'II',
    title: 'The Descent',
    paragraphs: [
      'A strategy that looks profitable has to survive the two ways the result itself can mislead.',
      'The first is luck. A result can look strong because it was the best of many attempts, not because it found anything real. Katabasis weighs every result against how much searching produced it, and discounts it accordingly. An edge that stands out only because the search was wide does not survive the adjustment.',
      'The second is cost. A backtest can look strong because nothing was paid to trade it: not the spread on every entry, not the price the order moves against itself, not the fills that never come. Katabasis subtracts all of it first. Only what is left counts as performance.',
    ],
  },
  {
    id: 'nadir',
    numeral: 'III',
    title: 'The Nadir',
    paragraphs: [
      'The hardest test is set before the results exist.',
      'Before a strategy is evaluated, the conditions that would kill it are fixed in advance: what it has to achieve, and what result ends it. Once the results are in, those conditions cannot move. A strategy that fails them is not quietly adjusted until it passes. It is killed.',
      'This closes off the most common form of self-deception, the kind that does not feel like deception at all: seeing a weak result and concluding, in good faith, that the strategy you meant to test was slightly different. After the fact, the strategy cannot be redefined.',
      'Nothing here is ever proven. A strategy that survives has not been shown to be right. It has only not yet been shown to be wrong, and it is kept on that basis and no other. Later evidence can still end it.',
    ],
  },
  {
    id: 'return',
    numeral: 'IV',
    title: 'The Return',
    paragraphs: [
      'What survives evaluation crosses into live trading. Almost nothing does.',
      'The crossing runs one way. A strategy reaches the live system only after meeting every condition set against it, and getting there is not an argument that can be won, only a standard that has been met. A strategy that later fails that standard is removed.',
      'Live trading is not the reward at the end of the test. It is the test continuing, now with real money at stake, where costs are no longer modeled but paid, and where a strategy can still be wrong in ways no backtest could reach. The standard that governed evaluation governs it here too. It does not loosen because a strategy made it this far.',
    ],
  },
]

export const creator = {
  name: 'Max McCollom',
  paragraphs: [
    "I'm studying financial economics at Columbia University. I started building Katabasis in June 2026.",
    'The problem I work on is the one most systematic research avoids: telling a real edge apart from a result that only looks like one. Katabasis is built around that question, end to end. It runs live now, at small size, and most of what it does stays private.',
  ],
}
