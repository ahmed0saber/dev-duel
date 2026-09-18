# DEV DUEL card art prompts

Use these to generate one illustration per card. Give the files back named exactly as `Save as` below. Those ids match the game data, so they can be wired in without renaming.

## How to generate

- **Size:** 1024 × 768 (4:3 landscape). Matches the in-game art window (`160 × 120`).
- **Format:** PNG, no transparency needed.
- **Look:** original sci-fi hardware. Not a Yu-Gi-Oh clone, not a real-world brand, not a licensed mecha.
- **Composition:** one centered subject, readable silhouette, fills most of the frame. Dark industrial night, wet metal, cyan / amber rim light. Magenta only when the prompt asks for it.
- **Do not include:** letters, numbers, UI chrome, watermarks, artist signatures, company logos, human faces, blood.

Paste this **shared style** at the start of every prompt:

```text
DEV DUEL trading-card illustration, original sci-fi, cinematic concept art, 4:3 landscape.
Dark wet industrial night, rain-slick steel, volumetric fog, cyan and amber rim lighting.
Photoreal mechanical hardware with faint holographic HUD lines, no readable text.
Centered hero subject, strong silhouette, shallow depth of field, ultra-detailed metal and cables.
No humans, no letters, no logos, no watermark.
```

Negative prompt if the tool has one:

```text
text, letters, numbers, watermark, logo, signature, human, face, anime face, cute chibi, blood, gore, existing mecha franchise, Gundam, Evangelion, Transformers, Yu-Gi-Oh, card frame overlay
```

When you send the images back, drop them in `assets/cards/` with the filenames below (create the folder if needed).

---

## Frames (main deck)

### DRONE-21

- **Save as:** `drone-21.png`
- **Role:** light recon flyer, ATK 1200

```text
[SHARED STYLE]
A small expendable reconnaissance drone hovering low over a ruined night highway.
Thin carbon-fiber body, teal-green running lights (hue ~150), four folding sensor vanes, a single bright optical core in the center.
Fragile, fast, almost insect-like, exposed wiring, no heavy armor.
Low-angle shot, city glow in the distance, motion blur on the vanes.
```

### XR-5

- **Save as:** `xr-5.png`
- **Role:** compact survey probe, ATK 1400

```text
[SHARED STYLE]
A compact diamond-shaped survey probe planted on cracked concrete, mapping a hostile sector.
Cyan-blue sensor skin (hue ~190), wedge chassis, two thick survey legs splayed like a tripod, a glowing rangefinder eye.
Smaller than a car, dense with instruments, not a combat unit.
Cool cyan light painting the ground grid around it.
```

### RX-17

- **Save as:** `rx-17.png`
- **Role:** frontier patrol walker, ATK 1600

```text
[SHARED STYLE]
A standard frontier patrol walker standing watch on a foggy industrial perimeter.
Boxy torso, cyan visor bar (hue ~188), three sturdy hydraulic legs, searchlight on the crown.
Mass-produced, scuffed paint, serial stencils suggested as wear marks only — no readable text.
Neutral stance, patrol-ready, medium scale.
```

### AERO-12

- **Save as:** `aero-12.png`
- **Role:** atmospheric interceptor, ATK 1800

```text
[SHARED STYLE]
An atmospheric interceptor in a steep bank over night clouds, folding vanes fully spread.
Blue-cyan fuselage (hue ~205), dagger silhouette, glowing intake, two swept canards.
Fast, aggressive, airborne, not a helicopter.
Moonlit cloud deck, engine heat haze, condensation trails.
```

### MK-04

- **Save as:** `mk-04.png`
- **Role:** mass-produced bipedal line walker, ATK 1900

```text
[SHARED STYLE]
A mass-produced bipedal combat walker marching through a muddy factory yard.
Warm amber-orange plating (hue ~32), rectangular head visor, two thick legs, shoulder slab armor.
Cheap, numerous, battle-scuffed, assembly-line aesthetic.
Dust and sparks, production-line lighting.
```

