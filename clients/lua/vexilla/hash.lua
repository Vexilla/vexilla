local format = require("vexilla.number").format
local errors = require("vexilla.errors")
local unicode = require("vexilla.unicode")
local Hasher = {}
function Hasher.instance_text(value)
  if type(value) == "string" then
    if not unicode.valid(value) then
      errors.raise("instance", "Instance ID must contain Unicode scalar values")
    end
    return value
  end
  local ok, text = pcall(format, value)
  if not ok then
    errors.raise("instance", tostring(text))
  end
  return text
end
function Hasher.fnv32(text)
  if not unicode.valid(text) then
    errors.raise("instance", "Instance ID must contain Unicode scalar values")
  end
  local hash = 2166136261
  for i = 1, #text do
    local byte, low_byte, xor_byte, bit_place = text:byte(i), hash % 256, 0, 1
    for _ = 1, 8 do
      if low_byte % 2 ~= byte % 2 then
        xor_byte = xor_byte + bit_place
      end
      low_byte, byte, bit_place = math.floor(low_byte / 2), math.floor(byte / 2), bit_place * 2
    end
    hash = hash - hash % 256 + xor_byte
    -- Split the multiplication so neither runtime loses integer precision.
    hash = ((hash % 65536) * 16777619 + (math.floor(hash / 65536) * 403 % 65536) * 65536)
      % 4294967296
  end
  return hash
end
function Hasher.bucket(instance, seed)
  local text = Hasher.instance_text(instance)
  -- Force binary64 multiplication, including when Lua 5.3+ decodes seed 1 as int.
  return ((Hasher.fnv32(text) * (seed + 0.0)) % 1000.0) / 1000.0
end
return Hasher
