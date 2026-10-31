# Vexilla Client - OCaml

This is the OCaml client library for Vexilla, a static file-based VCS-native feature flag system.

## Table of Contents

- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Setup](#setup)
  - [Usage](#usage)
  - [Full Example](#full-example)
- [What are feature flags?](#what-are-feature-flags)
- [How does it work?](#how-does-it-work)
- [Support](#support)
- [API](#api)
- [Generate Types](#generate-types-optional)
- [Contributing](#contributing)

## Getting Started

To get started is easy. Follow these steps to get started with integration.

### Installation

Use the tracked source project with OCaml 4.14.1 or newer and Dune 3.10 or newer. From a checkout of this repository:

```sh
cd clients/ocaml
opam install . --deps-only
eval $(opam env)
dune build
```

The package metadata is named `vexilla_sdk`; the local Dune library is `vexilla` and the module is `Vexilla`. The library currently has no `public_name`, so these instructions use it inside the source Dune workspace rather than assuming an installed or published library.

For the full example, save the OCaml code as `examples/main.ml` inside `clients/ocaml` and add `examples/dune` containing:

```lisp
(executable
 (name main)
 (libraries vexilla lwt.unix cohttp-lwt-unix uri))
```

Run it from `clients/ocaml` with `dune exec ./examples/main.exe` after replacing the application-specific values described below. The HTTP dependencies are included in the project's opam dependency list.


### Setup

You will need to create a Client within your app. This optionally takes in the `instance_id` for use with gradual rollout as well as Selective features.

Create a client with labelled arguments, then synchronize the manifest before fetching a group. Synchronization returns an Lwt promise containing a `result`; retain the client from each `Ok client` because it contains the newly installed data. Evaluation itself returns a synchronous `result`.

Replace the base URL, environment, instance ID, and group/feature names with values from your publication. These examples use the `Gradual` group from the repository fixtures. `fetch_hook` is the raw-JSON HTTP adapter defined in the full example.


**Important Note**: All methods that make HTTP requests take in a callback for the request itself. This allows you to use your existing dependencies or standard library methods to keep this bundle smaller and less opinionated.

```ocaml
open Lwt.Infix

let client =
  Vexilla.make_client
    ~environment:(`Name "dev")
    ~base_url:(Uri.of_string "https://BUCKET_NAME.s3-website-AWS_REGION.amazonaws.com")
    ~instance_id:"b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"
    ()

let load_flags client =
  Vexilla.sync_manifest ~client ~fetch_hook >>= function
  | Error error -> Lwt.return_error error
  | Ok client ->
      Vexilla.sync_flags ~client ~fetch_hook
        (Vexilla.Private.Types.Group.Name "Gradual")
```

Await `load_flags client` and use its `Ok client` for the usage call below.


### Usage

Use the created client to check if a feature `should` be on.

```ocaml
match Vexilla.should ~client (`Name "Gradual") (`Name "testingWorkingGradual") with
| Ok true -> print_endline "Feature enabled"
| Ok false -> print_endline "Feature disabled"
| Error _ -> prerr_endline "Feature evaluation failed"
```

`Ok false` is a successful evaluation, not an error. Group and feature evaluation keys use the polymorphic variants `` `Name "..." `` or `` `Id "..." ``; group fetching uses the `Group.Name` or `Group.Id` constructors instead.


### Full Example

```ocaml
open Lwt.Infix

let fetch_hook uri =
  Lwt.catch
    (fun () ->
      Cohttp_lwt_unix.Client.get uri >>= fun (response, body) ->
      Cohttp_lwt.Body.to_string body >>= fun json ->
      let status = Cohttp.Response.status response |> Cohttp.Code.code_of_status in
      if status >= 200 && status < 300 then Lwt.return_ok json
      else Lwt.return_error (`Msg (Printf.sprintf "HTTP status %d" status)))
    (fun error -> Lwt.return_error (`Msg (Printexc.to_string error)))

let or_fail message = function
  | Ok value -> Lwt.return value
  | Error _ -> Lwt.fail_with message

let main () =
  let client =
    Vexilla.make_client
      ~environment:(`Name "dev")
      ~base_url:(Uri.of_string "https://BUCKET_NAME.s3-website-AWS_REGION.amazonaws.com")
      ~instance_id:"b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"
      ()
  in
  Vexilla.sync_manifest ~client ~fetch_hook
  >>= or_fail "Manifest synchronization failed"
  >>= fun client ->
  Vexilla.sync_flags ~client ~fetch_hook
    (Vexilla.Private.Types.Group.Name "Gradual")
  >>= or_fail "Group synchronization failed"
  >>= fun client ->
  match Vexilla.should ~client (`Name "Gradual") (`Name "testingWorkingGradual") with
  | Ok true ->
      print_endline "Feature enabled";
      Lwt.return_unit
  | Ok false ->
      print_endline "Feature disabled";
      Lwt.return_unit
  | Error _ -> Lwt.fail_with "Feature evaluation failed"

let () = Lwt_main.run (main ())
```

The example raises on `Error` results to stop startup. An application can instead inspect each error variant and choose its own recovery behavior.


## What are Feature Flags?

Feature flags are useful for enabling or disabling parts of your application without having to redeploy. In some cases, such as mobile applications, the redeploy could take up to a week.

See more about them here:

- [https://featureflags.io](https://featureflags.io)
- [https://en.wikipedia.org/wiki/Feature_toggle](https://en.wikipedia.org/wiki/Feature_toggle)

Feature Flags are also a fundamental building block for things such as A/B testing.

## How does it work?

The process is simple but has several steps to get up and running. Please see our in-depth guides in our [documentation](https://vexilla.dev/documentation).

## API

The following functions are exported from `Vexilla`. Fetch and installation operations validate publication data; keep the returned client after each successful installation or synchronization.

| Operation | Parameters and result |
| --- | --- |
| `make_client ~environment ~base_url ~instance_id ()` | Creates a client. `environment` is `` `Name string `` or `` `Id string ``, `base_url` is a `Uri.t`, and `instance_id` is a string. Optional `~show_logs:bool` defaults to `false`; `~custom_instance_id` can supply a typed instance instead of the string. |
| `get_manifest ~client ~fetch_hook` | Returns a manifest `result` inside Lwt without installing it. |
| `set_manifest ~client manifest` | Returns a synchronous `Ok client` with the installed manifest and refreshed aliases, or `Error`. Removes cached groups that no longer match the manifest. |
| `sync_manifest ~client ~fetch_hook` | Fetches and installs the manifest; returns a client `result` inside Lwt. |
| `get_flags ~client ~fetch_hook group` | Returns a group `result` inside Lwt without installing it. `group` is `Vexilla.Private.Types.Group.Name string` or `Id string`; requires an installed manifest. |
| `set_flags ~client ~group` | Validates and installs the group and lookup tables; returns a client `result` inside Lwt. Requires the group's ID/name to match the manifest. |
| `sync_flags ~client ~fetch_hook group` | Fetches and installs a group; returns a client `result` inside Lwt. |
| `should ~client group feature` | Returns `Ok bool` for a toggle, gradual, or selective feature, or `Error`. Both keys use `` `Name string `` or `` `Id string ``. |
| `should ~client ~instance_id group feature` | Evaluates with a per-call typed instance: `` `String string ``, `` `Int int ``, or `` `Float float ``. This overrides the configured instance; there is no separate custom-evaluation function. |
| `value ~client ~default ~group_key ~feature_key` | Returns a synchronous value `result`. Keys use the same variants as `should`; value/default constructors are `String`, `Int`, or `Float` from `Vexilla.Private.Types.Feature`. |

`fetch_hook` has type `` Uri.t -> (string, [ `Msg of string ]) Lwt_result.t ``: return the original JSON text, not parsed JSON. Transport failures become `` Error (`Fetch message) `` and malformed publication data becomes `` Error (`Validation message) ``. Lookup failures include `` `Flag_group_not_found ``, `` `Environment_not_found ``, and `` `Feature_not_found ``. Boolean evaluation rejects value features; `value` rejects non-value features. Invalid instances or schedules also return errors.

Use `Ok false` for a disabled boolean feature. `value` returns the supplied default only when a value feature's schedule is inactive; lookup, validation, and feature-kind failures remain `Error` results. The configured or per-call instance may also carry `` `Missing `` or `` `Invalid `` to represent unavailable/invalid input, which fails for features requiring an instance. Numeric instances must be finite and within the SDK's supported range.


## Generate Types (Optional)

We have created a tool to generate types for usage in your code. It will crawl your JSON structures and create consts or enums to help prevent typos and other "magic string" related issues. You just need to pass the URL of the JSON file where it is hosted.

### NPM

To use the tool, you can run it directly from NPM.

```
npx vexilla types ocaml REMOTE_JSON_URL
```

### Automatic Install Script

You can also use a precompiled binary for your platform. This install script will automatically choose the right binary for you:

```
curl -o- -s https://raw.githubusercontent.com/vexilla/vexilla/main/install.sh | bash
```

The install script also accepts a target install path:

```
curl -o- -s https://raw.githubusercontent.com/vexilla/vexilla/main/install.sh | bash -s -- -b /usr/local/bin/
```

### Manual Installation

If you prefer to download the binary manually you can get it from the releases section in Github, [https://github.com/vexilla/vexilla/releases](https://github.com/vexilla/vexilla/releases)

## Support

Have you run into a bug? Is there a feature you feel is missing? Feel free to create a [GitHub Issue](https://github.com/vexilla/vexilla/issues).

Another way to get support or help is to reach out in our [Discord community](https://discord.gg/GbJu3d93TC).

## Contributing

Would you like to contribute to this client SDK? There are many ways you can help. Reporting issues or creating PRs are the most obvious. Helping triage the issues and PRs of others would also be a huge help. Being a vibrant member of the community on [Discord](https://discord.gg/GbJu3d93TC) is another way to help out.

If you would like to contribute to the app, docs, or other parts of the project, please go see our [Contribution Guide](https://vexilla.dev/documentation/contributing).

## Using Vexilla in production?

We would love to add your company's logo to our usage section on the website. Please submit your name and logo url in [this issue](https://github.com/vexilla/vexilla/issues/25).

## Sponsors

No sponsors yet. This could be a link and icon for **your** company here.

## License

Current Vexilla code is released under a combination of two licenses, the Business Source License (BSL) and the MIT License.

Please see the [License file](../../../LICENSE) for more info.
