const clientId = '7257603b361940308bc1c93da610767e';
const redirectUrl = localStorage.getItem('devURL') || 'https://slyk26.github.io/balls';

const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const scope = 'streaming playlist-read-private user-library-read user-read-playback-state user-modify-playback-state playlist-modify-public playlist-modify-private';
const spotifyApi = new SpotifyWebApi();

const spotifyState = {
    user: {},
    deviceId: 0,
    loggedIn: false,
    player: {},
    playerLoaded: false,
    current_ms: 0,
    max_ms: 9.59,
    myplaylists: []
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
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('refresh_in');
    localStorage.removeItem('expires_in');
    localStorage.removeItem('expires');
    window.location.href = redirectUrl;
}

async function updateRefreshToken() {
    if (localdata.refresh_token != null) {
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

async function initSpotifyElements() {
    const dd = document.getElementById('spotify-dd');

    setInterval(updateRefreshToken, 45 * 60 * 1000); // 45 minutes

    try {
        spotifyState.user = await spotifyApi.getMe();
    } catch (e) {
        spotifyState.loggedIn = false;
    }

    if (spotifyState.loggedIn) {
        dd.innerHTML = `<i style="color: #1DB954" class="fab fa-spotify source-icon"</i>  <i style="color: #2e8b8b" class="fa fa-check"</i>`;
        spotifyState.player = makePlayer();
        spotifyState.player.connect();
    } else {
        dd.innerHTML = `<i style="color: #B24C4C" class="fab fa-spotify source-icon"</i> <i style="color: #2e8b8b" class="fa-solid fa-xmark"></i>`
    }

    const menu = document.getElementById('spotify-menu');
    if (spotifyState.loggedIn) {
        menu.appendChild(menuButton('spotify-logout', 'Logout', logout));
    } else {
        menu.appendChild(menuButton('spotify-login', 'Login', login));
    }

    addMyPlaylists();
}

function initSpotify() {
    window.onSpotifyWebPlaybackSDKReady = () => {
        checkSpotifyAuth().then(async () => {
            await initSpotifyElements();
        })
    }
}

initSpotify();

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
        infoToast("spotify is ready", 3000);
        spotifyState.deviceId = device_id;
        focus(restoreQueue);
        spotifyState.playerLoaded = true;
    });

    player.addListener('progress', pos_data => {
        spotifyState.current_ms = pos_data.position;

        if (currentTrack?.src === 'SPOTIFY') {
            updateProgressBar(spotifyState.current_ms);
        }
    })

    player.addListener('player_state_changed', state => {
        spotifyState.max_ms = state.duration;

        if (currentTrack?.src === 'SPOTIFY') {
            updateProgressBar(spotifyState.current_ms, spotifyState.max_ms);
        }
    })

    return player;
}

function addMyPlaylists() {
    spotifyApi.getUserPlaylists(spotifyState.user.id).then(pl => {
        pl.items.forEach(async p => {
            const e = {
                title: p.name,
                owner: p.owner.display_name,
                id: p.id
            };
            spotifyState.myplaylists.push(e);
            myplaylists.rows.add(convertPlaylistToColumn(e));
        });
    });
}