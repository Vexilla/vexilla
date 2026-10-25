package internal

import (
	_ "embed"
	"encoding/json"
	"regexp"
	"strings"
)

//go:embed compatibility.json
var compatibilityJSON []byte
var compatibility struct {
	Timezone struct {
		Identifiers   []string `json:"identifiers"`
		OffsetPattern string   `json:"offsetPattern"`
	} `json:"timezone"`
	Unicode struct {
		Lower           map[string]string `json:"lower"`
		CasedRanges     [][2]int          `json:"casedRanges"`
		IgnorableRanges [][2]int          `json:"ignorableRanges"`
	} `json:"unicode"`
}
var timezoneNames = map[string]bool{}
var offsetPattern *regexp.Regexp

func init() {
	if err := json.Unmarshal(compatibilityJSON, &compatibility); err != nil {
		panic(err)
	}
	for _, name := range compatibility.Timezone.Identifiers {
		timezoneNames[asciiLower(name)] = true
	}
	offsetPattern = regexp.MustCompile(compatibility.Timezone.OffsetPattern)
}
func asciiLower(value string) string {
	return strings.Map(func(r rune) rune {
		if r >= 'A' && r <= 'Z' {
			return r + 32
		}
		return r
	}, value)
}
func IsCompatibleTimezone(value string) bool {
	return timezoneNames[asciiLower(value)] || offsetPattern.MatchString(value)
}
func inRanges(code rune, ranges [][2]int) bool {
	first, last := 0, len(ranges)-1
	for first <= last {
		mid := (first + last) / 2
		if int(code) < ranges[mid][0] {
			last = mid - 1
		} else if int(code) > ranges[mid][1] {
			first = mid + 1
		} else {
			return true
		}
	}
	return false
}
func lowerName(text string) string {
	chars := []rune(text)
	var out strings.Builder
	for i, r := range chars {
		if r == 'Σ' {
			before, after := i-1, i+1
			for before >= 0 && inRanges(chars[before], compatibility.Unicode.IgnorableRanges) {
				before--
			}
			for after < len(chars) && inRanges(chars[after], compatibility.Unicode.IgnorableRanges) {
				after++
			}
			if before >= 0 && inRanges(chars[before], compatibility.Unicode.CasedRanges) && (after == len(chars) || !inRanges(chars[after], compatibility.Unicode.CasedRanges)) {
				out.WriteRune('ς')
			} else {
				out.WriteRune('σ')
			}
		} else if lower, ok := compatibility.Unicode.Lower[string(r)]; ok {
			out.WriteString(lower)
		} else {
			out.WriteRune(r)
		}
	}
	return out.String()
}
func baseUpper(r rune) bool {
	return r >= 'A' && r <= 'Z' || r >= 192 && r <= 214 || r >= 216 && r <= 222
}
func baseLower(r rune) bool {
	return r >= 'a' && r <= 'z' || r >= 223 && r <= 246 || r >= 248 && r <= 255
}
func nameSymbol(r rune) bool {
	return r >= 32 && r <= 38 || r >= 40 && r <= 47 || r >= 58 && r <= 64 || r >= 91 && r <= 96 || r >= 123 && r <= 126 || r >= 160 && r <= 191 || r == 215 || r == 247
}
func NormalizeName(text string) string {
	chars := []rune(text)
	hasLower, hasRoom := false, false
	for _, r := range chars {
		hasLower = hasLower || baseLower(r)
		hasRoom = hasRoom || nameSymbol(r)
	}
	if len(chars) > 0 && !hasLower {
		text = lowerName(text)
		chars = []rune(text)
	}
	if !hasRoom {
		var out strings.Builder
		for i := 0; i < len(chars); {
			j := i + 1
			for j < len(chars) && baseUpper(chars[j]) {
				j++
			}
			out.WriteRune(chars[i])
			if !baseUpper(chars[i]) && j > i+1 {
				out.WriteByte(' ')
				if j > i+2 {
					out.WriteString(string(chars[i+1 : j-1]))
					out.WriteByte(' ')
				}
				out.WriteRune(chars[j-1])
				i = j
			} else {
				i++
			}
		}
		text = out.String()
	}
	chars = []rune(lowerName(text))
	var out strings.Builder
	for i := 0; i < len(chars); {
		if nameSymbol(chars[i]) {
			for i < len(chars) && nameSymbol(chars[i]) {
				i++
			}
			if i < len(chars) {
				out.WriteByte('-')
				out.WriteRune(chars[i])
				i++
			}
		} else {
			out.WriteRune(chars[i])
			i++
		}
	}
	return strings.ReplaceAll(out.String(), "'", "")
}
