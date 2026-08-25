/* =========================================================
   SONIDO (clics, hover, lanzar, música de fondo)
========================================================= */

const soundClick = document.getElementById('sound-click');
const soundLaunch = document.getElementById('sound-launch');
const soundMusic = document.getElementById('sound-music');

soundClick.volume = 0.5;
soundLaunch.volume = 0.6;
soundMusic.volume = 0.25;

let isMuted = false;

// Reproduce un sonido desde el inicio, incluso si ya estaba
// sonando (usa un clon para permitir clics rápidos seguidos).
function playSound(audioElement) {

    if (isMuted) {
        return;
    }

    const clone = audioElement.cloneNode();
    clone.volume = audioElement.volume;
    clone.play().catch(() => {});
}

function applyMuteState() {

    soundMusic.muted = isMuted;

    document.getElementById('icon-sound-on').style.display =
        isMuted ? 'none' : 'block';

    document.getElementById('icon-sound-off').style.display =
        isMuted ? 'block' : 'none';
}


// Sonido de clic para casi cualquier botón o tarjeta clickeable,
// EXCEPTO el botón de Jugar (ese usa su propio sonido especial).
document.addEventListener('click', event => {

    const target = event.target.closest(
        'button, .sidebar-item, .instance-card'
    );

    if (!target) {
        return;
    }

    if (target.classList.contains('play-button')) {
        return; // este ya suena distinto, ver más abajo
    }

    playSound(soundClick);

});


// Botón de silenciar / activar sonido
document
    .getElementById('mute-toggle')
    .addEventListener('click', () => {

        isMuted = !isMuted;

        applyMuteState();

        // Guardamos la preferencia junto con el resto de
        // la configuración (RAM, resolución) que ya existía.
        currentSettings.muted = isMuted;

        window.electronAPI.saveSettings(currentSettings);

    });


// Intentamos iniciar la música apenas carga el launcher.
// Si el navegador la bloquea (política de autoplay), la
// arrancamos en cuanto el usuario haga el primer clic.
function tryPlayMusic() {

    if (isMuted) {
        return;
    }

    soundMusic.play().catch(() => {

        const startOnFirstClick = () => {

            soundMusic.play().catch(() => {});

            document.removeEventListener(
                'click',
                startOnFirstClick
            );
        };

        document.addEventListener(
            'click',
            startOnFirstClick
        );
    });
}


/* =========================================================
   BOTONES DE VENTANA
========================================================= */

document
    .getElementById('minimize')
    .addEventListener('click', () => {

        window.electronAPI.minimize();

    });


document
    .getElementById('maximize')
    .addEventListener('click', () => {

        window.electronAPI.maximize();

    });


document
    .getElementById('close')
    .addEventListener('click', () => {

        window.electronAPI.close();

    });


/* =========================================================
   NAVEGACIÓN
========================================================= */

const sidebarItems =
    document.querySelectorAll('.sidebar-item');

const pages =
    document.querySelectorAll('.page');


sidebarItems.forEach(item => {

    item.addEventListener('click', () => {

        const target =
            item.dataset.page;


        sidebarItems.forEach(button => {

            button.classList.remove('active');

        });


        pages.forEach(page => {

            page.classList.remove('active');

        });


        item.classList.add('active');


        const targetPage =
            document.getElementById(
                `page-${target}`
            );


        if (targetPage) {

            targetPage.classList.add('active');

        }

    });

});


/* =========================================================
   INSTANCIA SELECCIONADA
========================================================= */

let selectedInstance = 'Cliente';

let selectedInstanceName = 'Cliente';


/* =========================================================
   ACTUALIZAR INSTANCIA
========================================================= */

function updateSelectedInstance(
    name,
    id,
    minecraft
) {

    selectedInstance = id;

    selectedInstanceName = name;


    const selected =
        document.getElementById(
            'selected-instance'
        );


    if (selected) {

        selected.innerHTML = '';

        const label =
            document.createElement('span');

        label.textContent =
            'Instancia';


        const strong =
            document.createElement('strong');

        strong.textContent =
            name;


        selected.appendChild(label);

        selected.appendChild(strong);

    }


    const playName =
        document.getElementById(
            'play-instance-name'
        );


    if (playName) {

        playName.textContent =
            name;

    }


    const playInfo =
        document.getElementById(
            'play-instance-info'
        );


    if (playInfo) {

        playInfo.textContent =
            `Minecraft ${minecraft}`;

    }


    document
        .querySelectorAll('.instance-card')
        .forEach(card => {

            card.classList.remove(
                'selected'
            );

        });


    const selectedCard =
        document.querySelector(
            `[data-instance-id="${CSS.escape(id)}"]`
        );


    if (selectedCard) {

        selectedCard.classList.add(
            'selected'
        );

    }

}


