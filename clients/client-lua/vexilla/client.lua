local http_request = require "http.request"
local rapidjson = require('rapidjson')

local FLAG_TYPE_TOGGLE = "toggle"
local FLAG_TYPE_GRADUAL = "gradual"

Client = {}

function Client:new(environment, base_url, custom_instance_hash)
  local instance = setmetatable({}, { __index = Client })

  instance.environment = environment
  instance.base_url = base_url
  instance.custom_instance_hash = custom_instance_hash
  instance.flags = {}
  return instance
end

function Client:fetch_flags(file_name)
  local headers, stream = assert(http_request.new_from_uri(self.base_url.."/"..file_name):go())
  local body = assert(stream:get_body_as_string())
  local decoded = rapidjson.decode(body)
  return decoded
end

function Client:set_flags(flags)
  self.flags = flags
end

function Client:should(feature_name)

  local feature = self.flags["environments"][self.environment]["untagged"][feature_name]

  if feature.type == FLAG_TYPE_TOGGLE then
    return feature.value
  elseif feature.type == FLAG_TYPE_GRADUAL then
    return self:hash_instance_id(feature.seed) < feature.value
  end
end

function Client:hash_instance_id(seed)

  local total = 0

  self.custom_instance_hash:gsub(".", function(character)
    total = total + character:byte()
  end)

  local calculated = total * seed * 42.0

  return math.floor(calculated) % 100

end

return Client
