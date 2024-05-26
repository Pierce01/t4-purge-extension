const apiUrlBase = 'https://cms.seattleu.edu/terminalfour'

const constantHeaders = {
    "accept": "application/json, text/javascript, */*; q=0.01",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json",
    "sec-ch-ua": "\" Not;A Brand\";v=\"99\", \"Google Chrome\";v=\"91\", \"Chromium\";v=\"91\"",
    "sec-ch-ua-mobile": "?0",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "x-requested-with": "XMLHttpRequest"
}

const constantEntry = {
    "method": "POST",
    "mode": "cors",
    "credentials": "include",
    "referrer": `${apiUrlBase}/page/recycleContent`,
    "referrerPolicy": "strict-origin-when-cross-origin",
    "body": null
}

const deleteQueueContent = []
const deleteQueueSection = []
const blacklist = []

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    const id = request.data || null;
    if (!id) {
        return alert("ID malformed")
    }
    if (await getPermission()) {
        blacklist.push(id)
        const json = await getSectionInfo(id)
        await troll(json)
        const sectionResponse = await purgeSectionIDs(deleteQueueSection)
        const contentResponse = await purgeContentIDs(deleteQueueContent)
        deleteQueueSection.length = 0;
        deleteQueueContent.length = 0;
        chrome.runtime.sendMessage({ 
            data: {
                text: "Requests issued!",
                sectionStatus: sectionResponse.status, 
                contentStatus: contentResponse.status
            }, 
            success: true 
        }, function(response) {
            if (response.success) {
                window.location.reload()
            }
         })
    } else {
        chrome.runtime.sendMessage({ 
            data: {
                text: "User is not admin"
            }, 
            success: false 
        }, (resp) => { console.log(resp) });
    }
    sendResponse({ success: true })
    return true
});

// Gets the specific section's information, including their subsections if that wasn't populated.
async function getSectionInfo(id) {
    return (await (await fetch(`${apiUrlBase}/rs/hierarchy/section`, {
        "headers": {
          "authorization": `Bearer ${JSON.parse(window.sessionStorage.__oauth2).accessToken}`,
          ...constantHeaders
        },
        ...constantEntry,
        "referrer": `${apiUrlBase}/page/site-structure`,
        "body": JSON.stringify({
            "read": {
                "section": {
                    id,
                    "language": "en"
                },
                "recursionDepth": 1,
                "activeNode": id,
                "explode": false,
                "showContentInfo": true,
                "showWidget": true,
                "openNodes": [id],
                "showFullTree": true,
                "restrictedToPermitedSections": false,
                "expandCollapseAllChildren": true
            }
        })
      })).json())[0]
}

async function purgeSectionIDs (array) {
    array = array.map(String)
    const rq = async (arr) => await fetch(`${apiUrlBase}/rs/hierarchy/purge`, {
        "headers": {
            "authorization": `Bearer ${JSON.parse(window.sessionStorage.__oauth2).accessToken}`,
            ...constantHeaders
        },
        ...constantEntry,
        "body": JSON.stringify({
            "languageCode":"en",
            "contentIds": arr
        })
    })

    // Will refactor once extension is ported to an application
    let initalRequest = await rq(array)
    try {
        const requestBody = await initalRequest.json()
        if (initalRequest.status == 404) {
            array = array.filter(contentId => requestBody.errorPlaceholder != contentId)
            initalRequest = await purgeSectionIDs(array)
        }
    } catch (e) {
        console.log(e)
    }
    return initalRequest
}

async function purgeContentIDs (array) {
    return await fetch(`${apiUrlBase}/rs/content/purge`, {
        "headers": {
            "authorization": `Bearer ${JSON.parse(window.sessionStorage.__oauth2).accessToken}`,
            ...constantHeaders
        },
        ...constantEntry,
        "body": JSON.stringify({
            "languageCode":"en",
            "contentIds": array
        })
    })
}

async function troll (obj) {
    console.log("Trolling started for section " + obj.id)
    if (!hasChildren(obj)) {
        if (!blacklist.includes(obj.id)) deleteQueueSection.push(obj.id)
        return
    }

    // If section has content entries, add them to the delete queue.
    if (((obj.countContentApproved + obj.countContentInactive + obj.countContentPending) > 0)) {
        console.log("Getting content ids from section " + obj.id)
        const children = await getContentIDsFromSection(obj.id)
        for (let child of children) {
            if (canDelete(child, 1)) {
                console.log("Adding " + child.id + " to the deleteContent queue")
                deleteQueueContent.push(child.id)
            }
        }
    }

    // If section has subsections, troll their content & subsections before adding them to the delete queue.
    if (obj.subsections) {
        console.log("Trolling subsections")
        for (let entry of obj.subsections) {
            await troll(entry)
            if (canDelete(entry, 0)) {
                console.log("Adding " + entry.id + " to the deleteSection queue")
                deleteQueueSection.push(entry.id)
            }
        }
    }
}

async function getContentIDsFromSection (id) {
    return (await (await fetch(`${apiUrlBase}/rs/hierarchy/${id}/en/contents?showAll=true&removeNonTranslated=false`, {
        "headers": {
            "authorization": `Bearer ${JSON.parse(window.sessionStorage.__oauth2).accessToken}`,
            ...constantHeaders
        },
        ...constantEntry,
        "method": "GET"
        })).json()).children
}

function canDelete (obj, type) {
    switch (type) {
        // Section type
        case 0: {
            return !deleteQueueSection.includes(obj.id) && obj["mirror-type"] == "none"
        }
        // Content type
        case 1: {
            return !deleteQueueContent.includes(obj.id) && Object.keys(obj.content.mirroredSectionPaths).length === 0
        }
        // Default case
        default: {
            return false
        }
    }
}

function hasChildren (obj) {
    return (obj.hasChildren || ((obj.countContentApproved + obj.countContentInactive + obj.countContentPending) > 0))
}

async function getPermission () {
    return ((await (await fetch(`${apiUrlBase}/rs/profile`, {
        "headers": {
            "authorization": `Bearer ${JSON.parse(window.sessionStorage.__oauth2).accessToken}`,
            ...constantHeaders
        },
        ...constantEntry,
        "referrer": "https://cms.seattleu.edu/terminalfour/page/content",
        "method": "GET"
        })).json()).userLevel) == 0
}