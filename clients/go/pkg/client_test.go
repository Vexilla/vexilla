package internal

import (
	"net/http"
	"testing"
)

func TestClient(tester *testing.T) {
	uuid := "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"

	client := NewClient("dev", "http://localhost:3000", uuid, false)

	manifestErr := client.SyncManifest(func(url string) (*http.Response, error) {
		return http.Get(url)
	})

	if manifestErr != nil {
		tester.Fatal(manifestErr)
	}

	groupErr := client.SyncFlags("Gradual", func(url string) (*http.Response, error) {
		return http.Get(url)
	})

	if groupErr != nil {
		tester.Fatal(groupErr)
	}

	shouldGradual, err := client.Should("Gradual", "testingWorkingGradual")

	if err != nil {
		tester.Fatal(err)
	}

	if shouldGradual == false {
		tester.Fatalf("testingWorkingGradual should have been true: %v", shouldGradual)
	}

	shouldNotGradual, err := client.Should("Gradual", "testingNonWorkingGradual")

	if err != nil {
		tester.Fatal(err)
	}

	if shouldNotGradual == true {
		tester.Fatalf("testingNonWorkingGradual should have been false: %v", shouldNotGradual)
	}

	selectiveGroupErr := client.SyncFlags("Selective", func(url string) (*http.Response, error) {
		return http.Get(url)
	})

	if selectiveGroupErr != nil {
		tester.Fatal(selectiveGroupErr)
	}

	shouldSelectiveString, err := client.Should("Selective", "String")

	if err != nil {
		tester.Fatal(err)
	}

	if shouldSelectiveString == false {
		tester.Fatalf("Selective:String should have been true: %v", shouldSelectiveString)
	}

	shouldSelectiveCustomString, err := client.ShouldCustomString("Selective", "String", "shouldBeInList")

	if err != nil {
		tester.Fatal(err)
	}

	if shouldSelectiveCustomString == false {
		tester.Fatalf("Selective:String should have been true: %v", shouldSelectiveCustomString)
	}

	shouldNotSelectiveCustomString, err := client.ShouldCustomString("Selective", "String", "shouldNOTBeInList")

	if err != nil {
		tester.Fatal(err)
	}

	if shouldNotSelectiveCustomString == true {
		tester.Fatalf("Selective:String should have been false: %v", shouldNotSelectiveCustomString)
	}

	shouldSelectiveCustomInt, err := client.ShouldCustomInt("Selective", "Number", 42)

	if err != nil {
		tester.Fatal(err)
	}

	if shouldSelectiveCustomInt == false {
		tester.Fatalf("Selective:Number should have been true: %v", shouldSelectiveCustomInt)
	}

	valueGroupErr := client.SyncFlags("Value", func(url string) (*http.Response, error) {
		return http.Get(url)
	})

	if valueGroupErr != nil {
		tester.Fatal(valueGroupErr)
	}

	value_string, err := client.ValueString("Value", "String", "")

	if err != nil {
		tester.Fatal(err)
	}

	if value_string != "foo" {
		tester.Fatalf("Value:String should be 'foo', got: %v", value_string)
	}


	value_int, err := client.ValueInt("Value", "Integer", 0)

	if err != nil {
		tester.Fatal(err)
	}

	if value_int != 42 {
		tester.Fatalf("Value:String should be 42, got: %v", value_int)
	}

	value_float, err := client.ValueFloat("Value", "Float", 0.42)

	if err != nil {
		tester.Fatal(err)
	}

	if value_float != 42.42 {
		tester.Fatalf("Value:Float should be 42.42, got: %v", value_float)
	}

	scheduledGroupErr := client.SyncFlags("Scheduled", func(url string) (*http.Response, error) {
		return http.Get(url)
	})

	if scheduledGroupErr != nil {
		tester.Fatal(scheduledGroupErr)
	}

	before_global, err := client.Should("Scheduled", "beforeGlobal")

	if err != nil {
		tester.Fatal(err)
	}

	if before_global != false {
		tester.Fatalf("Scheduled:beforeGlobal should be false, got: %v", before_global)
	}

	during_global, err := client.Should("Scheduled", "duringGlobal")

	if err != nil {
		tester.Fatal(err)
	}

	if during_global != true {
		tester.Fatalf("Scheduled:duringGlobal should be true, got: %v", during_global)
	}

	after_global, err := client.Should("Scheduled", "afterGlobal")

	if err != nil {
		tester.Fatal(err)
	}

	if after_global != false {
		tester.Fatalf("Scheduled:afterGlobal should be false, got: %v", after_global)
	}


	before_global_start_end, err := client.Should("Scheduled", "beforeGlobalStartEnd")

	if err != nil {
		tester.Fatal(err)
	}

	if before_global_start_end != false {
		tester.Fatalf("Scheduled:beforeGlobalStartEnd should be false, got: %v", before_global_start_end)
	}

	during_global_start_end, err := client.Should("Scheduled", "duringGlobalStartEnd")

	if err != nil {
		tester.Fatal(err)
	}

	if during_global_start_end != true {
		tester.Fatalf("Scheduled:duringGlobalStartEnd should be true, got: %v", during_global_start_end)
	}

	after_global_start_end, err := client.Should("Scheduled", "afterGlobalStartEnd")

	if err != nil {
		tester.Fatal(err)
	}

	if after_global_start_end != false {
		tester.Fatalf("Scheduled:afterGlobalStartEnd should be false, got: %v", after_global_start_end)
	}


	before_global_daily, err := client.Should("Scheduled", "beforeGlobalDaily")

	if err != nil {
		tester.Fatal(err)
	}

	if before_global_daily != false {
		tester.Fatalf("Scheduled:beforeGlobalDaily should be false, got: %v", before_global_daily)
	}

	during_global_daily, err := client.Should("Scheduled", "duringGlobalDaily")

	if err != nil {
		tester.Fatal(err)
	}

	if during_global_daily != true {
		tester.Fatalf("Scheduled:duringGlobalDaily should be true, got: %v", during_global_daily)
	}

	after_global_daily, err := client.Should("Scheduled", "afterGlobalDaily")

	if err != nil {
		tester.Fatal(err)
	}

	if after_global_daily != false {
		tester.Fatalf("Scheduled:afterGlobalDaily should be false, got: %v", after_global_daily)
	}

}
