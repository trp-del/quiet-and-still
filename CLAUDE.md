# Quiet & Still

The design principles are in [RULES.md](RULES.md); the layout and commands are in [README.md](README.md).

## Artifacts

When a visual, proposal, or report is relevant, make it as an artifact in time style.

In time style means behaviour is shown as it unfolds, not as a before/after snapshot:

- Each demo plays as a sequence of named steps with a Play/Replay button, a timeline with a tick per step and a moving playhead, and a caption that says what is happening at that step.
- It plays once when scrolled into view, and rests on its end state so the page reads correctly without playing. With reduced motion it never autoplays and applies each step at once.
- Typing is typed, values land where they land as they are entered, and what just changed flashes amber, then settles.
- A Today/Proposed switch stays beside it where the comparison matters.

Filing:

- Save it in `history/`, named for the date and time it was made: `YYYY-MM-DD-HHMM-<what>.html` (24-hour local time), so the folder sorts chronologically.
- Add an entry at the top of `history/index.html` with the same date and time, a title, and a one-line summary.
- Match the look of the existing history pages: Newsreader / IBM Plex Sans / IBM Plex Mono, the shared `--bg`/`--fg`/`--muted`/`--line` tokens with a dark mode, and demos at Still's real levels (whisper 0.12, quiet 0.4, amber only for live state).
- Put the date and time in the page's eyebrow label, and publish it as an Artifact so it can be shared.
- History pages are records: don't rewrite an old one when the plugin moves on; add a new one.
