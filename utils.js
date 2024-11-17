const toastTime = 2000;

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

function msToMMSS(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secondsRemaining = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secondsRemaining.toString().padStart(2, '0')}`;
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

function debounce(func, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}


function addToQueue(track) {
    queue.push(track);
    dataTable.rows.add([`<i style="background: none" class="fab fa-${track.src.toLowerCase()}"></i>`, track.title, track.owner, `<i style="background: none" class="fa fa-trash"></i>`]);
}

function highlightCurrentTrack() {
    blank();
    colorRow(queuePos, '#2e8b8b');
}

function blank() {
    const rows = document.querySelectorAll('tr');

    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('*');
        cells.forEach(cell => {
            cell.style.color = 'white';
        });
    }
}

function colorRow(idx, color) {
    const row = document.querySelector(`tr[data-index="${idx}"]`);

    if (row) {
        const cells = row.querySelectorAll('*');
        cells.forEach(cell => {
            cell.style.color = color;
        });
    }
}