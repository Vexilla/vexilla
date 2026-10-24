local json = require('dkjson')
local Client = require('vexilla_client')
local hash = require('vexilla.hash')
local number = require('vexilla.number')
local schedule = require('vexilla.schedule')
local lookup = require('vexilla.lookup')
local errors = require('vexilla.errors')
local dir = assert(os.getenv('VEXILLA_CONTRACT_DIR'), 'VEXILLA_CONTRACT_DIR is required')
local observations = {}
local function decode(text)
  local value, _, err = json.decode(text, 1, json.null)
  assert(not err, err)
  return value
end
local function read(name)
  local file = assert(io.open(dir .. '/' .. name, 'rb'))
  local text = file:read('*a'); file:close()
  return decode(text)
end
local function nil_value(value) if value == json.null then return nil end; return value end
local function outcome(fn)
  local ok, value = pcall(fn)
  if ok then return {value = value == nil and json.null or value} end
  if not errors.is(value) then error(value, 0) end
  return {error = value.kind}
end
local function equal(a, b)
  if a == json.null or b == json.null then return a == b end
  if type(a) ~= type(b) then return false end
  if type(a) ~= 'table' then return a == b end
  for k, value in pairs(a) do if not equal(value, b[k]) then return false end end
  for k in pairs(b) do if a[k] == nil then return false end end
  return true
