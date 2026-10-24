local M = {}
local mt = { __tostring = function(self) return self.message end }
function M.raise(kind, message)
  error(setmetatable({ kind = kind, message = message }, mt), 0)
end
function M.is(value, kind)
  return type(value) == 'table' and getmetatable(value) == mt and (kind == nil or value.kind == kind)
end
return M
