# Optional sound cues

Settings has Enable sound cues / Mute sound cues, a labelled 0–1 volume slider, and a persistent text status. Alt+Shift+M toggles outside inputs, textareas, selects and editable content. Ctrl/Cmd modifiers, composing input and repeated keys are ignored. It does not use VoiceOver's Ctrl+Option modifier combination.

Sound is off on every page load. Only pressing the enable button or accepted shortcut creates/resumes an AudioContext. The browser remembers mute/volume preferences, but never activates a new visit automatically. A suspended/unavailable context stays silent until explicit activation; text statuses remain active. Muting immediately zeros active gains. No speech, recording or external audio is used.

Actual terminal event calls use a 100ms sine oscillator → gain envelope → destination. Events are validation-error (220Hz), repair (440Hz), demo completion (523.25Hz), comparison completion (587.33Hz), and evaluation completion (659.25Hz). These identify actions, not severity, accuracy or confidence. A repair cue means the user's supplied text was appended, not that every check passed. Failed demo/comparison operations use validation-error and retain their actual error text. Typing, checklist debounce, route renders and evaluation progress do not emit tones. Identical played events within one second are suppressed. Muted, zero-volume, suspended and unsupported contexts produce no oscillator.

`test/audio.test.cjs` instruments construction/resume/graph/start and edge cases. `test/canonical.e2e.cjs` wraps the real browser AudioContext and observes actual demo/comparison terminal calls without permissive autoplay flags. No claim is made that a human listened or that these checks replace a native screen-reader study.
