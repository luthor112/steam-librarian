import { callable, findModule, sleep, Millennium, Menu, MenuItem, DialogButton, showContextMenu, IconsModule, definePlugin, Field, TextField, Toggle, pluginSelf, DownloadItem } from "@steambrew/client";
import { createRoot } from "react-dom/client";
import React, { useState, useEffect } from "react";

declare global {
    var MainWindowBrowserManager: any;
    var SteamUIStore: any;
    var uiStore: any;
    var appStore: any;
    var appDetailsStore: any;
    var collectionStore: any;
}

// Backend functions
const fs_file_exists = callable<[{ file_path: string }], boolean>('fs_file_exists');
const run_command = callable<[{ custom_command: string }], boolean>('run_command');
const copy_files = callable<[{ a_source_dir: string, b_destination_dir: string }], boolean>('copy_files');

const WaitForElement = async (sel: string, parent = document) =>
    [...(await Millennium.findElement(parent, sel))][0];

const WaitForElementTimeout = async (sel: string, parent = document, timeOut = 1000) =>
    [...(await Millennium.findElement(parent, sel, timeOut))][0];

const WaitForElementList = async (sel: string, parent = document) =>
    [...(await Millennium.findElement(parent, sel))];

type PluginConfig = {
    autoselect: string;
    open_details: boolean;
    library_size: string;
    millennium_systray: boolean;
    millennium_systray_text: string;
    remove_news: boolean;
    remove_review_ask: boolean;
    extra_options_str: string;
    mark_shortcuts_offline: boolean;
    check_shortcuts_exist: boolean;
    restart_menu: boolean;
    restart_menu_text: string;
    scroll_to_app: boolean;
    app_downgrader: boolean;
    community_download: boolean;
    old_download_detection: boolean;
    download_custom_command: string;
}

var pluginConfig: PluginConfig = {
    autoselect: "",
    open_details: false,
    library_size: "",
    millennium_systray: false,
    millennium_systray_text: "Millennium",
    remove_news: false,
    remove_review_ask: false,
    extra_options_str: "",
    mark_shortcuts_offline: false,
    check_shortcuts_exist: false,
    restart_menu: false,
    restart_menu_text: "Restart",
    scroll_to_app: false,
    app_downgrader: false,
    community_download: true,
    old_download_detection: false,
    download_custom_command: ""
};

// 0: Do nothing
// 1: Shut down
// 2: Run custom command
var downloadCompletionTask: number = 0;

function getExtraOptionsList() {
    let extraOptionsList = [];
    if (pluginConfig.extra_options_str !== "") {
        const strParts = pluginConfig.extra_options_str.split(";");
        for (let i = 0; i < strParts.length; i = i + 2) {
            extraOptionsList.push([strParts[i], strParts[i+1]]);
        }
    }
    return extraOptionsList;
};

async function runExtraOption(opt_num: number, app_id: number, app_name: string) {
    const extraOption = getExtraOptionsList()[opt_num][1];
    if (!extraOption.includes("://")) {
        const app_id_str = app_id.toString();
        const app_name_hyphen = app_name.replace(" ", "-");
        const app_name_under = app_name.replace(" ", "_");
        const customCommand = extraOption.replace("<APPID>", app_id_str).replace("<NAME>", `\"${app_name}\"`).replace("<NAME_HYPHEN>", app_name_hyphen).replace("<NAME_UNDER>", app_name_under);
        await run_command({ custom_command: customCommand });
    } else {
        const app_id_str = app_id.toString();
        const app_name_enc = encodeURIComponent(app_name);
        const app_name_hyphen_enc = encodeURIComponent(app_name.replace(" ", "-"));
        const app_name_under_enc = encodeURIComponent(app_name.replace(" ", "_"));
        const pageToOpen = extraOption.replace("<APPID>", app_id_str).replace("<NAME>", app_name_enc).replace("<NAME_HYPHEN>", app_name_hyphen_enc).replace("<NAME_UNDER>", app_name_under_enc);
        MainWindowBrowserManager.ShowURL(pageToOpen, "store");
    }
}

