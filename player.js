let queue = [];
let queuePos = -1;
let currentTrack;
let busy = false;

// track needs {id, title, owner, src, type, }

function spotifyToTrack(s) {
    return {
        id: s.type === 'track' ? s.uri : s.id,
        title: s.name,
        owner: s.artists.map(a => a.name).join(', '),
        src: 'SPOTIFY',
        type: s.type,
        ext_song: s.external_urls.spotify,
        ext_artists: s.artists,
        execute: function() {
            spotifyApi.play({uris: [this.id]}).then(() => {
                busy = false;
                updatePlayPauseIcon(false);
            }).catch(() => {
                spotifyApi.transferMyPlayback([spotifyState.deviceId]).then(() => {
                    this.play();
                })
            })
        },
        play: function() {
            if (!!!spotifyState.playerLoaded || this.type !== 'track') return;
            spotifyState.player.resume().then(() => updatePlayPauseIcon(false));
        },
        pause: function(guiUpdate) {
            if (!!!spotifyState.playerLoaded || this.type !== 'track') return;
            spotifyState.player.pause().then(() => {
                    if (guiUpdate)
                        updatePlayPauseIcon(true);
                }
            );
        },
       isPaused: async function() {
           return (await spotifyApi.getMyCurrentPlaybackState()).is_playing === false;
       },

       setVolume: function(volume) {
           spotifyState.player.setVolume(volume);
       },

        seek: function(target_ms) {
            spotifyState.player.seek(target_ms);
        }
    }
}

function addTrack(track) {
    if (!currentTrack) {
        updateMetadata(track);
        currentTrack = track;
        queuePos = 0;
        highlightCurrentTrack();
        playTrack(currentTrack);
    }

    addToQueue(track);
    infoToast(track.title + ' added to queue');
}

function playTrack(track) {
    track.execute();
}

async function togglePlayPause() {
    if (!currentTrack) return;

    if (await currentTrack.isPaused()) {
        currentTrack.play();
    } else {
        currentTrack.pause(true);
    }
}

const debouncedPlay = debounce(() => {
    playTrack(currentTrack);
    highlightCurrentTrack()
    followTrack();
}, 200)

function nextTrack() {
    if (queuePos === queue.length - 1) {
        queuePos = -1;
    }

    queuePos += 1;
    currentTrack.pause(true);
    currentTrack = queue[queuePos];
    updateMetadata(currentTrack);
    debouncedPlay();
}

function previousTrack() {
    if (queuePos <= 0) {
        queuePos = queue.length;
    }

    queuePos -= 1;
    currentTrack.pause(false);
    currentTrack = queue[queuePos];
    updateMetadata(currentTrack);
    debouncedPlay()
}


function updatePlayPauseIcon(paused) {
    const pp = document.getElementById('playpause');

    if (paused) {
        pp.classList.remove('fa-pause');
        pp.classList.add('fa-play');
    } else {
        pp.classList.remove('fa-play');
        pp.classList.add('fa-pause');
    }
}

function seekTrack(track_ms) {
    currentTrack.seek(track_ms);
    updateProgressBar(track_ms);
}

function updateProgressBar(track_ms, max_ms) {
    if (track_ms >= max_ms && busy === false && track_ms > 0) {
        busy = true;
        nextTrack();
        return;
    }

    if (max_ms) {
        document.getElementById('max_time').innerText = msToMMSS(max_ms);
        document.getElementById('track-slider').max = max_ms;
    }

    document.getElementById('curr_time').innerText = msToMMSS(track_ms);
    document.getElementById('track-slider').value = track_ms;
}

function updateVolume(volume) {
    localdata.saveVolume(volume);
    currentTrack.setVolume(volume);
}

function playInQueue(idx, force) {
    if (idx === queuePos && !!!force) return;
    currentTrack.pause(false);

    currentTrack = queue[idx];
    queuePos = idx;
    updateMetadata(currentTrack);
    playTrack(currentTrack);
    highlightCurrentTrack();
    followTrack();
}

function deleteTrack(rowIndex) {
    let x = queuePos > rowIndex;
    if (x) {
        queuePos -= 1;
    }

    queue.splice(rowIndex, 1);
    dataTable.rows.remove(rowIndex);

    // play next song on same idx or first song if deleted song is last
    if (queuePos === rowIndex && !x) {
        playInQueue(queuePos >= queue.length ? 0 : queuePos, true);
    }
}

function addToQueue(track) {
    queue.push(track);
    dataTable.rows.add(convertTrackToColumn(track))
}

let rotation = 0;
function shuffle() {
    const b = document.getElementById('shuffle');
    rotation += 360;
    b.style.transform = `rotate(${rotation}deg)`;
    queue = shuffleArrayWithFixedElement(queue, queuePos);

    // save height
    let tableRow = document.querySelector('.table-row');
    let height = tableRow.offsetHeight;
    tableRow.style.height = height + 'px';
    clearTable();
    dataTable.insert({
        headings: ['#', 'song', 'artist', '#'],
        data: queue.map(convertTrackToColumn),
    })

    tableRow.style.height = 'auto';
}

function clearTable() {
    dataTable.rows.remove(createArray(queue.length-1))
}

function reset(){
    currentTrack.pause(false);
    currentTrack = undefined;
    updateMetadata();
    clearTable();
}