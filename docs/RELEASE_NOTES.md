# 0.1.0 development snapshot

This is a development snapshot of PHU QUY ISLAND. It is not a claim that all requirements in MASTER_PROMPT.md have been completed.

The snapshot includes an OSM-derived coastline and source roads, terrain and ocean, an existing coastal community, 18 buildable address types, three road categories, five zone classes, six public services, daily population and budget simulation, fishing/tourism/trade, weather, objectives, management panels and persistent local saves. Selected CC0 glTF assets are bundled with provenance and source licenses.

Recent corrections cover mixed indexed/non-indexed fishing-boat geometry, demolition of overlapping road alignments, render pacing and reduced-motion behavior, accessible speed controls and menu alignment. Verification evidence is recorded in TEST_REPORT.md rather than inferred from this feature list.

## Known limitations

- The visual asset style is currently stylized/low-poly. Locally specific architecture, environmental realism and asset-category coverage remain under review.
- Heights and most landmark positions are artistic approximations. Buildings, demographics and economic figures are fictional; only the documented geographic inputs come from OSM.
- Transport uses a shared-cell graph and aggregate traffic/sea capacity rather than individual deliveries. Construction uses a game-scale planning grid.
- Browser UI/visual QA and performance measurement are in progress. Software-rendered VPS results are not a guarantee of ordinary-desktop performance or browser compatibility.
- The Three.js production chunk exceeds Vite's default 500 kB warning threshold before gzip.
- Local saves can be removed by browser data clearing. Export JSON backups for important sessions.
- Public hosting has not yet been verified.

Keep the geography files and license notices with any redistributed static build. See ASSET_LICENSES.md and the top-level THIRD_PARTY_NOTICES.md for the applicable terms.
