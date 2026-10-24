local errors = require('vexilla.errors')
local lookup = require('vexilla.lookup')
local unicode = require('vexilla.unicode')
local M = {}
local function fail(path, expected) errors.raise('validation', path .. ': expected ' .. expected) end
local function object(value, path)
  if type(value) ~= 'table' then fail(path, 'an object') end
  local mt = getmetatable(value)
  if mt and mt.__jsontype ~= 'object' then fail(path, 'an object') end
  for key in pairs(value) do if type(key) ~= 'string' then fail(path, 'an object with string keys') end end
  return value
end
local function array(value, path)
  if type(value) ~= 'table' then fail(path, 'an array') end
  local mt = getmetatable(value)
  if mt and mt.__jsontype ~= 'array' then fail(path, 'an array') end
  local count = 0
  for key in pairs(value) do
    if type(key) ~= 'number' or key < 1 or key % 1 ~= 0 then fail(path, 'an array') end
    count = count + 1
  end
  if count ~= #value then fail(path, 'a contiguous array') end
  return value
end
local function string_value(value, path, nonempty)
  if type(value) ~= 'string' or nonempty and value == '' then fail(path, nonempty and 'a nonempty string' or 'a string') end
  return value
end
local function number(value, path, integer)
  if type(value) ~= 'number' or value ~= value or math.abs(value) == math.huge then fail(path, 'a finite number') end
  if integer and (value % 1 ~= 0 or value < -9007199254740991 or value > 9007199254740991) then fail(path, 'a safe integer') end
end
local function enum(value, path, allowed)
  for _, candidate in ipairs(allowed) do if value == candidate then return end end
  fail(path, table.concat(allowed, ' or '))
end
local function safe_id(value, path)
  string_value(value, path, true)
  if value == 'manifest' or value == 'config' or value == '.' or value == '..' or value:find('[/\\%z]') then fail(path, 'a safe group file identifier') end
end
local function schedule(value, path)
  object(value, path)
  for _, field in ipairs({'start', 'end', 'startTime', 'endTime'}) do number(value[field], path .. '/' .. field, true) end
  enum(value.timeType, path .. '/timeType', {'none', 'start/end', 'daily'})
  if not lookup.timezone(value.timezone) then fail(path .. '/timezone', 'a compatible timezone identifier') end
end
local function feature(value, path)
  object(value, path)
  string_value(value.name, path .. '/name')
  string_value(value.featureId, path .. '/featureId', true)
  enum(value.scheduleType, path .. '/scheduleType', {'', 'global', 'environment'})
  schedule(value.schedule, path .. '/schedule')
  enum(value.featureType, path .. '/featureType', {'toggle', 'gradual', 'selective', 'value'})
  if value.featureType == 'toggle' then
    if type(value.value) ~= 'boolean' then fail(path .. '/value', 'a boolean') end
  elseif value.featureType == 'gradual' then
    number(value.value, path .. '/value')
    number(value.seed, path .. '/seed')
    if value.seed <= 0 or value.seed > 1 then fail(path .. '/seed', '0 < seed <= 1') end
  else
    enum(value.valueType, path .. '/valueType', {'string', 'number'})
    if value.valueType == 'number' then enum(value.numberType, path .. '/numberType', {'int', 'float'}) end
    local function item(v, p)
      if value.valueType == 'string' then string_value(v, p)
      else number(v, p, value.numberType == 'int') end
    end
    if value.featureType == 'selective' then
      for i, v in ipairs(array(value.value, path .. '/value')) do item(v, path .. '/value/' .. i) end
    else item(value.value, path .. '/value') end
  end
end
local function feature_map(features, path)
  object(features, path)
  local aliases = {}
  for id, f in pairs(features) do
    feature(f, path .. '/' .. id)
    if id ~= f.featureId then fail(path .. '/' .. id .. '/featureId', 'the map key') end
    lookup.add(aliases, id, f.name)
  end
  return aliases
end
function M.manifest(value)
  if not unicode.tree(value) then fail('manifest', 'Unicode without unpaired surrogates') end
  object(value, 'manifest')
  if value.version ~= 'v1' then fail('manifest/version', 'v1') end
  local aliases, ids = {}, {}
  for _, group in ipairs(array(value.groups, 'manifest/groups')) do
    object(group, 'manifest/group')
    safe_id(group.groupId, 'manifest/group/groupId')
    string_value(group.name, 'manifest/group/name')
    if ids[group.groupId] then fail('manifest/group/groupId', 'a unique group ID') end
    ids[group.groupId] = group
    lookup.add(aliases, group.groupId, group.name)
  end
  return aliases, ids
end
function M.group(value, entries)
  if not unicode.tree(value) then fail('group', 'Unicode without unpaired surrogates') end
  object(value, 'group')
  safe_id(value.groupId, 'group/groupId')
  string_value(value.name, 'group/name')
  local entry = entries[value.groupId]
  if not entry or entry.name ~= value.name then fail('group/name', 'the manifest ID and name') end
  object(value.meta, 'group/meta')
  if value.meta.version ~= 'v1' then fail('group/meta/version', 'v1') end
  local features = feature_map(value.features, 'group/features')
  local environments = {}
  object(value.environments, 'group/environments')
  for id, env in pairs(value.environments) do
    object(env, 'group/environment')
    string_value(env.environmentId, 'group/environment/environmentId', true)
    string_value(env.name, 'group/environment/name')
    if id ~= env.environmentId then fail('group/environment/environmentId', 'the map key') end
    lookup.add(environments, id, env.name)
    feature_map(env.features, 'group/environments/' .. id .. '/features')
    for fid in pairs(env.features) do if not value.features[fid] then fail('environment/features', 'the exact group feature set') end end
    for fid, original in pairs(value.features) do
      local f = env.features[fid]
      if not f then fail('environment/features', 'the exact group feature set') end
      for _, field in ipairs({'name', 'featureType', 'valueType', 'numberType'}) do
        if f[field] ~= original[field] then fail('environment/features/' .. fid .. '/' .. field, 'the group feature subtype and name') end
      end
    end
  end
  return features, environments
end
function M.copy(value, seen)
  if type(value) ~= 'table' then return value end
  seen = seen or {}
  if seen[value] then fail('snapshot', 'acyclic JSON data') end
  seen[value] = true
  local result = {}
  for k, v in pairs(value) do result[k] = M.copy(v, seen) end
  seen[value] = nil
  local mt = getmetatable(value)
  if mt then setmetatable(result, {__jsontype = mt.__jsontype, __tojson = mt.__tojson}) end
  return result
end
return M