/* =========================================================
   JUGAR DESDE INICIO
========================================================= */

document
    .getElementById('play-button')
    .addEventListener('click', () => {

        playSound(soundLaunch);

        console.log(
            '🚀 Lanzando:',
            selectedInstance
        );


        window.electronAPI.launchInstance(
            selectedInstance
        );

    });


/* =========================================================
   JUGAR DESDE PÁGINA JUGAR
========================================================= */

document
    .getElementById('play-instance')
    .addEventListener('click', () => {

        playSound(soundLaunch);

        console.log(
            '🚀 Lanzando:',
            selectedInstance
        );


        window.electronAPI.launchInstance(
            selectedInstance
        );

    });


/* =========================================================
   CARGAR INSTANCIAS
========================================================= */

const instancesList =
    document.getElementById(
        'instances-list'
    );


async function loadInstances() {

    try {

        instancesList.innerHTML = `
            <div class="loading">
                Cargando instalaciones...
            </div>
        `;


        const instances =
            await window.electronAPI.getInstances();


        instancesList.innerHTML = '';


        if (
            !instances ||
            instances.length === 0
        ) {

            instancesList.innerHTML = `
                <div class="loading">
                    No se encontraron instalaciones.
                </div>
            `;

            return;

        }


        instances.forEach(instance => {

            /* =================================================
               TARJETA
            ================================================= */

            const card =
                document.createElement('div');

            card.className =
                'instance-card';

            card.dataset.instanceId =
                instance.id;


            /* =================================================
               ICONO
               
               IMPORTANTE:
               Ya NO usamos innerHTML para el IMG.
               Creamos el elemento directamente.
            ================================================= */

            const iconContainer =
                document.createElement('div');

            iconContainer.className =
                'instance-icon';


            if (instance.icon) {

                const img =
                    document.createElement('img');

                img.src =
                    instance.icon;

                img.alt =
                    `${instance.name} icon`;

                img.draggable =
                    false;

                img.addEventListener(
                    'error',
                    () => {

                        img.remove();

                        createDefaultIcon(
                            iconContainer
                        );

                    }
                );


                iconContainer.appendChild(img);

            } else {

                createDefaultIcon(
                    iconContainer
                );

            }


            /* =================================================
               INFORMACIÓN
            ================================================= */

            const info =
                document.createElement('div');

            info.className =
                'instance-info';


            const name =
                document.createElement('strong');

            name.textContent =
                instance.name;


            const minecraft =
                document.createElement('span');

            minecraft.textContent =
                `Minecraft ${instance.minecraft}`;


            const details =
                document.createElement('span');

            details.className =
                'instance-details';

            details.textContent =
                `${instance.loader} • Java ${instance.java} • ${instance.ram}`;


            info.appendChild(name);

            info.appendChild(minecraft);

            info.appendChild(details);


            /* =================================================
               BOTÓN
            ================================================= */

            const button =
                document.createElement('button');

            button.className =
                'play-button small select-instance';

            button.type =
                'button';


            const buttonText =
                document.createElement('span');

            buttonText.textContent =
                'SELECCIONAR';


            button.appendChild(
                buttonText
            );


            /* =================================================
               ARMAR TARJETA
            ================================================= */

            card.appendChild(
                iconContainer
            );

            card.appendChild(
                info
            );

            card.appendChild(
                button
            );


            /* =================================================
               BOTÓN SELECCIONAR
            ================================================= */

            button.addEventListener(
                'click',
                event => {

                    event.stopPropagation();

                    playSound(soundClick);


                    updateSelectedInstance(
                        instance.name,
                        instance.id,
                        instance.minecraft
                    );


                    console.log(
                        '✅ Seleccionada:',
                        instance.id
                    );

                }
            );


            /* =================================================
               CLICK EN TARJETA
            ================================================= */

            card.addEventListener(
                'click',
                () => {

                    updateSelectedInstance(
                        instance.name,
                        instance.id,
                        instance.minecraft
                    );


                    console.log(
                        '✅ Instancia seleccionada:',
                        instance.id
                    );

                }
            );


            instancesList.appendChild(
                card
            );

        });


        /* =================================================
           MARCAR CLIENTE AL INICIAR
        ================================================= */

        updateSelectedInstance(
            selectedInstanceName,
            selectedInstance,
            '1.21.11'
        );


    } catch (error) {

        console.error(
            'Error cargando instancias:',
            error
        );


        instancesList.innerHTML = `
            <div class="loading">
                Error al cargar las instalaciones.
            </div>
        `;

    }

}


