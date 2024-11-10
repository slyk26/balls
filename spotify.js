const clientId = '7257603b361940308bc1c93da610767e';
const redirectUrl = 'http://localhost:8080';

const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const scope = 'user-read-private user-read-email';
const spotifyApi = new SpotifyWebApi();

const spotifyState = {
    user: {},
    playlists: {},
    loggedIn: false,
}

// Data structure that manages the current active token, caching it in localStorage
const currentToken = {
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

    save: function (response) {
        const {access_token, refresh_token, expires_in} = response;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('expires_in', expires_in);

        const now = new Date();
        localStorage.setItem('expires', new Date(now.getTime() + (expires_in * 1000)).toString());
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
    window.location.href = authUrl.toString(); // Redirect the user to the authorization server for login
}

// Soptify API Calls
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
            refresh_token: currentToken.refresh_token
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
    if (currentToken.refresh_token != null) {
        console.log('updating token...');
        const token = await refreshToken();
        currentToken.save(token);
    }
}

async function checkSpotifyAuth() {
    const args = new URLSearchParams(window.location.search);
    const code = args.get('code');

    if (code) {
        const token = await getToken(code);
        currentToken.save(token);

        const url = new URL(window.location.href);
        url.searchParams.delete("code");

        const updatedUrl = url.search ? url.href : url.href.replace('?', '');
        window.history.replaceState({}, document.title, updatedUrl);
    }

    if (currentToken.access_token) {
        spotifyApi.setAccessToken(currentToken.access_token)
        return true;
    }

    if (!currentToken.access_token) {
        return false;
    }
}

function initElements(){
    document.getElementById('spotify-login').addEventListener('click', async () => {
        await login();
    });
    document.getElementById('spotify-logout').addEventListener('click', async () => {
        await logout();
    })
}

async function initSpotify() {
    setInterval(updateRefreshToken, 45 * 60 * 1000); // 45 minutes

    spotifyState.user = await spotifyApi.getMe();
    console.log(spotifyState)
}