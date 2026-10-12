const { getStackqlCommand, setupAuth } = require("../utils");
const fs = require('fs');

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
const originalArch = Object.getOwnPropertyDescriptor(process, 'arch');

describe("Utils Functions Tests", () => {
  let core;

  beforeEach(() => {
    Object.defineProperty(process, 'platform', { value: 'linux' });

    core = {
      debug: jest.fn().mockImplementation((message) => console.log(`DEBUG: ${message}`)),
      setFailed: jest.fn().mockImplementation((message) => console.error(message)),
      info: jest.fn().mockImplementation((message) => console.log(message)),
      exportVariable: jest.fn(),
      setOutput: jest.fn(),
      error: jest.fn().mockImplementation((message) => console.error(message)),
    };
    jest.spyOn(core, 'setOutput').mockImplementation((name, value) => {
      core[name] = value;
    });
    // set defaults for env vars
    delete process.env.QUERY;
    delete process.env.QUERY_FILE_PATH;
    delete process.env.DATA_FILE_PATH;
    delete process.env.VARS;
    delete process.env.AUTH;
    delete process.env.STACKQL_CLI_PATH;
    process.env.OUTPUT = 'json';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(process, 'platform', originalPlatform);
    Object.defineProperty(process, 'arch', originalArch);
    delete process.env.STACKQL_CLI_PATH;
  });
  
  it("should handle a stackql query", () => {
    // Simulate setting the QUERY variable as it would be from a YAML file using Folded Block Style
    process.env.QUERY = "SELECT status, count(*) as num_instances FROM google.compute.instances WHERE project = 'stackql-demo' GROUP BY status";

    // Execute the function that processes the command
    getStackqlCommand(core);

    // Prepare the expected full command
    const expectedCommand = 'stackql exec "SELECT status, count(*) as num_instances FROM google.compute.instances WHERE project = \'stackql-demo\' GROUP BY status" --output json';

    // Verify that the full command is set correctly
    expect(core.setOutput).toHaveBeenCalledWith('stackql_command', expectedCommand);

    // Optionally, check for no errors
    expect(core.error).not.toHaveBeenCalled();
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  // Test for non-existent query file
  it('should handle non-existent query file', () => {
    process.env.QUERY_FILE_PATH = 'path/to/nonexistent/file.iql';
    getStackqlCommand(core);
    // Use RegExp for case insensitive comparison
    expect(core.setFailed).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`query file path does not exist: ${process.env.QUERY_FILE_PATH}`, 'i')));
    expect(core.setOutput).not.toHaveBeenCalledWith('stackql_command', expect.any(String));
  });

  // Test for unsupported output formats
  it('should handle unsupported output formats', () => {
    process.env.OUTPUT = 'unsupported_format';
    getStackqlCommand(core);
    // Use RegExp for case insensitive comparison
    expect(core.setFailed).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`output format not supported: ${process.env.OUTPUT}`, 'i')));
    expect(core.setOutput).not.toHaveBeenCalled();
  });

  it("should handle query execution from an existing file", () => {
    // Setup environment variables
    process.env.QUERY_FILE_PATH = "stackql_scripts/google-instances-by-status.iql";

    // Execute the function
    getStackqlCommand(core);

    // Prepare the expected full command
    const expectedCommand = 'stackql exec -i "stackql_scripts/google-instances-by-status.iql" --output json';

    // Verify that the command is set correctly
    expect(core.setOutput).toHaveBeenCalledWith('stackql_command', expectedCommand);

    // Optionally, check for no errors
    expect(core.error).not.toHaveBeenCalled();
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it("should handle query execution from a file with a data file", () => {
    // Setup environment variables
    process.env.QUERY_FILE_PATH = "stackql_scripts/google-instances-by-status-with-external-data-file.iql";
    process.env.DATA_FILE_PATH = "stackql_scripts/google-instances-by-status-with-external-data-file.jsonnet";
  
    // Execute the function
    getStackqlCommand(core);
  
    // Prepare the expected full command
    const expectedCommand = 'stackql exec -i "stackql_scripts/google-instances-by-status-with-external-data-file.iql" --iqldata "stackql_scripts/google-instances-by-status-with-external-data-file.jsonnet" --output json';
  
    // Verify that the command is set correctly
    expect(core.setOutput).toHaveBeenCalledWith('stackql_command', expectedCommand);
  
    // Optionally, check for no errors
    expect(core.error).not.toHaveBeenCalled();
    expect(core.setFailed).not.toHaveBeenCalled();
  });


  describe.each(['x64', 'arm64'])('Windows %s installs', arch => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      Object.defineProperty(process, 'arch', { value: arch });
      process.env.QUERY = 'SELECT 1 AS result';
    });

    it('uses a plain installation on PATH', async () => {
      await getStackqlCommand(core);
      expect(core.setOutput).toHaveBeenCalledWith('stackql_command', 'stackql.exe exec "SELECT 1 AS result" --output json');
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('quotes the wrapped binary path', async () => {
      process.env.STACKQL_CLI_PATH = 'C:\\StackQL Tools';
      jest.spyOn(fs, 'existsSync').mockImplementation(file => file === 'C:\\StackQL Tools\\stackql-bin.exe');
      jest.resetModules();
      await require('../utils').getStackqlCommand(core);
      expect(core.setOutput).toHaveBeenCalledWith('stackql_command', '"C:\\StackQL Tools\\stackql-bin.exe" exec "SELECT 1 AS result" --output json');
    });

    it('falls back to PATH when wrapper metadata is stale', async () => {
      process.env.STACKQL_CLI_PATH = 'C:\\missing';
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      jest.resetModules();
      await require('../utils').getStackqlCommand(core);
      expect(core.setOutput).toHaveBeenCalledWith('stackql_command', 'stackql.exe exec "SELECT 1 AS result" --output json');
    });
  });

  // auth is emitted as a scoped step output, never exported to GITHUB_ENV,
  // so it cannot carry over between steps/actions in a job.
  describe("setupAuth", () => {
    afterEach(() => {
      delete process.env.AUTH_STR;
      delete process.env.AUTH_FILE_PATH;
    });

    it("emits the provided auth string as the 'auth' output", () => {
      process.env.AUTH_STR = '{ "cloudflare": { "type": "bearer", "credentialsenvvar": "CLOUDFLARE_API_TOKEN" } }';
      setupAuth(core);
      expect(core.setOutput).toHaveBeenCalledWith('auth', process.env.AUTH_STR);
      expect(core.exportVariable).not.toHaveBeenCalled();
    });

    it("emits an empty 'auth' output when no auth is supplied (no carry-over)", () => {
      setupAuth(core);
      expect(core.setOutput).toHaveBeenCalledWith('auth', '');
      expect(core.exportVariable).not.toHaveBeenCalled();
    });
  });

});
