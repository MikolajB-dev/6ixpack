# context

RULES FOR CLAUDE (read first, no exceptions)
Never push to main. Work on your own branch (<name>/<feature>) and open a pull request. A human merges.
Stay in your designated sector. Only create or edit files inside the folder assigned to your user (see "Sectors" below). If a task needs a change outside it, stop and tell the user. Do not make the change yourself.
No overlap, no overwriting. Do not rewrite, reformat, rename or delete files you did not create. Do not touch shared files (build config, prj.conf, CMakeLists.txt, package files, README) without the user confirming that the teammate who owns them agrees.
Pull before you work, commit small, never force-push. Run git pull on your branch before starting. No git push --force, no git reset --hard on shared branches.
Shared interfaces are contracts. If a message format, GATT service, advertising payload or pin map is documented in "Contracts" below, do not change it unilaterally. Propose the change and let the user take it to the team.
If unsure whose file it is, ask. Do not guess.
Team
6 people, one team, SDU Vejle students.
3 use Claude Pro (Claude Code), 3 use Freebuff.
Different AI tools means different habits. Keep your output readable by all six: plain C/Python, comments on non-obvious lines, no tool-specific config files committed.
Sectors (fill in at the first team meeting)
Person	AI tool	Sector (folder)	Notes
1			
2			
3			
4			
5			
6			
Contracts (fill in as the team agrees them)
Message format between blocks: TBD
Advertising / GATT definition: TBD
Pin map and hardware per block: TBD
Project idea

TBD. Team to fill in. Claude: do not invent or change the concept. Build only what the user asks for inside their sector.

Working notes from earlier chat (one proposed direction, not decided): rune-shaped physical blocks that visitors move

Event facts
Techathon, 13-15 Nov 2026 (Fri to Sun), Kongernes Jelling (UNESCO site). Work area is "The Bank". Teams stay at Vejle Danhostel.
Organizers: AAU Technical Faculty of IT and Design, SDU Vejle and Sonderborg, National Museum of Denmark, Samsung Denmark Research Center.
Theme: "Connecting People, Places & Events with Tech". Directions named by organizers: a concept for future museum experiences, or deeper Bluetooth work.
Entry types allowed: concept presentation, code, or working prototype.
Prize: none listed. Winners may get a chance to exhibit at the museum.
Judging categories
Best Museum Experience Concept: unique, makes visitors stop, could appear in a real exhibition.
Best Technical Execution: difficulty and cleverness.
Best Concept/Product: intuitive, polished, enjoyable, a new experience.
Best Use of Bluetooth: unexpected or innovative use, pushes its capabilities.

Judges include the Kongernes Jelling museum director and a Bluetooth specialist from Samsung. Also AAU HCI, communications, Vejle Kommune tourism and SDU innovation.

Schedule (key points)
Fri: 16:00-23:00 project work. 16:30-18:00 talks on Bluetooth and computer vision. 23:00 one-minute idea pitch.
Sat: 09:00-24:00 project work. 15:00-17:00 "Ask Us Anything".
Sun: 09:00-12:00 project work. 10:00-11:30 judges visit tables. 12:00-13:00 three-minute presentations. 14:00-15:00 return materials. Buses 15:30.
Practical consequence: the demo must work by 10:00 Sunday. Freeze features Saturday night. Record a backup video.
The museum brief (what the exhibition is about)

Kongernes Jelling plans a 2027 exhibition in the foyer of the new museum (the old bank building) on the Great Jelling Stone and its many copies around the world. Questions posed in the brief:

How could guests experience all these different stones?
What technical solutions could help bring the copies together?
Could Bluetooth be implemented in the exhibition?
What would be the central story or message?
How could visitors explore the different locations of the copies?
What would be a surprising or unexpected element?
Historical context (use selectively)

The Great Jelling Stone was raised by Harald Bluetooth in 965. It is called "Denmark's birth certificate". Its inscription honors his parents Gorm and Thyra, claims Denmark and Norway, and says he made the Danes Christian. Three sides: inscription, animal ornament (Mammen style), Christ in interlaced bands. The Bluetooth logo is a bind rune of H and B (Harald Bluetooth). This is general knowledge and is not in the organizer files.

