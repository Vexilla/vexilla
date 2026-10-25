package vexilla

import (
	"bytes"
	"errors"
	"io"
	"log"
	"net/http"
	"strings"
	"testing"
)

func TestDiagnosticsAreOptInAndPreserveFailures(t *testing.T) {
	originalWriter, originalFlags := log.Writer(), log.Flags()
	defer log.SetOutput(originalWriter)
	defer log.SetFlags(originalFlags)
	log.SetFlags(0)
	for _, showLogs := range []bool{false, true} {
		var diagnostics bytes.Buffer
		log.SetOutput(&diagnostics)
		client := NewClient("prod", "https://private-token@contract", "private-instance", showLogs)
		manifest, err := client.GetManifest(func(string) (*http.Response, error) {
			return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(`{"version":"v1","groups":[]}`))}, nil
		})
		if err != nil {
			t.Fatal(err)
		}
		if err := client.SetManifest(manifest); err != nil {
			t.Fatal(err)
		}
		_, err = client.GetManifest(func(string) (*http.Response, error) { return nil, errors.New("private-callback-error") })
		if err == nil {
			t.Fatal("Fetch failure was swallowed")
		}
		manifest.Version = "invalid"
		if err := client.SetManifest(manifest); err == nil {
			t.Fatal("Validation failure was swallowed")
		}
		if !showLogs {
			if diagnostics.Len() != 0 {
				t.Fatalf("Disabled diagnostics: %s", diagnostics.String())
			}
			continue
		}
		for _, expected := range []string{"manifest.fetch outcome=success", "manifest.install outcome=success", "manifest.fetch outcome=failure", "manifest.install outcome=failure"} {
			if !strings.Contains(diagnostics.String(), expected) {
				t.Fatalf("Missing %s: %s", expected, diagnostics.String())
			}
		}
		if strings.Contains(diagnostics.String(), "private-") {
			t.Fatal("Diagnostics exposed private data")
		}
	}
}
