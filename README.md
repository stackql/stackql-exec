[stars]: https://img.shields.io/github/stars/stackql/stackql?style=flat-square "GitHub Stars"
[logo]: https://stackql.io/img/stackql-logo-bold.png "stackql logo"
[stackql]: https://github.com/stackql/stackql
[homepage]: https://stackql.io/
[downloads]: https://img.shields.io/github/downloads/stackql/stackql/total?label=github%20downloads

<div align="center">

[![logo]][homepage]  

[![Marketplace](https://img.shields.io/badge/Marketplace-stackql--exec-blue?logo=github)](https://github.com/marketplace/actions/stackql-exec)
[![Release](https://img.shields.io/github/v/release/stackql/stackql-exec)](https://github.com/stackql/stackql-exec/releases)
[![CI](https://github.com/stackql/stackql-exec/actions/workflows/stackql-exec-test.yml/badge.svg)](https://github.com/stackql/stackql-exec/actions/workflows/stackql-exec-test.yml)
[![License](https://img.shields.io/github/license/stackql/stackql-exec)](LICENSE)
![downloads]
[![stars]][stackql]

</div>

# stackql-exec
Github Action as a wrapper for executing a single command in stackql, maps all stackql exec args to actions args

# Usage

## Provider Authentication
Authentication to StackQL providers is done via environment variables source from GitHub Actions Secrets.  To learn more about authentication, see the setup instructions for your provider or providers at the [StackQL Provider Registry Docs](https://stackql.io/registry).  

## Inputs
- **`query`** - stackql query to execute *(need to supply either __`query`__ or __`query_file_path`__)*
- **`query_file_path`** - stackql query file to execute *(need to supply either __`query`__ or __`query_file_path`__)*
- **`data_file_path`** - (optional) path to data file to pass to the stackql query preprocessor (`json` or `jsonnet`)
- **`dry_run`** - (optional) set to `true` to print the query that would be executed without actually executing it (default is `false`)
- **`vars`** - (optional) comma delimited list of variables to pass to the stackql query preprocessor (supported with `jsonnet` config blocks or `jsonnet` data files only), accepts `var1=val1,var2=val2`, can be used to source environment variables into stackql queries 
- **`query_output`** - (optional) output format of the stackql exec result, accepts `table`, `csv`, `json` and `text`, defaults to `json`
- **`auth_obj_path`** - (optional) the path of json file that stores stackql AUTH string *(only required when using non-standard environment variable names)*
- **`auth_str`** - (optional) stackql AUTH string *(only required when using non-standard environment variable names)*
- **`is_command`** - (optional) set to `true` if the stackql execution is a command that does not return data (defaults to `false`)
- **`on_failure`** - (optional) behavior on a failure in query, supported values are `exit` (default) and `continue`

## Outputs

- **`stackql-query-results`** - results from a stackql query (in the format specified)
- **`stackql-command-output`** - text output from a stackql command (a query that does not return data)
- **`stackql-query-error`** - error from a stackql query

> This action uses [setup-stackql](https://github.com/marketplace/actions/setup-stackql)

Windows ARM64 runners use the native binary installed by `setup-stackql`. Existing plain `stackql.exe` installations on `PATH` and wrapped installations are both supported.

## Supported platforms

| Platform | x64 runner | ARM64 runner |
| --- | --- | --- |
| Linux | `ubuntu-24.04` | `ubuntu-24.04-arm` |
| Windows | `windows-2025` | `windows-11-arm` |
| macOS | `macos-15-intel` | `macos-15` |

CI runs unit tests and integration tests on all six combinations. Smoke tests need no cloud credentials and cover automatic setup, preinstalled wrapped binaries, and preinstalled plain binaries. On macOS, `setup-stackql` uses Homebrew and does not install a wrapper.

Smoke tests verify the native binary architecture, multiline queries, query and data paths containing spaces, variables, dry runs, and all four output formats. Provider integration tests additionally use the repository's GitHub and Google credentials.

## Examples

### Inline `stackql` query example

this is an example of a command (that does not return data):

```yaml
    - name: exec github example
      uses: ./
      with:
        is_command: 'true'
        query: "REGISTRY PULL github;
      env: 
        STACKQL_GITHUB_USERNAME: ${{  secrets.STACKQL_GITHUB_USERNAME }}
        STACKQL_GITHUB_PASSWORD: ${{  secrets.STACKQL_GITHUB_PASSWORD }}
```

this is an example of a query that returns data:

```yaml
    - name: exec github example
      uses: ./
      with:
        query: |
          select total_private_repos
          from github.orgs.orgs
          where org = 'stackql'"
      env: 
        STACKQL_GITHUB_USERNAME: ${{  secrets.STACKQL_GITHUB_USERNAME }}
        STACKQL_GITHUB_PASSWORD: ${{  secrets.STACKQL_GITHUB_PASSWORD }}
```

### Query file example using an inline `jsonnet` variable block and external variables

`google-example.iql`
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

workflow excerpt:  
```yaml
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

### Query file example using an external `jsonnet` data file and external variables

`google-example.iql`
```sql
SELECT status, count(*) as num_instances
FROM google.compute.instances
WHERE project = '{{ .project }}' and zone = '{{ .zone }}'
GROUP BY status;
```

`google-example.jsonnet`
```
local project = std.extVar("GOOGLE_PROJECT");
local zone = std.extVar("GOOGLE_ZONE");
{
   project: project,
   zone: zone,
}
```

workflow excerpt:  
```yaml
    - name: exec google example with query file and data file using vars
      id: stackql-exec-file-with-data-file-and-vars
      uses: ./
      with:
        query_file_path: './stackql_scripts/google-example.iql'
        data_file_path: './stackql_scripts/google-example.jsonnet'
        vars: GOOGLE_PROJECT=${{ env.GOOGLE_PROJECT }},GOOGLE_ZONE=${{ env.GOOGLE_ZONE }}
      env: 
        GOOGLE_CREDENTIALS: ${{ secrets.GOOGLE_CREDENTIALS }}
        GOOGLE_PROJECT: ${{ vars.GOOGLE_PROJECT }}
        GOOGLE_ZONE: ${{ vars.GOOGLE_ZONE }}        
```
## Test action locally
To run unit tests locally against this action, use the following:

```
npm ci --ignore-scripts
npm test -- --runInBand
```
