local validate = require("vexilla.validate")
local errors = require("vexilla.errors")
local hash = require("vexilla.hash")
local schedule = require("vexilla.schedule")
local Client = {}
Client.__index = Client

function Client.new(config, show_logs)
  assert(type(config) == "table", "A client configuration table is required")
  assert(type(config.base_url) == "string", "base_url must be a string")
  local self = setmetatable({}, Client)
  self.base_url = config.base_url:gsub("/+$", "")
  self.environment = config.environment or "prod"
  self.custom_instance_id = config.custom_instance_id
  self.show_logs = show_logs == nil and config.show_logs or show_logs
  self._groups, self._entries, self._group_lookup = {}, {}, {}
  self._feature_lookup, self._environment_lookup = {}, {}
  return self
end
local function fetch(callback, url)
  if type(callback) ~= "function" then
    errors.raise("fetch", "A fetch callback is required")
  end
  local ok, result = pcall(callback, url)
  if not ok then
    errors.raise("fetch", "Failed to fetch " .. url .. ": " .. tostring(result))
  end
  return result
end
local function with_diagnostics(client, operation, action)
  local succeeded, result = pcall(action)
  if client.show_logs then
    io.stderr:write(
      "vexilla operation="
        .. operation
        .. " outcome="
        .. (succeeded and "success" or "failure")
        .. "\n"
    )
  end
  if not succeeded then
    error(result, 0)
  end
  return result
end
function Client:get_manifest(fetch_callback)
  return with_diagnostics(self, "manifest.fetch", function()
    local manifest = fetch(fetch_callback, self.base_url .. "/manifest.json")
    validate.manifest(manifest)
    return validate.copy(manifest)
  end)
end
function Client:set_manifest(manifest)
  return with_diagnostics(self, "manifest.install", function()
    local group_aliases = validate.manifest(manifest)
    local manifest_snapshot = validate.copy(manifest)
    local _, manifest_entries = validate.manifest(manifest_snapshot)
    for group_id, installed_group in pairs(self._groups) do
      local manifest_entry = manifest_entries[group_id]
      if not manifest_entry or manifest_entry.name ~= installed_group.name then
        self._groups[group_id] = nil
        self._feature_lookup[group_id] = nil
        self._environment_lookup[group_id] = nil
      end
    end
    self._manifest = manifest_snapshot
    self._group_lookup = group_aliases
    self._entries = manifest_entries
  end)
end
function Client:sync_manifest(fetch_callback)
  self:set_manifest(self:get_manifest(fetch_callback))
end
function Client:get_flags(group_name_or_id, fetch_callback)
  return with_diagnostics(self, "group.fetch", function()
    local group_id = self._group_lookup[group_name_or_id]
    if not self._manifest or not group_id then
      errors.raise("lookup", "Group not found in manifest: " .. tostring(group_name_or_id))
    end
    local group = fetch(fetch_callback, self.base_url .. "/" .. group_id .. ".json")
    validate.group(group, self._entries)
    if group.groupId ~= group_id then
      errors.raise("validation", "Fetched group does not match the request")
    end
    return validate.copy(group)
  end)
end
function Client:set_flags(group)
  return with_diagnostics(self, "group.install", function()
    if not self._manifest then
      errors.raise("lookup", "Manifest is not installed")
    end
    validate.group(group, self._entries)
    local group_snapshot = validate.copy(group)
    local feature_aliases, environment_aliases = validate.group(group_snapshot, self._entries)
    self._groups[group_snapshot.groupId] = group_snapshot
    self._feature_lookup[group_snapshot.groupId] = feature_aliases
    self._environment_lookup[group_snapshot.groupId] = environment_aliases
  end)
end
function Client:sync_flags(group_name_or_id, fetch_callback)
  self:set_flags(self:get_flags(group_name_or_id, fetch_callback))
end
function Client:_feature(group_name_or_id, feature_name_or_id)
  local group_id = self._group_lookup[group_name_or_id]
  local installed_group = group_id and self._groups[group_id]
  if not installed_group then
    errors.raise("lookup", "Group is not installed: " .. tostring(group_name_or_id))
  end
  local environment_id = self._environment_lookup[group_id][self.environment]
  local feature_id = self._feature_lookup[group_id][feature_name_or_id]
  if not environment_id or not feature_id then
    errors.raise("lookup", "Environment or feature could not be found")
  end
  return installed_group.environments[environment_id].features[feature_id]
end
function Client:should(group_name_or_id, feature_name_or_id, custom_instance_id)
  local feature = self:_feature(group_name_or_id, feature_name_or_id)
  if feature.featureType == "value" then
    errors.raise("kind", "should requires a boolean feature")
  end
  local effective_instance_id = custom_instance_id
  if effective_instance_id == nil then
    effective_instance_id = self.custom_instance_id
  end
  if feature.featureType == "gradual" or feature.featureType == "selective" then
    hash.instance_text(effective_instance_id)
  end
  if not schedule.active(feature.schedule, feature.scheduleType, schedule.now()) then
    return false
  end
  if feature.featureType == "toggle" then
    return feature.value
  end
  if feature.featureType == "gradual" then
    return hash.bucket(effective_instance_id, feature.seed) < feature.value
  end
  for _, value in ipairs(feature.value) do
    if type(value) == type(effective_instance_id) and value == effective_instance_id then
      return true
    end
  end
  return false
end
function Client:value(group_name_or_id, feature_name_or_id, default_value)
  local feature = self:_feature(group_name_or_id, feature_name_or_id)
  if feature.featureType ~= "value" then
    errors.raise("kind", "value requires a value feature")
  end
  if not schedule.active(feature.schedule, feature.scheduleType, schedule.now()) then
    return default_value
  end
  return feature.value
end
return Client
