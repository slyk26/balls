const ytData = {
    get disabled() {
        return localStorage.getItem('ytDisabled') || null;
    },

    setDisabled: function (disabled) {
        if (disabled) {
            localStorage.removeItem('ytDisabled');
        } else {
            localStorage.setItem('ytDisabled', disabled);
        }
    }
}

let ytPlayer = {};

function initialize(d) {
    infoToast('youtube is ready', 3000);

    document.getElementById('video-placeholder').console.log = function (){}
}

function onPlayerChange(d) {
    // video is done

    debounce(() => {
        if(d.data === 0){
            nextTrack();
            busy = true;
        }
    }, 100)

    // video is playing
    if(d.data === 1){
        updatePlayPauseIcon(false);
    }
}

function initYtElements() {
    const menu = document.getElementById('yt-menu');
    const dd = document.getElementById('yt-dd');
    if (!!!!ytData.disabled) {
        dd.innerHTML = `<i style="color: red" class="fab fa-youtube"</i>  <i style="color: #2e8b8b" class="fa fa-check"</i>`;
        menu.appendChild(menuButton('yt-logout', 'Disable', () => {
            ytData.setDisabled(true)
        }));
    } else {
        dd.innerHTML = `<i style="color: #B24C4C" class="fab fa-youtube"</i>`;
        menu.appendChild(menuButton('youtube-login', 'Enable', () => {
            ytData.setDisabled(false)
        }));
    }
}

function initYoutube() {
    initYtElements();

    if(!!!!ytData.disabled) {
        setTimeout(() => {
            ytPlayer = new YT.Player('video-placeholder', {
                width: 600,
                height: 400,
                playerVars: {
                    color: 'white',
                    controls: 0,
                    disablekb: 1
                },
                events: {
                    onReady: initialize,
                    onStateChange: onPlayerChange,
                }
            });
        }, 500)
    }

    setInterval(() => {
        if(currentTrack?.src === 'YOUTUBE'){
            updateProgressBar(ytPlayer.getCurrentTime() * 1000,ytPlayer.getDuration() * 1000)
        }
    }, 100);
}


function parseVideo(data) {
    if (!data) return undefined;

    try {
        let title = '';
        if (data.videoRenderer) {
            title = data.videoRenderer.title.runs[0].text;
            title = title.replace("\\\\", "\\");

            try {
                title = decodeURIComponent(title);
            } catch (e) {
                // @ts-ignore
            }

            return {
                id: {
                    videoId: data.videoRenderer.videoId
                },
                url: `https://www.youtube.com/watch?v=${data.videoRenderer.videoId}`,
                title,
                description: data.videoRenderer.descriptionSnippet && data.videoRenderer.descriptionSnippet.runs[0] ? data.videoRenderer.descriptionSnippet.runs[0].text : "",
                duration_raw: data.videoRenderer.lengthText ? data.videoRenderer.lengthText.simpleText : null,
                snippet: {
                    url: `https://www.youtube.com/watch?v=${data.videoRenderer.videoId}`,
                    duration: data.videoRenderer.lengthText ? data.videoRenderer.lengthText.simpleText : null,
                    publishedAt: data.videoRenderer.publishedTimeText ? data.videoRenderer.publishedTimeText.simpleText : null,
                    thumbnails: {
                        id: data.videoRenderer.videoId,
                        url: data.videoRenderer.thumbnail.thumbnails[data.videoRenderer.thumbnail.thumbnails.length - 1].url,
                        default: data.videoRenderer.thumbnail.thumbnails[data.videoRenderer.thumbnail.thumbnails.length - 1],
                        high: data.videoRenderer.thumbnail.thumbnails[data.videoRenderer.thumbnail.thumbnails.length - 1],
                        height: data.videoRenderer.thumbnail.thumbnails[data.videoRenderer.thumbnail.thumbnails.length - 1].height,
                        width: data.videoRenderer.thumbnail.thumbnails[data.videoRenderer.thumbnail.thumbnails.length - 1].width
                    },
                    title
                },
                views: data.videoRenderer.viewCountText && data.videoRenderer.viewCountText.simpleText ? data.videoRenderer.viewCountText.simpleText.replace(/[^0-9]/g, "") : 0,
                owner: data.videoRenderer.ownerText.runs[0].text
            };
        }
        return undefined
    } catch (e) {
        return undefined
    }
}

// shoutout to https://github.com/appit-online/youtube-search/blob/master/src/lib/search.ts
async function searchVideo(searchQuery) {
    const YOUTUBE_URL = 'https://www.youtube.com';

    const results = [];
    let details = [];
    let fetched = false;
    const options = {type: "video", limit: 0};


    const searchRes = await fetch(`${YOUTUBE_URL}/results?q=${encodeURIComponent(searchQuery.trim())}&hl=en`);
    let html = await searchRes.text();
    // try to parse html
    try {
        const data = html.split("ytInitialData = '")[1].split("';</script>")[0];
        // @ts-ignore
        html = data.replace(/\\x([0-9A-F]{2})/ig, (...items) => {
            return String.fromCharCode(parseInt(items[1], 16));
        });
        html = html.replaceAll("\\\\\"", "");
        html = JSON.parse(html)
    } catch (e) { /* nothing */
    }

    if (html && html.contents && html.contents.sectionListRenderer && html.contents.sectionListRenderer.contents
        && html.contents.sectionListRenderer.contents.length > 0 && html.contents.sectionListRenderer.contents[0].itemSectionRenderer &&
        html.contents.sectionListRenderer.contents[0].itemSectionRenderer.contents.length > 0) {
        details = html.contents.sectionListRenderer.contents[0].itemSectionRenderer.contents;
        fetched = true;
    }
    // backup/ alternative parsing
    if (!fetched) {
        try {
            details = JSON.parse(html.split('{"itemSectionRenderer":{"contents":')[html.split('{"itemSectionRenderer":{"contents":').length - 1].split(',"continuations":[{')[0]);
            fetched = true;
        } catch (e) { /* nothing */
        }
    }
    if (!fetched) {
        try {
            details = JSON.parse(html.split('{"itemSectionRenderer":')[html.split('{"itemSectionRenderer":').length - 1].split('},{"continuationItemRenderer":{')[0]).contents;
            fetched = true;
        } catch (e) { /* nothing */
        }
    }

    if (!fetched) return [];

    for (let i = 0; i < details.length; i++) {
        if (typeof options.limit === "number" && options.limit > 0 && results.length >= options.limit) break;
        const data = details[i];

        const parsed = parseVideo(data);
        if (!parsed) continue;
        const res = parsed;

        results.push(res);
    }

    return results;
}