package internal

import (
	"testing"
)

func TestHashing(tester *testing.T) {

	uuid := "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"

	workingGradual := float64(0.11)
	nonWorkingGradual := float64(0.22)

	shouldWorkValue := HashInstanceID(uuid, workingGradual)
	shouldntWorkValue := HashInstanceID(uuid, nonWorkingGradual)

	if shouldWorkValue >= 40 {
		tester.Fatal()
	}

	if shouldntWorkValue < 40 {
		tester.Fatal()
	}

}