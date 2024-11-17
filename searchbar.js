const input = document.getElementById('search-input');
const dropdown = document.getElementById('suggestions');

let suggestions = {}

async function fetchData(query) {
    suggestions = {}
    if (query.length < 2) return;

    try {
        await fetchSpotify(query)
        await fetchYoutube(query)
        populateDatalist(query);
    } catch (error) {
        console.error("Error fetching data:", error);
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

async function fetchYoutube(query) {
    if (!!!ytData.disabled) return;
    const data = await searchVideo(query);

    data.forEach(video => {
        suggestions[video.title + ' - ' + video.owner] = youtubeToTrack(video)
    })
}

function populateDatalist(query) {
    for (const key in suggestions) {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.textContent = key;
        option.addEventListener('click', () => selectOption(key));
        dropdown.appendChild(option);
    }

    sortSuggestions(query)
    dropdown.style.display = dropdown.children.length > 0 ? 'block' : 'none';
    dropdown.style['border'] = 'none';
}

function selectOption(key) {
    input.value = '';
    dropdown.style.display = 'none';
    dropdown.style.border = 'none'

    var data = suggestions[key];

    if (data.src === 'SPOTIFY' && data.type === 'playlist') {
        spotifyApi.getPlaylistTracks(data.id).then(playlist => {
            if(playlist.items.length === 0){
                warnToast('playlist does not return any songs');
            }
            playlist.items.forEach(item => {
                addTrack(spotifyToTrack(item.track));
            })
        });
        return;
    }

    addTrack(data);
}


const debouncedFetchData = debounce(fetchData, 400);

document.getElementById('search-input').addEventListener('input', (event) => {
    const query = event.target.value;
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