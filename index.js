const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

let win;

/* =========================
   DETECTAR QUÉ LAUNCHER DE MINECRAFT HAY INSTALADO
   (Prism Launcher o PolyMC, según sistema operativo)
========================= */

function getPrismDataDir() {

    const candidates = [];

    if (process.platform === 'win32') {

        candidates.push({
            name: 'Prism Launcher',
            dir: path.join(process.env.APPDATA || '', 'PrismLauncher'),
            isFlatpak: false,
            nativeCommand: 'prismlauncher'
        });

        candidates.push({
            name: 'PolyMC',
            dir: path.join(process.env.APPDATA || '', 'PolyMC'),
            isFlatpak: false,
            nativeCommand: 'polymc'
        });

    } else if (process.platform === 'darwin') {

        candidates.push({
            name: 'Prism Launcher',
            dir: path.join(
                process.env.HOME,
                'Library/Application Support/PrismLauncher'
            ),
            isFlatpak: false,
            nativeCommand: 'prismlauncher'
        });

        candidates.push({
            name: 'PolyMC',
            dir: path.join(
                process.env.HOME,
                'Library/Application Support/PolyMC'
            ),
            isFlatpak: false,
            nativeCommand: 'polymc'
        });

    } else {

        // Linux: probamos Prism (Flatpak y nativo) y
        // PolyMC (Flatpak y nativo), en ese orden de
        // preferencia, y usamos el primero que exista
        // de verdad en esta PC.
        candidates.push({
            name: 'Prism Launcher',
            dir: path.join(
                process.env.HOME,
                '.var/app/org.prismlauncher.PrismLauncher/data/PrismLauncher'
            ),
            isFlatpak: true,
            flatpakId: 'org.prismlauncher.PrismLauncher'
        });

        candidates.push({
            name: 'Prism Launcher',
            dir: path.join(
                process.env.HOME,
                '.local/share/PrismLauncher'
            ),
            isFlatpak: false,
            nativeCommand: 'prismlauncher'
        });

        candidates.push({
            name: 'PolyMC',
            dir: path.join(
                process.env.HOME,
                '.var/app/org.polymc.PolyMC/data/PolyMC'
            ),
            isFlatpak: true,
            flatpakId: 'org.polymc.PolyMC'
        });

        candidates.push({
            name: 'PolyMC',
            dir: path.join(
                process.env.HOME,
                '.local/share/PolyMC'
            ),
            isFlatpak: false,
            nativeCommand: 'polymc'
        });
    }

    for (const candidate of candidates) {

        if (fs.existsSync(candidate.dir)) {
            return candidate;
        }
    }

    // Si no encontramos ninguna carpeta existente, devolvemos
    // la primera opción como intento por defecto (así el resto
    // del código sigue funcionando y muestra "sin instancias"
    // en vez de romperse).
    return candidates[0];
}

const prismInfo = getPrismDataDir();

const instancesPath = path.join(
    prismInfo.dir,
    'instances'
);

/* =========================
   LANZAR PRISM (según cómo esté instalado)
========================= */

function launchPrismInstance(instanceId) {

    let command;
    let args;

    if (prismInfo.isFlatpak) {

        command = 'flatpak';
        args = [
            'run',
            prismInfo.flatpakId,
            '--launch',
            instanceId
        ];

    } else if (process.platform === 'darwin') {

        command = 'open';
        args = [
            '-a',
            prismInfo.name,
            '--args',
            '--launch',
            instanceId
        ];

    } else {

        // Windows y Linux (instalación nativa): asumimos que
        // el comando está disponible en el PATH del sistema
        // (así queda tras una instalación normal en la
        // mayoría de los casos).
        command = prismInfo.nativeCommand;
        args = ['--launch', instanceId];
    }

    const prism = spawn(command, args, {
        detached: true,
        stdio: 'ignore'
    });

    prism.on('error', (error) => {

        console.error(
            `❌ No se pudo lanzar ${prismInfo.name}. ` +
            '¿Está instalado y accesible?',
            error
        );

        if (win && !win.isDestroyed()) {

            win.webContents.send(
                'launch-error',
                `No se pudo lanzar ${prismInfo.name}. ` +
                'Revisa que esté instalado correctamente.'
            );
        }
    });

    prism.unref();
}

/* =========================
   CONFIGURACIÓN (RAM / RESOLUCIÓN)
========================= */

// app.getPath('userData') es una carpeta que Electron crea
// automáticamente para cada app, distinta a la carpeta del código.
// Ahí es donde SIEMPRE se deben guardar configuraciones del usuario.
const settingsPath = path.join(
    app.getPath('userData'),
    'settings.json'
);

