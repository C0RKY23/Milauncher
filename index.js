const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const https = require('https');
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
   LISTA DE VERSIONES DE MINECRAFT
   (directo de la API pública de Mojang)
========================= */

function fetchMinecraftVersions() {

    return new Promise((resolve, reject) => {

        https.get(
            'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json',
            (response) => {

                let data = '';

                response.on('data', chunk => {
                    data += chunk;
                });

                response.on('end', () => {

                    try {

                        const parsed = JSON.parse(data);

                        // Por ahora solo versiones "release"
                        // (sin snapshots/betas), para mantenerlo
                        // simple y confiable.
                        const versions = parsed.versions
                            .filter(v => v.type === 'release')
                            .map(v => v.id);

                        resolve(versions);

                    } catch (error) {
                        reject(error);
                    }
                });
            }
        ).on('error', reject);
    });
}

ipcMain.handle('get-minecraft-versions', async () => {

    try {

        return await fetchMinecraftVersions();

    } catch (error) {

        console.error(
            'Error obteniendo versiones de Minecraft:',
            error
        );

        return [];
    }
});

/* =========================
   INFO DE MOD LOADER DE UNA INSTANCIA
   (para saber qué mods son compatibles)
========================= */

function getInstanceModInfo(instanceId) {

    const packPath = path.join(
        instancesPath,
        instanceId,
        'mmc-pack.json'
    );

    const info = {
        minecraftVersion: null,
        loader: null // 'fabric' | 'forge' | 'quilt' | null
    };

    if (!fs.existsSync(packPath)) {
        return info;
    }

    try {

        const pack = JSON.parse(
            fs.readFileSync(packPath, 'utf8')
        );

        for (const component of pack.components || []) {

            if (component.uid === 'net.minecraft') {
                info.minecraftVersion = component.version;
            }

            if (component.uid === 'net.fabricmc.fabric-loader') {
                info.loader = 'fabric';
            }

            if (component.uid === 'net.minecraftforge') {
                info.loader = 'forge';
            }

            if (component.uid === 'org.quiltmc.quilt-loader') {
                info.loader = 'quilt';
            }
        }

    } catch (error) {

        console.error(
            'Error leyendo mmc-pack.json de la instancia:',
            error
        );
    }

    return info;
}

/* =========================
   DESCARGAR UN ARCHIVO
   (usado para bajar el .jar del mod)
========================= */

function downloadFile(url, destPath, redirectsLeft = 3) {

    return new Promise((resolve, reject) => {

        https.get(url, (response) => {

            // Modrinth a veces redirige a su CDN
            if (
                response.statusCode >= 300 &&
                response.statusCode < 400 &&
                response.headers.location &&
                redirectsLeft > 0
            ) {

                downloadFile(
                    response.headers.location,
                    destPath,
                    redirectsLeft - 1
                ).then(resolve).catch(reject);

                return;
            }

            if (response.statusCode !== 200) {

                reject(
                    new Error(
                        `Descarga falló (código ${response.statusCode})`
                    )
                );

                return;
            }

            const fileStream = fs.createWriteStream(destPath);

            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close(resolve);
            });

            fileStream.on('error', reject);

        }).on('error', reject);
    });
}

/* =========================
   BUSCAR MODS EN MODRINTH
========================= */

function httpsGetJson(url) {

    return new Promise((resolve, reject) => {

        https.get(
            url,
            { headers: { 'User-Agent': 'CRK-Launcher/1.0' } },
            (response) => {

                let data = '';

                response.on('data', chunk => {
                    data += chunk;
                });

                response.on('end', () => {

                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(error);
                    }
                });
            }
        ).on('error', reject);
    });
}

ipcMain.handle('search-mods', async (event, query) => {

    try {

        const url =
            'https://api.modrinth.com/v2/search' +
            `?query=${encodeURIComponent(query)}` +
            '&facets=[["project_type:mod"]]' +
            '&limit=20';

        const data = await httpsGetJson(url);

        return (data.hits || []).map(hit => ({
            id: hit.project_id,
            title: hit.title,
            description: hit.description,
            iconUrl: hit.icon_url,
            downloads: hit.downloads
        }));

    } catch (error) {

        console.error('Error buscando mods:', error);
        return [];
    }
});

