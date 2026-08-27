/* =========================================================
   AVISOS (TOASTS)
========================================================= */

const toastContainer =
    document.getElementById('toast-container');

function showToast(message) {

    const toast =
        document.createElement('div');

    toast.className = 'toast';

    const icon = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg'
    );

    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('class', 'toast-icon');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '2');

    const circle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
    );

    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '9');

    const line1 = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
    );

    line1.setAttribute('d', 'M12 8v5');

    const line2 = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
    );

    line2.setAttribute('d', 'M12 16h.01');

    icon.appendChild(circle);
    icon.appendChild(line1);
    icon.appendChild(line2);


    const text = document.createElement('span');
    text.textContent = message;


    toast.appendChild(icon);
    toast.appendChild(text);

    toastContainer.appendChild(toast);

    // Se quita solo después de unos segundos
    setTimeout(() => {

        toast.classList.add('hide');

        setTimeout(() => toast.remove(), 250);

    }, 5000);

}


// Cuando el proceso principal avisa que algo falló al
// intentar lanzar el juego, se lo mostramos al usuario.
window.electronAPI.onLaunchError(message => {

    showToast(message);

});


/* =========================================================
   SONIDO (clics, lanzar, música de fondo)
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

            const cardButton =
                card.querySelector('.select-instance');

            if (cardButton) {

                cardButton.disabled = false;

                const cardButtonText =
                    cardButton.querySelector('span');

                if (cardButtonText) {
                    cardButtonText.textContent = 'SELECCIONAR';
                }
            }

        });


    const selectedCard =
        document.querySelector(
            `[data-instance-id="${CSS.escape(id)}"]`
        );


    if (selectedCard) {

        selectedCard.classList.add(
            'selected'
        );

        const selectedButton =
            selectedCard.querySelector('.select-instance');

        if (selectedButton) {

            selectedButton.disabled = true;

            const selectedButtonText =
                selectedButton.querySelector('span');

            if (selectedButtonText) {
                selectedButtonText.textContent = 'SELECCIONADA';
            }
        }

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

            const prismInstalled =
                await window.electronAPI.isPrismInstalled();

            const launcherName =
                await window.electronAPI.getDetectedLauncherName();

            instancesList.innerHTML = prismInstalled
                ? `
                    <div class="loading">
                        No se encontraron instalaciones.
                        Crea una instancia en ${launcherName} primero.
                    </div>
                `
                : `
                    <div class="loading">
                        No se detectó Prism Launcher ni PolyMC
                        instalados en este sistema.
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
                            iconContainer,
                            instance.loader
                        );

                    }
                );


                iconContainer.appendChild(img);

            } else {

                createDefaultIcon(
                    iconContainer,
                    instance.loader
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

            const isAlreadySelected =
                instance.id === selectedInstance;

            buttonText.textContent =
                isAlreadySelected ? 'SELECCIONADA' : 'SELECCIONAR';

            button.disabled = isAlreadySelected;

            if (isAlreadySelected) {
                card.classList.add('selected');
            }


            button.appendChild(
                buttonText
            );


            /* =================================================
               BOTONES EDITAR / BORRAR
            ================================================= */

            const actions =
                document.createElement('div');

            actions.className = 'instance-actions';


            const editButton =
                document.createElement('button');

            editButton.className = 'instance-icon-button';
            editButton.type = 'button';
            editButton.title = 'Renombrar';

            editButton.innerHTML = `
                <svg viewBox="0 0 24 24">
                    <path d="M12 20h9"/>
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>
                </svg>
            `;

            editButton.addEventListener('click', event => {

                event.stopPropagation();
                playSound(soundClick);

                openRenameInstanceModal(
                    instance.id,
                    instance.name
                );

            });


            const deleteButton =
                document.createElement('button');

            deleteButton.className =
                'instance-icon-button danger';

            deleteButton.type = 'button';
            deleteButton.title = 'Borrar';

            deleteButton.innerHTML = `
                <svg viewBox="0 0 24 24">
                    <path d="M4 7h16"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/>
                    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
            `;

            deleteButton.addEventListener('click', async event => {

                event.stopPropagation();
                playSound(soundClick);

                const confirmed = window.confirm(
                    `¿Borrar "${instance.name}"? Esta acción ` +
                    'no se puede deshacer.'
                );

                if (!confirmed) {
                    return;
                }

                const result =
                    await window.electronAPI.deleteInstance(
                        instance.id
                    );

                if (result && result.success) {

                    showToast(`"${instance.name}" borrada.`);
                    loadInstances();

                    // Si la página de Mods tenía seleccionada
                    // justo esta instancia, hay que limpiarla
                    // para no seguir mostrando sus mods.
                    if (modsInstanceSelect.value === instance.id) {
                        modsInstanceSelect.value = '';
                    }

                    loadModsInstanceOptions();
                    loadInstalledMods();

                } else {

                    showToast(
                        (result && result.error) ||
                        'No se pudo borrar la instancia.'
                    );
                }

            });


            actions.appendChild(editButton);
            actions.appendChild(deleteButton);


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
                actions
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