class frontend_functions {
    static get_community_download_setting() {
        return pluginConfig.community_download;
    }
}

// export frontend_functions class to global context
Millennium.exposeObj!({ frontend_functions });

async function runConsoleCommand(consoleCommand: string, desiredOutput: RegExp): Promise<string> {
    return new Promise((resolve) => {
        const spewReader = SteamClient.Console.RegisterForSpewOutput((output) => {
            console.log("[Steam Console]", output.spew);
            if (desiredOutput.test(output.spew)) {
                console.log("[steam-librarian] Found desired output!");
                spewReader.unregister();
                resolve(output.spew);
            }
        });
        console.log("[steam-librarian] Executing", consoleCommand);
        SteamClient.Console.ExecCommand(consoleCommand);
    });
}

var scrollToColl: string | undefined = undefined;
var scrollToApp: number | undefined = undefined;

async function OnPopupCreation(popup: any) {
    await sleep(10000);
    if (popup.m_strName === "SP Desktop_uid0") {
        await sleep(10000);
        var mwbm = undefined;
        while (!mwbm) {
            console.log("[steam-librarian] Waiting for MainWindowBrowserManager");
            try {
                mwbm = MainWindowBrowserManager;
            } catch {
                await sleep(100);
            }
        }

        MainWindowBrowserManager.m_browser.on("finished-request", async (currentURL: any, previousURL: any) => {
            void currentURL;
            void previousURL;

            if (MainWindowBrowserManager.m_lastLocation.pathname === "/library/home") {
                const gameName = pluginConfig.autoselect;
                if (gameName !== "") {
                    const gameObj = appStore.allApps.find((x: any) => x.display_name === gameName);
                    SteamUIStore.Navigate(`/library/app/${gameObj.appid}`);
                }

                const desiredLibrarySize = pluginConfig.library_size;
                if (desiredLibrarySize !== "") {
                    const libraryDisplay = await WaitForElement('div.LibraryDisplaySizeSmall, div.LibraryDisplaySizeMedium, div.LibraryDisplaySizeLarge', popup.m_popup.document);
                    const leftPanel = libraryDisplay.firstChild;
                    (leftPanel! as HTMLElement).style = `width: ${desiredLibrarySize}; min-width: 1px !important;`;
                }

                const removeNews = pluginConfig.remove_news;
                if (removeNews) {
                    try {
                        const newsElement = await WaitForElementTimeout(`div.${findModule(e => e.UpdatesContainer).UpdatesContainer}`, popup.m_popup.document);
                        if (newsElement) {
                            newsElement.remove();
                        }
                    } catch {}
                }

                const markShortcutsOffline = pluginConfig.mark_shortcuts_offline;
                const checkShortcutsExist = pluginConfig.check_shortcuts_exist;
                if (markShortcutsOffline) {
                    for (const currentApp of appStore.allApps) {
                        if (currentApp.BIsShortcut()) {
                            currentApp.per_client_data[0].installed = false;
                        }
                    }
                } else if (checkShortcutsExist) {
                    for (const currentApp of appStore.allApps) {
                        if (currentApp.BIsShortcut()) {
                            await appDetailsStore.RequestAppDetails(currentApp.appid);
                            const binaryPath = appDetailsStore.GetAppDetails(currentApp.appid).strShortcutExe;
                            const binaryExists = await fs_file_exists({ file_path: binaryPath });
                            if (!binaryExists) {
                                currentApp.per_client_data[0].installed = false;
                            }
                        }
                    }
                }
            } else if (MainWindowBrowserManager.m_lastLocation.pathname.startsWith("/library/app/")) {
                const autoOpenDetails = pluginConfig.open_details;
                if (autoOpenDetails) {
                    try {
                        const collapsedGameDetails = await WaitForElementTimeout(`div.${findModule(e => e.AppDetailsCollapsed).AppDetailsCollapsed}`, popup.m_popup.document);
                        if (collapsedGameDetails) {
                            const infoIcon = await WaitForElement(`div.${findModule(e => e.InPage).InPage} div.${findModule(e => e.AppButtonsContainer).AppButtonsContainer} svg.SVGIcon_Information`, popup.m_popup.document);
                            infoIcon.parentElement!.click();
                        }
                    } catch {}
                }

                const extraOptionsList = getExtraOptionsList();
                const extraOptionsCount = extraOptionsList.length;
                const scrollToAppEnabled = pluginConfig.scroll_to_app;
                if (extraOptionsCount > 0 || scrollToAppEnabled) {
                    const gameSettingsButton = await WaitForElement(`div.${findModule(e => e.InPage).InPage} div.${findModule(e => e.AppButtonsContainer).AppButtonsContainer} > div.${findModule(e => e.MenuButtonContainer).MenuButtonContainer}:not([role="button"])`, popup.m_popup.document);
                    const oldExtraSettingsButton = gameSettingsButton.parentNode!.querySelector('div.extra-settings-button');
                    if (!oldExtraSettingsButton) {
                        const extraSettingsButton = gameSettingsButton.cloneNode(true) as HTMLElement;
                        extraSettingsButton.classList.add("extra-settings-button");
                        extraSettingsButton.title = "Extra Settings";
                        (extraSettingsButton.firstChild! as HTMLElement).innerHTML = "+";
                        gameSettingsButton.parentNode!.insertBefore(extraSettingsButton, gameSettingsButton.nextSibling);

                        extraSettingsButton.addEventListener("click", async () => {
                            const extraMenuItems = [];
                            
                            if (scrollToAppEnabled) {
                                const currentCollID = uiStore.currentGameListSelection.strCollectionId;
                                const currentAppID = uiStore.currentGameListSelection.nAppId;
                                extraMenuItems.push(<MenuItem onClick={async () => {
                                    scrollToColl = currentCollID;
                                    scrollToApp = currentAppID;
                                    console.log("[steam-librarian] Switch to:", currentCollID);
                                    SteamUIStore.Navigate(`/library/collection/${currentCollID}`);
                                }}> Scroll to App </MenuItem>);
                            }
                            
                            for (let i = 0; i < extraOptionsCount; i++) {
                                const itemName = extraOptionsList[i][0];
                                const currentColl = collectionStore.GetCollection(uiStore.currentGameListSelection.strCollectionId);
                                const currentApp = currentColl.allApps.find((x: any) => x.appid === uiStore.currentGameListSelection.nAppId);
                                extraMenuItems.push(<MenuItem onClick={async () => { await runExtraOption(i, uiStore.currentGameListSelection.nAppId, currentApp.display_name); }}> {itemName} </MenuItem>);
                            }

                            showContextMenu(
                                <Menu label="Extra Options">
                                    {extraMenuItems}
                                </Menu>,
                                extraSettingsButton,
                                { bForcePopup: true }
                            );
                        });
                    }
                }

                const removeReviewAsk = pluginConfig.remove_review_ask;
                if (removeReviewAsk) {
                    try {
                        const reviewAskPane = await WaitForElementTimeout(`div.${findModule(e => e.ReviewContainer).ReviewContainer}`, popup.m_popup.document);
                        if (reviewAskPane) {
                            const askParent = reviewAskPane.parentElement;
                            reviewAskPane.remove();
                            if (askParent!.children.length === 0) {
                                askParent!.remove();
                            }
                        }
                    } catch {}
                }

                const markShortcutsOffline = pluginConfig.mark_shortcuts_offline;
                const checkShortcutsExist = pluginConfig.check_shortcuts_exist;
                if (markShortcutsOffline) {
                    const currentApp = appStore.allApps.find((x: any) => x.appid === uiStore.currentGameListSelection.nAppId);
                    if (currentApp.BIsShortcut()) {
                        currentApp.per_client_data[0].installed = false;
                    }
                } else if (checkShortcutsExist) {
                    const currentApp = appStore.allApps.find((x: any) => x.appid === uiStore.currentGameListSelection.nAppId);
                    if (currentApp.BIsShortcut()) {
                        await appDetailsStore.RequestAppDetails(currentApp.appid);
                        const binaryPath = appDetailsStore.GetAppDetails(currentApp.appid).strShortcutExe;
                        const binaryExists = await fs_file_exists({ file_path: binaryPath });
                        if (!binaryExists) {
                            currentApp.per_client_data[0].installed = false;
                        }
                    }
                }
            } else if (MainWindowBrowserManager.m_lastLocation.pathname.startsWith("/library/collection/")) {
                if (scrollToColl && MainWindowBrowserManager.m_lastLocation.pathname === `/library/collection/${scrollToColl}`) {
                    console.log("[steam-librarian] Switched to wanted collection:", scrollToColl);
                    const appGrid = await WaitForElement(`div.${findModule(e => e.CSSGrid).CSSGrid}[role='grid']`, popup.m_popup.document);
                    while (true) {
                        let wantedAppElement = appGrid.querySelector(`img[src^='/assets/${scrollToApp}/'`);
                        if (wantedAppElement) {
                            console.log("[steam-librarian] Wanted app image found, scrolling...");
                            wantedAppElement.scrollIntoView({ block: "center" });
                            scrollToColl = undefined;
                            scrollToApp = undefined;
                            break;
                        } else {
                            console.log("[steam-librarian] App image not found, scrolling to current bottom...");
                            appGrid.children[appGrid.children.length - 1].querySelector('img')!.scrollIntoView({ block: "end" });
                            await sleep(100);
                        }
                    }
                }
            }
        });

        const downloadStatusPlace = await WaitForElement(`div.${findModule(e => e.DownloadStatusContent).DownloadStatusContent}`, popup.m_popup.document);
        downloadStatusPlace.addEventListener("contextmenu", async () => {
            console.log("[steam-librarian] Right click detected, showing context menu...");
            showContextMenu(
                <Menu label="Download Options">
                    <MenuItem onClick={async () => {
                        downloadCompletionTask = 1;
                    }}> Shutdown after completion </MenuItem>
                    <MenuItem onClick={async () => {
                        downloadCompletionTask = 2;
                    }}> Run custom command after completion </MenuItem>
                    <MenuItem onClick={async () => {
                        downloadCompletionTask = 0;
                    }}> Do nothing after completion </MenuItem>
                    <MenuItem onClick={async () => {
                        SteamClient.Downloads.EnableAllDownloads(true);
                    }}> Unpause all downloads </MenuItem>
                    <MenuItem onClick={async () => {
                        SteamClient.Downloads.EnableAllDownloads(false);
                    }}> Pause all downloads </MenuItem>
                </Menu>,
                downloadStatusPlace,
                { bForcePopup: true }
            );
        });
        console.log("[steam-librarian] Registered for right click on download indicator");
    } else if (popup.m_strTitle === "Menu") {
        const systrayEnabled = pluginConfig.millennium_systray;
        if (systrayEnabled) {
            const menuItemList = await WaitForElementList(`div#popup_target div.contextMenuItem > div.${findModule(e => e.JumpListItemText).JumpListItemText}`, popup.m_popup.document);
            const exitItem = menuItemList[menuItemList.length - 1].parentNode;
            const millenniumItem = exitItem!.cloneNode(true);

            const systrayText = pluginConfig.millennium_systray_text;
            millenniumItem.firstChild!.textContent = systrayText;
            exitItem!.parentNode!.insertBefore(millenniumItem, exitItem!.previousSibling);
            millenniumItem.addEventListener("click", async () => {
                SteamUIStore.Navigate("/millennium/settings");
            });
        }
    } else if (popup.m_strTitle === "Steam Root Menu") {
        const restartMenuEnabled = pluginConfig.restart_menu;
        if (restartMenuEnabled) {
            console.log("[steam-librarian] Steam Root Menu reached!");
            const menuItemList = await WaitForElementList("div#popup_target div[role='menuitem']", popup.m_popup.document);
            const exitItem = menuItemList[menuItemList.length - 1];
            const restartItem = exitItem.cloneNode(true);

            const restartMenuText = pluginConfig.restart_menu_text;
            restartItem.textContent = restartMenuText;
            exitItem.parentNode!.insertBefore(restartItem, exitItem);
            restartItem.addEventListener("click", async () => {
                SteamClient.User.StartRestart(true);
            });
        }
    } else if (popup.m_strName.startsWith("PopupWindow_")) {
        const appDowngraderEnabled = pluginConfig.app_downgrader;
        if (appDowngraderEnabled) {
            try {
                const appGeneralPanel = await WaitForElementTimeout("div.DialogContent[id$='/properties/general_Content']", popup.m_popup.document);
                if (appGeneralPanel) {
                    const currentAppID = appGeneralPanel.id.substring(appGeneralPanel.id.indexOf("/app/") + "/app/".length, appGeneralPanel.id.indexOf("/properties/general_Content"));
                    console.log("[steam-librarian] Detected App General Properties window for:", currentAppID);

                    const contentPageObserver = new MutationObserver(async (mutationList, observer) => {
                        void mutationList;
                        void observer;

                        if (appGeneralPanel.id.endsWith("/properties/updates_Content")) {
                            const downgradeButton = popup.m_popup.document.createElement("div");
                            const downgradeButtonRoot = createRoot(downgradeButton);
                            downgradeButtonRoot.render(<DialogButton style={{width: "100%"}}>Custom Up/Downgrade</DialogButton>);
                            const dBody = await WaitForElement("div.DialogBody", appGeneralPanel as any);
                            dBody.appendChild(downgradeButton);

                            downgradeButton.firstChild.addEventListener("click", async () => {
                                console.log("[steam-librarian] Custom Up/Downgrade button clicked!");
                                MainWindowBrowserManager.ShowURL(`https://steamdb.info/app/${currentAppID}/depots/#depots`);
                                downgradeButton.firstChild.textContent = "Waiting for Manifest...";
                                downgradeButton.firstChild.disabled = true;

                                const manifestURLRegex = new RegExp("https://steamdb\\.info/depot/(\\d+)/history/\\?changeid=M:(.+)");
                                while (popup.m_popup && !manifestURLRegex.test(MainWindowBrowserManager.m_URL)) {
                                    await sleep(300);
                                }
                                if (!popup.m_popup) {
                                    return;
                                }

                                const matches = manifestURLRegex.exec(MainWindowBrowserManager.m_URL);
                                const depotID = matches![1];
                                const manifestID = matches![2];
                                console.log(`[steam-librarian] App: ${currentAppID}; Depot: ${depotID}; Manifest:`, manifestID);

                                await SteamClient.Apps.SetAppAutoUpdateBehavior(parseInt(currentAppID), 1);
                                console.log("[steam-librarian] App update behaviour set to 'Launch'");

                                downgradeButton.firstChild.textContent = "Downloading Depot...";
                                const downloadCommand = `download_depot ${currentAppID} ${depotID} ${manifestID}`;
                                const downloadCompletedRegex = new RegExp(`Depot download complete *: *\"(.+)\" \\(manifest ${manifestID}\\)`);
                                const downloadCompletedMessage = await runConsoleCommand(downloadCommand, downloadCompletedRegex);

                                if (!popup.m_popup) {
                                    return;
                                }
                                const depotDLDir = downloadCompletedRegex.exec(downloadCompletedMessage)![1];
                                console.log("[steam-librarian] Download path:", depotDLDir);
                                
                                downgradeButton.firstChild.textContent = "Updating app...";
                                await appDetailsStore.RequestAppDetails(parseInt(currentAppID));
                                const appPath = appDetailsStore.GetAppDetails(parseInt(currentAppID)).strInstallFolder;
                                await copy_files({ a_source_dir: depotDLDir, b_destination_dir: appPath });

                                downgradeButton.firstChild.textContent = "Done!";
                            });
                        }
                    });
                    contentPageObserver.observe(appGeneralPanel, { attributes: true, attributeFilter: ["id"] });
                }
            } catch {}
        }
    }
}

