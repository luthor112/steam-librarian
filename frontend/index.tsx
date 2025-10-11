import { callable, findClassModule, findModule, sleep, Millennium, Menu, MenuItem, DialogButton, showContextMenu } from "@steambrew/client";
import { render } from "react-dom";

// Backend functions
const get_autoselect_item = callable<[{}], string>('Backend.get_autoselect_item');
const get_open_details = callable<[{}], boolean>('Backend.get_open_details');
const get_library_size = callable<[{}], string>('Backend.get_library_size');
const get_millennium_systray = callable<[{}], boolean>('Backend.get_millennium_systray');
const get_systray_text = callable<[{ transmit_encoded: boolean }], string>('Backend.get_systray_text');
const get_remove_news = callable<[{}], boolean>('Backend.get_remove_news');
const get_remove_review_ask = callable<[{}], boolean>('Backend.get_remove_review_ask');
const get_extra_options_count = callable<[{}], number>('Backend.get_extra_options_count');
const get_mark_shortcuts_offline = callable<[{}], boolean>('Backend.get_mark_shortcuts_offline');
const get_check_shortcuts_exist = callable<[{}], boolean>('Backend.get_check_shortcuts_exist');
const fs_file_exists = callable<[{ file_path: string }], boolean>('Backend.fs_file_exists');
const get_restart_menu = callable<[{}], boolean>('Backend.get_restart_menu');
const get_extra_option = callable<[{ opt_num: number }], string>('Backend.get_extra_option');
const get_restart_text = callable<[{ transmit_encoded: boolean }], string>('Backend.get_restart_text');
const run_extra_option = callable<[{ opt_num: number, app_id: number, app_name: string }], boolean>('Backend.run_extra_option');
const get_scroll_to_app = callable<[{}], boolean>('Backend.get_scroll_to_app');
const get_app_downgrader = callable<[{}], boolean>('Backend.get_app_downgrader');
const copy_files = callable<[{ source_dir: string, destination_dir: string }], boolean>('Backend.copy_files');

const WaitForElement = async (sel: string, parent = document) =>
	[...(await Millennium.findElement(parent, sel))][0];

const WaitForElementTimeout = async (sel: string, parent = document, timeOut = 1000) =>
	[...(await Millennium.findElement(parent, sel, timeOut))][0];

const WaitForElementList = async (sel: string, parent = document) =>
	[...(await Millennium.findElement(parent, sel))];

