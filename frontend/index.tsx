import { callable, findClassModule, findModule, Millennium } from "@steambrew/client";

// Backend functions
const get_autoselect_item = callable<[{}], string>('Backend.get_autoselect_item');
const get_open_details = callable<[{}], boolean>('Backend.get_open_details');

function ensureDocExists() {
    try {
        var doc = g_PopupManager.GetExistingPopup("SP Desktop_uid0").m_popup.document;
        if (doc != undefined) {
            registerEvent();
        } else {
            setTimeout(ensureDocExists, 300);
        }
    } catch {
        setTimeout(ensureDocExists, 300);
    }
}

function registerEvent() {
    var doc = g_PopupManager.GetExistingPopup("SP Desktop_uid0").m_popup.document;
    var libraryButton = Array.from(doc.querySelectorAll(`div.${findModule(e => e.SuperNavMenu).SuperNavMenu}`)).find(el => el.textContent === findModule(e => e.MainTabsLibrary).MainTabsLibrary);
    var gameList = doc.querySelector('div.ReactVirtualized__Grid__innerScrollContainer');

    if (libraryButton != undefined && gameList != undefined) {
        libraryButton.addEventListener("click", autoClickGame);
        gameList.addEventListener("click", gameSelected);
    } else {
        setTimeout(registerEvent, 300);
    }
}

async function autoClickGame() {
    const gameName = await get_autoselect_item({});
    if (gameName !== "") {
        var doc = g_PopupManager.GetExistingPopup("SP Desktop_uid0").m_popup.document;
        var gameItem = Array.from(doc.querySelectorAll('div.ReactVirtualized__Grid__innerScrollContainer > div.Panel > div > div.Focusable')).find(el => el.textContent === gameName);

        gameItem.click();
    }
}

async function gameSelected() {
    const autoOpenDetails = await get_open_details({});
    if (autoOpenDetails) {
        var doc = g_PopupManager.GetExistingPopup("SP Desktop_uid0").m_popup.document;
        var expandedGameDetails = doc.querySelector(`div.${findModule(e => e.AppDetailsExpanded).AppDetailsExpanded}`);
        var collapsedGameDetails = doc.querySelector(`div.${findModule(e => e.AppDetailsCollapsed).AppDetailsCollapsed}`);

        if (expandedGameDetails == undefined && collapsedGameDetails == undefined) {
            setTimeout(gameSelected, 300);
        }

        if (collapsedGameDetails) {
            var infoIcon = doc.querySelector(`div.${findModule(e => e.InPage).InPage} div.${findModule(e => e.AppButtonsContainer).AppButtonsContainer} svg.SVGIcon_Information`);
            if (infoIcon) {
                infoIcon.parentElement.click();
            }
        }
    }
}

export default async function PluginMain() {
    console.log("[steam-librarian] frontend startup");

    // Call the backend methods and log the configuration
    const ret1 = await get_autoselect_item({});
    console.log("[steam-librarian] Result from get_autoselect_item:", ret1);
    const ret2 = await get_open_details({});
    console.log("[steam-librarian] Result from get_open_details:", ret2);

    ensureDocExists();
}
