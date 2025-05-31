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
- To add items to the extra Settings menu of every game, fill `extra_options` with a list of objects:
    - To run a command, add `{ "title": "TITLE_HERE", "command": "COMMAND_HERE <APPID>" }`
    - To open a webpage, add `{ "title": "TITLE_HERE", "url": "URL_HERE/<APPID>" }`
    - `<APPID>` will be replaced by the Steam AppID
    - `<NAME>`, `<NAME_HYPHEN>` and `<NAME_UNDER>` will be replaced by the game name

Big thanks to canitakemasoulbackpls!

## Configuration
- `<STEAM>\plugins\steam-librarian\config.json`

## Prerequisites
- [Millennium](https://steambrew.app/)

## Known issues:
- The old issues should now be fixed!