import Millennium, PluginUtils # type: ignore
logger = PluginUtils.Logger()

import json
import os

def get_config(plugin_name):
    with open(os.path.join(Millennium.steam_path(), "plugins", plugin_name, "config.json"), "rt") as fp:
        return json.load(fp)

class Backend:
    @staticmethod
    def get_autoselect_item():
        autoselect_item = get_config("library-autoselect")["autoselect"]
        logger.log(f"get_autoselect_item() -> {autoselect_item}")
        return autoselect_item

    @staticmethod
    def get_open_details():
        open_details = get_config("library-autoselect")["open_details"]
        logger.log(f"get_open_details() -> {open_details}")
        return open_details

class Plugin:
    def _front_end_loaded(self):
        logger.log("frontend loaded")

    def _load(self):     
        logger.log(f"backend loaded")
        Millennium.ready()

    def _unload(self):
        logger.log("unloading")
