const toastTime = 2000;
const dataTable = new simpleDatatables.DataTable("#queue", {
    searchable: false,
    sortable: false,
    paging: false,
    tableRender: () => {
        highlightCurrentTrack();
    }
});

dataTable.setMessage('temp music player');

dataTable.on("datatable.selectrow", (rowIndex, event) => {
    event.preventDefault();

    if (event.target.className === 'fab fa-spotify') {
        if (event.type === 'mousedown') {
            window.open(queue[rowIndex].ext_song, '_blank');
        }
        return;
    }

    if (event.target.className === 'fa fa-trash') {
        if (event.type === 'mousedown') {
            deleteTrack(rowIndex);
        }
        return;
    }

    playInQueue(rowIndex);
});

const myplaylists = new simpleDatatables.DataTable("#myplaylists", {
    searchable: false,
    sortable: false,
    paging: false,
});


myplaylists.on("datatable.selectrow", (rowIndex, event) => {
    event.preventDefault();
    addTracksFromPlaylistId(spotifyState.myplaylists[rowIndex].id);
});

function infoToast(msg, ms) {
    Toastify({
        text: msg,
        duration: ms || toastTime,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: {
            background: '#2e8b8b'
        },
        onClick: function () {
        } // Callback after click
    }).showToast();
}

function errorToast(msg, ms) {
    Toastify({
        text: msg,
        duration: ms || toastTime,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: {
            background: '#B24C4C'
        },
        onClick: function () {
        } // Callback after click
    }).showToast();
}

function warnToast(msg, ms) {
    Toastify({
        text: msg,
        duration: ms || toastTime,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: {
            background: '#D1C74C'
        },
        onClick: function () {
        } // Callback after click
    }).showToast();
}

function blank(table) {
    const rows = document.getElementById(table).querySelectorAll('tr');

    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('*');
        cells.forEach(cell => {
            cell.style.color = 'white';
        });
    }
}

function colorRow(idx, color) {
    const row = document.getElementById('queue').querySelector(`tr[data-index="${idx}"]`);

    if (row) {
        const cells = row.querySelectorAll('*');
        cells.forEach(cell => {
            cell.style.color = color;
        });
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

function highlightCurrentTrack() {
    blank('queue');
    colorRow(queuePos, '#2e8b8b');
}

function updateMetadata(track) {
    document.getElementById('meta-song').innerHTML = track ? makeLink(track.title, track.ext_song) : '';
    document.getElementById('meta-artist').innerHTML = track ? `${track.ext_artists.map(a => makeLink(a.name, a.external_urls.spotify)).join(', ')}` : '';
    document.getElementById('meta-source').innerHTML = `<i id="meta-src-icon" class="fab fa-${track?.src?.toLowerCase()}"></i>`;
}

function makeLink(text, url) {
    return `<a target="_blank" href="${url}">${text}</a>`
}

function followTrack() {
    const row = document.querySelector(`tr[data-index="${queuePos}"]`);
    scrollTo(row);
}

function scrollTo(element) {
    element.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest"
    });
}