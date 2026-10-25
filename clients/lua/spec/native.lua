local json = require("dkjson")
local hash = require("vexilla.hash")
local number = require("vexilla.number")
local schedule = require("vexilla.schedule")
local lookup = require("vexilla.lookup")
local errors = require("vexilla.errors")
local function invalid(value)
  local ok, err = pcall(hash.instance_text, value)
  assert(not ok and errors.is(err, "instance"))
end
invalid(nil)
invalid(false)
invalid(true)
invalid(math.huge)
invalid(-math.huge)
invalid(0 / 0)
invalid(string.char(237, 160, 128))
invalid(string.char(237, 191, 191))
invalid(string.char(255))
if math.maxinteger then
  invalid(math.maxinteger)
  invalid(math.mininteger + 1)
end
assert(hash.instance_text("") == "")
assert(hash.instance_text(-0.0) == "0")
assert(hash.instance_text(42.0) == "42")
assert(hash.instance_text(9007199254740992) == "9007199254740992")
assert(lookup.normalize("ΟΣ") == "ος")
assert(lookup.normalize("ΟΣΑ") == "οσα")
local file = assert(io.open(assert(os.getenv("VEXILLA_NUMERIC_CHECKS")), "rb"))
local vectors, _, err = json.decode(file:read("*a"), 1, json.null)
file:close()
assert(not err, err)
for _, sample in ipairs(vectors) do
  assert(number.format(sample.value + 0.0) == sample.text, sample.text)
end
local now = schedule.now()
assert(now % 1 == 0 and now > 1700000000000)
print(_VERSION, jit and jit.version or "", #vectors, "numeric regressions and native checks passed")

local Client = require("vexilla_client")
local original_stderr = io.stderr
local logging_ok, logging_error = pcall(function()
  for _, show_logs in ipairs({ false, true }) do
    local diagnostics = {}
    io.stderr = {
      write = function(_, diagnostic)
        diagnostics[#diagnostics + 1] = diagnostic
      end,
    }
    local client = Client.new({
      base_url = "https://private-token@contract",
      custom_instance_id = "private-instance",
      show_logs = show_logs,
    })
    local manifest = client:get_manifest(function()
      return { version = "v1", groups = {} }
    end)
    client:set_manifest(manifest)
    local fetched, fetch_error = pcall(function()
      client:get_manifest(function()
        error("private-callback-error")
      end)
    end)
    assert(not fetched and errors.is(fetch_error, "fetch"))
    local installed, validation_error = pcall(function()
      client:set_manifest({ version = "invalid", groups = {} })
    end)
    assert(not installed and errors.is(validation_error, "validation"))
    if show_logs then
      assert(#diagnostics == 4)
      assert(diagnostics[1] == "vexilla operation=manifest.fetch outcome=success\n")
      assert(diagnostics[2] == "vexilla operation=manifest.install outcome=success\n")
      assert(diagnostics[3] == "vexilla operation=manifest.fetch outcome=failure\n")
      assert(diagnostics[4] == "vexilla operation=manifest.install outcome=failure\n")
      assert(not table.concat(diagnostics):find("private%-"))
    else
      assert(#diagnostics == 0)
    end
  end
end)
io.stderr = original_stderr
assert(logging_ok, logging_error)
