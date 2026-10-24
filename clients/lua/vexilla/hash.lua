local format = require('vexilla.number').format
local errors = require('vexilla.errors')
local unicode = require('vexilla.unicode')
local M = {}
function M.instance_text(value)
  if type(value) == 'string' then
    if not unicode.valid(value) then errors.raise('instance', 'Instance ID must contain Unicode scalar values') end
    return value
  end
  local ok, text = pcall(format, value)
  if not ok then errors.raise('instance', tostring(text)) end
  return text
end
function M.fnv32(text)
  if not unicode.valid(text) then errors.raise('instance', 'Instance ID must contain Unicode scalar values') end
  local hash = 2166136261
  for i = 1, #text do
    local byte, low, xor, place = text:byte(i), hash % 256, 0, 1
    for _ = 1, 8 do
      if low % 2 ~= byte % 2 then xor = xor + place end
      low, byte, place = math.floor(low / 2), math.floor(byte / 2), place * 2
    end
    hash = hash - hash % 256 + xor
    -- Split the multiplication so neither runtime loses integer precision.
    hash = ((hash % 65536) * 16777619 + (math.floor(hash / 65536) * 403 % 65536) * 65536) % 4294967296
  end
  return hash
end
function M.bucket(instance, seed)
  local text = M.instance_text(instance)
  -- Force binary64 multiplication, including when Lua 5.3+ decodes seed 1 as int.
  return ((M.fnv32(text) * (seed + 0.0)) % 1000.0) / 1000.0
end
return M
