package vexilla

import (
	"encoding/json"
	internal "github.com/vexilla/vexilla/clients/go/pkg/internal"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestSharedContractSeedBounds(t *testing.T) {
	dir := os.Getenv("VEXILLA_CONTRACT_DIR")
	if dir == "" {
		t.Skip("Generate shared contract artifacts first")
	}
	read := func(name string) []byte {
		data, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			t.Fatal(err)
		}
		return data
	}
	var expected struct {
		SeedCases []struct {
			Value interface{} `json:"value"`
			Valid bool        `json:"valid"`
		} `json:"seedCases"`
	}
	if err := json.Unmarshal(read("expected.json"), &expected); err != nil {
		t.Fatal(err)
	}
	for _, sample := range expected.SeedCases {
		var group map[string]interface{}
		if err := json.Unmarshal(read("contract-group.json"), &group); err != nil {
			t.Fatal(err)
		}
		group["environments"].(map[string]interface{})["dev"].(map[string]interface{})["features"].(map[string]interface{})["gradual"].(map[string]interface{})["seed"] = sample.Value
		body, err := json.Marshal(group)
		if err != nil {
			t.Fatal(err)
		}
		client := NewClient("dev", "https://contract", "member", false)
		fetch := func(url string) (*http.Response, error) {
			content := body
			if filepath.Base(url) == "manifest.json" {
				content = read("manifest.json")
			}
			return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(string(content)))}, nil
		}
		if err := client.SyncManifest(fetch); err != nil {
			t.Fatal(err)
		}
		_, err = client.GetFlags("contract-group", fetch)
		if (err == nil) != sample.Valid {
			t.Fatalf("seed %v: error %v, valid %v", sample.Value, err, sample.Valid)
		}
	}
}

func TestSharedContract(t *testing.T) {
	dir := os.Getenv("VEXILLA_CONTRACT_DIR")
	if dir == "" {
		t.Skip("Generate shared contract artifacts first")
	}
	read := func(name string) []byte {
		b, e := os.ReadFile(filepath.Join(dir, name))
		if e != nil {
			t.Fatal(e)
		}
		return b
	}
	var expected struct {
		Clock        int64                    `json:"referenceClock"`
		GroupID      string                   `json:"groupId"`
		GroupName    string                   `json:"groupName"`
		Environments []map[string]interface{} `json:"environments"`
		Cases        []struct {
			ID       string      `json:"id"`
			Name     string      `json:"name"`
			Kind     string      `json:"kind"`
			Key      string      `json:"expectedKey"`
			Instance interface{} `json:"instance"`
		} `json:"cases"`
		Scheduled []string `json:"scheduled"`
	}
	if e := json.Unmarshal(read("expected.json"), &expected); e != nil {
		t.Fatal(e)
	}
	fetch := func(url string) (*http.Response, error) {
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(string(read(filepath.Base(url)))))}, nil
	}
	for _, env := range expected.Environments {
		for _, names := range []bool{false, true} {
			eid, group := env["id"].(string), expected.GroupID
			if names {
				eid = env["name"].(string)
				group = expected.GroupName
			}
			client := NewClient(eid, "https://contract", "member", false)
			if e := client.SyncManifest(fetch); e != nil {
				t.Fatal(e)
			}
			decoded, e := client.GetFlags(group, fetch)
			if e != nil {
				t.Fatal(e)
			}
			if e := client.SetFlags(decoded); e != nil {
				t.Fatal(e)
			}
			if decoded.Environments[internal.EnvironmentId(env["id"].(string))].GradualFeatures["gradual"].Seed != env["seed"].(float64) {
				t.Fatal("seed lost")
			}
			for _, c := range expected.Cases {
				fid := c.ID
				if names {
					fid = c.Name
				}
				var got interface{}
				var err error
				if c.Kind == "value" {
					switch c.Key {
					case "string":
						got, err = client.ValueString(group, fid, "fallback")
					case "int":
						var n int64
						n, err = client.ValueInt(group, fid, -1)
						got = float64(n)
					case "float":
						got, err = client.ValueFloat(group, fid, -1)
					}
				} else {
					switch n := c.Instance.(type) {
					case string:
						got, err = client.ShouldCustomString(group, fid, n)
					case float64:
						if c.ID == "selective-int" {
							got, err = client.ShouldCustomInt(group, fid, int64(n))
						} else {
							got, err = client.ShouldCustomFloat(group, fid, n)
						}
					}
				}
				if err != nil || got != env[c.Key] {
					t.Fatalf("%s/%s: got %v (%v), want %v", eid, fid, got, err, env[c.Key])
				}
			}
			for _, fid := range append(append([]string{}, expected.Scheduled...), "scheduled-active") {
				f := decoded.Environments[internal.EnvironmentId(env["id"].(string))].ToggleFeatures[internal.FeatureId(fid)]
				if internal.IsScheduleActiveWithNow(f.Schedule, f.ScheduleType, time.UnixMilli(expected.Clock)) != (fid == "scheduled-active") {
					t.Fatal("reference clock: " + fid)
				}
			}
			for _, fid := range expected.Scheduled {
				got, err := client.Should(group, fid)
				if err != nil || got {
					t.Fatalf("schedule %s: %v %v", fid, got, err)
				}
			}
		}
	}
}
