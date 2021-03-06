const crosis = require("@replit/crosis");
const axios = require("axios");
global.WebSocket = require("ws");

/* Listens for event evt on ch
Promise is resolved when an event is received
falsey or <=0 timeout is the same as no timeout
If timeout expires without an event being received, listener is removed and promise is rejected
*/
const waitForEventTimeout = (ch, evt, timeout) => {
  return new Promise((resolve, reject) => {
    const listener = () => {
      clearTimeout(timeoutId);
      resolve();
    };

    let timeoutId;
    if (timeout && timeout > 0) {
      timeoutId = setTimeout(() => {
        ch.removeListener(evt, listener);
        reject("timed out");
      }, timeout);
    } else {
      timeoutId = null;
    }
    ch.once(evt, listener);
  });
};

class BetterCrosis {
  constructor(client) {
    if (!(client instanceof crosis.Client)) {
      return new BetterCrosis(new crosis.Client());
    }

    this._client = client;
    this._channels = new Map();
    this.connected = false;
  }

  async _connect(token) {
    await this._client.connect({ token });
  }

  async _getToken(replId, apiKey) {
    const res = await axios.post(
      `https://repl.it/api/v0/repls/${replId}/token`,
      { apiKey }
    );
    if (res.status != 200 || typeof res.data != "string") {
      throw new Error(`Invalid token response! Status ${res.status} text: `);
    }
    return res.data;
  }

  async connect(replId, apiKey) {
    // save token for later
    this._token = await this._getToken(replId, apiKey);

    // as of 2.1.0
    await this._connect(this._token);

    // as of 6.0.0-beta.0
    /*await this._client.connect({
      fetchToken: async () => this._token
    })*/

    this.connected = true;
  }

  channel(name) {
    if (this._channels.has(name)) {
      return this._channels.get(name);
    } else {
      const chan = this._client.openChannel({ service: name });
      this._channels.set(name, chan);
      return chan;
    }
  }

  // FILES

  async read(path) {
    let res = await this.channel("files").request({
      read: {
        path: path,
      },
    });
    if (res.error) {
      throw res.error;
    }
    //return new TextDecoder("utf-8").decode(res.file.content)
    return Buffer.from(res.file.content, "base64").toString();
  }

  async write(path, contents, encode = true) {
    if (encode) {
      contents = Buffer.from(contents).toString("base64");
    }
    return await this.channel("files").request({
      write: {
        path: path,
        content: contents,
      },
    });
  }

  async listdir(dir) {
    return (
      await this.channel("files").request({
        readdir: {
          path: dir,
        },
      })
    ).files.files;
  }

  async list(dir, exclude = [], prefix = "") {
    console.log("listing", dir);
    let flist = [],
      dirlist = [],
      toProcess = await listdir(dir);
    for (var i = 0; i < toProcess.length; i++) {
      file = toProcess[i];
      console.log(file);
      if (!file.path || exclude.includes(file.path)) {
        console.log("skipping ", file.path);
      } else if (file.type && (file.type == 1 || file.type == "DIRECTORY")) {
        newpath = prefix + file.path + "/";
        dirlist.push(newpath)[(newfiles, newdirs)] = await list(
          newpath,
          exclude,
          newpath
        );
        flist = flist.concat(newfiles);
        dirlist = dirlist.concat(newdirs);
      } else {
        flist.push(prefix + file.path);
      }
    }
    return [flist, dirlist];
  }

  // INTERP2

  run(timeout = null) {
    const ch = this.channel("shellrun2");
    ch.send({ runMain: {} });
    return waitForEventTimeout(ch, "command", timeout);
  }

  stop(timeout = null) {
    const ch = this.channel("interp2");
    ch.send({ clear: {} });
    return waitForEventTimeout(ch, "command", timeout);
  }

  // PACKAGER

  install(options = {}) {
    return new Promise((resolve, reject) => {
      const ch = this.channel("packager3");
      const log = typeof options.log == "function" ? options.log : () => {};
      let timedOut = false;
      let timer;

      if (options.timeout) {
        timer = setTimeout(() => {
          timedOut = true;
          reject();
        }, options.timeout);
      } else {
        timer = null;
      }

      ch.on("command", (msg) => log(msg));

      ch.request({ packageInstall: {} }).then(() => {
        if (!timedOut) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
  }

  // MISC

  close() {
    this._client.close();
  }
}

module.exports = BetterCrosis;
