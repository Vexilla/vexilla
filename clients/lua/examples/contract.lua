-- Offline example. The application supplies its transport and JSON decoder.
local Client = require('vexilla_client')
local json = require('dkjson')
local artifacts = assert(os.getenv('VEXILLA_CONTRACT_DIR'), 'Set VEXILLA_CONTRACT_DIR to a published fixture directory')
local function fetch(url)
  local file = assert(io.open(artifacts .. '/' .. assert(url:match('([^/]+)$')), 'rb'))
  local text = file:read('*a'); file:close()
  local value, _, err = json.decode(text, 1, json.null)
  assert(not err, err)
  return value
end
local client = Client.new({base_url = 'https://contract', environment = 'prod', custom_instance_id = 'member'})
client:sync_manifest(fetch)
client:sync_flags('Contract', fetch)
assert(client:should('Contract', 'Toggle'))
assert(client:should('Contract', 'Selective Int', 42))
assert(client:value('Contract', 'Value String', 'fallback') == 'hello')
print('Installed v1 Lua SDK example passed')
