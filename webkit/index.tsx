import { callable } from '@steambrew/webkit';

//const get_community_download = callable<[{}], boolean>('get_community_download');

function AddDownloadButton(ratingDiv) {
    const previewImg = ratingDiv.parentElement.parentElement.parentElement.querySelector("div.apphub_CardContentMain img");
    const imgSrc = previewImg.src.substring(0, previewImg.src.indexOf("?"));

    const dlBtn = document.createElement("a");
    dlBtn.className = "btn_grey_grey btn_small_thin ico_hover";
    dlBtn.href = "javascript:void(0)";
    dlBtn.onclick = function() { SteamClient.Browser.StartDownload(imgSrc); };

    const dlSpan = document.createElement("span");
    dlSpan.textContent = "⇓";
    dlBtn.appendChild(dlSpan);

    ratingDiv.appendChild(dlBtn);
    ratingDiv.classList.add("extra-dl-button-added");
}

export default async function WebkitMain() {
	//const communityDownloadEnabled = await get_community_download({});
    const communityDownloadEnabled = true;
	console.log("[steam-librarian] Result from get_community_download:", communityDownloadEnabled);

    if (communityDownloadEnabled && window.location.href.startsWith("https://steamcommunity.com/app/")) {
        const ratingDivs = document.querySelectorAll("div.apphub_CardRatingButtons:not(.extra-dl-button-added)");
        for (const ratingDiv of ratingDivs) {
            AddDownloadButton(ratingDiv);
        }
    }

    const contentPageObserver = new MutationObserver((mutationList, observer) => {
        for (const mutation of mutationList) {
            for (const addedNode of mutation.addedNodes) {
                const addedRatingDivs = addedNode.querySelectorAll("div.apphub_CardRatingButtons:not(.extra-dl-button-added)");
                for (const addedRatingDiv of addedRatingDivs) {
                    AddDownloadButton(addedRatingDiv);
                }
            }
        }
    });
    contentPageObserver.observe(document, { subtree: true, childList: true });
}
