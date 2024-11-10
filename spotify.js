const spotifyApi = new SpotifyWebApi();
let me;
let myPlaylists;

async function initSpotify() {
    spotifyApi.setAccessToken('BQBNIiKDNIa0FaFch15N2NwpCXOGOJ1Gh1AwAsft4YcJV1YjRlMk7982FwQaKdcjA3tZzPqNRlKCIuCLRTH_-P7ihYG6G6JxdDEDG1KH4a90dm4vUCsUCVQIRJCV5rtp1ozPZTBH910sAaEtaaiV5uzSo4DN3oUYlOcd8IcBZJ73rHN-7hFdmr6yvv6nS7IHktsZhNh5JP1MMLNdYgDp1TOOZQhtQgaP9Pi0dVgx0BWhVJKfqMeINF3LL_65-6v3fa02H_9NC9_qkXCAqXEsm_s-q5aaEA6N');
    await initData()
    await initElements()

    console.log(me)
}

async function initData() {
    me = await spotifyApi.getMe();
}

async function initElements() {
    const list = document.getElementById('playlists')
    myPlaylists = await spotifyApi.getUserPlaylists(me.id);
    console.log(myPlaylists)

    for (let playlist of myPlaylists.items) {
        const pl = document.createElement('li');
        pl.innerText = playlist['name'] + ' - ' + playlist['owner']['display_name'];
        list.append(pl);
    }
}