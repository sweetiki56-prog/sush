# Content generators

Python scripts that wrote the content of the late stages of «Сушь». The JSON in `src/content` is the source of
truth; these are kept so a stage can be regenerated after a change. See «Content generators» in `AGENTS.md`.

Run from the repo root, in this order, then format:

```sh
for g in skit upper bones dam lowland secrets; do python3 tools/content-gen/$g.py; done
npx prettier --write src/content/locations.json src/content/travel.json
```

| Script | Stage | Writes |
|---|---|---|
| `skit.py` | S — Chapter VI «Скит», «Роса-2», Ирга | `dialogues/skit.json`; quests, items, creatures, weapons, companion, places |
| `upper.py` | U — Chapter VII «Шептун и Депо», Лёля, Ведро | `dialogues/upper.json`; … |
| `bones.py` | B — Chapter VIII «Костяной круг», the ruins | `dialogues/bones.json`; … |
| `dam.py` | F — Chapter IX «Заслон» and the ending slides | `dialogues/dam.json`, `endings.json`; … |
| `lowland.py` | N — the rest of Низовье, Тимофей, «Долг сборщика» | `dialogues/lowland.json`; … |
| `secrets.py` | P — S15a: гонец, бункер, «Литерный», Палата, «Сухие руки» | `dialogues/secrets.json`; quests, items, places, trial, slides |

`jsonfmt.py` formats the one-entry-per-line files (`creatures`, `weapons`, `traders`, `companions`).
