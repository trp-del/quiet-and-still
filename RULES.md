# Quiet & Still — rules

The plugin makes Logseq DB recede so the writing is the loudest thing on screen,
without losing the ability to tell kinds of information apart at a glance.

## The rules

1. **Content is the loudest thing on screen.** Block text keeps full ink. Everything
   else is measured against it and must be quieter.

2. **Fade, never remove.** Non-essential elements drop in weight but stay visible
   and reachable. Nothing is `display: none`. If you can't see it exists, you can't
   reach for it. Whisper never drops below 1.5:1 contrast against Logseq's default
   neutrals; the build clamps it, and `npm test` checks every system.

3. **Three volume levels, no more.**
   - *Ink*: content, plus the block you are editing.
   - *Quiet*: secondary information you read but don't act on: properties, dates, breadcrumbs.
   - *Whisper*: chrome you act on rarely: header, sidebars, bullets, fold arrows, thread lines.
   Every element belongs to exactly one level. A fourth level is a sign of noise.

4. **Attention restores volume.** Hovering a region, focusing it, or editing a block
   brings it back to full strength. You only pay the visual cost where you are working.
   Hover waits a short dwell first, so a passing pointer restores nothing; focus is
   immediate. Holding the peek key restores everything at once.

5. **One type, one channel.** Each kind of information owns one visual channel: hue,
   weight, underline style, shape, or size. Two types never share the same value on
   the same channel. That is what makes a split-second read possible.

6. **Differences are small but reliable.** A key only needs to be just noticeable.
   Use muted hues, a hairline, or a half-step of weight, never a loud badge. It must
   also be consistent everywhere the type appears.

7. **Color is scarce.** Each system spends at most four hues. Neutrals come from
   Logseq's own text color, so light and dark themes keep working.

8. **State beats category.** If a few things may be loud, choose live state (doing,
   overdue, the block in focus) over static category (this is a tag).

9. **Shape over chrome.** Remove boxes, backgrounds, and borders before adding them.
   When a container is needed, a hairline or a tint is enough.

10. **Calm motion.** Fades are short (~150 ms) and only on opacity and color.
    Nothing slides, bounces, or shifts layout.

## How the code follows them

- `src/systems/` holds **only token values**: colors, opacities, weights, line styles.
- `src/library/` holds **elements**: small CSS modules that only read tokens.
- Any element can pair with any system, and each can be switched on or off by itself.
- `src/live.ts` holds the few behaviours CSS can't do alone. They only toggle classes
  (`qs-peek`, `qs-repeat`) that elements style, so the look still lives in tokens.
- `npm test` enforces this: elements may not hard-code colors or read unknown tokens,
  and hover, focus and editing rules may only change paint (opacity, color, background,
  filter), never size or spacing.
