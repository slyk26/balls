const clientId = '7257603b361940308bc1c93da610767e';
const redirectUrl = localStorage.getItem('devURL') || 'https://slyk26.github.io/balls';

const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const scope = 'streaming playlist-read-private user-read-playback-position user-library-read user-read-playback-state user-modify-playback-state';
const spotifyApi = new SpotifyWebApi();

const spotifyState = {
    user: {},
    loggedIn: false,
    player: {},
    playerLoaded: false,
}

const localdata = {
    get access_token() {
        return localStorage.getItem('access_token') || null;
    },
    get refresh_token() {
        return localStorage.getItem('refresh_token') || null;
    },
    get expires_in() {
        return localStorage.getItem('refresh_in') || null
    },
    get expires() {
        return localStorage.getItem('expires') || null
    },
    get volume() {
        return localStorage.getItem('volume') || null
    },

    saveTokens: function (response) {
        const {access_token, refresh_token, expires_in} = response;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('expires_in', expires_in);

        const now = new Date();
        localStorage.setItem('expires', new Date(now.getTime() + (expires_in * 1000)).toString());
    },

    saveVolume(volume) {
        localStorage.setItem('volume', volume);
    }
};

async function redirectToSpotifyAuthorize() {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomValues = crypto.getRandomValues(new Uint8Array(64));
    const code_verifier = randomValues.reduce((acc, x) => acc + possible[x % possible.length], "");
    const data = new TextEncoder().encode(code_verifier);
    const hashed = await crypto.subtle.digest('SHA-256', data);

    const code_challenge_base64 = btoa(String.fromCharCode(...new Uint8Array(hashed)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    window.localStorage.setItem('code_verifier', code_verifier);

    const authUrl = new URL(authorizationEndpoint)
    const params = {
        response_type: 'code',
        client_id: clientId,
        scope: scope,
        code_challenge_method: 'S256',
        code_challenge: code_challenge_base64,
        redirect_uri: redirectUrl,
    };

    authUrl.search = new URLSearchParams(params).toString();
    window.location.href = authUrl.toString();
}

async function getToken(code) {
    const code_verifier = localStorage.getItem('code_verifier');

    const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: clientId,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUrl,
            code_verifier: code_verifier,
        }),
    });

    return await response.json();
}

async function refreshToken() {
    const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_id: clientId,
            grant_type: 'refresh_token',
            refresh_token: localdata.refresh_token
        }),
    });

    return await response.json();
}

async function login() {
    await redirectToSpotifyAuthorize();
}

async function logout() {
    localStorage.clear();
    window.location.href = redirectUrl;
}

async function updateRefreshToken() {
    if (localdata.refresh_token != null) {
        console.log('updating token...');
        const token = await refreshToken();
        localdata.saveTokens(token);
    }
    return localdata.access_token;
}

async function checkSpotifyAuth() {
    const args = new URLSearchParams(window.location.search);
    const code = args.get('code');

    if (code) {
        const token = await getToken(code);
        localdata.saveTokens(token);

        const url = new URL(window.location.href);
        url.searchParams.delete("code");

        const updatedUrl = url.search ? url.href : url.href.replace('?', '');
        window.history.replaceState({}, document.title, updatedUrl);
    }

    if (localdata.access_token) {
        spotifyApi.setAccessToken(localdata.access_token)
        spotifyState.loggedIn = true;
    }

    if (!localdata.access_token) {
        spotifyState.loggedIn = false;
    }
}

function initElements() {
    const menu = document.getElementById('spotify-menu');
    if (spotifyState.loggedIn) {
        menu.appendChild(menuButton('spotify-logout', 'Logout', logout));
    } else {
        menu.appendChild(menuButton('spotify-login', 'Login', login));
    }
}

function menuButton(id, text, listener) {
    const b = document.createElement('li');
    b.id = id;
    b.innerText = text;
    if (listener) {
        b.addEventListener('click', async () => {
            await listener();
        });
    }
    return b;
}

async function initSpotify() {
    const dd = document.getElementById('spotify-dd')

    setInterval(updateRefreshToken, 45 * 60 * 1000); // 45 minutes

    try {
        spotifyState.user = await spotifyApi.getMe();
    } catch (e) {
        spotifyState.loggedIn = false;
    }

    if (spotifyState.loggedIn) {
        dd.innerHTML = `<i style="color: #1DB954" class="fab fa-spotify"</i>` + ' ' + spotifyState.user['display_name'];
        spotifyState.player = makePlayer();
        spotifyState.player.connect();
    } else {
        dd.innerHTML = `<i style="color: red" class="fab fa-spotify"</i>` + ' ' + 'Add Spotify'
    }
    initElements();
}

function makePlayer() {
    const volume = parseFloat(localdata.volume) || 0;
    document.getElementById('volume-slider').value = volume;
    const player = new Spotify.Player({
        name: 'balls',
        getOAuthToken: cb => {
            updateRefreshToken().then(access_token => {
                cb(access_token)
            })
        },
        volume: volume
    });

    // Ready
    player.addListener('ready', ({device_id}) => {
        fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            body: JSON.stringify({
                device_ids: [device_id],
                play: false
            }),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localdata.access_token}`
            }
        });
        spotifyState.playerLoaded = true;
    });

    player.addListener('progress', pos_data => {
        document.getElementById('curr_time').innerText = msToMMSS(pos_data.position);
        document.getElementById('track-slider').value = pos_data.position;
    })
    player.addListener('autoplay_failed', () => {
        console.log('Autoplay is not allowed by the browser autoplay rules');
    });

    player.addListener('player_state_changed', state => {
        updateMetadata(state.track_window.current_track.name, state.track_window.current_track.artists.map(artist => artist.name).join(', '))
        const pp = document.getElementById('playpause');
        if(state.paused){
            pp.classList.replace('fa-pause', 'fa-play')
        } else {
            pp.classList.replace('fa-play', 'fa-pause')
        }

        document.getElementById('max_time').innerText = msToMMSS(state.duration);
        document.getElementById('track-slider').max = state.duration;
    })

    return player;
}

function togglePlayPause() {
    if(!!!spotifyState.playerLoaded) return;

    spotifyState.player.togglePlay();

    const b = document.getElementById('playpause');
        b.classList.toggle('fa-play');
        b.classList.toggle('fa-pause');
}

function previousTrack() {
    if(!!!spotifyState.playerLoaded) return;

    spotifyState.player.previousTrack();
}

function nextTrack() {
    if(!!!spotifyState.playerLoaded) return;

    spotifyState.player.nextTrack();
}

function updateVolume(volume) {
    localdata.saveVolume(volume);
    spotifyState.player.setVolume(volume);
}

function updateTrack(track_ms) {
    spotifyState.player.seek(track_ms);
}

function updateMetadata(song, artists){
    document.getElementById('meta-song').innerHTML = song;
    document.getElementById('meta-artist').innerHTML = artists;
}

function msToMMSS(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secondsRemaining = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secondsRemaining.toString().padStart(2, '0')}`;
}