/* =========================
   INSTALAR UN MOD EN UNA INSTANCIA
========================= */

ipcMain.handle(
    'install-mod',
    async (event, { instanceId, projectId }) => {

        try {

            const { minecraftVersion, loader } =
                getInstanceModInfo(instanceId);

            if (!loader) {

                return {
                    success: false,
                    error:
                        'Esta instancia no tiene un mod loader ' +
                        '(como Fabric) instalado.'
                };
            }

            const versionsUrl =
                `https://api.modrinth.com/v2/project/${projectId}/version` +
                `?loaders=["${loader}"]` +
                `&game_versions=["${minecraftVersion}"]`;

            const versions = await httpsGetJson(versionsUrl);

            if (!versions || versions.length === 0) {

                return {
                    success: false,
                    error:
                        'No hay una versión de este mod ' +
                        `compatible con ${loader} ` +
                        `${minecraftVersion}.`
                };
            }

            const chosenVersion = versions[0];

            const file =
                chosenVersion.files.find(f => f.primary) ||
                chosenVersion.files[0];

            if (!file) {

                return {
                    success: false,
                    error: 'Este mod no tiene archivos descargables.'
                };
            }

            const modsDir = path.join(
                instancesPath,
                instanceId,
                'minecraft',
                'mods'
            );

            fs.mkdirSync(modsDir, { recursive: true });

            const destPath = path.join(
                modsDir,
                file.filename
            );

            await downloadFile(file.url, destPath);

            console.log(
                '✅ Mod instalado:',
                file.filename,
                'en',
                instanceId
            );

            return {
                success: true,
                fileName: file.filename
            };

        } catch (error) {

            console.error('Error instalando mod:', error);

            return {
                success: false,
                error: 'Ocurrió un problema al instalar el mod.'
            };
        }
    }
);

/* =========================
   RENOMBRAR / BORRAR INSTANCIA
========================= */

ipcMain.handle(
    'rename-instance',
    (event, { instanceId, newName }) => {

        try {

            const configPath = path.join(
                instancesPath,
                instanceId,
                'instance.cfg'
            );

            if (!fs.existsSync(configPath)) {

                return {
                    success: false,
                    error: 'No se encontró la instancia.'
                };
            }

            const cleanName =
                newName.trim() || 'Sin nombre';

            let lines = fs
                .readFileSync(configPath, 'utf8')
                .split('\n');

            let found = false;

            lines = lines.map(line => {

                if (line.startsWith('name=')) {
                    found = true;
                    return `name=${cleanName}`;
                }

                return line;
            });

            if (!found) {
                lines.push(`name=${cleanName}`);
            }

            fs.writeFileSync(
                configPath,
                lines.filter(Boolean).join('\n') + '\n',
                'utf8'
            );

            return { success: true };

        } catch (error) {

            console.error('Error renombrando instancia:', error);

            return {
                success: false,
                error: 'No se pudo renombrar la instancia.'
            };
        }
    }
);

ipcMain.handle(
    'delete-instance',
    (event, instanceId) => {

        try {

            // Seguridad: el id nunca debe poder "salirse"
            // de la carpeta de instancias.
            if (
                !instanceId ||
                instanceId.includes('/') ||
                instanceId.includes('\\') ||
                instanceId.includes('..')
            ) {

                return {
                    success: false,
                    error: 'Instancia no válida.'
                };
            }

            const instanceDir = path.join(
                instancesPath,
                instanceId
            );

            if (!fs.existsSync(instanceDir)) {

                return {
                    success: false,
                    error: 'La instancia ya no existe.'
                };
            }

            fs.rmSync(instanceDir, {
                recursive: true,
                force: true
            });

            return { success: true };

        } catch (error) {

            console.error('Error borrando instancia:', error);

            return {
                success: false,
                error: 'No se pudo borrar la instancia.'
            };
        }
    }
);

/* =========================
   VER / BORRAR MODS INSTALADOS
========================= */

