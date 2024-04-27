const { readFileSync, existsSync } = require('fs');
const { promisify } = require('util');
const execAsync = promisify(require('child_process').exec);

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
      auth = readFileSync(fileName, "utf-8");
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

  const [query, queryFilePath, dry_run, auth, output = "json", vars, dataFilePath] = [
    process.env.QUERY,
    process.env.QUERY_FILE_PATH,
    process.env.DRY_RUN,
    process.env.AUTH,
    process.env.OUTPUT,
    process.env.VARS,
    process.env.DATA_FILE_PATH,
  ];

  const isWindows = process.platform === "win32";

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
    let formattedQuery = query;
    if (isWindows) {
        // Replace newlines with a space for Windows command line compatibility
        formattedQuery = formattedQuery.replace(/\n/g, " ");
    }
    args = [
        "exec",
        `"${formattedQuery}"`,
    ];    
  } else if (queryFilePath) {
    if (!existsSync(queryFilePath)) {
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
    if (!existsSync(dataFilePath)) {
      core.setFailed(`data file path does not exist: ${dataFilePath}`);
      return;
    }
    args.push(`--iqldata "${dataFilePath}"`);
  }  

  args.push(`--output ${output}`);

  if (checkEnvVarValid(dry_run)) {
    if(dry_run === "true"){
      args.push(`--dryrun`);
    }
  }
  
  if (checkEnvVarValid(auth)) {
    args.push(`--auth "${auth}"`);
  }

  if (checkEnvVarValid(vars)) {
    args.push(`--var "${vars}"`);
  }
  
  const stackQLExecutable = isWindows ? `${process.env.STACKQL_CLI_PATH}\\stackql-bin.exe` : `stackql`;

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
 * @param {string} onFailure - The action to take if the command fails. Either 'exit' or 'continue'.
 * @param {boolean} dryRun - Indicates if the operation is a dry run only.
 */
async function execStackQLQuery(core, command, isCommand, onFailure, dryRun) {

  if (dryRun) {
    // dry run
    core.info(`dry-run enabled, skipping stackql query execution`);
  } else {
    // real query
    if (onFailure !== 'exit' && onFailure !== 'continue') {
      core.setFailed(`onFailure must be 'exit' or 'continue'. Received: ${onFailure}`);
      return;
    }
    core.info(`executing stackql query (isCommand: ${isCommand}): ${command}`);
  }

  try {

        let { stdout, stderr } = await execAsync(command);

        if (process.platform != "win32"){
            // crazy required hack for linux and mac runners....
            for (const line of stdout.split('\n')) {
              const decodedLine = decodeURIComponent(line.replace(/%0A/g, '\n')).trim();
              if (decodedLine.startsWith('::debug::stdout:')) {
                  stdout = decodedLine.substring('::debug::stdout:'.length).trim();
              };
              if (decodedLine.startsWith('::debug::stderr:')) {
                  stderr = decodedLine.substring('::debug::stderr:'.length).trim();
              };	
          }
        }

        // dry-run should return stderr only
        // if (dryRun) {
        //   if (stderr) {
        //     core.setOutput('stackql-query-results', stderr);
        //     core.info(`dry-run output:\n${stderr}`);
        //   } else {
        //     core.setFailed(`stackql query failed to render`);
        //   }
        //   return;
        // }

        if (stdout) {
          // queries should return data to stdout
          core.debug(`STDOUT: ${stdout}`);
          if (!isCommand) {
            core.setOutput('stackql-query-results', stdout);
            if(dryRun){
              const json = JSON.parse(stdout);
              core.info(`dry-run query:\n${json[0].query}`);
              console.log(json[0].query);
            } else {
              core.info(`query output:\n${stdout}`);
            } 
          }
        } else {
          core.debug('STDOUT: <empty>');
        }

      if (stderr) {
          // commands should return data to stderr
          // stderr for queries indicates an error
          core.debug(`STDERR: ${stderr}`);
          if (!isCommand) {
              // we shouldnt have seen an error here...
              core.setOutput('stackql-query-error', stderr);
              if(onFailure){
                core.setFailed(`stackql query reported an error: ${stderr}`);
              } else {
                core.warning(`stackql query reported an error: ${stderr}`);
              }
          } else {
              // it was a command, return the message
              core.setOutput('stackql-command-output', stderr);
              core.info(`command output:\n${stderr}`);
          }
      } else {
          core.debug('STDERR: <empty>');
      }

  } catch (error) {
      core.error(`error executing StackQL command: ${error.message}`);
      core.setFailed(`stackql command failed with error: ${error.message}`);
  }
}

module.exports = {
  setupAuth,
  getStackqlCommand,
  execStackQLQuery
};