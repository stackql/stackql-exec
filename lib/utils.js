
function setupAuth(core) {
  const fs = require("fs");
  let auth;
  const fileName = process.env.AUTH_FILE_PATH;
  const authStr = process.env.AUTH_STR;

  if (!checkEnvVarValid(fileName) && !checkEnvVarValid(authStr)) {
    core.setFailed("Either AUTH_FILE_PATH or AUTH_STR must be set.");
    return;
  }

  if (checkEnvVarValid(fileName)) {
    try {
      // Read the contents of the JSON file into a string
      auth = fs.readFileSync(fileName, "utf-8");
    } catch (error) {
      core.error(error);
      core.setFailed(`Cannot find auth file ${fileName}`);
      return;
    }
  }
  if (checkEnvVarValid(authStr)) {
    auth = authStr
  }

  core.info("Setting AUTH environment variable...");
  core.exportVariable("AUTH", auth);
}

async function getStackqlCommand(core) {
  
  if (!checkEnvVarValid(process.env.AUTH)) {
    core.setFailed("Cannot find AUTH environment variable when executing stackql");
    return;
  }
  let [query, queryFilePath, auth, output = "json"] = [
    process.env.QUERY,
    process.env.QUERY_FILE_PATH,
    process.env.AUTH,
    process.env.OUTPUT,
  ];



  if (!checkEnvVarValid(query) && !checkEnvVarValid(queryFilePath)) {
    core.setFailed("Either query or query_file_path need to be set");
    return;
  }

  let args = [];
  if (queryFilePath) {
    args = [
      "exec",
      "-i",
      queryFilePath,
      `--auth='${auth}'`,
      `--output='${output}'`
    ];
  }
  if (query) {
    args = ["exec", `"${query}"`, `--auth='${auth}'`, `--output='${output}'`];
  }
  try {
    core.exportVariable('STACKQL_COMMAND', `stackql ${args.join(" ")}`)
  } catch (error) {
    core.error(error);
    core.setFailed("Error when executing stackql");
  }
}

function setOutput(core, name, outputValue) {
  if(typeof outputValue !== 'string') {
    return;
  }
  core.setOutput(name, outputValue);
}

/**
 * Checking if environment variable is not empty or undefined
 * @param {*} variable
 */
const checkEnvVarValid = (variable) => {
  if (!variable || variable === "" || variable === "undefined") {
    return false;
  }
  return true;
};

module.exports = {
  setupAuth,
  getStackqlCommand,
  setOutput
};
