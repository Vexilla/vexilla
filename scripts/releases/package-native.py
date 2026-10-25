#!/usr/bin/env python3
"""Build and consume native SDK release artifacts without registry credentials.

Usage: python3 scripts/releases/package-native.py elixir --revision <sha> --output <dir>
The output directory receives immutable artifacts and receipt.json only after all
checks succeed. Work and consumer directories live outside the checkout.
"""
import argparse
import gzip
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[2]
PACKAGE = "vexilla_client"
STABLE = re.compile(r"^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$")


def run(command, cwd, env=None, capture=False):
    print("+ " + " ".join(map(str, command)), flush=True)
    return subprocess.run(command, cwd=cwd, env=env, check=True,
                          text=True, stdout=subprocess.PIPE if capture else None).stdout


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def unpack(archive, destination):
    """No links, devices, absolute paths or traversal in inspected packages."""
    destination.mkdir(parents=True, exist_ok=True)
    for member in archive.getmembers():
        name = PurePosixPath(member.name)
        if name.is_absolute() or ".." in name.parts or not (member.isfile() or member.isdir()):
            raise ValueError(f"Unsafe package member: {member.name}")
        path = destination.joinpath(*name.parts)
        if member.isdir():
            path.mkdir(parents=True, exist_ok=True)
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(archive.extractfile(member).read())


def inspect_files(files, sdk):
    compatibility = "priv/compatibility.json" if sdk == "elixir" else "src/compatibility.json"
    required = {"mix.exs", "README.md", "LICENSE"} if sdk == "elixir" else {
        "Cargo.toml", "Cargo.toml.orig", "Cargo.lock", "README.md", "LICENSE", "src/lib.rs"}
    required.add(compatibility)
    if not required.issubset(files):
        raise ValueError(f"Missing required package files: {sorted(required - set(files))}")
    allowed = {"README.md", "LICENSE", "CHANGELOG.md", compatibility}
    allowed |= {"mix.exs"} if sdk == "elixir" else {
        "Cargo.toml", "Cargo.toml.orig", "Cargo.lock", ".cargo_vcs_info.json"}
    source = "lib/" if sdk == "elixir" else "src/"
    for file in files:
        if file not in allowed and not (file.startswith(source) and
                file.endswith(".ex" if sdk == "elixir" else ".rs")):
            raise ValueError(f"Unexpected {sdk} package file: {file}")


def docs_archive(directory, output):
    # A reproducible gzip tar, rooted at index.html, as required by Hex docs.
    if not (directory / "index.html").is_file():
        raise ValueError("ExDoc did not generate doc/index.html")
    with output.open("wb") as raw, gzip.GzipFile(fileobj=raw, mode="wb", mtime=0, filename="") as gz:
        with tarfile.open(fileobj=gz, mode="w", format=tarfile.USTAR_FORMAT) as tar:
            for file in sorted(directory.rglob("*")):
                if file.is_symlink():
                    raise ValueError(f"Unexpected docs symlink: {file}")
                if file.is_file():
                    info = tar.gettarinfo(str(file), str(file.relative_to(directory)))
                    info.uid = info.gid = info.mtime = 0
                    info.uname = info.gname = ""
                    with file.open("rb") as stream:
                        tar.addfile(info, stream)


def elixir(version, output, work, revision):
    source = ROOT / "clients/elixir"
    env = {**os.environ, "MIX_ENV": "docs", "RELEASE_REVISION": revision}
    lock = (source / "mix.lock").read_bytes()
    run(["mix", "deps.get", "--check-locked"], source, env)
    if (source / "mix.lock").read_bytes() != lock:
        raise ValueError("Elixir dependency installation changed mix.lock")
    artifact = output / f"{PACKAGE}-{version}.tar"
    run(["mix", "hex.build", "--output", str(artifact)], source, env)
    with tarfile.open(artifact) as tar:
        if set(tar.getnames()) != {"VERSION", "CHECKSUM", "metadata.config", "contents.tar.gz"}:
            raise ValueError("Unexpected Hex archive structure")
        pieces = {name: tar.extractfile(name).read() for name in tar.getnames()}
        actual = hashlib.sha256(pieces["VERSION"] + pieces["metadata.config"] + pieces["contents.tar.gz"]).hexdigest()
        if actual != pieces["CHECKSUM"].decode().lower():
            raise ValueError("Hex inner checksum mismatch")
        metadata = pieces["metadata.config"].decode()
        if f'{{<<"name">>,<<"{PACKAGE}">>}}' not in metadata or f'{{<<"version">>,<<"{version}">>}}' not in metadata:
            raise ValueError("Hex packaged identity/version mismatch")
        with tarfile.open(fileobj=io.BytesIO(pieces["contents.tar.gz"])) as contents:
            files = sorted(x.name for x in contents.getmembers() if x.isfile())
            inspect_files(files, "elixir")
            unpack(contents, work / "sdk")
    consumer = work / "consumer"
    consumer.mkdir()
    (consumer / "mix.exs").write_text('''defmodule ReleaseConsumer.MixProject do
  use Mix.Project
  def project, do: [app: :release_consumer, version: "0.0.0", deps: [{:vexilla_client, path: "../sdk"}]]
  def application, do: [extra_applications: [:vexilla_client]]
end
''')
    # Resolve production dependencies using the reviewed SDK lock rather than
    # workspace path dependencies or an unlocked dependency upgrade.
    (consumer / "mix.lock").write_bytes(lock)
    prod = {**os.environ, "MIX_ENV": "prod"}
    run(["mix", "deps.get", "--check-locked"], consumer, prod)
    run(["mix", "run", "-e", '''{:ok, _} = Application.ensure_all_started(:vexilla_client)
true = Code.ensure_loaded?(HTTPoison)
true = Code.ensure_loaded?(Jason)
%{environment: "production"} = VexillaClient.create_config("https://example.invalid", "production", "consumer")
'''], consumer, prod)
    run(["mix", "docs"], source, env)
    docs = output / f"{PACKAGE}-{version}-docs.tar.gz"
    docs_archive(source / "doc", docs)
    return {"files": files, "innerChecksum": actual,
            "docs": {"artifact": docs.name, "sha256": sha256(docs)},
            "verification": {"package": True, "consumer": True, "docs": True}}


