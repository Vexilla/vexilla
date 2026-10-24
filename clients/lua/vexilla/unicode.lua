local M = {}
-- Strict UTF-8, portable to Lua 5.1: overlong forms, surrogates, and values
-- above U+10FFFF cannot be silently replaced by an application's decoder.
function M.valid(text)
  if type(text) ~= 'string' then return false end
  local i = 1
  while i <= #text do
    local a, b, c, d = text:byte(i, i + 3)
    local function continuation(value) return value and value >= 128 and value <= 191 end
    if a < 128 then i = i + 1
    elseif a >= 194 and a <= 223 and continuation(b) then i = i + 2
    elseif a >= 224 and a <= 239 and continuation(b) and continuation(c)
      and (a ~= 224 or b >= 160) and (a ~= 237 or b < 160) then i = i + 3
    elseif a >= 240 and a <= 244 and continuation(b) and continuation(c) and continuation(d)
      and (a ~= 240 or b >= 144) and (a ~= 244 or b <= 143) then i = i + 4
    else return false end
  end
  return true
end
function M.tree(value, seen)
  if type(value) == 'string' then return M.valid(value) end
  if type(value) ~= 'table' then return true end
  seen = seen or {}
  if seen[value] then return true end
  seen[value] = true
  for key, item in pairs(value) do
    if not M.tree(key, seen) or not M.tree(item, seen) then return false end
  end
  return true
end
return M
