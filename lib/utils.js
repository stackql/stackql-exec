// import { readFileSync, existsSync } from "fs";

// Instead of this:
// import { readFileSync, existsSync } from "fs";

// Use this:
const { readFileSync, existsSync } = require("fs");


// const exec = require('child_process').exec;
// const { promisify } = require('util');
// const execAsync = promisify(exec);

// import { promisify } from 'node:util';
// const exec = promisify(require('node:child_process').exec);

const { execa } = require('execa');


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

  const [query, queryFilePath, auth, output = "json", vars, dataFilePath] = [
    process.env.QUERY,
    process.env.QUERY_FILE_PATH,
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

  if (checkEnvVarValid(auth)) {
    args.push(`--auth "${auth}"`);
  }

  if (checkEnvVarValid(vars)) {
    args.push(`--var "${vars}"`);
  }
  
  const stackQLExecutable = isWindows ? `${process.env.STACKQL_CLI_PATH}\\stackql-bin.exe` : "stackql";

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
 */
async function execStackQLQuery(core, command, isCommand, onFailure) {
  core.info(`Executing stackql query (isCommand: ${isCommand}): ${command}`);

  try {
      // Execute the command using execa
      const { stdout, stderr } = await execa.command(command, { shell: true });

      // Log the output from stdout and stderr
      if (stdout) {
          core.info(`STDOUT: ${stdout}`);
          if (!isCommand) {
              // If it is not a command, it is assumed to be a query where stdout is expected to contain results
              core.setOutput('stackql-query-results', stdout);
              core.info(`Query output: ${stdout}`);
          }
      } else {
          core.info('STDOUT: <empty>');
      }

      if (stderr) {
          core.info(`STDERR: ${stderr}`);
          if (isCommand) {
              // If it is a command, stderr might contain valid messages or results
              core.setOutput('stackql-command-output', stderr);
              core.info(`Command output: ${stderr}`);
          } else {
              // If it's not a command, stderr should contain only errors
              core.setOutput('stackql-query-error', stderr);
              if (onFailure === 'exit') {
                  core.setFailed(`StackQL query reported an error: ${stderr}`);
              } else {
                  core.info(`Continuing despite the error: ${stderr}`);
              }
          }
      } else {
          core.info('STDERR: <empty>');
      }

  } catch (error) {
      // Handle any errors that occur during the execution
      core.error(`Error executing StackQL command: ${error.message}`);
      if (onFailure === 'exit') {
          core.setFailed(`StackQL command failed with error: ${error.message}`);
      } else {
          core.info(`Continuing despite the error: ${error.message}`);
      }
  }
}
// async function execStackQLQuery(core, command, isCommand, onFailure) {
//   core.info(`executing stackql query (isCommand: ${isCommand}): ${command}`);

//   try {
      
//     const shell = require('shelljs');
//     const output = shell.exec('echo hello');
//     console.log(output.stdout);

//     shell.exec(command, {async: true}, (code, stdout, stderr) => {
//       console.log('Exit code:', code);
//       console.log('Program output:', stdout);
//       console.log('Program stderr:', stderr);
//     });
    
//       // const { stdout, stderr } = await exec(command);
//       // console.info(await exec(command));
//       // console.log('stdout:', stdout);
//       // console.error('stderr:', stderr);

//       // const { stdout, stderr } = await execAsync(command);

//       // if (onFailure !== 'exit' && onFailure !== 'continue') {
//       //     core.setFailed(`invalid onFailure value: ${onFailure}`);
//       //     return;
//       // }

//       // if (stdout) {
//       //     core.info(`STDOUT: ${stdout}`);
//       //     if (!isCommand) {
//       //         core.setOutput('stackql-query-results', stdout);
//       //         core.info(`stackql query output: ${stdout}`);
//       //     }
//       // } else {
//       //     core.info('STDOUT: <empty>');
//       // }

//       // if (stderr) {
//       //     core.info(`STDERR: ${stderr}`);
//       //     if (!isCommand) {
//       //         const outputMsg = `stackql query reported an error: ${stderr}`;
//       //         if (onFailure === 'exit') {
//       //             core.setFailed(outputMsg);
//       //         } else {
//       //             core.setOutput('stackql-query-error', stderr);                
//       //             core.info(outputMsg);
//       //         }
//       //     } else {
//       //         core.setOutput('stackql-command-output', stderr);
//       //         core.info(`command output: ${stderr}`);
//       //     }
//       // } else {
//       //     core.info('STDERR: <empty>');
//       // }

//   } catch (error) {
//       core.error(`error executing stackql command: ${error.message}`);
//       core.setFailed(`stackql command failed with error: ${error.message}`);
//   }
// }

// async function execStackQLQuery(core, command, isCommand) {
//   core.info(`executing stackql query (isCommand: ${isCommand}): ${command}`);

//   try {
//       const { stdout, stderr } = await execAsync(command);

//       if (stdout) {
//           // queries should return data to stdout
//           core.info(`STDOUT: ${stdout}`);
//           if (!isCommand) {
//               core.info(`query output: ${stdout}`);
//           }
//       } else {
//           core.info('STDOUT: <empty>');
//       }

//       if (stderr) {
//           // commands should return data to stderr
//           // stderr for queries indicates an error
//           core.info(`STDERR: ${stderr}`);
//           if (!isCommand) {
//               // we shouldnt have seen an error here...
//               core.setFailed(`stackql query reported an error: ${stderr}`);
//           } else {
//               // it was a command, return the message
//               core.info(`command output: ${stderr}`);
//           }
//       } else {
//           core.info('STDERR: <empty>');
//       }

//   } catch (error) {
//       core.error(`error executing StackQL command: ${error.message}`);
//       core.setFailed(`stackql command failed with error: ${error.message}`);
//   }
// }

export default {
  setupAuth,
  getStackqlCommand,
  execStackQLQuery,
};
