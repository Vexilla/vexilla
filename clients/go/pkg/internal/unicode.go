package internal

import (
	"encoding/json"
	"reflect"
	"strconv"
	"unicode/utf8"
)

// encoding/json replaces unpaired UTF-16 escapes with U+FFFD. Check original
// bytes first so a malformed string cannot become valid during decoding.
func validateJSONUnicode(data []byte) error {
	if !utf8.Valid(data) {
		return ValidationError("JSON must contain Unicode scalar values")
	}
	unit := func(i int) (uint64, error) {
		if i+6 > len(data) || data[i] != '\\' || data[i+1] != 'u' {
			return 0, ValidationError("Unpaired Unicode surrogate")
		}
		n, err := strconv.ParseUint(string(data[i+2:i+6]), 16, 16)
		if err != nil {
			return 0, ValidationError("Invalid Unicode escape")
		}
		return n, nil
	}
	for i := 0; i < len(data); i++ {
		if data[i] != '"' {
			continue
		}
		for i++; i < len(data) && data[i] != '"'; i++ {
			if data[i] != '\\' {
				continue
			}
			if i+1 >= len(data) {
				break
			}
			if data[i+1] != 'u' {
				i++
				continue
			}
			n, err := unit(i)
			if err != nil {
				return err
			}
			i += 5
			if n >= 0xd800 && n <= 0xdbff {
				next, err := unit(i + 1)
				if err != nil || next < 0xdc00 || next > 0xdfff {
					return ValidationError("Unpaired Unicode surrogate")
				}
				i += 6
			} else if n >= 0xdc00 && n <= 0xdfff {
				return ValidationError("Unpaired Unicode surrogate")
			}
		}
	}
	return nil
}

// Validate before json.Marshal can repair invalid native UTF-8 strings.
func ValidateUnicode(value interface{}) error {
	var walk func(reflect.Value) error
	walk = func(v reflect.Value) error {
		if !v.IsValid() {
			return nil
		}
		if v.Type() == reflect.TypeOf(json.RawMessage{}) {
			return validateJSONUnicode(v.Bytes())
		}
		switch v.Kind() {
		case reflect.String:
			if !utf8.ValidString(v.String()) {
				return ValidationError("Invalid native Unicode string")
			}
		case reflect.Interface, reflect.Ptr:
			if !v.IsNil() {
				return walk(v.Elem())
			}
		case reflect.Struct:
			for i := 0; i < v.NumField(); i++ {
				if err := walk(v.Field(i)); err != nil {
					return err
				}
			}
		case reflect.Map:
			for _, key := range v.MapKeys() {
				if err := walk(key); err != nil {
					return err
				}
				if err := walk(v.MapIndex(key)); err != nil {
					return err
				}
			}
		case reflect.Slice, reflect.Array:
			for i := 0; i < v.Len(); i++ {
				if err := walk(v.Index(i)); err != nil {
					return err
				}
			}
		}
		return nil
	}
	return walk(reflect.ValueOf(value))
}
