const fs = require('fs');
const childProcess = require('child_process');
const { promisify } = require('util');

const platforms = ['linux', 'darwin', 'win32'].flatMap(platform =>
  ['x64', 'arm64'].map(arch => [platform, arch]));
const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
const originalArch = Object.getOwnPropertyDescriptor(process, 'arch');
const originalEnv = process.env;

describe.each(platforms)('%s/%s', (platform, arch) => {
  let core;
  let utils;
  let execute;
  const executable = platform === 'win32' ? 'stackql.exe' : 'stackql';

  beforeEach(() => {
    process.env = { ...originalEnv };
    for (const name of ['QUERY', 'QUERY_FILE_PATH', 'DATA_FILE_PATH', 'DRY_RUN', 'AUTH', 'VARS', 'STACKQL_CLI_PATH']) {
      delete process.env[name];
    }
    process.env.OUTPUT = 'json';
    Object.defineProperty(process, 'platform', { value: platform });
    Object.defineProperty(process, 'arch', { value: arch });
    core = Object.fromEntries(['debug', 'info', 'error', 'warning', 'setFailed', 'setOutput'].map(name => [name, jest.fn()]));
    execute = jest.fn();
    jest.spyOn(childProcess, 'exec')[promisify.custom] = execute;
    jest.resetModules();
    utils = require('../utils');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(process, 'platform', originalPlatform);
    Object.defineProperty(process, 'arch', originalArch);
    process.env = originalEnv;
    jest.resetModules();
  });

  it.each(['json', 'csv', 'table', 'text'])('builds a multiline %s query for the platform shell', async format => {
    process.env.QUERY = "SELECT\n  'stackql smoke' AS result;";
    process.env.OUTPUT = format;
    await utils.getStackqlCommand(core);
    const query = platform === 'win32' ? "SELECT   'stackql smoke' AS result;" : process.env.QUERY;
    expect(core.setOutput).toHaveBeenCalledWith('stackql_command', `${executable} exec "${query}" --output ${format}`);
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('quotes query and data paths and includes variables and dry-run flags', async () => {
    process.env.QUERY_FILE_PATH = 'queries with spaces/query.iql';
    process.env.DATA_FILE_PATH = 'queries with spaces/data.jsonnet';
    process.env.VARS = 'VALUE=stackql smoke';
    process.env.DRY_RUN = 'true';
    jest.spyOn(fs, 'existsSync').mockImplementation(file =>
      [process.env.QUERY_FILE_PATH, process.env.DATA_FILE_PATH].includes(file));
    jest.resetModules();
    await require('../utils').getStackqlCommand(core);
    expect(core.setOutput).toHaveBeenCalledWith('stackql_command',
      `${executable} exec -i "queries with spaces/query.iql" --iqldata "queries with spaces/data.jsonnet" --output json --dryrun --var "VALUE=stackql smoke"`);
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  if (platform !== 'win32') {
    it('uses PATH for both plain and wrapped Unix installations', async () => {
      process.env.STACKQL_CLI_PATH = '/tmp/StackQL Tools';
      process.env.QUERY = 'SELECT 1';
      await utils.getStackqlCommand(core);
      expect(core.setOutput).toHaveBeenCalledWith('stackql_command', 'stackql exec "SELECT 1" --output json');
      expect(core.setFailed).not.toHaveBeenCalled();
    });
  }

  it.each(['json', 'csv', 'table', 'text'])('preserves raw %s query output', async format => {
    const outputs = {
      json: '[{"result":"stackql smoke"}]',
      csv: 'result\nstackql smoke\n',
      table: '| result |\n| stackql smoke |\n',
      text: 'result\nstackql smoke\n',
    };
    execute.mockResolvedValue({ stdout: outputs[format], stderr: '' });
    await utils.execStackQLQuery(core, 'test command', false, 'exit', false);
    expect(execute).toHaveBeenCalledWith('test command');
    expect(core.setOutput).toHaveBeenCalledWith('stackql-query-results', outputs[format]);
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  if (platform !== 'win32') {
    it('extracts query output from the setup-stackql wrapper', async () => {
      const result = '[\n{"result":"stackql smoke"}\n]';
      execute.mockResolvedValue({
        stdout: `[command]/tmp/stackql-bin exec query\n${result}\n::debug::stdout: ${result.replace(/\n/g, '%0A')}\n::debug::stderr: \n`,
        stderr: '',
      });
      await utils.execStackQLQuery(core, 'test command', false, 'exit', false);
      expect(core.setOutput).toHaveBeenCalledWith('stackql-query-results', result);
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('extracts command output from the setup-stackql wrapper', async () => {
      execute.mockResolvedValue({ stdout: '::debug::stdout: \n::debug::stderr: provider installed%0A\n', stderr: 'provider installed\n' });
      await utils.execStackQLQuery(core, 'test command', true, 'exit', false);
      expect(core.setOutput).toHaveBeenCalledWith('stackql-command-output', 'provider installed');
      expect(core.setOutput).not.toHaveBeenCalledWith('stackql-query-results', expect.anything());
      expect(core.setFailed).not.toHaveBeenCalled();
    });
  }

  it('captures native command output from stderr', async () => {
    execute.mockResolvedValue({ stdout: '', stderr: 'provider installed\n' });
    await utils.execStackQLQuery(core, 'test command', true, 'exit', false);
    expect(core.setOutput).toHaveBeenCalledWith('stackql-command-output', 'provider installed\n');
    expect(core.setOutput).not.toHaveBeenCalledWith('stackql-query-results', expect.anything());
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('returns the rendered query during a dry run', async () => {
    const stdout = '[{"query":"SELECT 1;"}]';
    execute.mockResolvedValue({ stdout, stderr: '' });
    await utils.execStackQLQuery(core, 'test command --dryrun', false, 'exit', true);
    expect(execute).toHaveBeenCalledWith('test command --dryrun');
    expect(core.setOutput).toHaveBeenCalledWith('stackql-query-results', stdout);
    expect(core.info).toHaveBeenCalledWith('dry-run query:\nSELECT 1;');
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('fails the action when the executable fails', async () => {
    execute.mockRejectedValue(new Error('process exited with code 1'));
    await utils.execStackQLQuery(core, 'test command', false, 'exit', false);
    expect(core.setFailed).toHaveBeenCalledWith('stackql command failed with error: process exited with code 1');
    expect(core.setOutput).not.toHaveBeenCalled();
  });
});