Copies and their stories
Place	Year	Hook
Paris (Saint-Germain-en-Laye)	1889	Left behind after a World's Fair archaeology exhibit; now in the dry moat of the Musee d'Archeologie Nationale
Rouen	1911	Carlsberg Foundation gift for Normandy's 1000-year jubilee
San Francisco	1915	World's Fair; the only truly lost copy, whereabouts unknown
Varde	1918	Gift of Cornelius Stau, unveiled on his wife's birthday; a pair (great and small stone)
Hvidovre	1933	Moved in 1990; a bottle from 1933 under it held curses against anyone who removed it
Utrecht	1936	University jubilee; a shop sold small souvenir casts
London	1948 / 1955	Made for a V&A show; ended up at the Danish church in 1955
Yorba Linda, CA	1965	Hollow cement and granite cast, moved to the Danish church entrance
Tokyo (Funabashi)	1975	Plastic, light, blew into the street; later moved to Funabashi H.C. Andersen Park
Viborg	n/a	Made for a Moesgaard Museum show, stands at JP Group, Glyptonite, two blues added
National Museum storage	1984	New copies of both stones
Themes the history supports
The copies travel. They have been moved, stored, lost and re-erected. Moveable physical blocks match this.
Colour is a guess. The original shows no visible colour. Each copy was painted by different people at different times. One LED colour per block fits.
One missing copy (San Francisco) is a natural "node that never connects".
Souvenir casts (Utrecht) show a long habit of copies reaching ordinary people.
Data caveats (do not state these as hard facts on screen)
Brief says "at least 12" copies but lists 10 places and omits San Francisco.
London: one text says it was displayed around London first, the other says it was packed away first.
Yorba Linda: the gift recipient and move year (1993 vs 1994) differ between texts.
Funabashi is in Chiba, not in Tokyo.
Low-value detail: Rouen banquet menu, royals at Utrecht, casting method, church well history.
Hardware
Provided (quantities unknown, ask organizers)
Nordic nRF52, nRF52833, nRF54L15 dev boards. ESP32 boards. Grove Beginner Kits for Arduino.
Microphone modules, NFC tags and readers, assorted sensor kits.
Power banks, USB-C and micro-USB cables.
Breadboards, jumper and crocodile wires, LEDs, DC motors.
VR headsets (website says Meta Oculus 2 and 3s).
Bambu Lab 3D printers (file says P2S Combo, website says P1s), black and white filament only.
Tools, adhesives, markers, sticker paper, zip ties.
Teams may bring personal hardware and tools.
Not provided, bring if needed

Batteries (CR2032 holders or small LiPo), neodymium magnets, colored filament.

Sensor kit (37 modules, Arduino style)

Likely useful for movable blocks:

GY-521 (IMU): orientation, flip, shake.
Linear Hall sensor and magnetic reed switch (with magnets): detect a block snapping into place.
RGB LED, SMD RGB: status colour.
Passive and active buzzer: audio feedback.
Tilt switch, shock sensor, button: cheap alternatives.

Low value for this project: flame, water level, relay, laser, IR pair, temperature and humidity, metal touch, avoidance, tracking, sound modules, LCD1602 (bare parallel 5V module).

Voltage rule: most modules are 5V Arduino style. nRF54L15 GPIO is 3.3V logic. Power modules from 3.3V and never feed 5V into an nRF pin.

nRF54L15 notes (from general knowledge, not verified this session)
Arm Cortex-M33 SoC with BLE.
Bluetooth Channel Sounding (distance measurement) is reportedly supported. Verify SDK support before promising it. High risk, high reward stretch.
Bluetooth approach guidance
Simplest block-to-block messaging: advertising with manufacturer-specific data (broadcaster plus observer). No connection management needed.
Scanning and mesh are not covered by Nordic's BLE Fundamentals course. Look for the observer and broadcaster samples in the nRF Connect SDK.
Do not use RSSI as a precise distance or placement signal. It is noisy. Detect "block placed" with hall, reed, NFC or IMU, and use Bluetooth for passing the message.
Multi-hop relay is a stretch goal. Get single-hop reliable first.
Learning resources
BLE Fundamentals (Nordic Academy): lessons 2 (advertising), 3 (connections), 4 (data exchange) are the core. Lesson 6 (sniffer) helps debugging.
nRF Connect SDK Fundamentals: about 8-10 hours. Do lessons 1-4 only (setup, LEDs and buttons, app structure, logging).
nRF54L Express: about 2-3 hours, no hardware needed. Low priority.
Links: https://academy.nordicsemi.com/courses/bluetooth-low-energy-fundamentals/ , https://academy.nordicsemi.com/courses/nrf-connect-sdk-fundamentals/ , https://academy.nordicsemi.com/courses/nrf54l-series-express-course/ , https://docs.nordicsemi.com/category/nrf-54L-series (could not be read automatically).
Open questions for organizers
How many nRF54L15 kits can our team use? This sets the number of blocks.
Which Bambu printer model, and how is print time shared?
Are batteries or magnets available?
Do the NFC readers need their own microcontroller, and which chip?
Working principles for Claude on this project
Time is about 44 hours wall clock, roughly 25-30 working hours. Prefer the simplest thing that works over the clever thing that might.
Reliability beats features. A demo that works every time wins over a bigger one that sometimes fails.
Keep content work (history text on screen) tiny until the Bluetooth link works. Eight lines per block is enough.
Report blockers to the user early. Do not silently work around them in someone else's sector.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
