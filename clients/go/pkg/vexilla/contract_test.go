package vexilla

import (
	"encoding/json"
	"errors"
	"fmt"
	internal "github.com/vexilla/vexilla/clients/go/pkg/internal"
	"io"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"reflect"
	"strconv"
	"strings"
	"testing"
	"time"
)

type observation struct {
	CaseID  string      `json:"caseId"`
	Outcome interface{} `json:"outcome"`
}

func contractOutcome(value interface{}, err error) interface{} {
	if err == nil {
		return map[string]interface{}{"value": value}
	}
	var contract *internal.ContractError
	if errors.As(err, &contract) {
		return map[string]interface{}{"error": contract.Kind}
	}
	switch err.(type) {
	case *internal.GroupLookupError, *internal.EnvironmentLookupError, *internal.FeatureLookUpError:
		return map[string]interface{}{"error": "lookup"}
	case *internal.FeatureTypeError:
		return map[string]interface{}{"error": "kind"}
	case *json.SyntaxError, *json.UnmarshalTypeError, *json.UnsupportedValueError, *json.MarshalerError:
		return map[string]interface{}{"error": "validation"}
	default:
		panic(err)
	}
}
func patchKeys(pointer string) []string {
	result := strings.Split(strings.TrimPrefix(pointer, "/"), "/")
	for i, key := range result {
		result[i] = strings.ReplaceAll(strings.ReplaceAll(key, "~1", "/"), "~0", "~")
	}
	return result
}
func patchAt(value interface{}, keys []string) interface{} {
	for _, key := range keys {
		if object, ok := value.(map[string]interface{}); ok {
			value = object[key]
		} else {
			i, _ := strconv.Atoi(key)
			value = value.([]interface{})[i]
		}
	}
	return value
}
func patchSet(value interface{}, keys []string, op string, item interface{}) interface{} {
	if object, ok := value.(map[string]interface{}); ok {
		if len(keys) > 1 {
			object[keys[0]] = patchSet(object[keys[0]], keys[1:], op, item)
		} else if op == "remove" {
			delete(object, keys[0])
		} else {
			object[keys[0]] = item
		}
		return object
	}
	array := value.([]interface{})
	i, err := strconv.Atoi(keys[0])
	if err != nil {
		panic(err)
	}
	if len(keys) > 1 {
		array[i] = patchSet(array[i], keys[1:], op, item)
	} else if op == "remove" {
		array = append(array[:i], array[i+1:]...)
	} else if i == len(array) {
		array = append(array, item)
	} else {
		array[i] = item
	}
	return array
}
func patch(value interface{}, mutations []interface{}) interface{} {
	for _, raw := range mutations {
		m := raw.(map[string]interface{})
		op := m["op"].(string)
		item := m["value"]
		if wire, ok := m["wireString"].(string); ok {
			item = json.RawMessage(wire)
		}
		if op == "copy" {
			bytes, err := json.Marshal(patchAt(value, patchKeys(m["from"].(string))))
			if err != nil {
				panic(err)
			}
			if err := json.Unmarshal(bytes, &item); err != nil {
				panic(err)
			}
		}
		if token, ok := m["nativeNumber"].(string); ok {
			switch token {
			case "NaN":
				item = math.NaN()
			case "Infinity":
				item = math.Inf(1)
			case "-Infinity":
				item = math.Inf(-1)
			}
		}
		value = patchSet(value, patchKeys(m["path"].(string)), op, item)
	}
	return value
}
func shouldContract(c *Client, group, feature string, instance interface{}) (bool, error) {
	switch value := instance.(type) {
	case string:
		return c.ShouldCustomString(group, feature, value)
	case float64:
		return c.ShouldCustomFloat(group, feature, value)
	case nil:
		return c.Should(group, feature)
	default:
		// Typed overloads cannot take booleans; the public default-ID field can.
		old := c.InstanceId
		c.InstanceId = instance
		defer func() { c.InstanceId = old }()
		return c.Should(group, feature)
	}
}
func valueContract(c *Client, group, feature string, fallback interface{}) (interface{}, error) {
	// Select the existing native value accessor from the installed wire subtype.
	if strings.Contains(feature, "float") || feature == "Value Float" {
		value, err := c.ValueFloat(group, feature, 0)
		return value, err
	}
	if strings.Contains(feature, "string") || feature == "Value String" {
		text, _ := fallback.(string)
		value, err := c.ValueString(group, feature, text)
		return value, err
	}
	numeric, _ := fallback.(float64)
	value, err := c.ValueInt(group, feature, int64(numeric))
	return value, err
}
func TestSharedContract(t *testing.T) {
	dir := os.Getenv("VEXILLA_CONTRACT_DIR")
	if dir == "" {
		t.Skip("Run through contract/scripts/run.cjs")
	}
	read := func(name string) interface{} {
		bytes, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			t.Fatal(err)
		}
		var value interface{}
		if err := json.Unmarshal(bytes, &value); err != nil {
			t.Fatal(err)
		}
		return value
	}
	readBytes := func(name string) []byte {
		bytes, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			t.Fatal(err)
		}
		return bytes
	}
	expected, parity := read("expected.json").(map[string]interface{}), read("parity.json").(map[string]interface{})
	fetch := func(url string) (*http.Response, error) {
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(string(readBytes(filepath.Base(url)))))}, nil
	}
	newClient := func(env string, instance interface{}) *Client {
		c := NewClient(env, "https://contract", instance, false)
		return &c
	}
	observations := []observation{}
	observe := func(id string, actual, wanted interface{}) {
		bytes, err := json.Marshal(actual)
		if err != nil {
			t.Fatal(err)
		}
		var normalized interface{}
		if err := json.Unmarshal(bytes, &normalized); err != nil {
			t.Fatal(err)
		}
		if !reflect.DeepEqual(normalized, wanted) {
			t.Fatalf("%s: got %#v, expected %#v", id, normalized, wanted)
		}
		observations = append(observations, observation{id, actual})
	}
	for _, section := range []string{"hashes", "numbers", "gradual", "schedules", "validation", "operations", "aliases", "timezones"} {
		for _, raw := range parity[section].([]interface{}) {
			sample := raw.(map[string]interface{})
			id := sample["id"].(string)
			var actual interface{}
			switch section {
			case "hashes":
				actual = contractOutcome(internal.HashFnv32a(sample["text"].(string)), nil)
			case "numbers":
				text, err := internal.InstanceText(sample["instance"])
				if err != nil {
					t.Fatal(err)
				}
				actual = contractOutcome(map[string]interface{}{"text": text, "hash": internal.HashFnv32a(text)}, nil)
			case "gradual":
				c := newClient("prod", "member")
				if err := c.SyncManifest(fetch); err != nil {
					t.Fatal(err)
				}
				g := read("contract-group.json").(map[string]interface{})
				f := g["environments"].(map[string]interface{})["prod"].(map[string]interface{})["features"].(map[string]interface{})["gradual"].(map[string]interface{})
				f["seed"], f["value"] = sample["seed"], sample["threshold"]
				bytes, err := json.Marshal(g)
				if err != nil {
					t.Fatal(err)
				}
				var group internal.Group
				if err := json.Unmarshal(bytes, &group); err != nil {
					t.Fatal(err)
				}
				if err := c.SetFlags(group); err != nil {
					t.Fatal(err)
				}
				enabled, err := shouldContract(c, "contract-group", "gradual", sample["instance"])
				if err != nil {
					t.Fatal(err)
				}
				text, _ := internal.InstanceText(sample["instance"])
				actual = contractOutcome(map[string]interface{}{"bucket": internal.HashStringInstanceID(text, sample["seed"].(float64)), "enabled": enabled}, nil)
			case "schedules":
				bytes, _ := json.Marshal(sample["schedule"])
				var schedule internal.Schedule
				if err := json.Unmarshal(bytes, &schedule); err != nil {
					t.Fatal(err)
				}
				actual = contractOutcome(internal.IsScheduleActiveWithNow(schedule, internal.ScheduleType(sample["scheduleType"].(string)), time.UnixMilli(int64(sample["now"].(float64)))), nil)
			case "validation":
				validate := func(fetched bool) error {
					source := map[string]interface{}{"manifest": read("manifest.json"), "groups": map[string]interface{}{"contract-group": read("contract-group.json")}}
					patch(source, sample["mutations"].([]interface{}))
					c := newClient("prod", "member")
					bytes, err := json.Marshal(source["manifest"])
					if err != nil {
						return err
					}
					if fetched {
						err = c.SyncManifest(func(string) (*http.Response, error) {
							return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(string(bytes)))}, nil
						})
					} else {
						var m internal.Manifest
						err = json.Unmarshal(bytes, &m)
						if err == nil {
							err = c.SetManifest(m)
						}
					}
					if err != nil {
						return err
					}
					for key, value := range source["groups"].(map[string]interface{}) {
						bytes, err = json.Marshal(value)
						if err != nil {
							return err
						}
						if fetched {
							err = c.SyncFlags(key, func(string) (*http.Response, error) {
								return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(string(bytes)))}, nil
							})
						} else {
							var g internal.Group
							err = json.Unmarshal(bytes, &g)
							if err == nil {
								err = c.SetFlags(g)
							}
						}
						if err != nil {
							return err
						}
					}
					return nil
				}
				a, b := validate(false), validate(true)
				direct, fetched := contractOutcome(true, a), contractOutcome(true, b)
				if !reflect.DeepEqual(direct, fetched) {
					t.Fatalf("%s: ingestion paths differ: %v/%v", id, a, b)
				}
				actual = direct
			case "operations":
				clients := map[string]*Client{}
				data := map[string]interface{}{}
				results := []interface{}{}
				for _, rawStep := range sample["steps"].([]interface{}) {
					step := rawStep.(map[string]interface{})
					clientID, _ := step["client"].(string)
					c := clients[clientID]
					op := step["op"].(string)
					value, err := func() (interface{}, error) {
						key, _ := step["data"].(string)
						group, _ := step["group"].(string)
						feature, _ := step["feature"].(string)
						callback := func(string) (*http.Response, error) {
							conf := step["callback"].(map[string]interface{})
							if conf["throws"] == true {
								return nil, errors.New("Deliberate transport failure")
							}
							var v interface{}
							if name, ok := conf["file"].(string); ok {
								v = read(name)
							} else {
								v = data[conf["data"].(string)]
							}
							bytes, err := json.Marshal(v)
							if err != nil {
								return nil, err
							}
							return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(string(bytes)))}, nil
						}
						switch op {
						case "load":
							data[step["as"].(string)] = read(step["file"].(string))
						case "new":
							clients[clientID] = newClient(step["environment"].(string), step["instance"])
						case "mutate":
							data[key] = patch(data[key], step["mutations"].([]interface{}))
						case "setManifest":
							if m, ok := data[key].(internal.Manifest); ok {
								return nil, c.SetManifest(m)
							}
							bytes, err := json.Marshal(data[key])
							if err != nil {
								return nil, err
							}
							var m internal.Manifest
							if err := json.Unmarshal(bytes, &m); err != nil {
								return nil, err
							}
							return nil, c.SetManifest(m)
						case "setFlags":
							if g, ok := data[key].(internal.Group); ok {
								return nil, c.SetFlags(g)
							}
							bytes, err := json.Marshal(data[key])
							if err != nil {
								return nil, err
							}
							var g internal.Group
							if err := json.Unmarshal(bytes, &g); err != nil {
								return nil, err
							}
							return nil, c.SetFlags(g)
						case "getManifest":
							m, err := c.GetManifest(callback)
							if err != nil {
								return nil, err
							}
							data[step["as"].(string)] = m
						case "getFlags":
							g, err := c.GetFlags(group, callback)
							if err != nil {
								return nil, err
							}
							data[step["as"].(string)] = g
						case "syncManifest":
							return nil, c.SyncManifest(callback)
						case "syncFlags":
							return nil, c.SyncFlags(group, callback)
						case "should":
							return shouldContract(c, group, feature, step["instance"])
						case "value":
							return valueContract(c, group, feature, step["default"])
						default:
							panic("Unknown operation: " + op)
						}
						return nil, nil
					}()
					results = append(results, contractOutcome(value, err))
				}
				actual = contractOutcome(results, nil)
			case "aliases":
				actual = contractOutcome(internal.NormalizeName(sample["name"].(string)), nil)
			case "timezones":
				c := newClient("prod", "member")
				if err := c.SyncManifest(fetch); err != nil {
					t.Fatal(err)
				}
				group := read("contract-group.json").(map[string]interface{})
				group["features"].(map[string]interface{})["toggle"].(map[string]interface{})["schedule"].(map[string]interface{})["timezone"] = sample["timezone"]
				bytes, _ := json.Marshal(group)
				var g internal.Group
				err := json.Unmarshal(bytes, &g)
				if err == nil {
					err = c.SetFlags(g)
				}
				actual = contractOutcome(err == nil, nil)
			}
			observe(id, actual, sample["expected"])
		}
	}
	for _, rawEnv := range expected["environments"].([]interface{}) {
		env := rawEnv.(map[string]interface{})
		for _, mode := range []string{"id", "name", "alias"} {
			name := func(id, label string) string {
				if mode == "id" {
					return id
				}
				if mode == "name" {
					return label
				}
				return internal.NormalizeName(label)
			}
			c := newClient(name(env["id"].(string), env["name"].(string)), "member")
			if err := c.SyncManifest(fetch); err != nil {
				t.Fatal(err)
			}
			group := name(expected["groupId"].(string), expected["groupName"].(string))
			if err := c.SyncFlags(group, fetch); err != nil {
				t.Fatal(err)
			}
			for i, rawCase := range expected["cases"].([]interface{}) {
				sample := rawCase.(map[string]interface{})
				feature := name(sample["id"].(string), sample["name"].(string))
				var value interface{}
				var err error
				if sample["kind"] == "value" {
					value, err = valueContract(c, group, feature, "fallback")
				} else {
					value, err = shouldContract(c, group, feature, sample["instance"])
				}
				observe(fmt.Sprintf("publication/%s/%s/%d", env["id"], mode, i), contractOutcome(value, err), map[string]interface{}{"value": env[sample["expectedKey"].(string)]})
			}
			var decoded internal.Group
			if err := json.Unmarshal(readBytes("contract-group.json"), &decoded); err != nil {
				t.Fatal(err)
			}
			scheduled := append(expected["scheduled"].([]interface{}), "scheduled-active")
			for _, rawID := range scheduled {
				id := rawID.(string)
				var f internal.Feature
				if err := json.Unmarshal(decoded.Environments[internal.EnvironmentId(env["id"].(string))].RawFeatures[internal.FeatureId(id)], &f); err != nil {
					t.Fatal(err)
				}
				observe(fmt.Sprintf("publication/%s/%s/schedule/%s", env["id"], mode, id), contractOutcome(internal.IsScheduleActiveWithNow(f.Schedule, f.ScheduleType, time.UnixMilli(int64(expected["referenceClock"].(float64)))), nil), map[string]interface{}{"value": id == "scheduled-active"})
			}
		}
	}
	if file := os.Getenv("VEXILLA_OBSERVATIONS_FILE"); file != "" {
		bytes, err := json.Marshal(map[string]interface{}{"protocol": 1, "sdk": "go", "runs": []interface{}{map[string]interface{}{"runtime": "native", "observations": observations}}})
		if err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(file, bytes, 0600); err != nil {
			t.Fatal(err)
		}
	}
}

