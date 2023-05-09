local Client = require "vexilla_client"

local client_instance = Client.new({}, "dev", "https://streamparrot-feature-flags.s3.amazonaws.com", "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a")

local flags = client_instance:fetch_flags("features.json")
client_instance:set_flags(flags)

describe("vexilla.client", function()
  it("should allow a working seed", function()
    local should_work = client_instance:should("testingWorkingGradual")
    assert.Truthy(should_work)
  end)

  it("should not allow a working seed", function()
    local should_not_work = client_instance:should("testingNonWorkingGradual")
    assert.Falsy(should_not_work)
  end)
end)