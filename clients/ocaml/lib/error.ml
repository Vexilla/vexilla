type t =
  [ `Invalid_manifest_version of string
  | `Flag_group_not_found
  | `Feature_not_found
  | `Environment_not_found
  | `Unsupported_should_feature_type of string ]

let to_string = function
  | `Invalid_manifest_version version ->
      Fmt.str "Invalid manifest version: %s" version
  | `Flag_group_not_found -> "Flag group not found."
  | `Feature_not_found -> "Feature not found."
  | `Environment_not_found -> "Environment not found."
  | `Unsupported_should_feature_type feature_type ->
      Fmt.str "Unsupported should feature type: %s" feature_type
  | #t -> .
