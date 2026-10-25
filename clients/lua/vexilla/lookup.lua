local data = require("vexilla.compat_data")
local errors = require("vexilla.errors")
local Lookup = {}
local function chars(text)
  local result = {}
  for character in text:gmatch("[%z\1-\127\194-\244][\128-\191]*") do
    local first_byte, second_byte, third_byte, fourth_byte = character:byte(1, 4)
    local codepoint = first_byte
    if first_byte >= 240 then
      codepoint = (first_byte - 240) * 262144
        + (second_byte - 128) * 4096
        + (third_byte - 128) * 64
        + fourth_byte
        - 128
    elseif first_byte >= 224 then
      codepoint = (first_byte - 224) * 4096 + (second_byte - 128) * 64 + third_byte - 128
    elseif first_byte >= 192 then
      codepoint = (first_byte - 192) * 64 + second_byte - 128
    end
    result[#result + 1] = { text = character, codepoint = codepoint }
  end
  return result
end
local function in_ranges(codepoint, ranges)
  local first_range, last_range = 1, #ranges
  while first_range <= last_range do
    local middle_range = math.floor((first_range + last_range) / 2)
    if codepoint < ranges[middle_range][1] then
      last_range = middle_range - 1
    elseif codepoint > ranges[middle_range][2] then
      first_range = middle_range + 1
    else
      return true
    end
  end
  return false
end
local function lower(text)
  local items, result = chars(text), {}
  for i, character in ipairs(items) do
    if character.codepoint == 931 then
      local before, after = i - 1, i + 1
      while before > 0 and in_ranges(items[before].codepoint, data.ignorableRanges) do
        before = before - 1
      end
      while after <= #items and in_ranges(items[after].codepoint, data.ignorableRanges) do
        after = after + 1
      end
      local final = before > 0
        and in_ranges(items[before].codepoint, data.casedRanges)
        and (after > #items or not in_ranges(items[after].codepoint, data.casedRanges))
      result[i] = final and "ς" or "σ"
    else
      result[i] = data.lower[character.text] or character.text
    end
  end
  return table.concat(result)
end
local function upper(codepoint)
  return codepoint >= 65 and codepoint <= 90
    or codepoint >= 192 and codepoint <= 214
    or codepoint >= 216 and codepoint <= 222
end
local function base_lower(codepoint)
  return codepoint >= 97 and codepoint <= 122
    or codepoint >= 223 and codepoint <= 246
    or codepoint >= 248 and codepoint <= 255
end
local function symbol(codepoint)
  return codepoint >= 32 and codepoint <= 38
    or codepoint >= 40 and codepoint <= 47
    or codepoint >= 58 and codepoint <= 64
    or codepoint >= 91 and codepoint <= 96
    or codepoint >= 123 and codepoint <= 126
    or codepoint >= 160 and codepoint <= 191
    or codepoint == 215
    or codepoint == 247
end
function Lookup.normalize(text)
  local items, has_lower, has_room = chars(text), false, false
  for _, character in ipairs(items) do
    has_lower = has_lower or base_lower(character.codepoint)
    has_room = has_room or symbol(character.codepoint)
  end
  if not has_lower and #items > 0 then
    items = chars(lower(text))
  end
  if not has_room then
    local result, i = {}, 1
    while i <= #items do
      local j = i + 1
      while j <= #items and upper(items[j].codepoint) do
        j = j + 1
      end
      result[#result + 1] = items[i].text
      if not upper(items[i].codepoint) and j > i + 1 then
        result[#result + 1] = " "
        for k = i + 1, j - 2 do
          result[#result + 1] = items[k].text
        end
        if j > i + 2 then
          result[#result + 1] = " "
        end
        result[#result + 1], i = items[j - 1].text, j
      else
        i = i + 1
      end
    end
    items = chars(table.concat(result))
  end
  items = chars(lower((function()
    local first_byte = {}
    for i, third_byte in ipairs(items) do
      first_byte[i] = third_byte.text
    end
    return table.concat(first_byte)
  end)()))
  local result, i = {}, 1
  while i <= #items do
    if symbol(items[i].codepoint) then
      repeat
        i = i + 1
      until i > #items or not symbol(items[i].codepoint)
      if i <= #items then
        result[#result + 1] = "-"
        result[#result + 1] = items[i].text
        i = i + 1
      end
    else
      result[#result + 1] = items[i].text
      i = i + 1
    end
  end
  return (table.concat(result):gsub("'", ""))
end
function Lookup.timezone(value)
  if type(value) ~= "string" then
    return false
  end
  if data.timezones[value:lower()] then
    return true
  end
  local sign, hours, minutes = value:match("^([+-])(%d%d):(%d%d)$")
  if not sign then
    sign, hours, minutes = value:match("^([+-])(%d%d)(%d%d)$")
  end
  if not sign then
    sign, hours = value:match("^([+-])(%d%d)$")
    minutes = "00"
  end
  return sign ~= nil and tonumber(hours) < 24 and tonumber(minutes) < 60
end
function Lookup.add(lookup, id, name)
  for _, key in ipairs({ id, name, Lookup.normalize(name) }) do
    if lookup[key] and lookup[key] ~= id then
      errors.raise("validation", "Lookup alias shadows another ID: " .. key)
    end
    lookup[key] = id
  end
end
return Lookup