end
local function encode(value)
  if value == nil or value == json.null then return 'null' end
  if type(value) == 'number' then return number.format(value) end
  if type(value) == 'string' then return json.quotestring(value) end
  if type(value) == 'boolean' then return value and 'true' or 'false' end
  assert(type(value) == 'table')
  local result = {}
  local mt = getmetatable(value)
  local array = #value > 0 or mt and mt.__jsontype == 'array'
  if array then
    for i, item in ipairs(value) do result[i] = encode(item) end
    return '[' .. table.concat(result, ',') .. ']'
  end
  for key, item in pairs(value) do result[#result + 1] = json.quotestring(key) .. ':' .. encode(item) end
  return '{' .. table.concat(result, ',') .. '}'
end
local function observe(id, actual, expected)
  assert(equal(actual, expected), id .. '\nactual: ' .. encode(actual) .. '\nexpected: ' .. encode(expected))
  observations[#observations + 1] = {caseId = id, outcome = actual}
end
local function keys(pointer)
  local result = {}
  assert(pointer:sub(1,1) == '/')
  for key in (pointer:sub(2) .. '/'):gmatch('(.-)/') do
    result[#result + 1] = (key:gsub('~1','/'):gsub('~0','~'))
  end
  return result
end
local function index(parent, key)
  local mt = getmetatable(parent)
  if mt and mt.__jsontype == 'array' then return assert(tonumber(key)) + 1 end
  return key
end
local function at(value, path)
  for _, key in ipairs(keys(path)) do value = value[index(value, key)] end
  return value
end
local function copy(value)
  if value == json.null or type(value) ~= 'table' then return value end
  local result = {}
  for key, item in pairs(value) do result[key] = copy(item) end
  return setmetatable(result, getmetatable(value))
end
local function mutate(value, mutations)
  for _, mutation in ipairs(mutations) do
    local tokens, parent = keys(mutation.path), value
    for i = 1, #tokens - 1 do parent = assert(parent[index(parent,tokens[i])]) end
    local key = index(parent, tokens[#tokens])
    if mutation.op == 'remove' then
      assert(parent[key] ~= nil)
      if type(key) == 'number' then table.remove(parent, key) else parent[key] = nil end
    elseif mutation.op == 'copy' then parent[key] = copy(at(value, mutation.from))
    elseif mutation.op == 'set' then
      if mutation.wireString then parent[key] = assert(json.decode(mutation.wireString))
      elseif mutation.nativeNumber then parent[key] = ({NaN = 0/0, Infinity = math.huge, ['-Infinity'] = -math.huge})[mutation.nativeNumber]
      else parent[key] = copy(mutation.value) end
    else error('Unknown mutation') end
  end
end
local function client(env, instance)
  return Client.new({base_url = 'https://contract', environment = env or 'prod', custom_instance_id = nil_value(instance)})
end
local function fetch(url) return read(assert(url:match('([^/]+)$'))) end
local function installed(env)
  local c = client(env, 'member'); c:sync_manifest(fetch); c:sync_flags('contract-group', fetch); return c
end
local expected, parity = read('expected.json'), read('parity.json')
for _, sample in ipairs(parity.hashes) do observe(sample.id, {value = hash.fnv32(sample.text)}, sample.expected) end
for _, sample in ipairs(parity.numbers) do
  local text = hash.instance_text(sample.instance + 0.0)
  observe(sample.id, {value = {text = text, hash = hash.fnv32(text)}}, sample.expected)
end
for _, sample in ipairs(parity.gradual) do
  local c, g = client('prod', 'member'), read('contract-group.json')
  c:sync_manifest(fetch)
  g.environments.prod.features.gradual.seed, g.environments.prod.features.gradual.value = sample.seed, sample.threshold
  c:set_flags(g)
  observe(sample.id, {value = {bucket = hash.bucket(sample.instance, sample.seed), enabled = c:should(expected.groupId, 'gradual', sample.instance)}}, sample.expected)
end
for _, sample in ipairs(parity.schedules) do observe(sample.id, {value = schedule.active(sample.schedule, sample.scheduleType, sample.now)}, sample.expected) end
for _, sample in ipairs(parity.validation) do
  local results = {}
  for _, fetched in ipairs({false, true}) do
    results[#results + 1] = outcome(function()
      local c = client('prod', 'member')
      local source = {manifest = read('manifest.json'), groups = {['contract-group'] = read('contract-group.json')}}
      mutate(source, sample.mutations)
      if fetched then c:sync_manifest(function() return source.manifest end) else c:set_manifest(source.manifest) end
      for id, group in pairs(source.groups) do
        if fetched then c:sync_flags(id, function() return group end) else c:set_flags(group) end
      end
      return true
    end)
  end
  assert(equal(results[1], results[2]), sample.id .. ': fetched and direct paths differ')
  observe(sample.id, results[1], sample.expected)
end
for _, sample in ipairs(parity.operations) do
  local clients, data, results = {}, {}, {}
  for _, step in ipairs(sample.steps) do
    results[#results + 1] = outcome(function()
      local c = clients[step.client]
      local function callback()
        if step.callback.throws then error('Deliberate transport failure') end
        return step.callback.file and read(step.callback.file) or data[step.callback.data]
      end
      if step.op == 'load' then data[step['as']] = read(step.file)
      elseif step.op == 'new' then clients[step.client] = client(step.environment, step.instance)
      elseif step.op == 'mutate' then mutate(data[step.data], step.mutations)
      elseif step.op == 'setManifest' then c:set_manifest(data[step.data])
      elseif step.op == 'setFlags' then c:set_flags(data[step.data])
      elseif step.op == 'getManifest' then data[step['as']] = c:get_manifest(callback)
      elseif step.op == 'getFlags' then data[step['as']] = c:get_flags(step.group, callback)
      elseif step.op == 'syncManifest' then c:sync_manifest(callback)
      elseif step.op == 'syncFlags' then c:sync_flags(step.group, callback)
      elseif step.op == 'should' then return c:should(step.group, step.feature, nil_value(step.instance))
      elseif step.op == 'value' then return c:value(step.group, step.feature, step.default)
      else error('Unknown operation: ' .. step.op) end
    end)
  end
  observe(sample.id, {value = results}, sample.expected)
end
for _, sample in ipairs(parity.aliases) do observe(sample.id, {value = lookup.normalize(sample.name)}, sample.expected) end
for _, sample in ipairs(parity.timezones) do
  local c, g = client('prod', 'member'), read('contract-group.json'); c:sync_manifest(fetch)
  g.features.toggle.schedule.timezone = sample.timezone
  local result = outcome(function() c:set_flags(g); return true end)
  if result.error then assert(result.error == 'validation') end
  observe(sample.id, {value = result.error == nil}, sample.expected)
end
for _, env in ipairs(expected.environments) do
  for _, mode in ipairs({'id','name','alias'}) do
    local function name(id, label) if mode == 'id' then return id end; return mode == 'name' and label or lookup.normalize(label) end
    local c, group = installed(name(env.id, env.name)), name(expected.groupId, expected.groupName)
    for index_, sample in ipairs(expected.cases) do
      local feature = name(sample.id, sample.name)
      observe('publication/' .. env.id .. '/' .. mode .. '/' .. (index_ - 1), outcome(function()
        if sample.kind == 'value' then return c:value(group, feature, 'fallback') end
        return c:should(group, feature, sample.instance)
      end), {value = env[sample.expectedKey]})
    end
    local decoded = read('contract-group.json')
    local scheduled = copy(expected.scheduled); scheduled[#scheduled + 1] = 'scheduled-active'
    for _, id in ipairs(scheduled) do
      local f = decoded.environments[env.id].features[id]
      observe('publication/' .. env.id .. '/' .. mode .. '/schedule/' .. id, {value = schedule.active(f.schedule, f.scheduleType, expected.referenceClock)}, {value = id == 'scheduled-active'})
    end
  end
end
assert(_G.Client == nil, 'SDK must not create a global Client')
local file = assert(io.open(assert(os.getenv('VEXILLA_OBSERVATIONS_FILE')), 'wb'))
file:write(encode({runtime = assert(os.getenv('VEXILLA_LUA_RUNTIME')), observations = observations})); file:close()
print(assert(os.getenv('VEXILLA_LUA_RUNTIME')), #observations, 'shared observations passed')
