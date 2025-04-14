import { callable, findClassModule, findModule, Millennium, Menu, MenuItem, showContextMenu } from "@steambrew/client";

// Backend functions
const get_autoselect_item = callable<[{}], string>('Backend.get_autoselect_item');
const get_open_details = callable<[{}], boolean>('Backend.get_open_details');
const get_library_size = callable<[{}], string>('Backend.get_library_size');
const get_millennium_systray = callable<[{}], boolean>('Backend.get_millennium_systray');
const get_remove_news = callable<[{}], boolean>('Backend.get_remove_news');
const get_taskbar_progress_enabled = callable<[{}], boolean>('Backend.get_taskbar_progress_enabled');
const get_extra_options_count = callable<[{}], number>('Backend.get_extra_options_count');
const get_extra_option = callable<[{ opt_num: number }], string>('Backend.get_extra_option');
const run_extra_option = callable<[{ opt_num: number, app_id: number }], boolean>('Backend.run_extra_option');
const open_millennium_settings = callable<[{}], boolean>('Backend.open_millennium_settings');
const set_progress_percent = callable<[{ percent: number }], boolean>('Backend.set_progress_percent');

const WaitForElement = async (sel: string, parent = document) =>
	[...(await Millennium.findElement(parent, sel))][0];

const WaitForElementTimeout = async (sel: string, parent = document, timeOut = 1000) =>
	[...(await Millennium.findElement(parent, sel, timeOut))][0];

const WaitForElementList = async (sel: string, parent = document) =>
	[...(await Millennium.findElement(parent, sel))];

// TODO: Remove
async function test_func(progress = 10) {
    await set_progress_percent({ percent: progress });
    if (progress < 100) {
        setTimeout(test_func, 1000, progress + 10);
    }
}

async function OnPopupCreation(popup: any) {
    if (popup.m_strName === "SP Desktop_uid0") {
        const mainTabs = await WaitForElementList(`div.${findModule(e => e.SuperNavMenu).SuperNavMenu}`, popup.m_popup.document);
        const libraryButton = mainTabs.find(el => el.textContent === findModule(e => e.MainTabsLibrary).MainTabsLibrary);
        const gameList = await WaitForElement('div.ReactVirtualized__Grid__innerScrollContainer', popup.m_popup.document);

        const _gameName = await get_autoselect_item({});
        if (_gameName !== "") {
            libraryButton.addEventListener("click", async () => {
                const gameName = await get_autoselect_item({});
                const gameListItemList = await WaitForElementList('div.ReactVirtualized__Grid__innerScrollContainer > div.Panel > div > div.Focusable', popup.m_popup.document);
                const gameItem = gameListItemList.find(el => el.textContent === gameName);
                if (gameItem) {
                    gameItem.click();
                }
            });
        }

        const desiredLibrarySize = await get_library_size({});
        if (desiredLibrarySize !== "") {
            libraryButton.addEventListener("click", async () => {
                const libraryDisplay = await WaitForElement('div.LibraryDisplaySizeSmall, div.LibraryDisplaySizeMedium, div.LibraryDisplaySizeLarge', popup.m_popup.document);
                const leftPanel = libraryDisplay.firstChild;
                leftPanel.style = `width: ${desiredLibrarySize}; min-width: 1px !important;`;
            });
        }

        const removeNews = await get_remove_news({});
        if (removeNews) {
            libraryButton.addEventListener("click", async () => {
                try {
                    const newsElement = await WaitForElementTimeout(`div.${findModule(e => e.UpdatesContainer).UpdatesContainer}`, popup.m_popup.document);
                    if (newsElement) {
                        newsElement.remove();
                    }
                } catch {}
            });
        }

        const autoOpenDetails = await get_open_details({});
        if (autoOpenDetails) {
            gameList.addEventListener("click", async () => {
                try {
                    const collapsedGameDetails = await WaitForElementTimeout(`div.${findModule(e => e.AppDetailsCollapsed).AppDetailsCollapsed}`, popup.m_popup.document);
                    if (collapsedGameDetails) {
                        const infoIcon = await WaitForElement(`div.${findModule(e => e.InPage).InPage} div.${findModule(e => e.AppButtonsContainer).AppButtonsContainer} svg.SVGIcon_Information`, popup.m_popup.document);
                        infoIcon.parentElement.click();
                    }
                } catch {}
            });
        }

        const extraOptionsCount = await get_extra_options_count({});
        if (extraOptionsCount > 0) {
            gameList.addEventListener("click", async () => {
                setTimeout(async () => {
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
                                extraMenuItems.push(<MenuItem onClick={async () => { await run_extra_option({ opt_num: i, app_id: uiStore.currentGameListSelection.nAppId }); }}> {itemName} </MenuItem>);
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
                }, 1000);
            });
        }

        const taskbarProgressEnabled = await get_taskbar_progress_enabled({});
        if (taskbarProgressEnabled) {
            const downloadStatusPlace = await WaitForElement(`div.${findModule(e => e.DownloadStatusContent).DownloadStatusContent}`, popup.m_popup.document);
            const downloadStatusPlaceObserver = new MutationObserver(async (mutationList, observer) => {
                const downloadDetails = downloadStatusPlace.querySelector(`div.${findModule(e => e.DetailedDownloadProgress).DetailedDownloadProgress}`);
                if (downloadDetails) {
                    const downloadProgressBar = await WaitForElement(`div.${findModule(e => e.AnimateProgress).AnimateProgress}`, downloadDetails);
                    const fromPercent = downloadProgressBar.style.cssText.substring(downloadProgressBar.style.cssText.indexOf("--percent:"));
                    const realPercent = Number(fromPercent.substring(11, fromPercent.indexOf(";")))*100;

                    console.log("[steam-librarian] Porgress bar percentage:", realPercent);
                    await set_progress_percent({ percent: realPercent });
                } else {
                    console.log("[steam-librarian] Download disappeared...");
                    await set_progress_percent({ percent: -1 });
                }
            });
            downloadStatusPlaceObserver.observe(downloadStatusPlace, { childList: true, attributes: true, subtree: true });
        }
    } else if (popup.m_strTitle === "Menu") {
        const systrayEnabled = await get_millennium_systray({});
        if (systrayEnabled) {
            const menuItemList = await WaitForElementList(`div.contextMenuItem > div.${findModule(e => e.JumpListItemText).JumpListItemText}`, popup.m_popup.document);
            const settingsItem = menuItemList.find(el => el.textContent === findModule(e => e.Settings).Settings).parentElement;
            const millenniumItem = settingsItem.cloneNode(true);

            millenniumItem.firstChild.textContent = "Millennium";
            settingsItem.parentNode.insertBefore(millenniumItem, settingsItem.nextSibling);
            millenniumItem.addEventListener("click", async () => {
                await open_millennium_settings({});
            });
        }
    }
}

export default async function PluginMain() {
    console.log("[steam-librarian] frontend startup");

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
    const taskbarProgressEnabled = await get_taskbar_progress_enabled({});
    console.log("[steam-librarian] Result from get_taskbar_progress_enabled:", taskbarProgressEnabled);
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
