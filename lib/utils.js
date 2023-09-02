const fs = require("fs");

/**
 * Sets up authentication by reading from either a file or a string.
 * The AUTH environment variable is set with the authentication details.
 * @param {*} core - GitHub core library for setting outputs and environment variables.
 */
function setupAuth(core) {
  let auth;
  const fileName = process.env.AUTH_FILE_PATH;
  const authStr = process.env.AUTH_STR;

  // Check if any authentication method is provided
  if (!checkEnvVarValid(fileName) && !checkEnvVarValid(authStr)) {
    core.info("Neither AUTH_FILE_PATH nor AUTH_STR is set. Proceeding using default provider environment variable names.");
    return;
  }

  if (checkEnvVarValid(fileName)) {
    try {
      auth = fs.readFileSync(fileName, "utf-8");
    } catch (error) {
      core.error(error);
      core.setFailed(`Cannot find auth file ${fileName}`);
      return;
    }
  }

  if (checkEnvVarValid(authStr)) {
    auth = authStr;
  }

  core.info("Setting AUTH environment variable...");
  core.exportVariable("AUTH", auth);
}

async function getStackqlCommand(core) {
  if (!checkEnvVarValid(process.env.AUTH)) {
    core.info("Cannot find AUTH environment variable when executing stackql. Proceeding using default provider environment variable names.");
  }

  const [query, queryFilePath, auth, output = "json", vars] = [
    process.env.QUERY,
    process.env.QUERY_FILE_PATH,
    process.env.AUTH,
    process.env.OUTPUT,
    process.env.VARS
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
      `--output='${output}'`,
    ];
  }

  if (query) {
    args = [
      "exec", 
      `"${query}"`, 
      `--output='${output}'`, 
    ];
  }

  if (checkEnvVarValid(vars)) {
    args.push(`--var='${vars}'`);
  }

  if (checkEnvVarValid(auth)) {
    args.push(`--auth='${auth}'`);
  }  

  try {
    core.exportVariable('STACKQL_COMMAND', `stackql ${args.join(" ")}`);
  } catch (error) {
    core.error(error);
    core.setFailed("Error when executing stackql");
  }
}

const checkEnvVarValid = (variable) => {
  return variable !== null && variable !== undefined && variable !== "";
};

module.exports = {
  setupAuth,
  getStackqlCommand,
};