function createDefaultIcon(container, loader) {

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


    // Un ícono distinto según qué trae la instancia, para
    // reconocerlas de un vistazo en la lista.
    const iconsByLoader = {

        // Forge: yunque (el símbolo clásico de Forge)
        forge: {
            className: 'icon-forge',
            paths: [
                'M4 17h16',
                'M6 17v-2.5c0-.8.7-1.5 1.5-1.5h9c.8 0 1.5.7 1.5 1.5V17',
                'M9 13V9c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v4',
                'M9 7V5.5C9 4.7 9.7 4 10.5 4h3c.8 0 1.5.7 1.5 1.5V7'
            ]
        },

        // Fabric: patrón de hilos/tejido
        fabric: {
            className: 'icon-fabric',
            paths: [
                'M4 4l16 16',
                'M4 10l10 10',
                'M4 16l4 4',
                'M10 4l10 10',
                'M16 4l4 4'
            ]
        },

        // Vanilla (o sin loader): bloque simple
        vanilla: {
            className: 'icon-vanilla',
            paths: [
                'M7 4h10v5H7z',
                'M5 9h14v11H5z',
                'M9 9v4M15 9v4',
                'M9 17h6'
            ]
        }
    };

    // instance.loader llega como texto para mostrar en
    // pantalla (ej. "Forge 47.4.10", "Fabric 0.19.2"), así
    // que lo normalizamos a una clave simple.
    const loaderKey = (loader || '').toLowerCase();

    let normalizedKey = 'vanilla';

    if (loaderKey.includes('forge')) {
        normalizedKey = 'forge';
    } else if (loaderKey.includes('fabric')) {
        normalizedKey = 'fabric';
    }

    const chosen =
        iconsByLoader[normalizedKey] || iconsByLoader.vanilla;

    svg.classList.add(chosen.className);


    chosen.paths.forEach(d => {

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

        const prismInstalled =
            await window.electronAPI.isPrismInstalled();

        const launcherName =
            await window.electronAPI.getDetectedLauncherName();

        accountsList.innerHTML = prismInstalled
            ? `
                <div class="loading">
                    No se encontraron cuentas. Inicia sesión
                    en ${launcherName} primero.
                </div>
            `
            : `
                <div class="loading">
                    No se detectó Prism Launcher ni PolyMC
                    instalados en este sistema.
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
   MODAL: CREAR INSTANCIA
========================================================= */

const createInstanceModal =
    document.getElementById('create-instance-modal');

const newInstanceNameInput =
    document.getElementById('new-instance-name');

const newInstanceVersionSelect =
    document.getElementById('new-instance-version');

let versionsLoaded = false;


async function openCreateInstanceModal() {

    createInstanceModal.classList.remove('hidden');

    newInstanceNameInput.value = '';
    newInstanceNameInput.focus();

    if (versionsLoaded) {
        return;
    }

    const versions =
        await window.electronAPI.getMinecraftVersions();

    if (!versions || versions.length === 0) {

        newInstanceVersionSelect.innerHTML = `
            <option value="">
                No se pudo cargar la lista (¿sin internet?)
            </option>
        `;

        return;
    }

    newInstanceVersionSelect.innerHTML = versions
        .map(v => `<option value="${v}">${v}</option>`)
        .join('');

    versionsLoaded = true;

}

function closeCreateInstanceModal() {

    createInstanceModal.classList.add('hidden');
}


document
    .getElementById('open-create-instance')
    .addEventListener('click', openCreateInstanceModal);

document
    .getElementById('cancel-create-instance')
    .addEventListener('click', closeCreateInstanceModal);

// Cerrar si haces clic fuera del cuadro del modal
createInstanceModal.addEventListener('click', event => {

    if (event.target === createInstanceModal) {
        closeCreateInstanceModal();
    }
});


/* =========================================================
   MODAL: RENOMBRAR INSTANCIA
========================================================= */

const renameInstanceModal =
    document.getElementById('rename-instance-modal');

const renameInstanceInput =
    document.getElementById('rename-instance-input');

let instanceBeingRenamed = null;


function openRenameInstanceModal(instanceId, currentName) {

    instanceBeingRenamed = instanceId;

    renameInstanceInput.value = currentName;

    renameInstanceModal.classList.remove('hidden');

    renameInstanceInput.focus();
    renameInstanceInput.select();
}

function closeRenameInstanceModal() {

    renameInstanceModal.classList.add('hidden');
    instanceBeingRenamed = null;
}


document
    .getElementById('cancel-rename-instance')
    .addEventListener('click', closeRenameInstanceModal);

renameInstanceModal.addEventListener('click', event => {

    if (event.target === renameInstanceModal) {
        closeRenameInstanceModal();
    }
});

renameInstanceInput.addEventListener('keydown', event => {

    if (event.key === 'Enter') {
        document
            .getElementById('confirm-rename-instance')
            .click();
    }
});

document
    .getElementById('confirm-rename-instance')
    .addEventListener('click', async () => {

        const newName = renameInstanceInput.value.trim();

        if (!newName) {
            showToast('El nombre no puede estar vacío.');
            return;
        }

        const result = await window.electronAPI.renameInstance({
            instanceId: instanceBeingRenamed,
            newName
        });

        if (result && result.success) {

            closeRenameInstanceModal();
            showToast('Instancia renombrada.');
            loadInstances();
            loadModsInstanceOptions();

        } else {

            showToast(
                (result && result.error) ||
                'No se pudo renombrar la instancia.'
            );
        }

    });


document
    .getElementById('confirm-create-instance')
    .addEventListener('click', async () => {

        const name = newInstanceNameInput.value.trim();
        const version = newInstanceVersionSelect.value;

        const loader =
            document.getElementById('new-instance-loader').value;

        if (!name) {
            showToast('Ponle un nombre a la instancia.');
            return;
        }

        if (!version) {
            showToast('Selecciona una versión de Minecraft.');
            return;
        }

        const confirmButton =
            document.getElementById('confirm-create-instance');

        confirmButton.disabled = true;

        const result =
            await window.electronAPI.createInstance({
                name,
                version,
                loader
            });

        confirmButton.disabled = false;

        if (result && result.success) {

            closeCreateInstanceModal();
            showToast(`Instancia "${result.folderName}" creada.`);
            loadInstances();
            loadModsInstanceOptions();

        } else {

            showToast(
                (result && result.error) ||
                'No se pudo crear la instancia. Intenta de nuevo.'
            );
        }

    });


/* =========================================================
   PÁGINA DE MODS (buscar/instalar desde Modrinth)
========================================================= */

const modsInstanceSelect =
    document.getElementById('mods-instance-select');

const modsSearchInput =
    document.getElementById('mods-search-input');

const modsResults =
    document.getElementById('mods-results');

const installedModsSection =
    document.getElementById('installed-mods-section');

const installedModsList =
    document.getElementById('installed-mods-list');


// Llena el selector con las instancias que ya existen,
// para elegir dónde instalar el mod.
//
// IMPORTANTE: reconstruimos las opciones con el DOM
// (createElement/appendChild) en vez de reemplazar todo
// el innerHTML de golpe. Reescribir el innerHTML de un
// <select> mientras el navegador todavía tiene "memoria"
// de un clic reciente (por ejemplo, justo después de
// cerrar la ventanita de confirmar borrado) a veces deja
// el menú desplegable sin abrir con el mouse hasta que
// se interactúa con teclado. Reconstruir nodo por nodo
// es más robusto contra ese problema.
async function loadModsInstanceOptions() {

    const previousValue = modsInstanceSelect.value;

    while (modsInstanceSelect.firstChild) {
        modsInstanceSelect.removeChild(
            modsInstanceSelect.firstChild
        );
    }

    const instances =
        await window.electronAPI.getInstances();

    if (!instances || instances.length === 0) {

        const emptyOption =
            document.createElement('option');

        emptyOption.value = '';
        emptyOption.textContent = 'Sin instancias creadas';

        modsInstanceSelect.appendChild(emptyOption);

        return;
    }

    const placeholderOption =
        document.createElement('option');

    placeholderOption.value = '';
    placeholderOption.textContent = 'Elige una instancia...';

    modsInstanceSelect.appendChild(placeholderOption);

    instances.forEach(instance => {

        const option =
            document.createElement('option');

        option.value = instance.id;
        option.textContent =
            `${instance.name} (${instance.loader})`;

        modsInstanceSelect.appendChild(option);

    });

    // Si la instancia que tenías elegida sigue existiendo,
    // se la dejamos seleccionada; si no, se queda vacío.
    const stillExists = instances.some(
        instance => instance.id === previousValue
    );

    modsInstanceSelect.value =
        stillExists ? previousValue : '';
}


async function loadInstalledMods() {

    const instanceId = modsInstanceSelect.value;

    if (!instanceId) {

        installedModsSection.classList.add('hidden');
        return;
    }

    const mods =
        await window.electronAPI.getInstalledMods(instanceId);

    installedModsSection.classList.remove('hidden');

    if (!mods || mods.length === 0) {

        installedModsList.innerHTML = `
            <div class="loading">
                Esta instancia todavía no tiene mods instalados.
            </div>
        `;

        return;
    }

    installedModsList.innerHTML = '';

    mods.forEach(mod => {

        const card = document.createElement('div');
        card.className = 'instance-card';

        const info = document.createElement('div');
        info.className = 'instance-info';

        const name = document.createElement('strong');
        name.textContent = mod.fileName;

        const size = document.createElement('span');
        size.textContent = `${mod.sizeMB} MB`;

        info.appendChild(name);
        info.appendChild(size);


        const deleteButton = document.createElement('button');
        deleteButton.className = 'mod-delete-button';
        deleteButton.type = 'button';
        deleteButton.title = 'Borrar mod';

        deleteButton.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M4 7h16"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/>
                <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
        `;

        deleteButton.addEventListener('click', async () => {

            const confirmed = window.confirm(
                `¿Borrar "${mod.fileName}"? Esta acción no se puede deshacer.`
            );

            if (!confirmed) {
                return;
            }

            const result = await window.electronAPI.deleteMod({
                instanceId,
                fileName: mod.fileName
            });

            if (result && result.success) {

                showToast(`"${mod.fileName}" borrado.`);
                loadInstalledMods();

            } else {

                showToast(
                    (result && result.error) ||
                    'No se pudo borrar el mod.'
                );
            }

        });


        card.appendChild(info);
        card.appendChild(deleteButton);

        installedModsList.appendChild(card);

    });
}


