---
name: Update plan and memory after every TDD and sprint end
description: Always update memory and MEMORY.md index after completing a TDD cycle or finishing a sprint
type: feedback
---

After every TDD completion (`/tdd <feature>`) and after every sprint end, always:
1. Update or create the relevant `project_sprint*.md` memory file with the new completion state
2. Update `MEMORY.md` index line to reflect the new status (e.g. "in progress → COMPLETE")
3. Update the `## Current state summary` section in `MEMORY.md` if the sprint number or next-sprint changes

Do this proactively — do not wait for the user to ask.

**Why:** The user has had to ask for this multiple times across sessions. Memory is the only continuity between conversations; stale memory means the next session starts with wrong context.

**How to apply:** The final step of any `/tdd` skill run or sprint completion block should always be a memory write, just like committing tests + implementation together.
