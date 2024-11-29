

function msToMMSS(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secondsRemaining = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secondsRemaining.toString().padStart(2, '0')}`;
}

function debounce(func, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}

function createArray(n) {
    return Array.from({ length: n + 1 }, (_, i) => i);
}

function shuffleArrayWithFixedElement(arr, fixedIndex) {
    const arrayCopy = [...arr];
    const fixedElement = arrayCopy[fixedIndex];

    arrayCopy.splice(fixedIndex, 1);

    for (let i = arrayCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arrayCopy[i], arrayCopy[j]] = [arrayCopy[j], arrayCopy[i]];
    }

    arrayCopy.splice(fixedIndex, 0, fixedElement);
    return arrayCopy;
}

function convertTrackToColumn(track){
    return [`<i style="background: none" class="fab fa-${track.src.toLowerCase()}"></i>`, track.title, track.owner, `<i style="background: none" class="fa fa-trash"></i>`]
}

function convertPlaylistToColumn(playlist) {
    return [`${playlist.title} - ${playlist.owner}`];
}

function openGH() {
    window.open('https://github.com/slyk26', '_blank');
}

function focus(cb) {
    fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        body: JSON.stringify({
            device_ids: [spotifyState.deviceId],
            play: true
        }),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localdata.access_token}`
        }
    }).then(cb);
}