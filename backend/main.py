import Millennium, PluginUtils # type: ignore
logger = PluginUtils.Logger()

import base64
import json
import os
import subprocess
import urllib.parse
import webbrowser

def get_config():
    with open(os.path.join(PLUGIN_BASE_DIR, "config.json"), "rt", encoding="utf-8") as fp:
        return json.load(fp)

class Backend:
    @staticmethod
    def get_autoselect_item():
        autoselect_item = get_config()["autoselect"]
        logger.log(f"get_autoselect_item() -> {autoselect_item}")
        return autoselect_item

    @staticmethod
    def get_open_details():
        open_details = get_config()["open_details"]
        logger.log(f"get_open_details() -> {open_details}")
        return open_details

    @staticmethod
    def get_library_size():
        library_size = get_config()["library_size"]
        logger.log(f"get_library_size() -> {library_size}")
        return library_size

    @staticmethod
    def get_millennium_systray():
        millennium_systray = get_config()["millennium_systray"]
        logger.log(f"get_millennium_systray() -> {millennium_systray}")
        return millennium_systray

    @staticmethod
    def get_systray_text(transmit_encoded):
        systray_text = "Millennium"
        if "millennium_systray_text" in get_config():
            systray_text = get_config()["millennium_systray_text"]
        if transmit_encoded:
            systray_text = base64.standard_b64encode(systray_text.encode()).decode()
        logger.log(f"get_systray_text() -> {systray_text}")
        return systray_text

    @staticmethod
    def get_remove_news():
        remove_news = get_config()["remove_news"]
        logger.log(f"get_remove_news() -> {remove_news}")
        return remove_news

    @staticmethod
    def get_extra_options_count():
        extra_options_count = len(get_config()["extra_options"])
        logger.log(f"get_extra_options_count() -> {extra_options_count}")
        return extra_options_count

    @staticmethod
    def get_mark_shortcuts_offline():
        mark_shortcuts_offline = False
        if "mark_shortcuts_offline" in get_config():
            mark_shortcuts_offline = get_config()["mark_shortcuts_offline"]
        logger.log(f"get_mark_shortcuts_offline() -> {mark_shortcuts_offline}")
        return mark_shortcuts_offline

    @staticmethod
    def get_restart_menu():
        restart_menu = False
        if "restart_menu" in get_config():
            restart_menu = get_config()["restart_menu"]
        logger.log(f"get_restart_menu() -> {restart_menu}")
        return restart_menu

    @staticmethod
    def get_restart_text(transmit_encoded):
        restart_menu_text = "Restart"
        if "restart_menu_text" in get_config():
            restart_menu_text = get_config()["restart_menu_text"]
        if transmit_encoded:
            restart_menu_text = base64.standard_b64encode(restart_menu_text.encode()).decode()
        logger.log(f"get_restart_text() -> {restart_menu_text}")
        return restart_menu_text

    @staticmethod
    def get_extra_option(opt_num):
        extra_options_count = len(get_config()["extra_options"])
        if opt_num > -1 and opt_num < extra_options_count:
            extra_option_name = get_config()["extra_options"][opt_num]["title"]
            return extra_option_name
        else:
            logger.log("get_extra_option() called with invalid index")
            return ""

    @staticmethod
    def run_extra_option(opt_num, app_id, app_name):
        extra_options_count = len(get_config()["extra_options"])
        if opt_num > -1 and opt_num < extra_options_count:
            if "command" in get_config()["extra_options"][opt_num]:
                app_id_str = str(app_id)
                app_name_hyphen = app_name.replace(" ", "-")
                app_name_under = app_name.replace(" ", "_")
                subprocess.Popen(get_config()["extra_options"][opt_num]["command"].replace("<APPID>", app_id_str).replace("<NAME>", f"\"{app_name}\"").replace("<NAME_HYPHEN>", app_name_hyphen).replace("<NAME_UNDER>", app_name_under))
                return True
            elif "url" in get_config()["extra_options"][opt_num]:
                app_id_str = str(app_id)
                app_name_enc = urllib.parse.quote(app_name)
                app_name_hyphen_enc = urllib.parse.quote(app_name.replace(" ", "-"))
                app_name_under_enc = urllib.parse.quote(app_name.replace(" ", "_"))
                webbrowser.open(get_config()["extra_options"][opt_num]["url"].replace("<APPID>", app_id_str).replace("<NAME>", app_name_enc).replace("<NAME_HYPHEN>", app_name_hyphen_enc).replace("<NAME_UNDER>", app_name_under_enc))
                return True
        else:
            logger.log("run_extra_option() called with invalid index")
            return False

class Plugin:
    def _front_end_loaded(self):
        logger.log("Frontend loaded")

    def _load(self):
        logger.log("Backend loaded")
        logger.log(f"Plugin base dir: {PLUGIN_BASE_DIR}")
        Millennium.ready()

    def _unload(self):
        logger.log("Unloading")
