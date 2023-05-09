package = "vexilla_client"
version = "0.0.1-1"
source = {
   url = "git://github.com/vexilla/client-lua",
   tag = "v0.0.1"
}
description = {
   summary = "A lua client for the Vexilla Feature Flag System.",
   detailed = [[
      Vexilla is a statically hosted feature flag system.
   ]],
   homepage = "http://github.com/vexilla/client-lua",
   license = "MIT"
}
dependencies = {
   "lua >= 5.1, < 5.4",
   "http >= 0.4.0",
   "rapidjson >= 0.6.1-1"
}
build = {
   type = "builtin",
   modules = {
      ["vexilla_client"] = "vexilla/client.lua"
   }
}