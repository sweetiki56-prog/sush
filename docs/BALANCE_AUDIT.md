# Balance audit after the progression rebalance

Status: **partial evidence, not a whole-campaign sign-off**. The current seeded combat simulations and unit suite pass. They test selected encounters at explicit levels, often with a fresh character and predetermined equipment; they do not yet simulate a complete route with actual ammunition, water, healing, drops, trade and companion survival.

Selected baseline from `npm test` (2026-10-02; values are seeded win fractions, not player telemetry):

| Encounter | Solo | Prepared / supported | Interpretation |
|---|---:|---:|---|
| Chapter I nest, shooter / talker | 0.969 / 0.283 | Talker with Жнецобой 0.878 | Prepared route matters; the shooter may be too safe for an early optional fight. |
| Chapter II raid, shooter | 0.175 | Militia 0.53; everyone 0.8775 | Help changes the fight as intended. |
| Chapter III gate, shooter / talker | 0.99 / 0.505 | Non-combat gate routes exist | Check whether the assault is too reliable at reachable gear. |
| Chapter IV salt snake, shooter | 0.19 | With noise 0.41 | Telegraphing and preparation matter. |
| Chapter IX crest, shooter | 0.055 | Siege allies 0.925 | Army battle is not a fair solo duel. |

These numbers do **not** justify a blanket enemy HP or damage adjustment. A low solo win rate may be correct when the dialogue, stealth or ally route is viable and clearly signposted. The next balance pass must use real campaign checkpoints for three archetypes at each chapter, classify required/optional fights, run reproducible seeds, and measure resources before and after each location. In particular: Chapter I shooter safety, Chapter III gate assault, Chapter IV snake preparation, Chapter VIII ally dependency, and whether Chapter IX non-fighters can reliably reach the console by their non-combat route.

Acceptance for the next pass: no repeatable low-risk XP loop; chapter-entry levels and gear come from reachable rewards; water and ammunition remain affordable without daily grinding; optional bosses are signposted; every mandatory objective has viable non-combat or supported paths. Only then can the whole-game balance be called reliable.