const defaultSettings = {
    ram: 4096,       // en MB (4096 MB = 4 GB)
    resWidth: 1280,
    resHeight: 720,
    muted: false,
    musicTrack: 'background-music.mp3',
    musicVolume: 0.25,
    sfxVolume: 0.5
};

function loadSettings() {

    try {

        if (fs.existsSync(settingsPath)) {

            const raw = fs.readFileSync(settingsPath, 'utf8');
            return { ...defaultSettings, ...JSON.parse(raw) };
        }

    } catch (error) {

        console.error('Error leyendo settings.json:', error);
    }

    return { ...defaultSettings };
}

function saveSettingsToDisk(settings) {

    try {

        fs.writeFileSync(
            settingsPath,
            JSON.stringify(settings, null, 2),
            'utf8'
        );

    } catch (error) {

        console.error('Error guardando settings.json:', error);
    }
}

/* =========================
   APLICAR CONFIGURACIÓN A UNA INSTANCIA
   (edita el instance.cfg de Prism antes de lanzar)
========================= */

function applySettingsToInstance(instanceId, settings) {

    const configPath = path.join(
        instancesPath,
        instanceId,
        'instance.cfg'
    );

    // Si el archivo no existe todavía, empezamos con el
    // encabezado que usa Prism/MultiMC.
    let lines = fs.existsSync(configPath)
        ? fs.readFileSync(configPath, 'utf8').split('\n')
        : ['[General]'];

    const updates = {
        OverrideMemory: 'true',
        MaxMemAlloc: String(settings.ram),
        OverrideWindow: 'true',
        MinecraftWinWidth: String(settings.resWidth),
        MinecraftWinHeight: String(settings.resHeight)
    };

    // Si el archivo no trae ya una RAM mínima, le ponemos
    // un valor seguro por defecto.
    const hasMinMem = lines.some(
        line => line.startsWith('MinMemAlloc=')
    );

    if (!hasMinMem) {
        updates.MinMemAlloc = '512';
    }

    const foundKeys = new Set();

    // Reemplazamos las líneas que ya existan...
    lines = lines.map(line => {

        const match = line.match(/^([^=]+)=(.*)$/);

        if (match && updates.hasOwnProperty(match[1])) {

            foundKeys.add(match[1]);
            return `${match[1]}=${updates[match[1]]}`;
        }

        return line;
    });

    // ...y agregamos al final las que no existían.
    for (const [key, value] of Object.entries(updates)) {

        if (!foundKeys.has(key)) {
            lines.push(`${key}=${value}`);
        }
    }

    fs.writeFileSync(
        configPath,
        lines.filter(Boolean).join('\n') + '\n',
        'utf8'
    );

    console.log(
        `⚙️  Configuración aplicada a ${instanceId}:`,
        updates
    );
}

function getAccountsPath() {

    return path.join(
        instancesPath,
        '..',
        'accounts.json'
    );
}

// Crafatar genera la imagen de la cabeza de la skin real
// a partir del UUID de la cuenta (si no tiene skin real,
// muestra la cabeza de Steve por defecto, igual que el juego).
function getFaceUrl(profileId) {

    return `https://crafatar.com/avatars/${profileId}?size=64&overlay`;
}

function getAllAccounts() {

    try {

        const accountsPath = getAccountsPath();

        if (!fs.existsSync(accountsPath)) {
            return [];
        }

        const data = JSON.parse(
            fs.readFileSync(accountsPath, 'utf8')
        );

        const accounts = data.accounts || [];

        return accounts
            .filter(a => a.profile?.id)
            .map(a => ({
                id: a.profile.id,
                name: a.profile.name || 'Sin nombre',
                type: a.type === 'MSA'
                    ? 'Cuenta Microsoft'
                    : 'Cuenta sin conexión',
                active: !!a.active,
                faceUrl: getFaceUrl(a.profile.id)
            }));

    } catch (error) {

        console.error(
            'Error leyendo cuentas:',
            error
        );

        return [];
    }
}

function setActiveAccount(profileId) {

    try {

        const accountsPath = getAccountsPath();

        const data = JSON.parse(
            fs.readFileSync(accountsPath, 'utf8')
        );

        for (const account of data.accounts || []) {

            account.active =
                account.profile?.id === profileId;
        }

        fs.writeFileSync(
            accountsPath,
            JSON.stringify(data, null, 2),
            'utf8'
        );

        console.log(
            '✅ Cuenta activa cambiada a:',
            profileId
        );

    } catch (error) {

        console.error(
            'Error cambiando cuenta activa:',
            error
        );
    }
}

