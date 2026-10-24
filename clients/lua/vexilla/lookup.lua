local data = require('vexilla.compat_data')
local errors = require('vexilla.errors')
local M = {}
local function chars(text)
  local result = {}
  for char in text:gmatch('[%z\1-\127\194-\244][\128-\191]*') do
    local a, b, c, d = char:byte(1, 4)
    local code = a
    if a >= 240 then code = (a - 240) * 262144 + (b - 128) * 4096 + (c - 128) * 64 + d - 128
    elseif a >= 224 then code = (a - 224) * 4096 + (b - 128) * 64 + c - 128
    elseif a >= 192 then code = (a - 192) * 64 + b - 128 end
    result[#result + 1] = { text = char, code = code }
  end
  return result
end
local function in_ranges(code, ranges)
  local first, last = 1, #ranges
  while first <= last do
    local mid = math.floor((first + last) / 2)
    if code < ranges[mid][1] then last = mid - 1
    elseif code > ranges[mid][2] then first = mid + 1
    else return true end
  end
  return false
end
local function lower(text)
  local items, result = chars(text), {}
  for i, char in ipairs(items) do
    if char.code == 931 then
      local before, after = i - 1, i + 1
      while before > 0 and in_ranges(items[before].code, data.ignorableRanges) do before = before - 1 end
      while after <= #items and in_ranges(items[after].code, data.ignorableRanges) do after = after + 1 end
      local final = before > 0 and in_ranges(items[before].code, data.casedRanges) and (after > #items or not in_ranges(items[after].code, data.casedRanges))
      result[i] = final and 'ς' or 'σ'
    else result[i] = data.lower[char.text] or char.text end
  end
  return table.concat(result)
end
local function upper(code)
  return code >= 65 and code <= 90 or code >= 192 and code <= 214 or code >= 216 and code <= 222
end
local function base_lower(code)
  return code >= 97 and code <= 122 or code >= 223 and code <= 246 or code >= 248 and code <= 255
end
local function symbol(code)
  return code >= 32 and code <= 38 or code >= 40 and code <= 47 or code >= 58 and code <= 64 or code >= 91 and code <= 96 or code >= 123 and code <= 126 or code >= 160 and code <= 191 or code == 215 or code == 247
end
function M.normalize(text)
  local items, has_lower, has_room = chars(text), false, false
  for _, char in ipairs(items) do has_lower = has_lower or base_lower(char.code); has_room = has_room or symbol(char.code) end
  if not has_lower and #items > 0 then items = chars(lower(text)) end
  if not has_room then
    local result, i = {}, 1
    while i <= #items do
      local j = i + 1
      while j <= #items and upper(items[j].code) do j = j + 1 end
      result[#result + 1] = items[i].text
      if not upper(items[i].code) and j > i + 1 then
        result[#result + 1] = ' '
        for k = i + 1, j - 2 do result[#result + 1] = items[k].text end
        if j > i + 2 then result[#result + 1] = ' ' end
        result[#result + 1], i = items[j - 1].text, j
      else i = i + 1 end
    end
    items = chars(table.concat(result))
  end
  items = chars(lower((function() local a = {}; for i,c in ipairs(items) do a[i]=c.text end; return table.concat(a) end)()))
  local result, i = {}, 1
  while i <= #items do
    if symbol(items[i].code) then
      repeat i = i + 1 until i > #items or not symbol(items[i].code)
      if i <= #items then result[#result + 1] = '-'; result[#result + 1] = items[i].text; i = i + 1 end
    else result[#result + 1] = items[i].text; i = i + 1 end
  end
  return (table.concat(result):gsub("'", ''))
end
function M.timezone(value)
  if type(value) ~= 'string' then return false end
  if data.timezones[value:lower()] then return true end
  local sign, hours, minutes = value:match('^([+-])(%d%d):(%d%d)$')
  if not sign then sign, hours, minutes = value:match('^([+-])(%d%d)(%d%d)$') end
  if not sign then sign, hours = value:match('^([+-])(%d%d)$'); minutes = '00' end
  return sign ~= nil and tonumber(hours) < 24 and tonumber(minutes) < 60
end
function M.add(lookup, id, name)
  for _, key in ipairs({ id, name, M.normalize(name) }) do
    if lookup[key] and lookup[key] ~= id then errors.raise('validation', 'Lookup alias shadows another ID: ' .. key) end
    lookup[key] = id
  end
end
return M
