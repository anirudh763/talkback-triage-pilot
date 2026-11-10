# Data card

## What it is

75 accessibility issues from the public GitHub issue trackers of two open-source Android apps, fetched on **9 November 2026** through the GitHub REST API.

| App | Repository | Selection | Issues |
|---|---|---|---|
| WordPress for Android | [wordpress-mobile/WordPress-Android](https://github.com/wordpress-mobile/WordPress-Android) | Label `Accessibility`, title or body mentions TalkBack or a screen reader, pull requests excluded | 51 |
| AntennaPod | [AntennaPod/AntennaPod](https://github.com/AntennaPod/AntennaPod) | Label `Area: Accessibility`, pull requests excluded | 24 |

The two apps were chosen because both have active accessibility labels, and because they differ:
- WordPress issues are mostly written by the app team, many as accessibility audits.
- AntennaPod issues come from a template that asks for the app version, Android version and device, and many are from community users, including TalkBack users.

## Files

- `data/raw_wp.txt` and `data/raw_ap.txt` are the source of truth. Each issue starts with a header line, then the title, then the body:
  ```
  @@@ WP#20770 | closed/completed | 2024-05-06 | 2024-05-07 | [Pri] High | 1 | CONTRIBUTOR
  ```
  The header fields are: app and issue number, state/state reason, created, closed, labels (`;`-separated, without the accessibility label used for selection), number of comments, and the author's association with the repository.
- `data/issues.json` is the same data parsed into objects by `node scripts/check.js`.

## Cleaning

- Images and videos are replaced with `[image]` and `[video]`; attachment URLs are removed.
- HTML comments and the issue templates' checkbox checklists are removed.
- Template sections answered with "_No response_" are removed.
- Some links were simplified by hand while transcribing:
  - Long or internal links became their link text or a short description (for example "(28s recording)" instead of a cloudup.com link).
  - "Hat tip" footer lines and footnote markers were dropped.
  - HTML wrappers around attachments (tables, `<details>`) were flattened to `[video]` or `[image]`.
  - One note that maintainers added to AntennaPod #7776 is summarised in brackets.

  None of these edits touch the steps, the version, device or Android lines, the expected or actual behaviour, or anything TalkBack said.
- Bodies longer than about 1,200 characters are cut, and marked `…[cut]`.

## Known biases

- **Two apps only**, both with active maintainers and accessibility labels. They aren't representative of Android apps in general.
- **WordPress selection depends on the words "TalkBack" or "screen reader"**, so reports about other assistive technologies (Switch Access, large fonts, contrast) are under-represented for that app.
- **Many WordPress reports are internal audits**, which are more structured than end-user reports.
- **Labels and states reflect each project's own process.** "Closed as completed" doesn't by itself mean the report was good.

## Ownership and use

- The issue text belongs to the people who wrote it on GitHub. It is included here, shortened, for non-commercial research, with a link to each original issue. The repository's MIT licence covers the code, not this text.
- No personal data beyond what is public in the issues is included. GitHub usernames in the text are kept as written.
- If you wrote one of these issues and want it removed, open an issue in this repository and it will be removed.
