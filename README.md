[![StackQL Exec](https://github.com/stackql/stackql-exec/actions/workflows/stackql-exec.yml/badge.svg)](https://github.com/stackql/stackql-exec/actions/workflows/stackql-exec.yml)  

# stackql-exec

The `stackql/stackql-exec` action allows you to execute one or more [`stackql`](https://github.com/stackql/stackql) queries or statements in a GitHub Actions workflow.  

This action can be run on `ubuntu-latest`, `windows-latest`, and `macos-latest` GitHub Actions runners, and will install and expose the latest version of the `stackql` CLI on the runner environment.

## Usage
Authentication to StackQL providers is done via environment variables source from GitHub Actions Secrets.  To learn more about authentication, see the setup instructions for your provider or providers at the [StackQL Provider Registry Docs](https://stackql.io/registry).

## Examples
The following example demonstrate the use of the `stackql/stackql-exec` action in a GitHub Actions workflow, demonstrating how to use the action to execute a StackQL query directly or run one or more queries from a query file in your repo, including the use of templating to supply runtime parameters to your queries.

### Execute a `stackql` query directly
The following example uses the GitHub provider for StackQL, for more information on this provider, see the [GitHub provider docs](https://registry.stackql.io/github).

```
    - name: exec github example
      uses: stackql/stackql-exec@v1.2.0
      with:
        query: "REGISTRY PULL github;
                select total_private_repos
                from github.orgs.orgs
                where org = 'stackql';"
      env: 
        STACKQL_GITHUB_USERNAME: ${{  secrets.STACKQL_GITHUB_USERNAME }}
        STACKQL_GITHUB_PASSWORD: ${{  secrets.STACKQL_GITHUB_PASSWORD }}
```

### Execute a rendered `stackql` query directly using parameters
The following example uses the AWS and Google providers for StackQL, for more information on these providers, see the [AWS provider docs](https://registry.stackql.io/github) and [Google provider docs](https://registry.stackql.io/google).  For more information on providing parameters to queries, see the [StackQL docs]


```
    - name: multi cloud select with parameters
      uses: stackql/stackql-exec@v1.2.0
      with:
        query: "REGISTRY PULL aws;
                REGISTRY PULL google;
                select total_private_repos
                from github.orgs.orgs
                where org = 'stackql';"
        data:
          syndey:
            aws:
              region: ap-southeast-2
            google:
              region: australia-southeast1
              project: stackql 
      env: 
        STACKQL_GITHUB_USERNAME: ${{  secrets.STACKQL_GITHUB_USERNAME }}
        STACKQL_GITHUB_PASSWORD: ${{  secrets.STACKQL_GITHUB_PASSWORD }}
```




### Execute `stackql` queries from a file


### Execute `stackql` queries from a file using parameters




## Inputs
- `query` - (optional) `stackql` query to execute
- `query_file_path` - (optional) `stackql` query file to execute (need to supply either `query` or `query_file_path`)
- `query_output` - (optional) output format of the `stackql exec` result, accepts `table`, `csv`, `json`, defaults to `json`
- `data` - (optional) object used to render a templated `stackql` query to supply runtime query parameters
- `data_file_path` - (optional) path to a `json` or `jsonnet` file used to render a templated `stackql` query to supply runtime query parameters (ignored if `data` action input argument is supplied)

## Outputs
This action uses [setup-stackql](https://github.com/marketplace/actions/stackql-studio-setup-stackql), with `use_wrapper` set to `true`, `stdout` and `stderr` are set to `exec-result` and `exec-error`

- `exec-result` - The STDOUT stream of the call to the `stackql` binary.
- `exec-error` - The STDERR stream of the call to the `stackql` binary.