/* =========================
   LEER CUENTA DE PRISM
========================= */

function getPrismAccount() {

    try {

        // accounts.json vive junto a la carpeta "instances"
        const accountsPath = getAccountsPath();

        if (!fs.existsSync(accountsPath)) {
            return null;
        }

        const data = JSON.parse(
            fs.readFileSync(accountsPath, 'utf8')
        );

        const accounts = data.accounts || [];

        // Tomamos la cuenta marcada como "active", o si no
        // hay ninguna marcada, la primera de la lista.
        const account =
            accounts.find(a => a.active) || accounts[0];

        if (!account) {
            return null;
        }

        return {
            name: account.profile?.name || 'Sin nombre',
            type: account.type === 'MSA'
                ? 'Cuenta Microsoft'
                : 'Cuenta sin conexión',
            faceUrl: account.profile?.id
                ? getFaceUrl(account.profile.id)
                : null
        };

    } catch (error) {

        console.error(
            'Error leyendo accounts.json:',
            error
        );

        return null;
    }
}

/* =========================
   CREAR VENTANA
========================= */

function createWindow() {
    win = new BrowserWindow({
        width: 1100,
        height: 700,
        frame: false,
        resizable: true,

        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            sandbox: false
        }
    });

    win.loadFile('index.html');
}

/* =========================
   BOTONES DE VENTANA
========================= */

ipcMain.on('window-minimize', () => {
    win.minimize();
});

ipcMain.on('window-maximize', () => {
    if (win.isMaximized()) {
        win.unmaximize();
    } else {
        win.maximize();
    }
});

ipcMain.on('window-close', () => {
    win.close();
});

/* =========================
   BUSCAR ICONO
========================= */

function findIcon(instancePath) {

    /* =========================
       1. ICONO DE MINECRAFT
    ========================= */

    const minecraftIcon = path.join(
        instancePath,
        'minecraft',
        'icon.png'
    );

    if (fs.existsSync(minecraftIcon)) {
        return pathToFileURL(minecraftIcon).href;
    }

    /* =========================
       2. ICONO DIRECTO
    ========================= */

    const possibleIcons = [
        'icon.png',
        'icon.webp',
        'icon.jpg',
        'icon.jpeg',
        'icon.ico'
    ];

    for (const icon of possibleIcons) {

        const iconPath = path.join(
            instancePath,
            icon
        );

        if (fs.existsSync(iconPath)) {
            return pathToFileURL(iconPath).href;
        }
    }

    /* =========================
       3. ICONO DE PRISM
    ========================= */

    const configPath = path.join(
        instancePath,
        'instance.cfg'
    );

    if (fs.existsSync(configPath)) {

        const config =
            fs.readFileSync(
                configPath,
                'utf8'
            );

        const match =
            config.match(
                /^iconKey=(.*)$/m
            );

        if (match && match[1]) {

            const iconKey =
                match[1].trim();

            const extensions = [
                '.webp',
                '.png',
                '.jpg',
                '.jpeg',
                '.ico'
            ];

            for (const extension of extensions) {

                const prismIcon =
                    path.join(
                        instancesPath,
                        '..',
                        'icons',
                        `${iconKey}${extension}`
                    );

                if (
                    fs.existsSync(
                        prismIcon
                    )
                ) {
                    return pathToFileURL(prismIcon).href;
                }
            }
        }
    }

    /* =========================
       4. SIN ICONO
    ========================= */

    return '';
}

/* =========================
   ¿ESTÁ ALGÚN LAUNCHER INSTALADO?
========================= */

ipcMain.handle('is-prism-installed', () => {

    return fs.existsSync(prismInfo.dir);
});

ipcMain.handle('get-detected-launcher-name', () => {

    return prismInfo.name;
});

/* =========================
   OBTENER INSTANCIAS
========================= */

