rockspec_format = '3.0'
package = 'vexilla_client'
version = 'scm-1'
source = {
  url = 'git+https://github.com/Vexilla/vexilla.git',
  branch = 'main',
  dir = 'vexilla/clients/lua',
}
description = {
  summary = 'The v1 Lua client for the Vexilla feature flag system.',
  homepage = 'https://github.com/Vexilla/vexilla/tree/main/clients/lua',
  license = 'MIT',
}
dependencies = {
  'lua >= 5.1, < 5.6',
  'luasocket == 3.1.0-1',
}
build = {
  type = 'builtin',
  modules = {
    vexilla_client = 'vexilla_client.lua',
    ['vexilla.errors'] = 'vexilla/errors.lua',
    ['vexilla.hash'] = 'vexilla/hash.lua',
    ['vexilla.number'] = 'vexilla/number.lua',
    ['vexilla.schedule'] = 'vexilla/schedule.lua',
    ['vexilla.lookup'] = 'vexilla/lookup.lua',
    ['vexilla.validate'] = 'vexilla/validate.lua',
    ['vexilla.unicode'] = 'vexilla/unicode.lua',
    ['vexilla.compat_data'] = 'vexilla/compat_data.lua',
  },
}
