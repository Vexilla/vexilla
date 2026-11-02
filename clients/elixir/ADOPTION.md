# Retained major-2 adoption scope

Elixir remains unmanaged and publication-disabled pending Hex workload identity
access and reviewed adoption evidence. Its published baseline and truthful working
seed are 1.0.1. While the common policy remains major 2, its first automated
release targets exactly 2.0.0.

Retain the breaking transition input after the original shared history boundary:
contract parity and validation, hashing/scheduling fixes, production Jason and
HTTPoison dependencies, corrected vexilla_client package identity, compatibility
asset, package allowlist, docs source links and isolated production/docs consumers.
Do not move the global boundary when Hex becomes available or consume this
history merely because JS/Rust release first. No stored Hex API key fallback is
part of the design.

If policy advances to major 3 while Elixir is inactive, revise the adoption design
and prove the current-major proposal from the truthful 1.x seed before management.
Simply relabeling the target cannot establish that transition. See
[the adoption checklist](../../docs/sdk-release-adoption.md).
