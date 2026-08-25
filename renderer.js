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


async function loadSettings() {

    const settings =
        await window.electronAPI.getSettings();

    // settings.ram viene en MB, el slider trabaja en GB
    const ramGB =
        Math.round(settings.ram / 1024);

    ramSlider.value = ramGB;

    ramValueLabel.textContent = `${ramGB} GB`;


    const resValue =
        `${settings.resWidth}x${settings.resHeight}`;

    resolutionSelect.value = resValue;

}


function saveCurrentSettings() {

    const ramGB =
        Number(ramSlider.value);

    const [resWidth, resHeight] =
        resolutionSelect.value
            .split('x')
            .map(Number);

    const settings = {
        ram: ramGB * 1024, // GB -> MB
        resWidth,
        resHeight
    };

    window.electronAPI.saveSettings(settings);

}


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
