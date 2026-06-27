# Kids YouTube Channel — Brand Guide

## Channel Identity
- **Genre:** Faceless 3D animated educational content for kids ages 4–8
- **Tone:** Curious, warm, enthusiastic — like a knowledgeable big sibling
- **Voice:** Simple sentences. No jargon. Maximum 2 syllables per word where possible.
- **COPPA Status:** Made for Kids. No personal data collection. No behavioral targeting.

## Visual Style
- **Aesthetic:** Pixar-quality 3D animation with bold outlines
- **Color Palette:** Primary — Vivid cyan (#00BCD4), sunny yellow (#FFD600), warm orange (#FF6D00), deep purple (#7B1FA2)
- **Background:** Bright gradient environments. Never dark or scary.
- **Character:** Friendly 3D guide character — round face, expressive eyes, no defined ethnicity to remain universally relatable
- **Higgsfield Soul ID:** Set via `HIGGSFIELD_SOUL_ID` environment variable

## Video Specifications
| Format | Resolution | Duration | Platform |
|--------|-----------|----------|----------|
| Landscape | 1280×720 | 10–15s per scene | YouTube |
| Portrait | 1080×1920 | 10–15s per scene | Instagram Reels, TikTok |

## Narration Rules
- Reading level: Grade 1–2 (Flesch-Kincaid 60–70)
- Max script length: 150 words for 60 seconds
- No dialogue beyond single-narrator voice
- No character names that conflict with existing IP
- End every video with a wonder/curiosity hook

## Thumbnail Rules
- One character close-up, centered
- Title text: 3–6 words max, uppercase, high contrast
- Background: vivid solid or gradient, no busy scenes
- No faces of real children
- No violent imagery, weapons, or scary faces

## Music & Audio
- Original score only — no copyrighted tracks
- Tempo: upbeat 110–130 BPM
- No lyrics in narrated segments
- Sound effects: playful, cartoon-style

## Publishing Schedule
| Day | Platform | Time (UTC) |
|-----|----------|-----------|
| Monday | YouTube | 10:00 |
| Monday | Instagram Reels | 12:00 |
| Monday | TikTok | 14:00 |
| Wednesday | YouTube | 10:00 |
| Wednesday | Instagram Reels | 12:00 |
| Thursday | TikTok | 14:00 |
| Friday | YouTube | 10:00 |

## Safety Guardrails
- All scripts run through automated COPPA safety checker before generation
- Scripts flagged for unsafe content pause pipeline and notify operator
- No copyrighted character likenesses ever generated
- All Higgsfield generations use `safety_filter: true`
- Human approval gate active — auto-publish after 24h if no response
