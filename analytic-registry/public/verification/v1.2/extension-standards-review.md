# V1.2 extension Standards review

**PASS — 0 remaining documented-standard violations; 0 actionable Fowler smell findings.**

Reviewed the new collection packager, baseline creator, release checks and guard, package commands, artifact catalog, and V1.2 workbook builder and contract. This extends the earlier snapshot review. It does not use a Git comparison.

Standards sources were the supplied working preferences, `GLOSSARY.md`, and accepted ADRs 0001–0003. No additional local coding standard was found. Fowler smells were assessed as judgment calls, separately from documented requirements. Tool-enforced formatting and type checks were excluded.

The workbook defines common fields once and preserves platform-specific mapping rules. Comparing both contracts found only three purpose clarifications. Native workspace identity now explicitly excludes workspace subtype. Input names, types, required flags, platform rules, and ordering remain unchanged. Shared artifact paths identify the current workbook separately from historical material.

The packager uses hidden, unique staging files and removes them after success or failure. It excludes earlier temporary archives from inputs. This resolves the initial finding that a failed archive could enter the next package. Saved archive bytes and current public copies are checked against their source inputs.

The baseline creator rejects linked inputs and paths outside its destination. It verifies file inventory and checksums before finalization. Windows rename retries are bounded. Its fallback passes paths through environment variables, checks both parent paths and directory attributes, and requires an absent destination. PowerShell uses literal paths, no force flag, and a bounded timeout. Finalization verifies the saved manifest and all file checksums again. Preview freshness is checked against current public resources and an in-memory Vite compilation. The manifest records application, workbook, and schema versions separately and includes the current workbook handoff.

The local release guard runs before mutations. Ordinary development preparation remains limited to documentation. These changes neither modify registry storage nor publish externally.

No new duplication, unnecessary abstraction, or scattered responsibility justified a Fowler finding. This is a code and contract review, not an installed-platform certification. The parent task records workbook rendering, browser validation, and the final frozen manifest separately.