ipcMain.handle(
    'get-installed-mods',
    (event, instanceId) => {

        try {

            const modsDir = path.join(
                instancesPath,
                instanceId,
                'minecraft',
                'mods'
            );

            if (!fs.existsSync(modsDir)) {
                return [];
            }

            return fs.readdirSync(modsDir)
                .filter(file => file.endsWith('.jar'))
                .map(file => {

                    const stats = fs.statSync(
                        path.join(modsDir, file)
                    );

                    return {
                        fileName: file,
                        sizeMB: (
                            stats.size / (1024 * 1024)
                        ).toFixed(1)
                    };
                });

        } catch (error) {

            console.error(
                'Error leyendo mods instalados:',
                error
            );

            return [];
        }
    }
);

ipcMain.handle(
    'delete-mod',
    (event, { instanceId, fileName }) => {

        try {

            // Seguridad: nunca dejar que el nombre del
            // archivo "se salga" de la carpeta de mods.
            if (
                !fileName ||
                fileName.includes('/') ||
                fileName.includes('\\') ||
                fileName.includes('..')
            ) {

                return {
                    success: false,
                    error: 'Nombre de archivo no válido.'
                };
            }

            const modPath = path.join(
                instancesPath,
                instanceId,
                'minecraft',
                'mods',
                fileName
            );

            if (!fs.existsSync(modPath)) {

                return {
                    success: false,
                    error: 'El mod ya no existe.'
                };
            }

            fs.unlinkSync(modPath);

            return { success: true };

        } catch (error) {

            console.error('Error borrando mod:', error);

            return {
                success: false,
                error: 'No se pudo borrar el mod.'
            };
        }
    }
);

/* =========================
   FORGE: versión recomendada + LWJGL requerido
========================= */

// Pregunta a Forge cuál es su versión recomendada (o la más
// reciente si no hay "recomendada") para una versión de MC.
async function fetchForgeVersion(mcVersion) {

    const promos = await httpsGetJson(
        'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json'
    );

    const entries = promos.promos || {};

    return (
        entries[`${mcVersion}-recommended`] ||
        entries[`${mcVersion}-latest`] ||
        null
    );
}

// Lee el version.json oficial de Mojang para esa versión y
// revisa qué LWJGL usa. Minecraft 1.13+ usa LWJGL 3; las
// versiones más viejas usan LWJGL 2, que no soportamos aquí
// (Forge en esas versiones necesita su instalador clásico,
// no este método declarativo).
async function fetchLwjgl3VersionForMinecraft(mcVersion) {

    const manifest = await httpsGetJson(
        'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
    );

    const entry = (manifest.versions || []).find(
        v => v.id === mcVersion
    );

    if (!entry) {
        return null;
    }

    const versionData = await httpsGetJson(entry.url);

    const lwjglLib = (versionData.libraries || []).find(
        lib => lib.name &&
            lib.name.startsWith('org.lwjgl:lwjgl:')
    );

    if (!lwjglLib) {
        return null; // versión vieja, usa LWJGL 2
    }

    return lwjglLib.name.split(':').pop();
}

/* =========================
   CREAR INSTANCIA NUEVA
========================= */

// Le pregunta a la API pública de Fabric cuál es la versión
// de Fabric Loader compatible con la versión de Minecraft
// elegida. Devuelve null si no hay ninguna (versión muy
// vieja, por ejemplo).
function fetchFabricLoaderVersion(mcVersion) {

    return new Promise((resolve, reject) => {

        https.get(
            `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`,
            (response) => {

                let data = '';

                response.on('data', chunk => {
                    data += chunk;
                });

                response.on('end', () => {

                    try {

                        const parsed = JSON.parse(data);

                        if (!parsed || parsed.length === 0) {
                            resolve(null);
                            return;
                        }

                        // Preferimos la primera versión marcada
                        // como estable; si no hay, usamos la
                        // primera de la lista (la más reciente).
                        const stable =
                            parsed.find(
                                entry => entry.loader.stable
                            );

                        const chosen = stable || parsed[0];

                        resolve(chosen.loader.version);

                    } catch (error) {
                        reject(error);
                    }
                });
            }
        ).on('error', reject);
    });
}

// Convierte el nombre que escribió el usuario en un nombre
// de carpeta seguro (sin caracteres raros).
function sanitizeFolderName(name) {

    const cleaned = name
        .trim()
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, ' ');

    return cleaned || 'Nueva Instancia';
}

