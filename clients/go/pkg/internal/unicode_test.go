package internal

import "testing"

func TestUnicodeIsCheckedBeforeJSONReplacement(t *testing.T) {
	for _, text := range []string{`"\ud800"`, `"\udfff"`, `"\ud800x"`, `{"\ud800":0}`, string([]byte{'"', 0xed, 0xa0, 0x80, '"'})} {
		if err := validateJSONUnicode([]byte(text)); err == nil {
			t.Fatalf("Accepted malformed Unicode: %q", text)
		}
	}
	for _, text := range []string{`"\ud83d\ude00"`, `"\ufffd"`, `"\\ud800"`, `"\u0000"`, `"😀"`} {
		if err := validateJSONUnicode([]byte(text)); err != nil {
			t.Fatalf("Rejected valid Unicode %q: %v", text, err)
		}
	}
	bad := string([]byte{0xed, 0xa0, 0x80})
	if err := ValidateUnicode(Manifest{Version: "v1", Groups: []ManifestGroup{{GroupId: "g", Name: GroupName(bad)}}}); err == nil {
		t.Fatal("Native Unicode was repaired during serialization")
	}
	if _, err := InstanceText(bad); err == nil {
		t.Fatal("Malformed native instance ID accepted")
	}
}
