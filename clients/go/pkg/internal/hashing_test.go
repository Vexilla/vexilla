package internal

import (
	"testing"
)

func TestHashing(tester *testing.T) {

	uuid := "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"

	workingGradual := float64(0.32)
	nonWorkingGradual := float64(0.22)

	shouldWorkValue := HashStringInstanceID(uuid, workingGradual)
	shouldntWorkValue := HashStringInstanceID(uuid, nonWorkingGradual)

	if shouldWorkValue >= 0.4 {
		tester.Fatal()
	}

	if shouldntWorkValue < 0.4 {
		tester.Fatal()
	}

}
