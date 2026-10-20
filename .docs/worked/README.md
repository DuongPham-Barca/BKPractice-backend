# Worked

Each finished piece of work has one file that records the process. Split those files into folders by area so they stay easy to find. Do not leave every file loose in this directory.

```text
docs/worked/<area>/YYYY-MM-DD-short-name.md
```

`<area>` is:

- `agent` when the work changes the process, the working agreement, or a repository-wide rule.
- `<service>` when the work belongs to one service: `api-gateway`, `identity`, `learning`, `submission`, `judge`, or `community`.
- `<service>/<module>` when the work belongs to one feature module. Use the same module name as the code directory `modules/<module>/`.

Examples:

```text
docs/worked/agent/2026-09-23-working-agreement.md
docs/worked/identity/auth/2026-09-23-login.md
```

Create a folder only when that area has an entry to write. Do not create empty folders.

The entry must explain what was done, why those pieces were used, and how the feature flows. A file list is not enough. The template and the configuration rules are in the
[working agreement](../agent/working-agreement.md), step 6. Do not record secrets, tokens, or passwords.