/* =========================================================
   ICONO POR DEFECTO
========================================================= */

function createDefaultIcon(container) {

    const svg =
        document.createElementNS(
            'http://www.w3.org/2000/svg',
            'svg'
        );


    svg.setAttribute(
        'viewBox',
        '0 0 24 24'
    );


    svg.setAttribute(
        'aria-hidden',
        'true'
    );


    const paths = [
        'M7 4h10v5H7z',
        'M5 9h14v11H5z',
        'M9 9v4M15 9v4',
        'M9 17h6'
    ];


    paths.forEach(d => {

        const path =
            document.createElementNS(
                'http://www.w3.org/2000/svg',
                'path'
            );


        path.setAttribute(
            'd',
            d
        );


        svg.appendChild(
            path
        );

    });


    container.appendChild(
        svg
    );

}


/* =========================================================
   CONFIGURACIÓN (RAM / RESOLUCIÓN)
========================================================= */

const ramSlider =
    document.getElementById('ram-slider');

const ramValueLabel =
    document.getElementById('ram-value');

const resolutionSelect =
    document.getElementById('resolution-select');


// Guardamos aquí la última configuración conocida, para no
// pisar el campo "muted" cuando se guarda RAM/resolución
// (y viceversa).
let currentSettings = {
    ram: 4096,
    resWidth: 1280,
    resHeight: 720,
    muted: false,
    musicTrack: 'background-music.mp3',
    musicVolume: 0.25,
    sfxVolume: 0.5
};


const musicSelect =
    document.getElementById('music-select');

const musicVolumeSlider =
    document.getElementById('music-volume-slider');

const musicVolumeValue =
    document.getElementById('music-volume-value');

const sfxVolumeSlider =
    document.getElementById('sfx-volume-slider');

const sfxVolumeValue =
    document.getElementById('sfx-volume-value');


async function loadSettings() {

    const settings =
        await window.electronAPI.getSettings();

    currentSettings = settings;

    // settings.ram viene en MB, el slider trabaja en GB
    const ramGB =
        Math.round(settings.ram / 1024);

    ramSlider.value = ramGB;

    ramValueLabel.textContent = `${ramGB} GB`;


    const resValue =
        `${settings.resWidth}x${settings.resHeight}`;

    resolutionSelect.value = resValue;


    // Pista y volúmenes
    musicSelect.value = settings.musicTrack;

    soundMusic.src = `sounds/${settings.musicTrack}`;

    soundMusic.volume = settings.musicVolume;

    musicVolumeSlider.value = Math.round(settings.musicVolume * 100);

    musicVolumeValue.textContent =
        `${Math.round(settings.musicVolume * 100)}%`;


    soundClick.volume = settings.sfxVolume;

    soundLaunch.volume = settings.sfxVolume;

    sfxVolumeSlider.value = Math.round(settings.sfxVolume * 100);

    sfxVolumeValue.textContent =
        `${Math.round(settings.sfxVolume * 100)}%`;


    // Aplicar el estado de silencio guardado
    isMuted = !!settings.muted;

    applyMuteState();
    tryPlayMusic();

}


function saveCurrentSettings() {

    const ramGB =
        Number(ramSlider.value);

    const [resWidth, resHeight] =
        resolutionSelect.value
            .split('x')
            .map(Number);

    currentSettings = {
        ...currentSettings,
        ram: ramGB * 1024, // GB -> MB
        resWidth,
        resHeight
    };

    window.electronAPI.saveSettings(currentSettings);

}


/* =========================================================
   PISTA Y VOLÚMENES
========================================================= */

musicSelect.addEventListener('change', () => {

    currentSettings.musicTrack = musicSelect.value;

    soundMusic.src = `sounds/${musicSelect.value}`;

    if (!isMuted) {
        soundMusic.play().catch(() => {});
    }

    window.electronAPI.saveSettings(currentSettings);

});


// Mientras arrastras, solo se mueve el número en pantalla
// (barato de hacer). El volumen REAL del audio que está
// sonando se aplica hasta que SUELTAS el slider, para no
// saturarlo con cambios constantes mientras se reproduce.
musicVolumeSlider.addEventListener('input', () => {

    musicVolumeValue.textContent =
        `${musicVolumeSlider.value}%`;

});

musicVolumeSlider.addEventListener('change', () => {

    const volume = Number(musicVolumeSlider.value) / 100;

    soundMusic.volume = volume;

    currentSettings.musicVolume = volume;

    window.electronAPI.saveSettings(currentSettings);

});


