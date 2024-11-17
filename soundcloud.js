const scData = {
    get scClientId() {
        return localStorage.getItem('scClientId') || null;
    },

    saveId: function(id) {
        localStorage.setItem('scClientId', id);
    }
}

function hasClientId(){
    return scData.scClientId !== null;
}

function initScElements() {
    const menu = document.getElementById('soundcloud-menu');
    const dd = document.getElementById('soundcloud-dd');
    if (hasClientId()) {
        dd.innerHTML = `<i style="color: #ff7700" class="fab fa-soundcloud"</i>  <i style="color: #2e8b8b" class="fa fa-check"</i>`;
        menu.appendChild(menuButton('soundcloud-logout', 'Logout', () => {}));
    } else {
        dd.innerHTML = `<i style="color: red" class="fab fa-soundcloud"</i>` + ' Add Soundcloud';
        menu.appendChild(menuButton('soundcloud-login', 'Login', () => {}));
    }
}

function initSoundcloud() {

    SC.initialize({
        client_id: scData.scClientId,
        redirect_uri: redirectUrl
    });

    initScElements();
}