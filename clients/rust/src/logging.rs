use super::*;

#[test]
fn diagnostics_are_opt_in_and_preserve_failures() {
    for show_logs in [false, true] {
        let output = std::process::Command::new(std::env::current_exe().unwrap())
            .args(["--exact", "logging::diagnostic_probe", "--nocapture"])
            .env(
                "VEXILLA_LOGGING_PROBE",
                if show_logs { "enabled" } else { "disabled" },
            )
            .output()
            .unwrap();
        assert!(output.status.success());
        let diagnostics = String::from_utf8(output.stderr).unwrap();
        if !show_logs {
            assert!(diagnostics.is_empty(), "{}", diagnostics);
            continue;
        }
        for expected in [
            "manifest.fetch outcome=success",
            "manifest.install outcome=success",
            "manifest.fetch outcome=failure",
            "manifest.install outcome=failure",
        ] {
            assert!(
                diagnostics.contains(expected),
                "Missing {}: {}",
                expected,
                diagnostics
            );
        }
        assert!(!diagnostics.contains("private-"));
    }
}

#[test]
fn diagnostic_probe() {
    let Ok(mode) = std::env::var("VEXILLA_LOGGING_PROBE") else {
        return;
    };
    let mut client =
        VexillaClient::new("prod", "https://private-token@contract", "private-instance")
            .with_show_logs(mode == "enabled");
    let manifest = client
        .get_manifest(|_| Ok(r#"{"version":"v1","groups":[]}"#.to_owned()))
        .unwrap();
    client.set_manifest(manifest.clone()).unwrap();
    assert!(matches!(
        client.get_manifest(|_| Err(VexillaError::Fetch("private-callback-error".to_owned()))),
        Err(VexillaError::Fetch(_))
    ));
    let mut invalid_manifest = manifest;
    invalid_manifest.version = "invalid".to_owned();
    assert!(matches!(
        client.set_manifest(invalid_manifest),
        Err(VexillaError::Validation(_))
    ));
}
