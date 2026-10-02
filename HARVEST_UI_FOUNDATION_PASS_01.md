# Harvest Colossus — UI Foundation + Combat HUD Pass 01

## Ausgangslage

Der M10.4-Stand besaß einen funktionalen DOM-HUD über der Hybrid-3D-Welt, aber keine gemeinsame Harvest-UI-Foundation, keinen strukturierten Meta-Hub und keine reproduzierbare Verarbeitung der neuen UI-/Hero-Master-Sheets.

## Production-Source und Runtime-Pipeline

Die neun gelieferten Referenzen liegen unverändert unter `production-assets/source/ui/`: Combat HUD, Evo-1-Hero 4×8, drei Button-/Tab-Master, Meta-Master-Mockup, Widget-Master sowie Gold- und Crystal-Panel-Master.

`scripts/extract-harvest-ui.mjs` erzeugt daraus:

- 10 transparente UI-WebP-Dateien unter `public/assets/ui/harvest/`
- 32 transparente Evo-1-Runtime-Dateien unter `public/assets/creature/evo1/`

Die Extraktion entfernt schwarze Sheet-Flächen technisch über Alpha, isoliert Hero-Komponenten, entfernt Beschriftungen/Nachbarfragmente und normalisiert alle Hero-Frames auf 384×384 mit konsistenter Footline.

## UI Design System

`src/ui/HarvestUIAssetCatalog.ts` definiert stabile IDs, Source-Sheet-Zuordnung, Render-Modus und 9-Slice-Grenzen. Meta-Panels verwenden Navy/Graphite, dünne Goldkonturen und Crystal-Ornamente. Das Combat HUD bleibt absichtlich moderner und leichter: dunkle/transluzente Flächen, dünne Linien, funktionale Cyan-/Violett-/Orange-Akzente.

Skalierbare Panels und Buttons nutzen CSS `border-image-slice`; Ecken werden nicht als Ganzbild gestreckt. Back/Close bleiben eigenständige transparente Image-Controls.

## Combat HUD

Erweitert wurden:

- Bossname, dynamische HP, Break I/II/Core, Timer und Round/Boss-Level
- Player Plate, HP/Energy und kompakte Party Rows
- World-Minimap, ein-/ausklappbarer Zoom und Fullscreen
- Joystick, Dash, Power Hit, Auto, Target und Skill-Slot-Zustände
- dynamische Damage-/Crit-Floater
- bestehende World-Space-Telegraphs, Loot-Beams, Target-/Ground-Marker und Projectile-Impacts

Gameplay-Werte und Simulation wurden nicht in die UI verschoben.

## Hero Evo 1

Die neue Familie ist über `creature.evo1.direction.<direction>.<state>` registriert:

- 8 Richtungen: N, NE, E, SE, S, SW, W, NW
- 4 States: Idle, Run, Dash, Attack

Der bestehende `HeroAnimationController`, Grounding, Movement, Direction-Hysterese und World-Sprite-Renderer werden weiterverwendet. Wings/Weapons sind nicht eingebrannt. Die bisherige Directional-Familie bleibt als Fallback/Legacy-Asset erhalten.

## Meta Hub

Der neue mobile-first Hero Sanctum Hub enthält zehn navigierbare Präsentationssektionen: Hero Progression, Skills System, Inventory, Item Shop, Reinforcement, Wings & Customization, Build Variety, Pets / Companions, Loot / Collection und Gameplay.

Der Pass implementiert Layout, Navigation, Controls, States und responsive Composition. Es wurden bewusst keine Shop-, Currency-, Account- oder neuen Progressionssysteme hinzugefügt. Nicht vorhandene Businesslogik ist als visuelle Shell gekennzeichnet.

## Interne QA

Im DEV-Build öffnet `Harvest UI Preview` aus dem Debug-Panel oder `?ui=preview` den internen Katalog mit Paneltypen, Button-/Tab-Zuständen, Combat-Komponenten und allen 32 Evo-1-Dateien. `?ui=hub` öffnet den Hub direkt für responsive QA.

## Responsive Verhalten

Die Foundation besitzt explizite Breakpoints für 360×800, 390×844, 412×915, Tablet Portrait und Desktop/landscape. Auf schmalen Geräten werden Party Rows und weniger wichtige Ability-Zustände reduziert; Touch-Ziele, Joystick, Dash, Power Hit und Skill-Slots bleiben erreichbar. Der Hub wechselt von drei auf zwei und schließlich eine Spalte.

## Tests und Validation

- TypeScript: PASS
- Tests: 176/176 PASS (20 Dateien)
- Production Build: PASS
- Asset registry/missing asset audit: PASS
- Hero 32-state mapping: PASS
- 9-Slice metadata: PASS
- Hub navigation targets: PASS
- Responsive layout helper: PASS
- Zero-byte assets: 0
- Vite HTTP startup: PASS
- Runtime Browser Capture: PENDING — in der Ausführungsumgebung war weder `agent-browser` noch ein lokaler Chromium verfügbar; der Cloud-Browser blockierte Loopback-Zugriff. Keine Offline-Collage wurde als Runtime-Screenshot ausgegeben.
- Physical Android/iOS: PENDING

## Pass 02 offen

- Echte Businesslogik für derzeit nur visuell dargestellte Meta-Sektionen anbinden, sobald der Produktscope definiert ist
- Zusätzliche handgezeichnete In-between-Frames statt zeitlich animierter Keyposes
- World-to-screen Damage-Floater exakt am projizierten Boss-Hitpunkt statt im stabilen Combat-Lesebereich
- Physische Mobile-QA und Feintuning der Safe-Area-/Thumb-Zonen
- Optionales Lazy Loading des Meta-/Preview-Art-Payloads
