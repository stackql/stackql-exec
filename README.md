# stackql-exec
Github Action as a wrapper for executing a single command in stackql, maps all stackql exec args to actions args

# Usage

## Provider Authentication
Authentication to StackQL providers is done via environment variables source from GitHub Actions Secrets.  To learn more about authentication, see the setup instructions for your provider or providers at the [StackQL Provider Registry Docs](https://stackql.io/registry).  

# Examples
## Query Example
```
    - name: exec github example
      uses: ./
      with:
        query: "REGISTRY PULL github;
                SHOW PROVIDERS;
                select total_private_repos
                from github.orgs.orgs
                where org = 'stackql';"
      env: 
        STACKQL_GITHUB_USERNAME: ${{  secrets.STACKQL_GITHUB_USERNAME }}
        STACKQL_GITHUB_PASSWORD: ${{  secrets.STACKQL_GITHUB_PASSWORD }}
```


## Query File example
- `google-example.iql`
```
<<<jsonnet
local project = std.extVar("GOOGLE_PROJECT");
local zone = std.extVar("GOOGLE_ZONE");
{
   project: project,
   zone: zone,
}
>>>
SELECT status, count(*) as num_instances
FROM google.compute.instances
WHERE project = '{{ .project }}' and zone = '{{ .zone }}'
GROUP BY status;
```
**Example**
```
    - name: exec google example with query file using vars
      id: stackql-exec-file-with-vars
      uses: ./
      with:
        query_file_path: './stackql_scripts/google-example.iql'
        vars: GOOGLE_PROJECT=${{ env.GOOGLE_PROJECT }},GOOGLE_ZONE=${{ env.GOOGLE_ZONE }}
      env: 
        GOOGLE_CREDENTIALS: ${{ secrets.GOOGLE_CREDENTIALS }}
        GOOGLE_PROJECT: ${{ vars.GOOGLE_PROJECT }}
        GOOGLE_ZONE: ${{ vars.GOOGLE_ZONE }}
```

## Inputs
- `query` - stackql query to execute **(need to supply either `query` or `query_file_path`)**
- `query_file_path` - stackql query file to execute **(need to supply either `query` or `query_file_path`)**
- `data_file_path` - (optional) path to data file to pass to the stackql query preprocessor (`json` or `jsonnet`)
- `vars` - (optional) comma delimited list of variables to pass to the stackql query preprocessor (supported with `jsonnet` config blocks or `jsonnet` data files only), accepts `var1=val1,var2=val2`, can be used to source environment variables into stackql queries 
- `query_output` - (optional) output format of the stackql exec result, accepts `table`, `csv`, `json`, defaults to `json`
- `auth_obj_path` - (optional) the path of json file that stores stackql AUTH string **(only required when using non-standard environment variable names)**
- `auth_str` - (optional) stackql AUTH string **(only required when using non-standard environment variable names)**


## Outputs
This action uses [setup-stackql](https://github.com/marketplace/actions/stackql-studio-setup-stackql), with use_wrapper set
to `true`, `stdout` and `stderr` are set to `exec-result` and `exec-error`

- `exec-result` - The STDOUT stream of the call to the `stackql` binary.
- `exec-error` - The STDERR stream of the call to the `stackql` binary.

## Test action locally
To run unit tests locally against this action, use the following:

```
npm i
npm run test lib/tests/utils.test.js
```
