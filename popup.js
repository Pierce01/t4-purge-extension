document.getElementById('purgeBtn').onclick = async (e) => {
    const id = (document.getElementById('box').value).trim()
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {data: id}, async function(response) {
            if (!chrome.runtime.lastError) {
                console.log("Initial request response dropped, relying on dom sendMessage.")
             } else {
                console.log(response)
             }
             document.getElementById('purgeBtn').disabled = true
             document.getElementById('purgeBtn').style.backgroundColor = "gray";
             document.getElementById('overlay').style.display = "block";
        });
    });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log(request, sender, sendResponse)
    if (request.data && request.data.sectionStatus == 204 && 204 == request.data.contentStatus) {
        alert("Purge request finished. Refreshing page...")
        sendResponse({ success: true })
        window.location.reload()
    } else {
        alert("Purge request failed... Review extension console")
        document.getElementById("overlay").style.display = "hidden";
        sendResponse({ success: false })
    }
})