async function runConsoleCommand(consoleCommand, desiredOutput) {
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

var scrollToColl = undefined;
var scrollToApp = undefined;

async function OnPopupCreation(popup: any) {
    if (popup.m_strName === "SP Desktop_uid0") {
        MainWindowBrowserManager.m_browser.on("finished-request", async (currentURL, previousURL) => {
            if (MainWindowBrowserManager.m_lastLocation.pathname === "/library/home") {
                const gameName = await get_autoselect_item({});
                if (gameName !== "") {
                    const gameObj = appStore.allApps.find((x) => x.display_name === gameName);
                    SteamUIStore.Navigate(`/library/app/${gameObj.appid}`);
                }

                const desiredLibrarySize = await get_library_size({});
                if (desiredLibrarySize !== "") {
                    const libraryDisplay = await WaitForElement('div.LibraryDisplaySizeSmall, div.LibraryDisplaySizeMedium, div.LibraryDisplaySizeLarge', popup.m_popup.document);
                    const leftPanel = libraryDisplay.firstChild;
                    leftPanel.style = `width: ${desiredLibrarySize}; min-width: 1px !important;`;
                }

                const removeNews = await get_remove_news({});
                if (removeNews) {
                    try {
                        const newsElement = await WaitForElementTimeout(`div.${findModule(e => e.UpdatesContainer).UpdatesContainer}`, popup.m_popup.document);
                        if (newsElement) {
                            newsElement.remove();
                        }
                    } catch {}
                }

                const markShortcutsOffline = await get_mark_shortcuts_offline({});
                const checkShortcutsExist = await get_check_shortcuts_exist({});
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
                const autoOpenDetails = await get_open_details({});
                if (autoOpenDetails) {
                    try {
                        const collapsedGameDetails = await WaitForElementTimeout(`div.${findModule(e => e.AppDetailsCollapsed).AppDetailsCollapsed}`, popup.m_popup.document);
                        if (collapsedGameDetails) {
                            const infoIcon = await WaitForElement(`div.${findModule(e => e.InPage).InPage} div.${findModule(e => e.AppButtonsContainer).AppButtonsContainer} svg.SVGIcon_Information`, popup.m_popup.document);
                            infoIcon.parentElement.click();
                        }
                    } catch {}
                }

                const extraOptionsCount = await get_extra_options_count({});
                const scrollToAppEnabled = await get_scroll_to_app({});
                if (extraOptionsCount > 0 || scrollToAppEnabled) {
                    const gameSettingsButton = await WaitForElement(`div.${findModule(e => e.InPage).InPage} div.${findModule(e => e.AppButtonsContainer).AppButtonsContainer} > div.${findModule(e => e.MenuButtonContainer).MenuButtonContainer}:not([role="button"])`, popup.m_popup.document);
                    const oldExtraSettingsButton = gameSettingsButton.parentNode.querySelector('div.extra-settings-button');
                    if (!oldExtraSettingsButton) {
                        const extraSettingsButton = gameSettingsButton.cloneNode(true);
                        extraSettingsButton.classList.add("extra-settings-button");
                        extraSettingsButton.firstChild.innerHTML = "+";
                        gameSettingsButton.parentNode.insertBefore(extraSettingsButton, gameSettingsButton.nextSibling);

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
                                const itemName = await get_extra_option({ opt_num: i });
                                const currentColl = collectionStore.GetCollection(uiStore.currentGameListSelection.strCollectionId);
                                const currentApp = currentColl.allApps.find((x) => x.appid === uiStore.currentGameListSelection.nAppId);
                                extraMenuItems.push(<MenuItem onClick={async () => { await run_extra_option({ opt_num: i, app_id: uiStore.currentGameListSelection.nAppId, app_name: currentApp.display_name }); }}> {itemName} </MenuItem>);
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

                const removeReviewAsk = await get_remove_review_ask({});
                if (removeReviewAsk) {
                    try {
                        const reviewAskPane = await WaitForElementTimeout(`div.${findModule(e => e.ReviewContainer).ReviewContainer}`, popup.m_popup.document);
                        if (reviewAskPane) {
                            const askParent = reviewAskPane.parentElement;
                            reviewAskPane.remove();
                            if (askParent.children.length === 0) {
                                askParent.remove();
                            }
                        }
                    } catch {}
                }

                const markShortcutsOffline = await get_mark_shortcuts_offline({});
                const checkShortcutsExist = await get_check_shortcuts_exist({});
                if (markShortcutsOffline) {
                    const currentApp = appStore.allApps.find((x) => x.appid === uiStore.currentGameListSelection.nAppId);
                    if (currentApp.BIsShortcut()) {
                        currentApp.per_client_data[0].installed = false;
                    }
                } else if (checkShortcutsExist) {
                    const currentApp = appStore.allApps.find((x) => x.appid === uiStore.currentGameListSelection.nAppId);
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
                            appGrid.children[appGrid.children.length - 1].querySelector('img').scrollIntoView({ block: "end" });
                            await sleep(100);
                        }
                    }
                }
            }
        });
    } else if (popup.m_strTitle === "Menu") {
        const systrayEnabled = await get_millennium_systray({});
        if (systrayEnabled) {
            const menuItemList = await WaitForElementList(`div#popup_target div.contextMenuItem > div.${findModule(e => e.JumpListItemText).JumpListItemText}`, popup.m_popup.document);
            const exitItem = menuItemList[menuItemList.length - 1].parentNode;
            const millenniumItem = exitItem.cloneNode(true);

            const systrayTextEnc = await get_systray_text({ transmit_encoded: true });
            millenniumItem.firstChild.textContent = decodeURIComponent(escape(window.atob(systrayTextEnc)));
            exitItem.parentNode.insertBefore(millenniumItem, exitItem.previousSibling);
            millenniumItem.addEventListener("click", async () => {
                SteamUIStore.Navigate("/millennium/settings");
            });
        }
    } else if (popup.m_strTitle === "Steam Root Menu") {
        const restartMenuEnabled = await get_restart_menu({});
        if (restartMenuEnabled) {
            console.log("[steam-librarian] Steam Root Menu reached!");
            const menuItemList = await WaitForElementList("div#popup_target div[role='menuitem']", popup.m_popup.document);
            const exitItem = menuItemList[menuItemList.length - 1];
            const restartItem = exitItem.cloneNode(true);

            const restartMenuTextEnc = await get_restart_text({ transmit_encoded: true });
            restartItem.textContent = decodeURIComponent(escape(window.atob(restartMenuTextEnc)));
            exitItem.parentNode.insertBefore(restartItem, exitItem);
            restartItem.addEventListener("click", async () => {
                SteamClient.User.StartRestart(true);
            });
        }
    } else if (popup.m_strName.startsWith("PopupWindow_")) {
        const appDowngraderEnabled = await get_app_downgrader({});
        if (appDowngraderEnabled) {
            try {
                const appGeneralPanel = await WaitForElementTimeout("div.DialogContent[id$='/properties/general_Content']", popup.m_popup.document);
                if (appGeneralPanel) {
                    const currentAppID = appGeneralPanel.id.substring(appGeneralPanel.id.indexOf("/app/") + "/app/".length, appGeneralPanel.id.indexOf("/properties/general_Content"));
                    console.log("[steam-librarian] Detected App General Properties window for:", currentAppID);

                    const contentPageObserver = new MutationObserver(async (mutationList, observer) => {
                        if (appGeneralPanel.id.endsWith("/properties/updates_Content")) {
                            const downgradeButton = popup.m_popup.document.createElement("div");
                            render(<DialogButton style={{width: "100%"}}>Custom Up/Downgrade</DialogButton>, downgradeButton);
                            const dBody = await WaitForElement("div.DialogBody", appGeneralPanel);
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
                                const depotID = matches[1];
                                const manifestID = matches[2];
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
                                const depotDLDir = downloadCompletedRegex.exec(downloadCompletedMessage)[1];
                                console.log("[steam-librarian] Download path:", depotDLDir);
                                
                                downgradeButton.firstChild.textContent = "Updating app...";
                                await appDetailsStore.RequestAppDetails(parseInt(currentAppID));
                                const appPath = appDetailsStore.GetAppDetails(parseInt(currentAppID)).strInstallFolder;
                                await copy_files({ source_dir: depotDLDir, destination_dir: appPath });

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

export default async function PluginMain() {
    console.log("[steam-librarian] frontend startup");
    await App.WaitForServicesInitialized();

    while (
        typeof g_PopupManager === 'undefined' ||
        typeof MainWindowBrowserManager === 'undefined'
    ) {
        await sleep(100);
    }

    var mwbm = undefined;
    while (!mwbm) {
        console.log("[steam-librarian] Waiting for MainWindowBrowserManager");
        try {
            mwbm = MainWindowBrowserManager;
        } catch {
            await sleep(100);
        }
    }

    // Call the backend methods and log the configuration
    const gameName = await get_autoselect_item({});
    console.log("[steam-librarian] Result from get_autoselect_item:", gameName);
    const autoOpenDetails = await get_open_details({});
    console.log("[steam-librarian] Result from get_open_details:", autoOpenDetails);
    const desiredLibrarySize = await get_library_size({});
    console.log("[steam-librarian] Result from get_library_size:", desiredLibrarySize);
    const systrayEnabled = await get_millennium_systray({});
    console.log("[steam-librarian] Result from get_millennium_systray:", systrayEnabled);
    const removeNews = await get_remove_news({});
    console.log("[steam-librarian] Result from get_remove_news:", removeNews);
    const removeReviewAsk = await get_remove_review_ask({});
    console.log("[steam-librarian] Result from get_remove_review_ask:", removeReviewAsk);
    const extraOptionsCount = await get_extra_options_count({});
    console.log("[steam-librarian] Result from get_extra_options_count:", extraOptionsCount);
    const markShortcutsOffline = await get_mark_shortcuts_offline({});
    console.log("[steam-librarian] Result from get_mark_shortcuts_offline:", markShortcutsOffline);
    const checkShortcutsExist = await get_check_shortcuts_exist({});
    console.log("[steam-librarian] Result from get_check_shortcuts_exist:", checkShortcutsExist);
    const restartMenuEnabled = await get_restart_menu({});
    console.log("[steam-librarian] Result from get_restart_menu:", restartMenuEnabled);
    const scrollToAppEnabled = await get_scroll_to_app({});
    console.log("[steam-librarian] Result from get_scroll_to_app:", scrollToAppEnabled);
    const appDowngraderEnabled = await get_app_downgrader({});
    console.log("[steam-librarian] Result from get_app_downgrader:", appDowngraderEnabled);

    const doc = g_PopupManager.GetExistingPopup("SP Desktop_uid0");
	if (doc) {
		OnPopupCreation(doc);
	}

    g_PopupManager.m_mapPopups.data_.forEach(popup => {
        if (popup.value_.m_strTitle === "Menu" || popup.value_.m_strTitle === "Steam Root Menu") {
            OnPopupCreation(popup.value_);
        }
    });

	g_PopupManager.AddPopupCreatedCallback(OnPopupCreation);

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
}
