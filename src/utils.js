const inquirer = require("inquirer");

const { performDataRequest } = require("./connect");
const config = require("./config");
const { findLocalDir } = require("./config");

/**
 * @description A wrapper around inquirer.prompt which handles a TTY error by exiting
 * @param args: Arguments to be passed to inquirer.prompt
 */
module.exports.handledPrompt = async (...args) => {
  try {
    return await inquirer.prompt(...args);
  } catch (e) {
    if (e.isTtyError) {
      module.exports.fatal("Error: Cannot run prompt without a tty present");
    } else {
      // throw any other unrecognized errors
      throw e;
    }
  }
};

/**
 * @description A heuristic to find invalid crosis keys
 * @param key: The key to check
 * @returns bool Whether the checks passed
 */
module.exports.isKey = (key) => {
  if (!key) return false;
  const parts = key.split(":");
  return parts.length == 2 && parts.every((p) => p.length > 5);
};

module.exports.isReplId = (replId) => replId && replId.split("-").length == 5;

const badRepl = () =>
  logs.fatal(`That doesn't look like a valid repl.
Please use the repl URL or the form @user/replname
or a repl ID (a 5 part, - joined UUID as returned by 
https://repl.it/data/repls/@user/repl)`);

/**
 * @description Parse a user provided repl id
 * @param repl A user provided repl slug or id
 * @returns the repl id for the repl
 */
module.exports.parseRepl = async (repl) => {
  // If its a repl id, we're already done
  if (module.exports.isReplId(repl)) return repl;

  // Check if user included full URL using a simple regex
  const urlRegex = /http(?:s?):\/\/repl\.it\/(.+)/g;
  const match = urlRegex.exec(repl);
  if (match) repl = match[1]; // the first group

  // Split user/author
  const parts = repl.split("/");
  if (parts.length != 2) return badRepl();
  let [user, slug] = parts;

  // Strip out @ from beginning of user
  if (user[0] == "@") user = user.slice(1);
  // user might include the full repl URL with #filename, strip that out
  slug = slug.split("#")[0];

  const { id } = await performDataRequest(user, slug);
  if (!id) {
    logs.fatal("Invalid data received from repl data request: missing repl id");
  }
  return id;
};

module.exports.getRepl = async (passedRepl) => {
  return await module.exports.parseRepl(passedRepl || (await findLocalDir()));
};
