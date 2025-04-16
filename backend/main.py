import Millennium, PluginUtils # type: ignore
logger = PluginUtils.Logger()

import json
import os
import subprocess
import webbrowser

def get_config(plugin_name):
    with open(os.path.join(PLUGIN_BASE_DIR, "config.json"), "rt") as fp:
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
    def get_extra_options_count():
        extra_options_count = len(get_config("steam-librarian")["extra_options"])
        logger.log(f"get_extra_options_count() -> {extra_options_count}")
        return extra_options_count

    @staticmethod
    def get_extra_option(opt_num):
        extra_options_count = len(get_config("steam-librarian")["extra_options"])
        if opt_num > -1 and opt_num < extra_options_count:
            extra_option_name = get_config("steam-librarian")["extra_options"][opt_num]["title"]
            return extra_option_name
        else:
            logger.log("get_extra_option() called with invalid index")
            return ""

    @staticmethod
    def run_extra_option(opt_num, app_id):
        extra_options_count = len(get_config("steam-librarian")["extra_options"])
        if opt_num > -1 and opt_num < extra_options_count:
            if "command" in get_config("steam-librarian")["extra_options"][opt_num]:
                subprocess.Popen(get_config("steam-librarian")["extra_options"][opt_num]["command"].replace("<APPID>", str(app_id)))
                return True
            elif "url" in get_config("steam-librarian")["extra_options"][opt_num]:
                webbrowser.open(get_config("steam-librarian")["extra_options"][opt_num]["url"].replace("<APPID>", str(app_id)))
                return True
        else:
            logger.log("run_extra_option() called with invalid index")
            return False

    @staticmethod
    def open_millennium_settings():
        logger.log("open_millennium_settings()")
        webbrowser.open("steam://millennium")
        return True

class Plugin:
    def _front_end_loaded(self):
        logger.log("Frontend loaded")

    def _load(self):
        logger.log("Backend loaded")
        logger.log(f"Plugin base dir: {PLUGIN_BASE_DIR}")
        Millennium.ready()

    def _unload(self):
        logger.log("Unloading")