def rust_metadata(package, readme):
    dependencies = []
    for dep in package["dependencies"]:
        if dep.get("path"):
            raise ValueError("Packaged Rust dependency must not use a workspace path")
        dependencies.append({"name": dep["name"], "version_req": dep["req"],
            "features": dep["features"], "optional": dep["optional"],
            "default_features": dep["uses_default_features"], "target": dep["target"],
            "kind": dep["kind"] or "normal", "registry": dep.get("registry"),
            "explicit_name_in_toml": dep.get("rename")})
    metadata = {key: package.get(key) for key in ["name", "authors", "description", "documentation",
        "homepage", "keywords", "categories", "license", "license_file", "repository", "links", "rust_version"]}
    return {**metadata, "vers": package["version"], "deps": dependencies,
            "features": package["features"], "readme": readme, "readme_file": "README.md", "badges": {}}


def rust(version, output, work, revision):
    source = ROOT / "clients/rust"
    target = work / "target"
    run(["cargo", "package", "--locked", "--allow-dirty", "--target-dir", str(target)], source)
    artifact = output / f"{PACKAGE}-{version}.crate"
    shutil.copyfile(target / "package" / artifact.name, artifact)
    prefix = f"{PACKAGE}-{version}/"
    with tarfile.open(artifact) as tar:
        if any(not member.name.startswith(prefix) for member in tar.getmembers()):
            raise ValueError("Unexpected Rust archive root")
        files = sorted(x.name[len(prefix):] for x in tar.getmembers() if x.isfile())
        inspect_files(files, "rust")
        unpack(tar, work / "unpacked")
    sdk = work / "unpacked" / f"{PACKAGE}-{version}"
    package = json.loads(run(["cargo", "metadata", "--no-deps", "--locked", "--format-version", "1"], sdk, capture=True))["packages"][0]
    if package["name"] != PACKAGE or package["version"] != version:
        raise ValueError("Rust packaged identity/version mismatch")
    consumer = work / "consumer"
    (consumer / "src").mkdir(parents=True)
    # The only source dependency points to the extracted, inspected .crate.
    (consumer / "Cargo.toml").write_text(f'''[package]
name = "vexilla_release_consumer"
version = "0.0.0"
edition = "2021"
[dependencies]
vexilla_client = {{ path = {json.dumps(str(sdk))} }}
''')
    (consumer / "src/main.rs").write_text('fn main() { let _ = vexilla_client::VexillaClient::new("production", "https://example.invalid", "consumer"); }\n')
    # Keep the reviewed dependency graph; Cargo adds only the new consumer root.
    shutil.copyfile(sdk / "Cargo.lock", consumer / "Cargo.lock")
    run(["cargo", "check", "--offline"], consumer)
    run(["cargo", "run", "--locked"], consumer)
    return {"files": files, "publishMetadata": rust_metadata(package, (sdk / "README.md").read_text()),
            "verification": {"package": True, "consumer": True}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sdk", choices=["elixir", "rust"])
    parser.add_argument("--revision", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not re.fullmatch(r"[0-9a-f]{40}", args.revision):
        parser.error("--revision must be a full commit SHA")
    head = run(["git", "rev-parse", "HEAD"], ROOT, capture=True).strip()
    if head != args.revision:
        parser.error("checkout HEAD must equal the approved release revision")
    manifest = ROOT / "clients" / args.sdk / ("mix.exs" if args.sdk == "elixir" else "Cargo.toml")
    match = re.search(r'\bversion\s*(?::|=)\s*"([^"]+)"', manifest.read_text())
    if not match or not STABLE.fullmatch(match[1]):
        parser.error("native manifest requires a stable version")
    version = match[1]
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    receipt = output / "receipt.json"
    receipt.unlink(missing_ok=True)  # A failed check must never leave a success receipt.
    with tempfile.TemporaryDirectory(prefix=f"vexilla-{args.sdk}-package-") as directory:
        result = globals()[args.sdk](version, output, Path(directory), args.revision)
    artifact = f"{PACKAGE}-{version}.{'tar' if args.sdk == 'elixir' else 'crate'}"
    digest = sha256(output / artifact)
    result = {"schemaVersion": 1, "sdk": args.sdk, "package": PACKAGE, "version": version,
              "revision": args.revision, "artifact": artifact, "sha256": digest,
              "registryChecksum": digest, **result}
    receipt.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"receipt": str(receipt), "sdk": args.sdk, "version": version, "sha256": digest}))


if __name__ == "__main__":
    main()
