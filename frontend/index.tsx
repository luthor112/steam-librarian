import { callable, findClassModule, findModule, sleep, Millennium, Menu, MenuItem, showContextMenu } from "@steambrew/client";

// Backend functions
const get_autoselect_item = callable<[{}], string>('Backend.get_autoselect_item');
const get_open_details = callable<[{}], boolean>('Backend.get_open_details');
const get_library_size = callable<[{}], string>('Backend.get_library_size');
const get_millennium_systray = callable<[{}], boolean>('Backend.get_millennium_systray');
const get_systray_text = callable<[{}], string>('Backend.get_systray_text');
const get_remove_news = callable<[{}], boolean>('Backend.get_remove_news');
const get_extra_options_count = callable<[{}], number>('Backend.get_extra_options_count');
const get_extra_option = callable<[{ opt_num: number }], string>('Backend.get_extra_option');
const run_extra_option = callable<[{ opt_num: number, app_id: number, app_name: string }], boolean>('Backend.run_extra_option');

const WaitForElement = async (sel: string, parent = document) =>
	[...(await Millennium.findElement(parent, sel))][0];

const WaitForElementTimeout = async (sel: string, parent = document, timeOut = 1000) =>
	[...(await Millennium.findElement(parent, sel, timeOut))][0];

const WaitForElementList = async (sel: string, parent = document) =>
	[...(await Millennium.findElement(parent, sel))];

async function OnPopupCreation(popup: any) {
    if (popup.m_strName === "SP Desktop_uid0") {
        var mwbm = undefined;
        while (!mwbm) {
            console.log("[steam-librarian] Waiting for MainWindowBrowserManager");
            try {
                mwbm = MainWindowBrowserManager;
            } catch {
                await sleep(100);
            }
        }

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
                if (extraOptionsCount > 0) {
                    const gameSettingsButton = await WaitForElement(`div.${findModule(e => e.InPage).InPage} div.${findModule(e => e.AppButtonsContainer).AppButtonsContainer} > div.${findModule(e => e.MenuButtonContainer).MenuButtonContainer}:not([role="button"])`, popup.m_popup.document);
                    const oldExtraSettingsButton = gameSettingsButton.parentNode.querySelector('div.extra-settings-button');
                    if (!oldExtraSettingsButton) {
                        const extraSettingsButton = gameSettingsButton.cloneNode(true);
                        extraSettingsButton.classList.add("extra-settings-button");
                        extraSettingsButton.firstChild.innerHTML = "+";
                        gameSettingsButton.parentNode.insertBefore(extraSettingsButton, gameSettingsButton.nextSibling);

                        extraSettingsButton.addEventListener("click", async () => {
                            const extraMenuItems = [];
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
            }
        });
    } else if (popup.m_strTitle === "Menu") {
        const systrayEnabled = await get_millennium_systray({});
        if (systrayEnabled) {
            const menuItemList = await WaitForElementList(`div#popup_target div.contextMenuItem > div.${findModule(e => e.JumpListItemText).JumpListItemText}`, popup.m_popup.document);
            const exitItem = menuItemList[menuItemList.length - 1].parentNode;
            const millenniumItem = exitItem.cloneNode(true);

            millenniumItem.firstChild.textContent = await get_systray_text({});
            exitItem.parentNode.insertBefore(millenniumItem, exitItem.previousSibling);
            millenniumItem.addEventListener("click", async () => {
                //window.open("steam://millennium", "_blank");
                //SteamUIStore.Navigate("/millennium");
                SteamUIStore.Navigate("/millennium/settings");
                //window.open("steam://millennium/settings", "_blank");
            });
        }
    }
}

export default async function PluginMain() {
    console.log("[steam-librarian] frontend startup");
    await sleep(1000);  // Hopefully temporary workaround

    // Call the backend methods and log the configuration
    const gameName = await get_autoselect_item({});
    console.log("[steam-librarian] Result from get_autoselect_item:", gameName);
    const autoOpenDetails = await get_open_details({});
    console.log("[steam-librarian] Result from get_open_details:", autoOpenDetails);
    const desiredLibrarySize = await get_library_size({});
    console.log("[steam-librarian] Result from get_library_size:", desiredLibrarySize);
    const systrayEnabled = await get_millennium_systray({});
    console.log("[steam-librarian] Result from get_millennium_systray:", systrayEnabled);
    const systrayText = await get_systray_text({});
    console.log("[steam-librarian] Result from get_systray_text:", systrayText);
    const removeNews = await get_remove_news({});
    console.log("[steam-librarian] Result from get_remove_news:", removeNews);
    const extraOptionsCount = await get_extra_options_count({});
    console.log("[steam-librarian] Result from get_extra_options_count:", extraOptionsCount);

    const doc = g_PopupManager.GetExistingPopup("SP Desktop_uid0");
	if (doc) {
		OnPopupCreation(doc);
	}

    g_PopupManager.m_mapPopups.data_.forEach(popup => {
        if (popup.value_.m_strTitle === "Menu") {
            OnPopupCreation(popup.value_);
        }
    });

	g_PopupManager.AddPopupCreatedCallback(OnPopupCreation);
}