type BoolKeys = {
    [K in keyof PluginConfig]: PluginConfig[K] extends boolean ? K : never
  }[keyof PluginConfig];
  
type StringKeys = {
    [K in keyof PluginConfig]: PluginConfig[K] extends string ? K : never
}[keyof PluginConfig];

type SingleSettingProps =
  | { type: "bool"; name: BoolKeys; label: string; description: string, readonly?: boolean }
  | { type: "text"; name: StringKeys; label: string; description: string, readonly?: boolean };

const SingleSetting = (props: SingleSettingProps) => {
    const [boolValue, setBoolValue] = useState(false);
    const [isDisabled, setIsDisabled] = useState(false);

    const saveConfig = () => {
        localStorage.setItem("luthor112.steam-librarian.config", JSON.stringify(pluginConfig));
    };

    useEffect(() => {
        if (props.type === "bool") {
            setBoolValue(pluginConfig[props.name]);
        }

        if (props.readonly) {
            setIsDisabled(true);
        }
    }, []);

    if (props.type === "bool") {
        return (
            <Field label={props.label} description={props.description} bottomSeparator="standard" focusable>
                <Toggle disabled={isDisabled} value={boolValue} onChange={(value) => { setBoolValue(value); pluginConfig[props.name] = value; saveConfig(); }} />
            </Field>
        );
    } else if (props.type === "text") {
        return (
            <Field label={props.label} description={props.description} bottomSeparator="standard" focusable>
                <TextField style={{ width: "100%", boxSizing: "border-box" }} disabled={isDisabled} defaultValue={pluginConfig[props.name]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { (pluginConfig as any)[props.name] = e.currentTarget.value; saveConfig(); }} />
            </Field>
        );
    } else {
        return (
            <div>This should not happen...</div>
        );
    }
}

