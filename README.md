# Steam Librarian

A Millennium plugin that adds extra functionality for the Steam Library tab.

## Features
- To automatically select a game when clicking the Library tab, set `autoselect` to its name
- To automatically open Game Details when clicking a game, set `open_details` to `true`
- To automatically resize the game list when clicking the Library tab, set `library_size` to a value
    - Pixels: `NNpx`, example: `60px`
    - Percentage: `NN%`, example: `10%`
- To add a Millennium menu item to the System Tray menu, set `millennium_systray` to `true`
- To remove the What's New section of the Library, set `remove_news` to `true`
- To display download progress under the taskbar icon, set `taskbar_progress` to `true`
    - This functionality is only supported on Windows
- To add items to the extra Settings menu of every game, fill `extra_options` with a list of objects:
    - To run a command, add `{ "title": "TITLE_HERE", "command": "COMMAND_HERE <APPID>" }`
    - To open a webpage, add `{ "title": "TITLE_HERE", "url": "URL_HERE/<APPID>" }`
    - In both cases. `<APPID>` will be replaced by the Steam AppID

Steam has to be restarted for configuration changes to take effect!

Big thanks to canitakemasoulbackpls!

## Configuration
- `<STEAM>\plugins\steam-librarian\config.json`

## Prerequisites
- [Millennium](https://steambrew.app/)

## Known issues:
- Some things don't always work the first time the Library tab is opened
- First startup is slow because of the dependencies