### A-47

- **Save as:** `a-47.png`
- **Role:** urban striker, ATK 2000

```text
[SHARED STYLE]
A balanced urban assault frame crouched in a narrow alley between server towers.
Red-orange armor (hue ~12), trapezoid torso, short cannons on the hips, compact bipedal stance.
Built for corridors, not open fields. Aggressive but not gigantic.
Sodium streetlights, wet brick, muzzle-heat shimmer.
```

### UNIT-08

- **Save as:** `unit-08.png`
- **Role:** frontline infantry machine, ATK 2100

```text
[SHARED STYLE]
A frontline infantry machine advancing through debris with reinforced plating.
Steel-blue armor (hue ~220), humanoid combat chassis, slab chest, rifle-arm, heavy greaves.
Soldier-like but fully mechanical, no face. Frontline workhorse, not a titan.
Rain, muzzle-adjacent glow, trench of wrecked drones behind it.
```

### VX-09

- **Save as:** `vx-09.png`
- **Role:** shoulder-mounted siege platform, ATK 2300

```text
[SHARED STYLE]
A wheeled siege platform with a huge shoulder-mounted cannon aimed at a distant bunker.
Violet-purple armor (hue ~268), low wide hull, two massive wheels, vertical gun tower.
Heavy, slow, industrial, built to crack fortifications.
Recoil pistons, heat-glow at the barrel, night bombardment atmosphere.
```

### SENTINEL-09

- **Save as:** `sentinel-09.png`
- **Role:** bastion guardian, ATK 2500

```text
[SHARED STYLE]
A stationary-capable bastion unit locking down a gateway, shield-body planted like a fortress.
Indigo-violet armor (hue ~250), hexagonal shield torso, single bright guardian core in the chest, short stabilizing legs.
Defensive, monumental, almost architectural.
Gate floodlights, hexagonal force-field hints, no readable signs.
```

### TITAN-03

- **Save as:** `titan-03.png`
- **Role:** super-heavy chassis, ATK 2800

```text
[SHARED STYLE]
A super-heavy combat chassis looming over a ruined overpass, reserved for decisive engagements.
Crimson-red armor (hue ~0), enormous rectangular torso, three tree-trunk hydraulic legs, crown sensor.
Dwarfs the wrecked cars around it. Intimidating, slow, apocalyptic scale.
Red emergency beacons, steam, crushed rebar.
```

---

## Extra Pool (fusions)

These should look like **compiled hybrids** of their two materials, bigger and more luminous than main-deck frames.

### NX-00

- **Save as:** `nx-00.png`
- **Materials:** RX-17 + MK-04
- **Role:** merged patrol frame, ATK 4000

```text
[SHARED STYLE]
A merged patrol fusion frame: the boxy cyan patrol walker and the amber bipedal line-walker locked into one combat spine.
Diamond silhouette, teal core (hue ~175), three hybrid legs, dual visor bars fused into a single luminous diamond chest.
Larger and cleaner than either parent, as if two machines were compiled into one executable.
Night perimeter, cyan-amber mixed rim light, energy seam down the spine.
```

### PX-01

- **Save as:** `px-01.png`
- **Materials:** UNIT-08 + VX-09
- **Role:** merged assault / siege hybrid, ATK 4500

```text
[SHARED STYLE]
A siege-infantry hybrid: a blue infantry machine fused with a purple shoulder cannon platform.
Wide rectangular hull, magenta-violet core (hue ~280), humanoid upper body growing out of a wheeled siege base, enormous shoulder cannon.
Assault and artillery in one chassis.
Night battlefield, crossed cyan and violet lights, shockwave dust.
```

### TX-MAX

- **Save as:** `tx-max.png`
- **Materials:** TITAN-03 + SENTINEL-09
- **Role:** merged bastion / fortress engine, ATK 5200

