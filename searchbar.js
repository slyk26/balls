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
        option.innerHTML = `<div class="innerSearch"><i class="fa fa-${suggestions[key].type === 'playlist' ? 'p' : 't'}"></i><div class="breakMyHeart">${key}</div></div>`;
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
        spotifyApi.getPlaylistTracks(data.id).then(playlist => {
            if (playlist.items.length === 0) {
                warnToast('playlist does not return any songs');
            }
            playlist.items.forEach(item => {
                addTrack(spotifyToTrack(item.track));
            });
            infoToast(`added ${playlist.items.length} tracks`);
        });
        return;
    }
    addTrack(data);
    infoToast(data.title + ' added to queue');
}

const debouncedFetchData = debounce(fetchData, 200);

document.getElementById('search-input').addEventListener('input', (event) => {
    const query = event.target.value;
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