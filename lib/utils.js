const fs = require("fs");
const exec = require('child_process').exec;
const { promisify } = require('util');
const execAsync = promisify(exec);

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
    core.info("using default provider environment variable variables as AUTH_FILE_PATH or AUTH_STR are not set...");
    return;
  }

  if (checkEnvVarValid(fileName)) {
    try {
      auth = fs.readFileSync(fileName, "utf-8");
    } catch (error) {
      core.error(error);
      core.setFailed(`cannot find auth file ${fileName}`);
      return;
    }
  }

  if (checkEnvVarValid(authStr)) {
    auth = authStr;
  }

  core.info("setting AUTH environment variable...");
  core.exportVariable("AUTH", auth);
}

async function getStackqlCommand(core) {

  const [query, queryFilePath, auth, output = "json", vars, dataFilePath] = [
    process.env.QUERY,
    process.env.QUERY_FILE_PATH,
    process.env.AUTH,
    process.env.OUTPUT,
    process.env.VARS,
    process.env.DATA_FILE_PATH,
  ];

  // output supports: json, csv, table, text only, fail if not supported
  if (!["json", "csv", "table", "text"].includes(output)) {
    core.setFailed(`output format not supported: ${output}`);
    return;
  }

  if (!checkEnvVarValid(query) && !checkEnvVarValid(queryFilePath)) {
    core.setFailed("either query or query_file_path need to be set");
    return;
  }

  let args = [];

  if (query) {
    args = [
      "exec", 
      `"${query}"`, 
    ];
  } else if (queryFilePath) {
    if (!fs.existsSync(queryFilePath)) {
      core.setFailed(`query file path does not exist: ${queryFilePath}`);
      return;
    }
    args = [
      "exec",
      "-i",
      `"${queryFilePath}"`,
    ];
  }

  if (checkEnvVarValid(dataFilePath)) {
    if (!fs.existsSync(dataFilePath)) {
      core.setFailed(`data file path does not exist: ${dataFilePath}`);
      return;
    }
    args.push(`--iqldata "${dataFilePath}"`);
  }  

  args.push(`--output ${output}`);

  if (checkEnvVarValid(auth)) {
    args.push(`--auth "${auth}"`);
  }

  if (checkEnvVarValid(vars)) {
    args.push(`--var "${vars}"`);
  }

  let stackQLExecutable = "stackql";  // Default for non-Windows systems
  const isWindows = process.platform === "win32";
  core.info(`process.platform: ${process.platform}`);
  isWindows ? core.info("running on Windows") : null;
  if (isWindows) {
      (async () => {
          try {
              const { stdout } = await execAsync('dir "stackql.exe" /S /B /A-D C:\\');
              const lines = stdout.split('\n').filter(line => line.trim() !== '');
              if (lines.length > 0) {
                  stackQLExecutable = lines[0].trim(); // Take the first result
                  core.info(`found stackql.exe at: ${stackQLExecutable}`);
              } else {
                  core.error('stackql.exe not found on the filesystem.');
              }
          } catch (error) {
              core.error('error searching for stackql.exe:', error.message);
          }
      })();
  }

  try {
    const stackQLCommand = `${stackQLExecutable} ${args.join(" ")}`;
    core.exportVariable('STACKQL_COMMAND', `${stackQLCommand}`);
    core.info(`STACKQL_COMMAND: ${stackQLCommand}`);
  } catch (error) {
    core.error(error);
    core.setFailed("error when executing stackql");
  }
}

const checkEnvVarValid = (variable) => {
  return variable !== null && variable !== undefined && variable !== "";
};

/**
 * Executes a StackQL command and handles the output and errors based on the command type.
 * @param {Object} core - The core library from GitHub Actions for interacting with the action environment.
 * @param {string} command - The StackQL command to be executed.
 * @param {boolean} isCommand - Indicates if the operation is a command (true) or query (false).
 */
function execStackQLQuery(core, command, isCommand) {
    core.info(`executing StackQL query (isCommand : ${isCommand}): ${command}`);

    exec(command, (error, stdout, stderr) => {
        if (stdout) {
            core.debug(`STDOUT: ${stdout}`);
        }
        if (stderr) {
            core.debug(`STDERR: ${stderr}`);
        }

        if (error) {
            core.error(`error executing StackQL command: ${stderr}`);
            if (!isCommand) {
                core.setFailed(`stackql command failed with error: ${error.message}`);
            }
            return;
        }

        core.exportVariable('STACKQL_COMMAND_OUTPUT', stdout);

        if (isCommand) {
            core.info(`command output: ${stdout}`);
        } else {
            if (stderr) {
                core.setFailed(`stackql command reported an error: ${stderr}`);
                core.exportVariable('STACKQL_COMMAND_ERROR', stderr);
            } else {
                core.info(`query output: ${stdout}`);
            }
        }
    });
}

module.exports = {
  setupAuth,
  getStackqlCommand,
  execStackQLQuery,
};
