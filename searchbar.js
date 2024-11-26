const input = document.getElementById('search-input');
const dropdown = document.getElementById('suggestions');

let suggestions = {}

async function fetchData(query) {
    suggestions = {}
    if (query.length < 2) return;

    try {
        await fetchSpotify(query)
        populateDatalist(query);
    } catch (error) {
        console.error(error)
        errorToast("search failed", 5000)
    }
}

async function fetchSpotify(query) {
    if (!spotifyState.loggedIn) return;
    let data = await spotifyApi.search(query, ['track', 'playlist']);
    data.tracks.items.concat(...data.playlists.items).forEach(r => {
        if (r.type === 'track') {
            suggestions[r.name + ' - ' + r.artists.map(m => m.name).join(', ')] = spotifyToTrack(r)
        }
        if (r.type === 'playlist') {
            r.src = 'SPOTIFY';
            suggestions[r.name + ' - ' + r.owner.display_name] = r
        }
    })
}

function populateDatalist(query) {
    for (const key in suggestions) {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.innerHTML = `<div class="innerSearch"><i title="${suggestions[key].type === 'playlist' ? 'Playlist' : 'Track'}" style="font-size: 10px; align-self: center; justify-self: center; margin-top: -2px" class="fa fa-${suggestions[key].type === 'playlist' ? 'p' : 't'}"></i><div class="breakMyHeart">${key}</div></div>`;
        option.addEventListener('click', () => selectOption(key));
        dropdown.appendChild(option);
    }

    sortSuggestions(query)
    dropdown.style.display = dropdown.children.length > 0 ? 'block' : 'none';
    dropdown.style.border = '1px solid #aaa';
}

function selectOption(key) {
    input.value = '';
    dropdown.style.display = 'none';
    dropdown.style.border = 'none'
    const data = suggestions[key];

    if (data.src === 'SPOTIFY' && data.type === 'playlist') {
        addTracksFromPlaylistId(data.id);
        return;
    }
    addTracks([data]);
    infoToast(data.title + ' added to queue');
}

const debouncedFetchData = debounce(fetchData, 200);

document.getElementById('search-input').addEventListener('input', (event) => {
    const query = event.target.value;


    if (isValidSpotifyUrl(sanitizeUrl(query))) {
        const p = sanitizeUrl(query).split('/');

        if (p[3].toLowerCase() === 'track') {
            addTrackFromId(p[4]);
        } else {
            addTracksFromPlaylistId(p[4])
        }
        input.value = '';
        return;
    }

    dropdown.style.border = 'none'
    dropdown.innerHTML = ''
    debouncedFetchData(query);
});

function calculateSimilarity(text, queryWords) {
    const textLower = text.toLowerCase();

    const matches = queryWords.filter(word => textLower.includes(word.toLowerCase()));

    return (matches.length / queryWords.length) * 100;
}

function sortSuggestions(query) {
    const container = document.getElementById("suggestions");
    const options = Array.from(container.getElementsByClassName("dropdown-option"));

    const queryWords = query.trim().toLowerCase().split(/\s+/);

    const filteredAndSortedOptions = options
        .filter(option => {
            const text = option.textContent.trim().toLowerCase();
            return queryWords.some(word => text.includes(word));
        })
        .sort((a, b) => {
            const similarityA = calculateSimilarity(a.textContent.trim(), queryWords);
            const similarityB = calculateSimilarity(b.textContent.trim(), queryWords);
            return similarityB - similarityA; // Descending order
        });

    container.innerHTML = '';
    filteredAndSortedOptions.forEach(option => container.appendChild(option));
}

function isValidSpotifyUrl(url) {
    const pattern = /^(https?:\/\/)?(open\.)?(spotify\.com)\/(track|playlist)\/[a-zA-Z0-9]{22}$/;
    return pattern.test(url);
}

function sanitizeUrl(url) {
    return url.trim().substring(0, url.lastIndexOf('?'));
}

function addTrackFromId(id) {
    spotifyApi.getTrack(id).then(t => {
        const tr = spotifyToTrack(t);
        addTracks([tr]);
        infoToast(tr.title + ' added to queue');
    });
}

async function addTracksFromPlaylistId(id) {
    let first = true;
    let counter = 0;
    let offset = 0;
    let limit = 100;
    let total = 0;

    do {
        const playlistdata = await spotifyApi.getPlaylistTracks(id, {limit: limit, offset: offset});
        if (playlistdata.items.length === 0 && first) {
            warnToast('playlist does not return any songs');
            return;
        }
        first = false;
        addTracks(playlistdata.items.map(i => spotifyToTrack(i.track)))
        counter += playlistdata.items.length;
        offset += limit;
        total = playlistdata.total;
        infoToast(`${counter}/${total} tracks added`);
    } while (offset < total);


}
