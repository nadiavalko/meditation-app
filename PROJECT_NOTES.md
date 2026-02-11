# Meditation App Plan (New Structure)

## App Structure
- Welcome screen
- Burn screen
- Breathing screen
- Body scan screen
- Finish screen

## Journey (3 steps)
1. Burn a thought (Burn screen)
2. Breath following the circle (Breathing screen)
3. Body scan (Body scan screen)

## Build Order
1. Build app structure and navigation between screens.
2. Add animations (breathing circle, transitions).
3. Make it look polished and beautiful (visual design pass).

## Notes
- Focus on structure first; keep UI simple until animation and styling passes.
- Use this plan to guide coding and sequencing.
- Build screens close to the Figma layouts but keep markup and styles easy to edit for a later polish pass.
- Burn screen behavior: show an old-paper note; flame button appears after typing; clicking burns paper + text with flame/smoke, then auto-advance to next screen after a short pause.
- Breathing screen behavior: smooth circle expansion (4s inhale) and contraction (6s exhale) for 5 rounds; show only round count; brief pause, then auto-advance to body scan.
- Body scan behavior: text guides from forehead to feet; each step highlights the matching body area (only one at a time, hands together OK); after scan, show “Well done.” then auto-advance to finish screen.
