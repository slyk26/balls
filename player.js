const queue = [];
let queuePos = -1;
let currentTrack;
let busy = false;

// track needs {id, title, owner, src, type}

function spotifyToTrack(s) {
    return {
        id: s.type === 'track' ? s.uri : s.id,
        title: s.name,
        owner: s.artists.map(a => a.name).join(', '),
        src: 'SPOTIFY',
        type: s.type
    }
}

function youtubeToTrack(y) {
    return {
        id: y.id.videoId,
        title: y.title,
        owner: y.owner,
        src: 'YOUTUBE',
    }
}

function updateMetadata(track) {
    document.getElementById('meta-song').innerHTML = track?.title || '';
    document.getElementById('meta-artist').innerHTML = track?.owner || '';
    document.getElementById('meta-source').innerHTML = `<i id="meta-src-icon" class="fab fa-${track?.src?.toLowerCase()}"></i>`;
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
    switch (track.src) {
        case 'SPOTIFY':
            spotifyApi.play({uris: [track.id]}).then(() => {
                busy = false;
                updatePlayPauseIcon(false);
            }).catch(() => {
                spotifyApi.transferMyPlayback([spotifyState.deviceId]).then(() => {
                    playTrack(track);
                })
            })
            break;
        case 'YOUTUBE':
            ytPlayer.loadVideoById({'videoId': track.id});
            busy = false;
            updateVolume(localdata.volume)
            updatePlayPauseIcon(false);
            break;
    }

}

async function togglePlayPause() {
    if (!currentTrack) return;

    if (await isPaused()) {
        await play();
    } else {
        await pause(true);
    }
}

const debouncedPlay = debounce(() => {
    playTrack(currentTrack);
    highlightCurrentTrack()
}, 300)

function nextTrack() {
    if (queuePos === queue.length - 1) {
        queuePos = -1;
    }

    queuePos += 1;
    pause(true);
    currentTrack = queue[queuePos];
    updateMetadata(currentTrack);
    debouncedPlay();
}

function previousTrack() {
    if (queuePos <= 0) {
        queuePos = queue.length;
    }

    queuePos -= 1;
    pause(false);
    currentTrack = queue[queuePos];
    updateMetadata(currentTrack);
    debouncedPlay()
}

function play() {
    switch (currentTrack.src) {
        case 'SPOTIFY':
            if (!!!spotifyState.playerLoaded) return;
            spotifyState.player.resume().then(() => updatePlayPauseIcon(false));
            break;
        case 'YOUTUBE':
            ytPlayer.playVideo();
            updateVolume(localdata.volume);
            updatePlayPauseIcon(false);
            break;
    }
}

function pause(guiUpdate) {
    switch (currentTrack.src) {
        case 'SPOTIFY':
            if (!!!spotifyState.playerLoaded) return;
            spotifyState.player.pause().then(() => {
                    if (guiUpdate)
                        updatePlayPauseIcon(true);
                }
            );
            break;
        case 'YOUTUBE':
            ytPlayer.pauseVideo();
            if (guiUpdate)
                updatePlayPauseIcon(true);
            break;
    }
}

async function isPaused() {
    if (!currentTrack) return true;

    switch (currentTrack.src) {
        case 'SPOTIFY':
            return (await spotifyApi.getMyCurrentPlaybackState()).is_playing === false;
        case 'YOUTUBE':
            return ytPlayer.playerInfo.playerState === 2
    }
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
    switch (currentTrack.src) {
        case 'SPOTIFY':
            spotifyState.player.seek(track_ms);
            break;
        case 'YOUTUBE':
            ytPlayer.seekTo(track_ms / 1000)
            break;
    }
    updateProgressBar(track_ms)
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

    switch (currentTrack.src) {
        case 'SPOTIFY':
            spotifyState.player.setVolume(volume);
            break;
        case 'YOUTUBE':
            ytPlayer.setVolume(volume * 100);
            break;
    }
}

function playInQueue(idx, force) {
    if (idx === queuePos && !!!force) return;
    pause(false);

    currentTrack = queue[idx];
    queuePos = idx;
    updateMetadata(currentTrack);
    playTrack(currentTrack);
    highlightCurrentTrack();
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