func TestSharedContractSnapshots(t *testing.T) {
	dir := os.Getenv("VEXILLA_CONTRACT_DIR")
	if dir == "" {
		t.Skip("Run through contract/scripts/run.cjs")
	}
	decode := func(file string, target interface{}) {
		data, err := os.ReadFile(filepath.Join(dir, file))
		if err != nil {
			t.Fatal(err)
		}
		if err := json.Unmarshal(data, target); err != nil {
			t.Fatal(err)
		}
	}
	c := NewClient("prod", "https://contract", "member", false)
	var manifest internal.Manifest
	var group internal.Group
	decode("manifest.json", &manifest)
	decode("contract-group.json", &group)
	if err := c.SetManifest(manifest); err != nil {
		t.Fatal(err)
	}
	if err := c.SetFlags(group); err != nil {
		t.Fatal(err)
	}
	feature := group.Environments["prod"].ToggleFeatures["toggle"]
	feature.Value = false
	group.Environments["prod"].ToggleFeatures["toggle"] = feature
	public := c.FlagGroups["contract-group"].Environments["prod"].ToggleFeatures["toggle"]
	public.Value = false
	c.FlagGroups["contract-group"].Environments["prod"].ToggleFeatures["toggle"] = public
	manifest.Groups[0].Name = "Changed"
	c.Manifest.Groups[0].Name = "Changed public copy"
	if enabled, err := c.Should("Contract", "Toggle"); err != nil || !enabled {
		t.Fatalf("Caller mutation affected snapshot: %v/%v", enabled, err)
	}
	gradual := group.Environments["prod"].GradualFeatures["gradual"]
	gradual.Seed = 0
	group.Environments["prod"].GradualFeatures["gradual"] = gradual
	if err := c.SetFlags(group); err == nil {
		t.Fatal("Invalid direct setter accepted")
	}
	if enabled, err := c.Should("Contract", "Toggle"); err != nil || !enabled {
		t.Fatal("Invalid replacement changed snapshot")
	}
	if err := c.SetManifest(internal.Manifest{Version: "v1"}); err == nil {
		t.Fatal("Null groups accepted")
	}
	if _, err := c.ShouldCustomInt("Contract", "Gradual", math.MaxInt64); err == nil {
		t.Fatal("Inexact integer ID accepted")
	}
}