const SettingsContent = () => {
    return (
        <div>
            <SingleSetting name="autoselect" type="text" label="Autoselect game" description="Automatically select game when opening the Library" />
            <SingleSetting name="open_details" type="bool" label="Always open details" description="Always open Game Details when clicking a game" />
            <SingleSetting name="library_size" type="text" label="Game List size" description="Automatically resize the Game List to this width when opening the Library" />
            <SingleSetting name="millennium_systray" type="bool" label="System Tray item" description="Add a Millennium menu item to the System Tray menu" />
            <SingleSetting name="millennium_systray_text" type="text" label="System Tray text" description="Customize the text of the System Tray menu item" />
            <SingleSetting name="remove_news" type="bool" label="Remove What's New" description="Remove the What's New section of the Library" />
            <SingleSetting name="remove_review_ask" type="bool" label="Remove review nag" description="Remove the 'Would you recommend this game to other players?' section of app pages" />
            <SingleSetting name="extra_options_str" type="text" label="Extra setting menu items" description="Check ReadMe for format" />
            <SingleSetting name="mark_shortcuts_offline" type="bool" label="Mark Shortcuts as not installed" description="Mark all Shortcuts (non-Steam games) as not installed" />
            <SingleSetting name="check_shortcuts_exist" type="bool" label="Mark Shortcuts with missing binaries as not installed" description="Mark Shortcuts (non-Steam games) with missing binaries as not installed" />
            <SingleSetting name="restart_menu" type="bool" label="Restart menu item" description="Add a Restart menu item to the Steam menu" />
            <SingleSetting name="restart_menu_text" type="text" label="Restart menu text" description="Customize the text of the Restart menu item" />
            <SingleSetting name="scroll_to_app" type="bool" label="Enable 'Scroll to App'" description="Add a 'Scroll to App' item to the extra Settings menu of every game (janky!)" />
            <SingleSetting name="app_downgrader" type="bool" label="Enable App Downgrader" description="Check ReadMe for instructions" />
            <SingleSetting name="community_download" type="bool" readonly={true} label="Download button for screenshots" description="Add a download button for screenshots in the Community Hub" />
            <SingleSetting name="download_custom_command" type="text" label="Custom command for download completion" description="Command to run on download completion" />
        </div>
    );
};

