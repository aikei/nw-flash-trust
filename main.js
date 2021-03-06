'use strict';

var fs = require('fs');
var os = require('os');
var path = require('path');
var mkdirp = require('mkdirp');

function getFlashPlayerFolder(options) {
	switch (process.platform) {
		case 'win32':
			var version = os.release().split('.');
			if (version[0] === '5') {
				// xp
				return process.env.USERPROFILE + '\\Application Data\\Macromedia\\Flash Player';
			} else {
				// vista, 7, 8
				//AppData\Local\[Test App]\User Data\Default\Pepper Data\Shockwave Flash\WritableRoot
				return process.env.USERPROFILE + '\\AppData\\Local\\'+ options.appName +'\\User Data\\Default\\Pepper Data\\Shockwave Flash\\WritableRoot';
				//return process.env.USERPROFILE + '\\AppData\\Local\\'+ meta.name +'\\User Data\\Default\\Pepper Data\\Shockwave Flash\\System';
			}
		case 'darwin':
            // osx
            return process.env.HOME + `/Library/Application Support/${options.appName}/Default/Pepper Data/Shockwave Flash/WritableRoot`;
			//return process.env.HOME + '/Library/Preferences/Macromedia/Flash Player';
		case 'linux':
			return process.env.HOME + '/.macromedia/Flash_Player';
	}
	return null;
}

function getFlashPlayerConfigFolder(options) {
    if (options.customFolder) {
        return path.join(options.customFolder, '#Security', 'FlashPlayerTrust');
    }
    return path.join(getFlashPlayerFolder(options), '#Security', 'FlashPlayerTrust');
}

/**
 * 
 * @param {string} appName - appName from package.json
 * @param {object|string} options - options object or just custom folder (string)
 */
module.exports.initSync = function (appName, options) {
    
    var trusted = [];
    var cfgPath, cfgFolder;

    if (typeof options === "string") {
        options = { customFolder: options };
    }
    options = options || {};
    options.appName = appName;
    
    function save() {
        var data = trusted.join(os.EOL);
        fs.writeFileSync(cfgPath, data, { encoding: 'utf8' });
    }
    
    function add(path) {
        path = path || "";
        if (options.nwChromeExtensionsProtocol) {
            path = `chrome-extension://${chrome.runtime.id}/${path}`;
        }
        if (!isTrusted(path)) { 
            trusted.push(path);
        }
        save();
    }
    
    function remove(path) {
        var index = trusted.indexOf(path);
        if (index !== -1) {
            trusted.splice(index, 1);
        }
        save();
    }
    
    function isTrusted(path) {
        return trusted.indexOf(path) !== -1;
    }
    
    function list() {
        return trusted.concat();
    }
    
    function empty() {
        trusted = [];
        save();
    }
    
    // Init
    // ----------------------
    
    if (typeof appName !== 'string' || appName === '' || !appName.match(/^[a-zA-Z0-9-_\.]*$/)) {
        throw new Error('Provide valid appName.');
    }
    this.appName = appName;
    cfgFolder = getFlashPlayerConfigFolder(options);
    // Find out if Flash Config Folder exists
    if (!fs.existsSync(cfgFolder)) {
        // if this folder is not present then try to create it
        try {
            mkdirp.sync(cfgFolder);
        } catch(err) {
            throw new Error('Could not create Flash Player config folder.');
        }
    }
    
    cfgPath = path.join(cfgFolder, appName + '.cfg');
    if (fs.existsSync(cfgPath)) {
        // load and parse file if exists
        var data = fs.readFileSync(cfgPath, { encoding: 'utf8' });
        trusted = data.split(os.EOL);
        // on the end of file could be empty line which means nothing
        var emptyStringIndex = trusted.indexOf('');
        if (emptyStringIndex !== -1) {
            trusted.splice(emptyStringIndex, 1);
        }
    }
    
    // API
    // ----------------------
    
    return {
        add: add,
        list: list,
        isTrusted: isTrusted,
        remove: remove,
        empty: empty,
    };
};