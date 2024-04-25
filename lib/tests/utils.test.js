const { getStackqlCommand } = require("../utils");

describe("Utils Functions Tests", () => {
  let core;

  beforeEach(() => {
    core = {
      setFailed: jest.fn().mockImplementation((message) => console.error(message)),
      info: jest.fn().mockImplementation((message) => console.log(message)),
      exportVariable: jest.fn(),
      error: jest.fn().mockImplementation((message) => console.error(message)),
    };
    jest.spyOn(core, 'exportVariable').mockImplementation((name, value) => {
      core[name] = value;
    });
    // set defaults for env vars
    delete process.env.QUERY;
    delete process.env.QUERY_FILE_PATH;
    delete process.env.DATA_FILE_PATH;
    delete process.env.VARS;
    delete process.env.AUTH;
    process.env.OUTPUT = 'json';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });
  
  it("should handle a stackql query", () => {
    // Simulate setting the QUERY variable as it would be from a YAML file using Folded Block Style
    process.env.QUERY = "SELECT status, count(*) as num_instances FROM google.compute.instances WHERE project = 'stackql-demo' GROUP BY status";

    // Execute the function that processes the command
    getStackqlCommand(core);

    // Prepare the expected full command
    const expectedCommand = 'stackql exec "SELECT status, count(*) as num_instances FROM google.compute.instances WHERE project = \'stackql-demo\' GROUP BY status" --output json';

    // Verify that the full command is set correctly
    expect(core.exportVariable).toHaveBeenCalledWith('STACKQL_COMMAND', expectedCommand);

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
    expect(core.exportVariable).not.toHaveBeenCalledWith('STACKQL_COMMAND', expect.any(String));
  });
  
  it("should handle unsupported output formats", () => {
    // Set environment variables for a valid scenario except for the output format
    process.env.QUERY = "SELECT * FROM services";
    process.env.OUTPUT = "unsupported_format"; // Intentionally incorrect
    // Execute the function
    getStackqlCommand(core);
    // Check for the appropriate failure handling
    expect(core.setFailed).toHaveBeenCalledWith(`Output format not supported: ${process.env.OUTPUT}`);
    expect(core.exportVariable).not.toHaveBeenCalled();
  });

  it("should handle query execution from an existing file", () => {
    // Setup environment variables
    process.env.QUERY_FILE_PATH = "stackql_scripts/google-instances-by-status.iql";

    // Execute the function
    getStackqlCommand(core);

    // Prepare the expected full command
    const expectedCommand = 'stackql exec -i "stackql_scripts/google-instances-by-status.iql" --output json';

    // Verify that the command is set correctly
    expect(core.exportVariable).toHaveBeenCalledWith('STACKQL_COMMAND', expectedCommand);

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
    expect(core.exportVariable).toHaveBeenCalledWith('STACKQL_COMMAND', expectedCommand);
  
    // Optionally, check for no errors
    expect(core.error).not.toHaveBeenCalled();
    expect(core.setFailed).not.toHaveBeenCalled();
  });
  

});
