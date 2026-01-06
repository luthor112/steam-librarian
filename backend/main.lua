local logger = require("logger")
local millennium = require("millennium")
local fs = require("fs")

-- INTERFACES

function fs_file_exists(file_path)
    local noq_file_path = string.gsub(file_path, "\"", "")
    local file_exists = fs.exists(noq_file_path)
    logger:info("fs_file_exists -> " .. file_exists .. " for " .. noq_file_path)
    return file_exists
end

function run_command(custom_command)
    logger:info("Running command " .. custom_command)
    io.popen(custom_command)
    return true
end

function copy_files(a_source_dir, b_destination_dir)
    source_dir = a_source_dir
    destination_dir = b_destination_dir
    logger:info("copy_files -> " .. source_dir .. " to " .. destination_dir)
    fs.copy_recursive(source_dir, destination_dir, false)
    logger:info("copy_files -> Done")
    return true
end

function get_community_download()
    local download_enabled = millennium.call_frontend_method("frontend_functions.get_community_download_setting", {})
    logger:info("get_community_download -> " .. download_enabled)
    return download_enabled
end

-- PLUGIN MANAGEMENT

local function on_frontend_loaded()
    logger:info("Frontend loaded")
end

local function on_load()
    logger:info("Backend loaded")
    millennium.ready()
end

local function on_unload()
    logger:info("Backend unloaded")
end

return {
    on_frontend_loaded = on_frontend_loaded,
    on_load = on_load,
    on_unload = on_unload
}
