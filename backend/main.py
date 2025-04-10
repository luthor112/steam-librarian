import Millennium, PluginUtils # type: ignore
logger = PluginUtils.Logger()

import json
import os
import webbrowser

def get_config(plugin_name):
    with open(os.path.join(Millennium.steam_path(), "plugins", plugin_name, "config.json"), "rt") as fp:
        return json.load(fp)

class Backend:
    @staticmethod
    def get_autoselect_item():
        autoselect_item = get_config("steam-librarian")["autoselect"]
        logger.log(f"get_autoselect_item() -> {autoselect_item}")
        return autoselect_item

    @staticmethod
    def get_open_details():
        open_details = get_config("steam-librarian")["open_details"]
        logger.log(f"get_open_details() -> {open_details}")
        return open_details

    @staticmethod
    def get_library_size():
        library_size = get_config("steam-librarian")["library_size"]
        logger.log(f"get_library_size() -> {library_size}")
        return library_size

    @staticmethod
    def get_millennium_systray():
        millennium_systray = get_config("steam-librarian")["millennium_systray"]
        logger.log(f"get_millennium_systray() -> {millennium_systray}")
        return millennium_systray

    @staticmethod
    def get_remove_news():
        remove_news = get_config("steam-librarian")["remove_news"]
        logger.log(f"get_remove_news() -> {remove_news}")
        return remove_news

    @staticmethod
    def open_millennium_settings():
        webbrowser.open("steam://millennium")
        return True

class Plugin:
    def _front_end_loaded(self):
        logger.log("frontend loaded")

    def _load(self):     
        logger.log(f"backend loaded")
        Millennium.ready()

    def _unload(self):
        logger.log("unloading")
