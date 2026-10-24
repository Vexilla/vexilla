local validate = require('vexilla.validate')
local errors = require('vexilla.errors')
local hash = require('vexilla.hash')
local schedule = require('vexilla.schedule')
local Client = {}
Client.__index = Client

function Client.new(config, show_logs)
  assert(type(config) == 'table', 'A client configuration table is required')
  assert(type(config.base_url) == 'string', 'base_url must be a string')
  local self = setmetatable({}, Client)
  self.base_url = config.base_url:gsub('/+$', '')
  self.environment = config.environment or 'prod'
  self.custom_instance_id = config.custom_instance_id
  self.show_logs = show_logs == nil and config.show_logs or show_logs
  self._groups, self._entries, self._group_lookup = {}, {}, {}
  self._feature_lookup, self._environment_lookup = {}, {}
  return self
end
local function fetch(callback, url)
  if type(callback) ~= 'function' then errors.raise('fetch', 'A fetch callback is required') end
  local ok, result = pcall(callback, url)
  if not ok then errors.raise('fetch', 'Failed to fetch ' .. url .. ': ' .. tostring(result)) end
  return result
end
function Client:get_manifest(callback)
  local value = fetch(callback, self.base_url .. '/manifest.json')
  validate.manifest(value)
  return validate.copy(value)
end
function Client:set_manifest(value)
  local aliases = validate.manifest(value)
  local snapshot = validate.copy(value)
  local _, entries = validate.manifest(snapshot)
  for id, group in pairs(self._groups) do
    if not entries[id] or entries[id].name ~= group.name then
      self._groups[id], self._feature_lookup[id], self._environment_lookup[id] = nil, nil, nil
    end
  end
  self._manifest, self._group_lookup, self._entries = snapshot, aliases, entries
end
function Client:sync_manifest(callback)
  self:set_manifest(self:get_manifest(callback))
end
function Client:get_flags(group, callback)
  local id = self._group_lookup[group]
  if not self._manifest or not id then errors.raise('lookup', 'Group not found in manifest: ' .. tostring(group)) end
  local value = fetch(callback, self.base_url .. '/' .. id .. '.json')
  validate.group(value, self._entries)
  if value.groupId ~= id then errors.raise('validation', 'Fetched group does not match the request') end
  return validate.copy(value)
end
function Client:set_flags(value)
  if not self._manifest then errors.raise('lookup', 'Manifest is not installed') end
  validate.group(value, self._entries)
  local snapshot = validate.copy(value)
  local features, environments = validate.group(snapshot, self._entries)
  self._groups[snapshot.groupId] = snapshot
  self._feature_lookup[snapshot.groupId], self._environment_lookup[snapshot.groupId] = features, environments
end
function Client:sync_flags(group, callback)
  self:set_flags(self:get_flags(group, callback))
end
function Client:_feature(group, name)
  local id = self._group_lookup[group]
  local installed = id and self._groups[id]
  if not installed then errors.raise('lookup', 'Group is not installed: ' .. tostring(group)) end
  local eid = self._environment_lookup[id][self.environment]
  local fid = self._feature_lookup[id][name]
  if not eid or not fid then errors.raise('lookup', 'Environment or feature could not be found') end
  return installed.environments[eid].features[fid]
end
function Client:should(group, name, override)
  local feature = self:_feature(group, name)
  if feature.featureType == 'value' then errors.raise('kind', 'should requires a boolean feature') end
  local instance = override
  if instance == nil then instance = self.custom_instance_id end
  if feature.featureType == 'gradual' or feature.featureType == 'selective' then hash.instance_text(instance) end
  if not schedule.active(feature.schedule, feature.scheduleType, schedule.now()) then return false end
  if feature.featureType == 'toggle' then return feature.value end
  if feature.featureType == 'gradual' then return hash.bucket(instance, feature.seed) < feature.value end
  for _, value in ipairs(feature.value) do
    if type(value) == type(instance) and value == instance then return true end
  end
  return false
end
function Client:value(group, name, default_value)
  local feature = self:_feature(group, name)
  if feature.featureType ~= 'value' then errors.raise('kind', 'value requires a value feature') end
  if not schedule.active(feature.schedule, feature.scheduleType, schedule.now()) then return default_value end
  return feature.value
end
return Client