modsInstanceSelect.addEventListener(
    'change',
    loadInstalledMods
);


async function searchMods() {

    const query = modsSearchInput.value.trim();

    if (!query) {
        showToast('Escribe algo para buscar.');
        return;
    }

    modsResults.innerHTML = `
        <div class="loading">Buscando...</div>
    `;

    const mods = await window.electronAPI.searchMods(query);

    if (!mods || mods.length === 0) {

        modsResults.innerHTML = `
            <div class="loading">
                No se encontraron mods para "${query}".
            </div>
        `;

        return;
    }

    modsResults.innerHTML = '';

    mods.forEach(mod => {

        const card = document.createElement('div');
        card.className = 'instance-card';

        const icon = document.createElement('img');
        icon.className = 'mod-card-icon';
        icon.src = mod.iconUrl || '';
        icon.alt = '';

        icon.addEventListener('error', () => {
            icon.style.visibility = 'hidden';
        });


        const info = document.createElement('div');
        info.className = 'mod-card-info';

        const title = document.createElement('strong');
        title.textContent = mod.title;

        const description = document.createElement('span');
        description.textContent = mod.description;

        info.appendChild(title);
        info.appendChild(description);


        const button = document.createElement('button');
        button.className = 'play-button small';
        button.type = 'button';

        const buttonText = document.createElement('span');
        buttonText.textContent = 'INSTALAR';
        button.appendChild(buttonText);

        button.addEventListener('click', async () => {

            const instanceId = modsInstanceSelect.value;

            if (!instanceId) {
                showToast('Primero elige una instancia.');
                return;
            }

            button.disabled = true;
            buttonText.textContent = 'INSTALANDO...';

            const result = await window.electronAPI.installMod({
                instanceId,
                projectId: mod.id
            });

            if (result && result.success) {

                buttonText.textContent = 'INSTALADO';
                showToast(`"${mod.title}" instalado.`);
                loadInstalledMods();

            } else {

                button.disabled = false;
                buttonText.textContent = 'INSTALAR';

                showToast(
                    (result && result.error) ||
                    'No se pudo instalar el mod.'
                );
            }

        });


        card.appendChild(icon);
        card.appendChild(info);
        card.appendChild(button);

        modsResults.appendChild(card);

    });
}


document
    .getElementById('mods-search-button')
    .addEventListener('click', searchMods);

modsSearchInput.addEventListener('keydown', event => {

    if (event.key === 'Enter') {
        searchMods();
    }
});


/* =========================================================
   INICIAR
========================================================= */

loadInstances();
loadSettings();
loadAccount();
loadAccountsList();
loadModsInstanceOptions();