```text
[SHARED STYLE]
A fortress engine: the crimson titan and the indigo sentinel compiled into a walking citadel.
Triangular / pyramid silhouette, crimson-magenta glow (hue ~348), shield-fortress body, titan legs, guardian core blazing in the chest.
The biggest machine in the set, cathedral-scale, almost a moving bunker.
Red storm light, hexagonal bastion plates, ground cracking under its feet.
```

### AX-7

- **Save as:** `ax-7.png`
- **Materials:** AERO-12 + DRONE-21
- **Role:** merged interdictor / swarm-wing, ATK 3400

```text
[SHARED STYLE]
A swarm-wing fusion: a blue interceptor fused with a teal recon drone into one airborne hunter.
Green-cyan glow (hue ~160), dagger fuselage with a drone optical core, folding vanes plus extra sensor wings like a flock locked together.
Sleek, fast, not heavy. Mid-air, clouds below.
Aurora-like teal exhaust, multiple wing lights like a bound swarm.
```

---

## Traps (software as industrial hardware)

Traps are **physical installations / weapons that feel like software**, not screenshots of Git. No company logos, no terminal windows full of code.

### Git Merge

- **Save as:** `git-merge.png`
- **Role:** combine two frames into a fusion

```text
[SHARED STYLE]
Two damaged combat machines being pulled into a single glowing compile chamber, metal spines braiding together.
Emerald merge-light (hue ~145), Y-shaped energy conduit, two incoming rails joining into one output rail.
Industrial fusion dock, sparks, cables, a bright merge node at the fork.
Implies combination, not destruction.
```

### Git Conflict

- **Save as:** `git-conflict.png`
- **Role:** cancel a merge

```text
[SHARED STYLE]
A merge dock violently rejected: two machine spines yanked apart by a red conflict spike.
Scarlet warning light (hue ~8), an X of laser shutters cutting the compile beam, emergency strobes.
Chaos, aborted fusion, sparks flying outward, not a completed machine.
Hostile, glitchy magenta-red atmosphere.
```

### Git Cherry-pick

- **Save as:** `git-cherry-pick.png`
- **Role:** steal one enemy frame for a turn

```text
[SHARED STYLE]
A gold grappling-capture array lifting a rival machine off the ground with a surgical claw.
Amber-gold light (hue ~48), cherry-like twin optical orbs on the claw, hijack cables plugging into the stolen chassis.
Theft, not wreckage. The captured machine is intact and being rewritten.
Night raid, gold vs cyan lighting.
```

### Rate Limiter

- **Save as:** `rate-limiter.png`
- **Role:** opponent may attack only once next turn

```text
[SHARED STYLE]
A massive industrial throttle gate clamping a cannon barrel, forcing fire-rate down to a crawl.
Burnt-orange limiter housing (hue ~28), a single glowing slot like a "one shot" aperture, heavy hydraulic jaws.
Traffic-calming for weapons. Thick cables, pressure gauges without readable text.
Warm warning lights, slow-motion muzzle energy stuck in the gate.
```

### Firewall

- **Save as:** `firewall.png`
- **Role:** block direct attacks

```text
[SHARED STYLE]
A hexagonal energy firewall wall slamming down in front of a dark command bunker.
Cyan-blue shield plates (hue ~200), castle-like digital battlements made of glass and steel, sparks where stray shots hit the wall.
Defense, impermeable, architectural.
Rain, cyan lattice, no people.
```

### Deadlock

- **Save as:** `deadlock.png`
- **Role:** freeze one enemy machine

```text
[SHARED STYLE]
A rival combat frame frozen mid-stride inside a magenta locking cage.
Hot pink / magenta restraints (hue ~320), padlock-like mechanical ring around the torso, time-stopped pistons.
The machine is intact but immobilized.
Harsh magenta vs cyan rim light, ice-like condensation on metal (not literal ice sculpture).
```

### Circuit Breaker

