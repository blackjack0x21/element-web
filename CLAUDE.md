# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

The imported `AGENTS.md` is the source of truth for repository layout, commands, test runners (the file path decides
jest vs. vitest), MVVM conventions, code style, commit rules and the "don't open PRs" rule. Keep project guidance
there so it is shared with other agents, and only add Claude-specific notes below.

## Claude-specific notes

- Commit messages follow the `AGENTS.md` rules (short imperative subject, no `feat:`/`fix:` prefix) and end with the
  `Co-Authored-By` attribution line supplied by the session.
- Before writing a new file's copyright header, check the current year and use the contributor's own name unless the
  work is done as part of Element (see `AGENTS.md`).
