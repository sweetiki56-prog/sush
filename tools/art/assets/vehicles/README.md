# Original vehicle cutouts

`sedan.png`, `pickup.png`, `burnt_van.png` and `water_tanker.png` were generated with the built-in ImageGen tool for this project. They are transparent source images, not extracted from any game or real vehicle photography. `tools/art/vehicle-raster.mjs` crops and downsizes them deterministically into the atlas; `npm run gen:assets` rebuilds the shipped frames. Preserve these source files when regenerating.

Final prompt set (each asset was generated separately):

- **Sedan:** One abandoned compact four-door sedan, original fictional design; elevated three-quarter isometric view, rear upper-left and front lower-right. Long hood, low cabin, trunk, four wheels. Weathered oxidized copper-orange paint, dark chipped metal, cloudy windows, dents, fine rust and panel seams.
- **Pickup:** One abandoned utility pickup, front lower-left and open cargo bed upper-right. Two-door cab, ribbed empty bed, damaged rails, four wheels. Faded sage-green paint, grey primer, cracked glass, rusty metal and dust.
- **Burnt van:** One burned delivery van, tall cargo shell upper-left and crushed cab lower-right. Collapsed roof corner, empty dark windows, warped steel, charcoal scorch, ash and rust; no flames.
- **Water tanker:** One improvised water-collection truck, cylindrical tank upper-left and stout cab lower-right. Riveted repair bands, drain valve, hoses, heavy wheels; dusty ochre and faded teal with mineral stains and patchwork repairs.

Shared style/constraints: richly textured hand-painted pre-rendered late-1990s isometric CRPG sprite aesthetic; subtle warm directional light; readable silhouette at ~110 pixels; genuinely transparent background; no terrain, people, lettering, brands, logos or watermark; no copying recognizable game assets or vehicle models; no blocky voxel or flat cartoon treatment.