sfxVolumeSlider.addEventListener('input', () => {

    const volume = Number(sfxVolumeSlider.value) / 100;

    soundClick.volume = volume;
    soundLaunch.volume = volume;

    sfxVolumeValue.textContent =
        `${sfxVolumeSlider.value}%`;

});

sfxVolumeSlider.addEventListener('change', () => {

    currentSettings.sfxVolume =
        Number(sfxVolumeSlider.value) / 100;

    window.electronAPI.saveSettings(currentSettings);

});


// Mientras arrastras el slider, solo actualiza el número en pantalla
ramSlider.addEventListener('input', () => {

    ramValueLabel.textContent =
        `${ramSlider.value} GB`;

});


// Cuando SUELTAS el slider, ahí sí se guarda (evita escribir el
// archivo cientos de veces mientras lo arrastras)
ramSlider.addEventListener('change', () => {

    saveCurrentSettings();

});


resolutionSelect.addEventListener('change', () => {

    saveCurrentSettings();

});


/* =========================================================
   CUENTA (leída de Prism)
========================================================= */

async function loadAccount() {

    const account =
        await window.electronAPI.getAccount();

    const displayName =
        account ? account.name : 'Sin cuenta';

    const displayType =
        account ? account.type : 'No se encontró ninguna cuenta en Prism';

    const firstLetter =
        displayName.charAt(0).toUpperCase();


    // Página de Cuenta
    document.getElementById('account-name').textContent =
        displayName;

    document.getElementById('account-type').textContent =
        displayType;

    setFaceImage(
        document.getElementById('account-avatar'),
        account?.faceUrl,
        firstLetter
    );


    // Barra inferior
    document.getElementById('footer-account-name').textContent =
        displayName;

    document.getElementById('footer-account-type').textContent =
        displayType;

    setFaceImage(
        document.getElementById('footer-avatar'),
        account?.faceUrl,
        firstLetter
    );

}


// Pone una imagen de cara dentro de un contenedor (avatar).
// Si la imagen falla en cargar (sin internet, etc), deja
// la letra de respaldo que ya tenía el contenedor.
function setFaceImage(container, faceUrl, fallbackLetter) {

    if (!container) {
        return;
    }

    if (!faceUrl) {

        container.innerHTML =
            `<span>${fallbackLetter}</span>`;

        return;
    }

    const img =
        document.createElement('img');

    img.src = faceUrl;
    img.alt = 'Skin';
    img.draggable = false;

    img.addEventListener('error', () => {

        container.innerHTML =
            `<span>${fallbackLetter}</span>`;

    });

    container.innerHTML = '';
    container.appendChild(img);

}


/* =========================================================
   LISTA DE CUENTAS (cambiar entre cuentas de Prism)
========================================================= */

const accountsList =
    document.getElementById('accounts-list');


async function loadAccountsList() {

    const accounts =
        await window.electronAPI.getAccounts();

    accountsList.innerHTML = '';

    if (!accounts || accounts.length === 0) {

        accountsList.innerHTML = `
            <div class="loading">
                No se encontraron cuentas en Prism.
            </div>
        `;

        return;
    }

    accounts.forEach(account => {

        const card =
            document.createElement('div');

        card.className =
            'instance-card' +
            (account.active ? ' selected' : '');


        const iconContainer =
            document.createElement('div');

        iconContainer.className =
            'instance-icon';

        setFaceImage(
            iconContainer,
            account.faceUrl,
            account.name.charAt(0).toUpperCase()
        );


        const info =
            document.createElement('div');

        info.className = 'instance-info';

        const name =
            document.createElement('strong');

        name.textContent = account.name;

        const type =
            document.createElement('span');

        type.textContent = account.active
            ? `${account.type} • Activa`
            : account.type;

        info.appendChild(name);
        info.appendChild(type);


        const button =
            document.createElement('button');

        button.className =
            'play-button small';

        button.type = 'button';
        button.disabled = account.active;

        const buttonText =
            document.createElement('span');

        buttonText.textContent =
            account.active ? 'ACTIVA' : 'USAR ESTA';

        button.appendChild(buttonText);

        button.addEventListener('click', async () => {

            await window.electronAPI.setActiveAccount(
                account.id
            );

            loadAccountsList();
            loadAccount();

        });


        card.appendChild(iconContainer);
        card.appendChild(info);
        card.appendChild(button);

        accountsList.appendChild(card);

    });

}


/* =========================================================
   INICIAR
========================================================= */

loadInstances();
loadSettings();
loadAccount();
loadAccountsList();
