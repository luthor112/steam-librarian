import { callable, findClassModule, findModule, Millennium } from "@steambrew/client";

// Backend functions
const get_autoselect_item = callable<[{}], string>('Backend.get_autoselect_item');
const get_open_details = callable<[{}], boolean>('Backend.get_open_details');
const get_library_size = callable<[{}], string>('Backend.get_library_size');
const get_millennium_systray = callable<[{}], boolean>('Backend.get_millennium_systray');
const get_remove_news = callable<[{}], boolean>('Backend.get_remove_news');
const open_millennium_settings = callable<[{}], boolean>('Backend.open_millennium_settings');

const WaitForElement = async (sel: string, parent = document) =>
	[...(await Millennium.findElement(parent, sel))][0];

const WaitForElementTimeout = async (sel: string, parent = document, timeOut = 1000) =>
	[...(await Millennium.findElement(parent, sel, timeOut))][0];

const WaitForElementList = async (sel: string, parent = document) =>
	[...(await Millennium.findElement(parent, sel))];

async function OnPopupCreation(popup: any) {
    if (popup.m_strName === "SP Desktop_uid0") {
        const mainTabs = await WaitForElementList(`div.${findModule(e => e.SuperNavMenu).SuperNavMenu}`, popup.m_popup.document);
        const libraryButton = mainTabs.find(el => el.textContent === findModule(e => e.MainTabsLibrary).MainTabsLibrary);
        const gameList = await WaitForElement('div.ReactVirtualized__Grid__innerScrollContainer', popup.m_popup.document);

        libraryButton.addEventListener("click", async () => {
            const gameName = await get_autoselect_item({});
            if (gameName !== "") {
                const gameListItemList = await WaitForElementList('div.ReactVirtualized__Grid__innerScrollContainer > div.Panel > div > div.Focusable', popup.m_popup.document);
                const gameItem = gameListItemList.find(el => el.textContent === gameName);
                if (gameItem) {
                    gameItem.click();
                }
            }
        });

        libraryButton.addEventListener("click", async () => {
            const desiredLibrarySize = await get_library_size({});
            if (desiredLibrarySize !== "") {
                const yolo = await WaitForElement('div.LibraryDisplaySizeSmall, div.LibraryDisplaySizeMedium, div.LibraryDisplaySizeLarge', popup.m_popup.document);
                const leftPanel = yolo.firstChild;
                leftPanel.style = `width: ${desiredLibrarySize}; min-width: 1px !important;`;
            }
        });

        libraryButton.addEventListener("click", async () => {
            const removeNews = await get_remove_news({});
            if (removeNews) {
                const newsElement = await WaitForElementTimeout(`div.${findModule(e => e.UpdatesContainer).UpdatesContainer}`, popup.m_popup.document);
                if (newsElement) {
                    newsElement.remove();
                }
            }
        });

        gameList.addEventListener("click", async () => {
            const autoOpenDetails = await get_open_details({});
            if (autoOpenDetails) {
                const collapsedGameDetails = await WaitForElementTimeout(`div.${findModule(e => e.AppDetailsCollapsed).AppDetailsCollapsed}`, popup.m_popup.document);
                if (collapsedGameDetails) {
                    const infoIcon = await WaitForElement(`div.${findModule(e => e.InPage).InPage} div.${findModule(e => e.AppButtonsContainer).AppButtonsContainer} svg.SVGIcon_Information`, popup.m_popup.document);
                    infoIcon.parentElement.click();
                }
            }
        });
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
