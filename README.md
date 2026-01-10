# Steam Librarian

A Millennium plugin that adds extra functionality for the Steam Library.

## Features
- Automatically select a game when opening the Library
- Always open Game Details when clicking a game
- Automatically resize the Game List when opening the Library (may not work on all themes)
    - Pixels: `NNpx`, example: `60px`
    - Percentage: `NN%`, example: `10%`
- Add a Millennium menu item to the System Tray menu
    - Steam has to be restarted for this configuration to take effect!
- Remove the What's New section of the Library
- Remove the "Would you recommend this game to other players?" section of app pages
- Add items to the extra Settings menu of every game
    - The format is `<TITLE>;<COMMAND/URL>;<TITLE>;<COMMAND/URL>;...`
    - `<APPID>` will be replaced by the Steam AppID
    - `<NAME>`, `<NAME_HYPHEN>` and `<NAME_UNDER>` will be replaced by the game name
- Mark all Shortcuts (non-Steam games) as not installed
- Mark Shortcuts (non-Steam games) with missing binaries as not installed
- Add a Restart menu item to the Steam menu
    - Steam has to be restarted for this configuration to take effect!
- Add a "Scroll to App" item to the extra Settings menu of every game
- Up/downgrade apps
    - Open the Properties window of an app
    - Under Updates, click the `Custom Up/Downgrade` button
    - Click the wanted Depot ID
    - Click the wanted Manifest ID
    - Wait for the depot to be downloaded and the app patched
    - The app is also set to only update on launch
    - When all is done, the button will display `Done!`
- Add a download button for screenshots in the Community Hub
- Shutdown or run a command when a download completes
    - Right click the download indicator to use
- Pause or unpause all downloads
    - Right click the download indicator to use

Big thanks to canitakemasoulbackpls!

## Configuration
- Configuration options are available through the Millennium Library Manager
- Configuration change may require restarting Steam to take effect

## Prerequisites
- [Millennium](https://steambrew.app/)

## Known issues:
- "Scroll to App" is unfortunately janky and doesn't always work
- If the download progress is not picked up by the plugin, try turning on `Use old detection method` and restarting Steam