- **Save as:** `circuit-breaker.png`
- **Role:** destroy one opponent machine

```text
[SHARED STYLE]
A giant industrial circuit breaker slamming open, dumping a bolt that shears a combat machine in half.
Orange-red arc flash (hue ~18), knife-switch the size of a truck, exploding busbars.
Violent but mechanical — electrical destruction, not gore.
White-hot plasma, flying armor plates, night substation.
```

### Observer

- **Save as:** `observer.png`
- **Role:** +1000 ATK to your machine this turn

```text
[SHARED STYLE]
An orbiting observer satellite locking onto a friendly machine and flooding it with targeting data.
Violet optic (hue ~260), iris of concentric rings, beams of analysis painting the ally brighter and sharper.
Buff, not attack. The ally looks empowered.
Purple scan-lines, HUD chevrons with no readable text.
```

### Bug Injection

- **Save as:** `bug-injection.png`
- **Role:** −1000 ATK to an enemy machine this turn

```text
[SHARED STYLE]
A lime-green injector drone stabbing a virus-spike into an enemy machine's neck cabling.
Toxic green glow (hue ~95), insect-mechanical parasite, corrupted lights crawling over the victim's armor.
Glitch, sickness, systems failing. The victim looks weaker, not exploding.
Sickly green vs dark steel, error-magenta flickers.
```

### Rollback

- **Save as:** `rollback.png`
- **Role:** restore 1500 HP

```text
[SHARED STYLE]
A damaged command core being rewound: armor plates flying backward into place, cracks sealing with teal restore-light.
Teal-green rewind halo (hue ~168), circular time-arc, health/integrity returning.
Repair and restore, calm compared to combat cards.
Soft teal glow, rain reversing off the metal.
```

### Hotfix

- **Save as:** `hotfix.png`
- **Role:** emergency +1200 HP

```text
[SHARED STYLE]
Emergency patching in the field: a yellow-gold weld-cross branded onto a cracked chassis, technicians-as-machines (no humans) clamping a live patch plate.
Amber-yellow heat (hue ~55), glowing plus-shaped weld, sparks, rushed repair.
Ugly, fast, effective. Not a factory, not a hospital.
Close-up of the patch glowing against dark armor.
```

### Factory

- **Save as:** `factory.png`
- **Role:** draw 1 card

```text
[SHARED STYLE]
An automated night factory spinning up another combat frame on a rail, still half-assembled.
Cool factory blue (hue ~210), assembly gantries, a newborn machine dropping onto a conveyor of light.
Production, not battle. Implies "one more unit incoming."
Steam, welding glare, rows of dormant frames in the dark.
```

---

## Checklist

| File | Card |
| --- | --- |
| `drone-21.png` | DRONE-21 |
| `xr-5.png` | XR-5 |
| `rx-17.png` | RX-17 |
| `aero-12.png` | AERO-12 |
| `mk-04.png` | MK-04 |
| `a-47.png` | A-47 |
| `unit-08.png` | UNIT-08 |
| `vx-09.png` | VX-09 |
| `sentinel-09.png` | SENTINEL-09 |
| `titan-03.png` | TITAN-03 |
| `nx-00.png` | NX-00 |
| `px-01.png` | PX-01 |
| `tx-max.png` | TX-MAX |
| `ax-7.png` | AX-7 |
| `git-merge.png` | Git Merge |
| `git-conflict.png` | Git Conflict |
| `git-cherry-pick.png` | Git Cherry-pick |
| `rate-limiter.png` | Rate Limiter |
| `firewall.png` | Firewall |
| `deadlock.png` | Deadlock |
| `circuit-breaker.png` | Circuit Breaker |
| `observer.png` | Observer |
| `bug-injection.png` | Bug Injection |
| `rollback.png` | Rollback |
| `hotfix.png` | Hotfix |
| `factory.png` | Factory |

26 images. Partial sets are fine — send what you have and they can be hooked up card by card.