ipcMain.handle(
    'get-instances',
    () => {

        try {

            const folders =
                fs.readdirSync(
                    instancesPath,
                    {
                        withFileTypes: true
                    }
                );

            const instances = [];

            for (
                const folder
                of folders
            ) {

                if (
                    !folder.isDirectory()
                ) {
                    continue;
                }

                const instancePath =
                    path.join(
                        instancesPath,
                        folder.name
                    );

                const configPath =
                    path.join(
                        instancePath,
                        'instance.cfg'
                    );

                let name =
                    folder.name;

                let minecraft =
                    'Desconocido';

                let loader =
                    'Vanilla';

                let java =
                    'Automática';

                let ram =
                    'Automática';

                /* =========================
                   LEER CONFIG
                ========================= */

                if (
                    fs.existsSync(
                        configPath
                    )
                ) {

                    const config =
                        fs.readFileSync(
                            configPath,
                            'utf8'
                        );

                    const getValue =
                        (key) => {

                            const match =
                                config.match(
                                    new RegExp(
                                        `^${key}=(.*)$`,
                                        'm'
                                    )
                                );

                            return match
                                ? match[1]
                                : null;
                        };

                    const configName =
                        getValue('name');

                    if (configName) {
                        name =
                            configName;
                    }

                    const maxRam =
                        getValue(
                            'MaxMemAlloc'
                        );

                    if (maxRam) {
                        ram =
                            `${maxRam} MB`;
                    }

                    const javaVersion =
                        getValue(
                            'JavaVersion'
                        );

                    if (javaVersion) {
                        java =
                            javaVersion;
                    }
                }

                /* =========================
                   LEER mmc-pack.json
                ========================= */

                const packPath =
                    path.join(
                        instancePath,
                        'mmc-pack.json'
                    );

                if (
                    fs.existsSync(
                        packPath
                    )
                ) {

                    try {

                        const pack =
                            JSON.parse(
                                fs.readFileSync(
                                    packPath,
                                    'utf8'
                                )
                            );

                        for (
                            const component
                            of pack.components || []
                        ) {

                            if (
                                component.uid ===
                                'net.minecraft'
                            ) {

                                minecraft =
                                    component.version ||
                                    minecraft;
                            }

                            if (
                                component.uid ===
                                'net.fabricmc.fabric-loader'
                            ) {

                                loader =
                                    `Fabric ${component.version}`;
                            }

                            if (
                                component.uid ===
                                'net.minecraftforge'
                            ) {

                                loader =
                                    `Forge ${component.version}`;
                            }

                            if (
                                component.uid ===
                                'org.quiltmc.quilt-loader'
                            ) {

                                loader =
                                    `Quilt ${component.version}`;
                            }
                        }

                    } catch (error) {

                        console.error(
                            'Error leyendo mmc-pack.json:',
                            error
                        );
                    }
                }

                /* =========================
                   BUSCAR ICONO
                ========================= */

                const icon =
                    findIcon(
                        instancePath
                    );

                /* =========================
                   GUARDAR INSTANCIA
                ========================= */

                instances.push({
                    id:
                        folder.name,

                    name:
                        name,

                    minecraft:
                        minecraft,

                    loader:
                        loader,

                    java:
                        java,

                    ram:
                        ram,

                    icon:
                        icon
                });
            }

            console.log(
                '📦 Instancias encontradas:',
                instances
            );

            return instances;

        } catch (error) {

            console.error(
                'Error leyendo instancias:',
                error
            );

            return [];
        }
    }
);

/* =========================
   OBTENER / GUARDAR CONFIGURACIÓN
========================= */

ipcMain.handle('get-settings', () => {

    return loadSettings();
});

ipcMain.on('save-settings', (event, settings) => {

    console.log('💾 Guardando configuración:', settings);

    saveSettingsToDisk(settings);
});

/* =========================
   OBTENER CUENTA
========================= */

ipcMain.handle('get-account', () => {

    return getPrismAccount();
});

ipcMain.handle('get-accounts', () => {

    return getAllAccounts();
});

ipcMain.on('set-active-account', (event, profileId) => {

    setActiveAccount(profileId);
});

/* =========================
   LANZAR INSTANCIA
========================= */

ipcMain.on(
    'launch-instance',
    (event, instanceId) => {

        console.log(
            '🚀 Lanzando instancia:',
            instanceId
        );

        try {

            // Aplicamos la RAM y resolución guardadas en
            // Configuración justo antes de lanzar el juego.
            const settings = loadSettings();

            applySettingsToInstance(
                instanceId,
                settings
            );

            launchPrismInstance(instanceId);

        } catch (error) {

            console.error(
                'Error al preparar el lanzamiento:',
                error
            );

            if (win && !win.isDestroyed()) {

                win.webContents.send(
                    'launch-error',
                    'Ocurrió un problema al preparar la ' +
                    'instancia para jugar.'
                );
            }
        }
    }
);

/* =========================
   ELECTRON
========================= */

app.whenReady()
    .then(createWindow);

app.on(
    'window-all-closed',
    () => {

        if (
            process.platform !==
            'darwin'
        ) {
            app.quit();
        }
    }
);