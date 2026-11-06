# Elixir major-2 adoption scope

This policy proposes release management for Elixir after the maintainer confirmed
Hex workload identity setup on 2026-11-06. Reviewing and merging its activation PR
accepts this source/history scope. Registry publication remains disabled pending
a separate publisher-activation review and the generated release PR checks.

The published baseline and truthful working seed are 1.0.1. The first automated
release targets exactly 2.0.0. Its proposed adoption source is immutable revision
5a98e333e80ed5a88a76984514081e8cebd0fa32. The historical Hex 1.0.1 source remains
d62e8aad7b36ef4b3dc7ea5e5a15c604677fcf8a; these revisions serve different purposes.

The approved shared history boundary for JS/Rust adoption is
8b4d80c05abec38d953f38b6bf59ff96462939fa. The breaking adoption commit containing
this note retains Elixir's transition input after that boundary: contract parity
and validation, hashing/scheduling fixes, production Jason/HTTPoison dependencies,
corrected vexilla_client identity, compatibility asset, package allowlist, docs
source links and isolated production/docs consumers. Its history remains
unconsumed while JS/Rust join management and release independently.

The generation policy preserves that boundary and the retained breaking input;
it changes no native package version, tag or existing JS/types/Rust 2.0.0 state.
The credential-free preflight verifies the proposed source, all eleven contract
consumers and Elixir package/production/docs consumers. The final approved release
must repeat verification at its exact source revision before publication. No
stored Hex API key fallback is part of this change.

If policy advances to major 3 while Elixir is inactive, revise its adoption design
and prove the current-major proposal from the truthful 1.x seed before management.
Simply relabeling the target cannot establish that transition. See
[the adoption checklist](../../docs/sdk-release-adoption.md).