// Si ya existe una carpeta con ese nombre, le agrega un
// número al final para no pisar una instancia existente.
function getAvailableInstanceFolder(baseName) {

    let folderName = baseName;
    let counter = 2;

    while (
        fs.existsSync(
            path.join(instancesPath, folderName)
        )
    ) {

        folderName = `${baseName} (${counter})`;
        counter++;
    }

    return folderName;
}

ipcMain.handle(
    'create-instance',
    async (event, { name, version, loader }) => {

        try {

            // Si eligieron Fabric, primero confirmamos que
            // existe una versión compatible ANTES de crear
            // ninguna carpeta (evita dejar una instancia a
            // medias si la versión no es compatible).
            let fabricLoaderVersion = null;

            if (loader === 'fabric') {

                fabricLoaderVersion =
                    await fetchFabricLoaderVersion(version);

                if (!fabricLoaderVersion) {

                    return {
                        success: false,
                        error:
                            'Fabric no tiene una versión ' +
                            'compatible con Minecraft ' +
                            version + '.'
                    };
                }
            }


            // Lo mismo para Forge — además necesitamos saber
            // qué LWJGL usa esa versión de Minecraft. Si no
            // usa LWJGL 3, es una versión muy vieja y Forge
            // ahí necesita su instalador clásico (no lo
            // soportamos desde aquí todavía).
            let forgeVersion = null;
            let lwjglVersion = null;

            if (loader === 'forge') {

                lwjglVersion =
                    await fetchLwjgl3VersionForMinecraft(version);

                if (!lwjglVersion) {

                    return {
                        success: false,
                        error:
                            'Forge automático solo está ' +
                            'disponible para Minecraft 1.13 ' +
                            'o más reciente.'
                    };
                }

                forgeVersion =
                    await fetchForgeVersion(version);

                if (!forgeVersion) {

                    return {
                        success: false,
                        error:
                            'No se encontró una versión de ' +
                            'Forge para Minecraft ' + version +
                            ' (o el servidor de Forge no ' +
                            'respondió).'
                    };
                }
            }


            const folderName = getAvailableInstanceFolder(
                sanitizeFolderName(name)
            );

            const instanceDir = path.join(
                instancesPath,
                folderName
            );

            fs.mkdirSync(instanceDir, { recursive: true });

            fs.mkdirSync(
                path.join(instanceDir, 'minecraft'),
                { recursive: true }
            );


            // instance.cfg: metadatos que Prism necesita
            // para reconocer la instancia.
            const instanceCfg = [
                '[General]',
                'InstanceType=OneSix',
                `name=${folderName}`,
                'iconKey=default'
            ].join('\n') + '\n';

            fs.writeFileSync(
                path.join(instanceDir, 'instance.cfg'),
                instanceCfg,
                'utf8'
            );


            // mmc-pack.json: le dice a Prism qué versión de
            // Minecraft (y de Fabric, si aplica) debe
            // descargar la primera vez que se abra la
            // instancia.
            const components = [
                {
                    uid: 'net.minecraft',
                    version: version,
                    important: true
                }
            ];

            if (loader === 'fabric') {

                components.push({
                    uid: 'net.fabricmc.intermediary',
                    version: version
                });

                components.push({
                    uid: 'net.fabricmc.fabric-loader',
                    version: fabricLoaderVersion
                });
            }

            if (loader === 'forge') {

                components.push({
                    uid: 'org.lwjgl3',
                    version: lwjglVersion,
                    dependencyOnly: true,
                    cachedVolatile: true
                });

                components.push({
                    uid: 'net.minecraftforge',
                    version: forgeVersion
                });
            }

            const mmcPack = {
                components: components,
                formatVersion: 1
            };

            fs.writeFileSync(
                path.join(instanceDir, 'mmc-pack.json'),
                JSON.stringify(mmcPack, null, 4),
                'utf8'
            );


            console.log(
                '✅ Instancia creada:',
                folderName,
                '-',
                version,
                loader === 'fabric'
                    ? `(Fabric ${fabricLoaderVersion})`
                    : loader === 'forge'
                        ? `(Forge ${forgeVersion})`
                        : '(Vanilla)'
            );

            return { success: true, folderName };

        } catch (error) {

            console.error(
                'Error creando instancia:',
                error
            );

            return {
                success: false,
                error: error.message
            };
        }
    }
);

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