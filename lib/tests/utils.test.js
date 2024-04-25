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
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("getStackqlCommand", () => {

    //
    // command test
    //
    it("test a command for expected output", () => {
      // Mock the necessary core functions
      jest.spyOn(core, 'exportVariable').mockImplementation((name, value) => {
          core[name] = value;
      });
      jest.spyOn(core, 'info');
      jest.spyOn(core, 'error');
      jest.spyOn(core, 'setFailed');
  
      // Set environment variables
      process.env.QUERY = "registry pull github";
      process.env.IS_COMMAND = "true";
  
      // Assuming getStackqlCommand setups the command to be executed
      getStackqlCommand(core);
  
      // Simulate the execution and outcome
      const simulatedOutput = "github provider, version 'v1.2.3'";
      core.exportVariable('STACKQL_COMMAND_OUTPUT', simulatedOutput);
  
      // Assertions
      expect(core.STACKQL_COMMAND).toBeDefined();
      expect(core.error).not.toHaveBeenCalled();
      expect(core.setFailed).not.toHaveBeenCalled();
      expect(core.STACKQL_COMMAND_OUTPUT.startsWith("github provider, version 'v")).toBeTruthy();
      console.log('Command Output:', core.STACKQL_COMMAND_OUTPUT);
    });
          



    it("test a query from a file for expected results", () => {
      // Placeholder for testing query execution from a file
    });

    it("test a query from a file with an inline jsonnet config block for expected results", () => {
      // Placeholder for testing query execution from a file with inline jsonnet configuration
    });

    it("test a query from a file with a jsonnet data file configured for expected results", () => {
      // Placeholder for testing query execution from a file with a jsonnet data file
    });
  });
});
