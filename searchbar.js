const input = document.getElementById('search-input');
const dropdown = document.getElementById('suggestions');

let suggestions = {}

function debounce(func, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}

async function fetchData(query) {
    suggestions = {}
    if (query.length < 2) return;

    try {
        await fetchSpotify(query)
        populateDatalist();
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

async function fetchSpotify(query) {
    const data = await spotifyApi.search(query, ['track', 'playlist']);
    data.tracks.items.concat(...data.playlists.items).forEach(r => {
        if (isSpotifySong(r)) {
            suggestions[r.name + ' - ' + r.artists.map(m => m.name).join(', ')] = r
        }
        if (isSpotifyPlaylist(r)) {
            suggestions[r.name + ' - ' + r.owner.display_name] = r
        }
    })
}

function populateDatalist() {
    for (const key in suggestions) {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.textContent = key;
        option.addEventListener('click', () => selectOption(key));
        dropdown.appendChild(option);
    }

    dropdown.style.display = dropdown.children.length > 0 ? 'block' : 'none';
    dropdown.style['border'] = 'none';
}

function selectOption(key) {
    input.value = '';
    dropdown.style.display = 'none';
    dropdown.style.border = 'none'

    var data = suggestions[key];

    if(isSpotifySong(data)){
        spotifyApi.queue(data.uri);
    }

    if(isSpotifyPlaylist(data)){
        console.log('is playlist', data);
    }

}

function isSpotifySong(item) {
    return item.type === 'track'
}

function isSpotifyPlaylist(item) {
    return item.type === 'playlist'
}

const debouncedFetchData = debounce(fetchData, 300);

document.getElementById('search-input').addEventListener('input', (event) => {
    const query = event.target.value;
    dropdown.innerHTML = ''
    debouncedFetchData(query);
});