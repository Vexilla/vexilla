-- ECMAScript shortest binary64 text, using exact decimal integer arithmetic.
-- The source uses the Lua 5.1 language subset and needs no FFI or bit operators.
local M = {}
local floor, abs = math.floor, math.abs
local BASE = 10000000
local function multiply(a, factor)
  local carry = 0
  for i = 1, #a do
    local value = a[i] * factor + carry
    a[i], carry = value % BASE, floor(value / BASE)
  end
  while carry > 0 do
    a[#a + 1], carry = carry % BASE, floor(carry / BASE)
  end
end
local function decimal(value)
  local exponent, significand = 0, value
  while significand >= 2 do significand, exponent = significand / 2, exponent + 1 end
  while significand < 1 do significand, exponent = significand * 2, exponent - 1 end
  -- Subnormals have fewer than 53 significant bits.
  local shift = math.min(52, exponent + 1074)
  local mantissa = significand * 2 ^ shift
  exponent = exponent - shift
  local a = {}
  while mantissa > 0 do
    a[#a + 1], mantissa = mantissa % BASE, floor(mantissa / BASE)
  end
  local scale = 0
  if exponent < 0 then
    scale = -exponent
    for _ = 1, scale do multiply(a, 5) end
  else
    for _ = 1, exponent do multiply(a, 2) end
  end
  local chunks = { string.format("%.0f", a[#a]) }
  for i = #a - 1, 1, -1 do chunks[#chunks + 1] = string.format("%07d", a[i]) end
  local digits = table.concat(chunks)
  return digits, #digits - scale
end
local function increment(digits, direction)
  local chars = {}
  for i = 1, #digits do chars[i] = digits:byte(i) - 48 end
  local carry = direction
  for i = #chars, 1, -1 do
    local n = chars[i] + carry
    if n < 0 then chars[i], carry = 9, -1
    elseif n > 9 then chars[i], carry = 0, 1
    else chars[i], carry = n, 0; break end
  end
  local parts = carry > 0 and {"1"} or {}
  for i = 1, #chars do parts[#parts + 1] = string.char(48 + chars[i]) end
  return table.concat(parts)
end
local function render(digits, point)
  digits = digits:gsub("0+$", "")
  if point > 0 and point <= 21 then
    if #digits <= point then return digits .. string.rep("0", point - #digits) end
    return digits:sub(1, point) .. "." .. digits:sub(point + 1)
  elseif point <= 0 and point > -6 then
    return "0." .. string.rep("0", -point) .. digits
  end
  local exponent = point - 1
  return digits:sub(1, 1) .. (#digits > 1 and "." .. digits:sub(2) or "") .. "e" .. (exponent >= 0 and "+" or "-") .. string.format("%d", abs(exponent))
end
function M.format(value)
  assert(type(value) == "number" and value == value and abs(value) < math.huge, "A finite numeric ID is required")
  -- Lua 5.3+ integers must not silently lose identity when cast to binary64.
  if math.type and math.type(value) == "integer" then
    assert(value == value + 0.0, "Integer ID is not exactly representable as binary64")
  end
  value = value + 0.0
  if value == 0 then return "0" end
  local sign = value < 0 and "-" or ""
  value = abs(value)
  local digits, point = decimal(value)
  for precision = 1, 17 do
    local head = digits:sub(1, precision)
    local nextDigit = digits:sub(precision + 1, precision + 1)
    local roundUp = nextDigit > "5" or (nextDigit == "5" and (digits:sub(precision + 2):find("[1-9]") or tonumber(head:sub(-1)) % 2 == 1))
    local rounded = roundUp and increment(head, 1) or head
    local adjustedPoint = point + #rounded - #head
    local candidate = render(rounded, adjustedPoint)
    if (tonumber(candidate) or math.huge) + 0.0 == value then return sign .. candidate end
    -- At powers of two the parser's rounding interval is asymmetric. A nearest
    -- decimal outside its shorter side can have a neighbor inside the interval.
    for _, direction in ipairs({-1, 1}) do
      local neighbor = increment(rounded, direction)
      if neighbor:sub(1, 1) ~= "0" then
        candidate = render(neighbor, adjustedPoint + #neighbor - #rounded)
        if (tonumber(candidate) or math.huge) + 0.0 == value then return sign .. candidate end
      end
    end
  end
  error("Could not format binary64 ID")
end
return M
