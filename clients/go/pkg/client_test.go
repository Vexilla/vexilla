package internal

import (
	"net/http"
	"testing"
)

func TestClient(tester *testing.T) {
	groupName := "Gradual"
	uuid := "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"

	client := NewClient("dev", "http://localhost:3000", uuid, false)

	manifestErr := client.SyncManifest(func(url string) (*http.Response, error) {
		return http.Get(url)
	})

	if manifestErr != nil {
		tester.Fatal(manifestErr)
	}

	groupErr := client.SyncFlags(groupName, func(url string) (*http.Response, error) {
		return http.Get(url)
	})

	if groupErr != nil {
		tester.Fatal(groupErr)
	}

	shouldGradual, err := client.Should(groupName, "testingWorkingGradual")

	if err != nil {
		tester.Fatal(err)
	}

	if shouldGradual == false {
		tester.Fatalf("testingWorkingGradual should have been true: %v", shouldGradual)
	}

	shouldNotGradual, err := client.Should(groupName, "testingNonWorkingGradual")

	if err != nil {
		tester.Fatal(err)
	}

	if shouldNotGradual == true {
		tester.Fatalf("testingNonWorkingGradual should have been false: %v", shouldNotGradual)
	}

}
