package internal

import (
	"testing"
)

func TestClient(tester *testing.T) {

		client := NewClient("dev", "https://streamparrot-feature-flags.s3.amazonaws.com", "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a")
		flags, err := client.FetchFlags("features.json")
		if err != nil {
			tester.Fatal(err)
		}

		client.SetFlags(flags)

		shouldGradual := client.Should("testingWorkingGradual")

		if shouldGradual == false {
			tester.Fatalf("shouldGradual should have been true: %v", shouldGradual)
		}

		shouldNotGradual := client.Should("testingNonWorkingGradual")

		if shouldNotGradual == true {
			tester.Fatalf("shouldNotGradual should have been false: %v", shouldNotGradual)
		}

}
