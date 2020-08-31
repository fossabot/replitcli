const { createCommand } = require("commander");

const logs = require("../logs");
const { listenForResize, raw } = require("../tty");
const { getClient } = require("../connect");
const { parseRepl } = require("../utils");

const main = async (repl) => {
  const client = await getClient(await parseRepl(repl));
  const chan = client.channel("shell");
  // util functions
  const sendKey = (k) => chan.send({ input: k });
  const quit = () => {
    client.close();
    process.exit();
  }

  // Listen for keys
  const { stdin } = process;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  // Pay attention to the currently typed command so if user types "exit", we quit
  let prompt = "";
  stdin.on("data", (key) => {
    // ctrl-c ( end of text )
    if (key === "\u0003") {
      console.log("^C");
      quit();
    }
    if (key == "\r") {
      if (prompt == "exit") {
        console.log(""); // blank line
        quit();
      }
      prompt = "";
    } else {
      prompt += key;
    }
    sendKey(key);
  });

  listenForResize((rows, cols) => chan.send({ resizeTerm: { rows, cols } }));
  chan.on("command", (data) => {
    if (data.output) {
      process.stdout.write(data.output);
    }
  });
  Array.from("echo hello\r").forEach((c) => sendKey(c));
};

module.exports = createCommand()
  .name("bash")
  .storeOptionsAsProperties(false)
  .passCommandToAction(false)
  .arguments("<repl>")
  .action(main);