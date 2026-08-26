const {
    contextBridge,
    ipcRenderer
} = require('electron');


console.log(
    'PRELOAD CARGADO'
);


contextBridge.exposeInMainWorld(
    'electronAPI',
    {

        minimize:
            () =>
                ipcRenderer.send(
                    'window-minimize'
                ),


        maximize:
            () =>
                ipcRenderer.send(
                    'window-maximize'
                ),


        close:
            () =>
                ipcRenderer.send(
                    'window-close'
                ),


        launchInstance:
            (instanceId) =>
                ipcRenderer.send(
                    'launch-instance',
                    instanceId
                ),


        getInstances:
            () =>
                ipcRenderer.invoke(
                    'get-instances'
                ),


        getSelectedInstance:
            () =>
                ipcRenderer.invoke(
                    'get-selected-instance'
                ),


        saveSelectedInstance:
            (instanceId) =>
                ipcRenderer.send(
                    'save-selected-instance',
                    instanceId
                ),


        getSettings:
            () =>
                ipcRenderer.invoke(
                    'get-settings'
                ),


        saveSettings:
            (settings) =>
                ipcRenderer.send(
                    'save-settings',
                    settings
                ),


        getAccount:
            () =>
                ipcRenderer.invoke(
                    'get-account'
                ),


        getAccounts:
            () =>
                ipcRenderer.invoke(
                    'get-accounts'
                ),


        setActiveAccount:
            (profileId) =>
                ipcRenderer.send(
                    'set-active-account',
                    profileId
                ),


        isPrismInstalled:
            () =>
                ipcRenderer.invoke(
                    'is-prism-installed'
                ),


        getDetectedLauncherName:
            () =>
                ipcRenderer.invoke(
                    'get-detected-launcher-name'
                ),


        getMinecraftVersions:
            () =>
                ipcRenderer.invoke(
                    'get-minecraft-versions'
                ),


        createInstance:
            (data) =>
                ipcRenderer.invoke(
                    'create-instance',
                    data
                ),


        searchMods:
            (query) =>
                ipcRenderer.invoke(
                    'search-mods',
                    query
                ),


        installMod:
            (data) =>
                ipcRenderer.invoke(
                    'install-mod',
                    data
                ),


        onLaunchError:
            (callback) =>
                ipcRenderer.on(
                    'launch-error',
                    (event, message) => callback(message)
                )

    }
);