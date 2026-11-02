# Retained major-2 adoption scope

Elixir remains unmanaged and publication-disabled pending Hex workload identity
access and its source/ownership/trust acceptance. Its published baseline and
truthful working seed are 1.0.1. While common policy remains major 2, its first
automated release targets exactly 2.0.0.

The approved shared history boundary for JS/Rust adoption is
8b4d80c05abec38d953f38b6bf59ff96462939fa. The breaking adoption commit containing
this note retains Elixir's transition input after that boundary: contract parity
and validation, hashing/scheduling fixes, production Jason/HTTPoison dependencies,
corrected vexilla_client identity, compatibility asset, package allowlist, docs
source links and isolated production/docs consumers. Its history remains
unconsumed while JS/Rust join management and release independently.

Do not move the global boundary when Hex becomes available. Complete Elixir's
own adoption review and credential-free docs/package preflight before management
or publication. No stored Hex API key fallback is part of this change.

If policy advances to major 3 while Elixir is inactive, revise its adoption design
and prove the current-major proposal from the truthful 1.x seed before management.
Simply relabeling the target cannot establish that transition. See
[the adoption checklist](../../docs/sdk-release-adoption.md).
