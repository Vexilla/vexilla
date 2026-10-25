local errors = require("vexilla.errors")
local lookup = require("vexilla.lookup")
local unicode = require("vexilla.unicode")
local Validation = {}
local function fail(path, expected)
  errors.raise("validation", path .. ": expected " .. expected)
end
local function object(value, path)
  if type(value) ~= "table" then
    fail(path, "an object")
  end
  local mt = getmetatable(value)
  if mt and mt.__jsontype ~= "object" then
    fail(path, "an object")
  end
  for key in pairs(value) do
    if type(key) ~= "string" then
      fail(path, "an object with string keys")
    end
  end
  return value
end
local function array(value, path)
  if type(value) ~= "table" then
    fail(path, "an array")
  end
  local mt = getmetatable(value)
  if mt and mt.__jsontype ~= "array" then
    fail(path, "an array")
  end
  local count = 0
  for key in pairs(value) do
    if type(key) ~= "number" or key < 1 or key % 1 ~= 0 then
      fail(path, "an array")
    end
    count = count + 1
  end
  if count ~= #value then
    fail(path, "a contiguous array")
  end
  return value
end
local function string_value(value, path, nonempty)
  if type(value) ~= "string" or nonempty and value == "" then
    fail(path, nonempty and "a nonempty string" or "a string")
  end
  return value
end
local function number(value, path, integer)
  if type(value) ~= "number" or value ~= value or math.abs(value) == math.huge then
    fail(path, "a finite number")
  end
  if integer and (value % 1 ~= 0 or value < -9007199254740991 or value > 9007199254740991) then
    fail(path, "a safe integer")
  end
end
local function enum(value, path, allowed)
  for _, candidate in ipairs(allowed) do
    if value == candidate then
      return
    end
  end
  fail(path, table.concat(allowed, " or "))
end
local function safe_id(value, path)
  string_value(value, path, true)
  if
    value == "manifest"
    or value == "config"
    or value == "."
    or value == ".."
    or value:find("[/\\%z]")
  then
    fail(path, "a safe group file identifier")
  end
end
local function schedule(value, path)
  object(value, path)
  for _, field in ipairs({ "start", "end", "startTime", "endTime" }) do
    number(value[field], path .. "/" .. field, true)
  end
  enum(value.timeType, path .. "/timeType", { "none", "start/end", "daily" })
  if not lookup.timezone(value.timezone) then
    fail(path .. "/timezone", "a compatible timezone identifier")
  end
end
local function validate_feature(value, path)
  object(value, path)
  string_value(value.name, path .. "/name")
  string_value(value.featureId, path .. "/featureId", true)
  enum(value.scheduleType, path .. "/scheduleType", { "", "global", "environment" })
  schedule(value.schedule, path .. "/schedule")
  enum(value.featureType, path .. "/featureType", { "toggle", "gradual", "selective", "value" })
  if value.featureType == "toggle" then
    if type(value.value) ~= "boolean" then
      fail(path .. "/value", "a boolean")
    end
  elseif value.featureType == "gradual" then
    number(value.value, path .. "/value")
    number(value.seed, path .. "/seed")
    if value.seed <= 0 or value.seed > 1 then
      fail(path .. "/seed", "0 < seed <= 1")
    end
  else
    enum(value.valueType, path .. "/valueType", { "string", "number" })
    if value.valueType == "number" then
      enum(value.numberType, path .. "/numberType", { "int", "float" })
    end
    local function item(v, p)
      if value.valueType == "string" then
        string_value(v, p)
      else
        number(v, p, value.numberType == "int")
      end
    end
    if value.featureType == "selective" then
      for i, v in ipairs(array(value.value, path .. "/value")) do
        item(v, path .. "/value/" .. i)
      end
    else
      item(value.value, path .. "/value")
    end
  end
end
local function feature_map(features, path)
  object(features, path)
  local feature_aliases = {}
  for feature_id, feature in pairs(features) do
    validate_feature(feature, path .. "/" .. feature_id)
    if feature_id ~= feature.featureId then
      fail(path .. "/" .. feature_id .. "/featureId", "the map key")
    end
    lookup.add(feature_aliases, feature_id, feature.name)
  end
  return feature_aliases
end
function Validation.manifest(value)
  if not unicode.tree(value) then
    fail("manifest", "Unicode without unpaired surrogates")
  end
  object(value, "manifest")
  if value.version ~= "v1" then
    fail("manifest/version", "v1")
  end
  local group_aliases, manifest_entries = {}, {}
  for _, group in ipairs(array(value.groups, "manifest/groups")) do
    object(group, "manifest/group")
    safe_id(group.groupId, "manifest/group/groupId")
    string_value(group.name, "manifest/group/name")
    if manifest_entries[group.groupId] then
      fail("manifest/group/groupId", "a unique group ID")
    end
    manifest_entries[group.groupId] = group
    lookup.add(group_aliases, group.groupId, group.name)
  end
  return group_aliases, manifest_entries
end
function Validation.group(value, entries)
  if not unicode.tree(value) then
    fail("group", "Unicode without unpaired surrogates")
  end
  object(value, "group")
  safe_id(value.groupId, "group/groupId")
  string_value(value.name, "group/name")
  local entry = entries[value.groupId]
  if not entry or entry.name ~= value.name then
    fail("group/name", "the manifest ID and name")
  end
  object(value.meta, "group/meta")
  if value.meta.version ~= "v1" then
    fail("group/meta/version", "v1")
  end
  local feature_aliases = feature_map(value.features, "group/features")
  local environment_aliases = {}
  object(value.environments, "group/environments")
  for environment_id, environment in pairs(value.environments) do
    object(environment, "group/environment")
    string_value(environment.environmentId, "group/environment/environmentId", true)
    string_value(environment.name, "group/environment/name")
    if environment_id ~= environment.environmentId then
      fail("group/environment/environmentId", "the map key")
    end
    lookup.add(environment_aliases, environment_id, environment.name)
    feature_map(environment.features, "group/environments/" .. environment_id .. "/features")
    for feature_id in pairs(environment.features) do
      if not value.features[feature_id] then
        fail("environment/features", "the exact group feature set")
      end
    end
    for feature_id, group_feature in pairs(value.features) do
      local environment_feature = environment.features[feature_id]
      if not environment_feature then
        fail("environment/features", "the exact group feature set")
      end
      for _, field in ipairs({ "name", "featureType", "valueType", "numberType" }) do
        if environment_feature[field] ~= group_feature[field] then
          fail(
            "environment/features/" .. feature_id .. "/" .. field,
            "the group feature subtype and name"
          )
        end
      end
    end
  end
  return feature_aliases, environment_aliases
end
function Validation.copy(value, ancestors)
  if type(value) ~= "table" then
    return value
  end
  ancestors = ancestors or {}
  if ancestors[value] then
    fail("snapshot", "acyclic JSON data")
  end
  ancestors[value] = true
  local snapshot = {}
  for key, item in pairs(value) do
    snapshot[key] = Validation.copy(item, ancestors)
  end
  ancestors[value] = nil
  local metatable = getmetatable(value)
  if metatable then
    setmetatable(snapshot, { __jsontype = metatable.__jsontype, __tojson = metatable.__tojson })
  end
  return snapshot
end
return Validation
