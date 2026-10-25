import logging
import pytest
from vexilla_client.client import VexillaClient, FetchError
from vexilla_client.types import Manifest


def test_diagnostics_are_opt_in_and_preserve_failures(caplog):
    caplog.set_level(logging.INFO, logger="vexilla_client.client")
    for show_logs in (False, True):
        caplog.clear()
        client = VexillaClient(
            "https://private-token@contract", "prod", "private-instance", show_logs
        )
        manifest = client.get_manifest(lambda _: '{"version":"v1","groups":[]}')
        client.set_manifest(manifest)

        def failing_fetch(_):
            raise RuntimeError("private-callback-error")

        with pytest.raises(FetchError):
            client.get_manifest(failing_fetch)
        with pytest.raises(ValueError):
            client.set_manifest(Manifest.construct(version="invalid", groups=[]))
        diagnostics = [record.getMessage() for record in caplog.records]
        if show_logs:
            assert diagnostics == [
                "vexilla operation=manifest.fetch outcome=success",
                "vexilla operation=manifest.install outcome=success",
                "vexilla operation=manifest.fetch outcome=failure",
                "vexilla operation=manifest.install outcome=failure",
            ]
            assert all("private-" not in diagnostic for diagnostic in diagnostics)
        else:
            assert diagnostics == []
