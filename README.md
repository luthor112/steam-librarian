# Steam Librarian

A Millennium plugin that adds extra functionality for the Steam Library tab.

## Features
- To automatically select a game when opening the Library, set `autoselect` to its name
- To automatically open Game Details when clicking a game, set `open_details` to `true`
- To automatically resize the Game List when opening the Library, set `library_size` to a value (may not work on all themes)
    - Pixels: `NNpx`, example: `60px`
    - Percentage: `NN%`, example: `10%`
- To add a Millennium menu item to the System Tray menu, set `millennium_systray` to `true`
    - To customize the text of the menu item, set `millennium_systray_text` to your desired value
    - Steam has to be restarted for this configuration to take effect!
- To remove the What's New section of the Library, set `remove_news` to `true`
- To remove the "Would you recommend this game to other players?" section of app pages, set `remove_review_ask` to `true`
- To add items to the extra Settings menu of every game, fill `extra_options` with a list of objects:
    - To run a command, add `{ "title": "TITLE_HERE", "command": "COMMAND_HERE <APPID>" }`
    - To open a webpage, add `{ "title": "TITLE_HERE", "url": "URL_HERE/<APPID>" }`
    - `<APPID>` will be replaced by the Steam AppID
    - `<NAME>`, `<NAME_HYPHEN>` and `<NAME_UNDER>` will be replaced by the game name
- To mark Shortcuts (non-Steam games) as not installed, set `mark_shortcuts_offline` to `true`
- To makr SHortcuts (non-Steam games) with missing binaries as not installed, set `check_shortcuts_exist` to `true`
- To add a Restart menu item to the Steam menu, set `restart_menu` to `true`
    - To customize the text of the menu item, set `restart_menu_text` to your desired value
    - Steam has to be restarted for this configuration to take effect!
- To add a "Scroll to App" item to the extra Settings menu of every game, set `scroll_to_app` to `true`

Big thanks to canitakemasoulbackpls!

## Configuration
- `<STEAM>\plugins\steam-librarian\config.json`

## Prerequisites
- [Millennium](https://steambrew.app/)
