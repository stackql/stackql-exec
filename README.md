# stackql-exec
Github Action as a wrapper for executing a single command in stackql, maps all stackql exec args to actions args

# Usage

## AUTH

`Example auth string`
```
{   "google": { "type": "service_account",  "credentialsfilepath": "sa-key.json" },
    "github": { "type": "basic", "credentialsenvvar": "STACKQL_GITHUB_CREDS" }}
```
It can be passed with `auth_str` as a string, or stored in a file and pass filename to `auth-obj-path`
- For "basic" auth, you need to set a environment variable with same name as the value of `credentialsenvvar` in the auth string for the Github Action step. You can use [Github Secrets](https://docs.github.com/en/actions/reference/encrypted-secrets) to store the value of the environment variable, and use env to pass it to the action. For example:
```
env:
  STACKQL_GITHUB_CREDS: ${{ secrets.STACKQL_GITHUB_CREDS }}
```
- For "service_account" auth, you need to store the credentials into a file; You can follow the example of `Prep Google Creds (bash)` step in the example

# Examples
## Basic Example
```
    - name: exec github example
      uses: ./
      with:
        auth_str: '{ "github": { "type": "basic", "credentialsenvvar": "STACKQL_GITHUB_CREDS" } }'
        query: "REGISTRY PULL github v23.01.00104;
                SHOW PROVIDERS;
                select total_private_repos
                from github.orgs.orgs
                where org = 'stackql';"
      env: 
        STACKQL_GITHUB_CREDS: ${{ secrets.STACKQL_GITHUB_CREDS }}

```


## Auth json file and query file example
- `auth.json`
```
{   "google": { "type": "service_account",  "credentialsfilepath": "sa-key.json" },
    "github": { "type": "basic", "credentialsenvvar": "STACKQL_GITHUB_CREDS" }}
```
- `google-example.iql`
```
REGISTRY PULL github v23.01.00104;
SHOW PROVIDERS;
select total_private_repos
from github.orgs.orgs
where org = 'stackql';
```
**Example**
```
    - name: Prep Google Creds (Windows)
      if: ${{ matrix.os == 'windows-latest'}}
      run: | ## use the secret to create json file
        $GoogleCreds = [System.Environment]::GetEnvironmentVariable("GOOGLE_CREDS_ENV")
        $GoogleCredsDecoded = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($GoogleCreds))
        Write-Output $GoogleCredsDecoded | Set-Content sa-key.json
      shell: pwsh
      env:
        GOOGLE_CREDS_ENV: ${{ secrets.GOOGLE_CREDS }}
  
    - name: Prep Google Creds (bash)
      if: ${{ matrix.os != 'windows-latest' }}
      shell: bash
      run: | ## use the base64 encoded secret to create json file
        sudo echo ${{ secrets.GOOGLE_CREDS }} | base64 -d > sa-key.json

    - name: exec google example
      uses: ./
      with:
        auth_obj_path: './stackql_scripts/auth.json'
        query_file_path: './stackql_scripts/google-example.iql'
```


## Inputs
- `auth_obj_path` - (optional) the path of json file that stores stackql AUTH string
- `auth_str` - (optional) stackql AUTH string, need either auth_str or auth_obj_path
- `query` - (optional) stackql query to execute
- `query_file_path` - (optional) stackql query file to execute, need either query or query_file_path
- `query_output` - (optional) output format of the stackql exec result, accept "table", "csv", "json", default to "json"


## Outputs
This action uses [setup-stackql](https://github.com/marketplace/actions/stackql-studio-setup-stackql), with use_wrapper set
to `true`, the following outputs are available for subsequent steps that call the `stackql` binary:

- `stdout` - The STDOUT stream of the call to the `stackql` binary.
- `stderr` - The STDERR stream of the call to the `stackql` binary.
- `exitcode` - The exit code of the call to the `stackql` binary.