export default definePlugin(async () => {
    console.log("[steam-librarian] Frontend startup");

    const rawValue = localStorage.getItem("luthor112.steam-librarian.config");
    const storedConfig: Partial<PluginConfig> = rawValue ? JSON.parse(rawValue) : {};
    pluginConfig = { ...pluginConfig, ...storedConfig };
    console.log("[steam-librarian] Merged config:", pluginConfig);

    Millennium.AddWindowCreateHook!(OnPopupCreation);

    if (pluginConfig.mark_shortcuts_offline) {
        for (const currentApp of appStore.allApps) {
            if (currentApp.BIsShortcut()) {
                currentApp.per_client_data[0].installed = false;
            }
        }
    } else if (pluginConfig.check_shortcuts_exist) {
        for (const currentApp of appStore.allApps) {
            if (currentApp.BIsShortcut()) {
                await appDetailsStore.RequestAppDetails(currentApp.appid);
                const binaryPath = appDetailsStore.GetAppDetails(currentApp.appid).strShortcutExe;
                const binaryExists = await fs_file_exists({ file_path: binaryPath });
                if (!binaryExists) {
                    currentApp.per_client_data[0].installed = false;
                }
            }
        }
    }

    const oldDetection = false;
    if (!oldDetection) {
        pluginSelf.current_download_appid = 0;

        SteamClient.Downloads.RegisterForDownloadOverview(async (event: any) => {
            console.log("[steam-librarian] onDownloadOverview:", event);
            const state: string = event.update_state;

            console.log('[steam-librarian] Appid: ', event.update_appid);

            if (event.update_appid === 0) {
                console.log("[steam-librarian] Ignoring appid 0");
            } else if (state === 'Downloading' || state === 'Updating' || state === 'Patching' || state === 'Installing') {
                console.log("[steam-librarian] Download percentage:", event.overall_percent_complete);
                pluginSelf.current_download_appid = event.update_appid;
            }
        });

        SteamClient.Downloads.RegisterForDownloadItems(async (isDownloading: boolean, downloadItems: any) => {
            void isDownloading;

            const current_app_item = downloadItems.find((el: any) => (el.item_data[0] as DownloadItem).appid === pluginSelf.current_download_appid);
            if (current_app_item ) {
                const current_app = current_app_item.item_data[0] as DownloadItem;
                if (current_app.completed) {
                    if (downloadCompletionTask == 1) {
                        console.log("[steam-librarian] Download completed, shutting down");
                        await run_command({ custom_command: "shutdown /s /t 0" });
                    } else if (downloadCompletionTask == 2) {
                        console.log("[steam-librarian] Download completed, running custom command");
                        await run_command({ custom_command: pluginConfig.download_custom_command });
                    }
                    pluginSelf.current_download_appid = 0;
                    downloadCompletionTask = 0;
                }
            }
        });

        console.log("[steam-librarian] Using new detection method - registered for download events");
    }

    return {
        title: "Steam Librarian",
        icon: <IconsModule.Settings />,
        content: <SettingsContent />,
    };
});
