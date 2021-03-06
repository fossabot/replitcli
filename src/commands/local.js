const { createCommand } = require("commander");
const chalk = require("chalk");

const logs = require("../logs");
const config = require("../config");
const { parseRepl } = require("../utils");

async function main(passedRepl) {
  // TODO: if passedRepl == "REMOVE", remove it
  const dir = process.cwd(); // TODO: option for directory, defaulting to cwd
  const replId = await parseRepl(passedRepl);
  let { localDirs } = config.getConfig();
  localDirs = { ...localDirs, [dir]: replId };
  config.update({ localDirs });
  console.log(
    chalk.green(
      `The repl for ${dir} has been set in config file ${config.getConfigFile()}`
    )
  );
}

module.exports = createCommand()
  .storeOptionsAsProperties(false)
  .passCommandToAction(false)
  .name("local")
  .arguments("<repl>")
  .action(main);
