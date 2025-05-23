@analytodon/cli
=================

Analytodon CLI Tools


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@analytodon/cli.svg)](https://npmjs.org/package/@analytodon/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@analytodon/cli.svg)](https://npmjs.org/package/@analytodon/cli)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @analytodon/cli
$ analytodon-cli COMMAND
running command...
$ analytodon-cli (--version)
@analytodon/cli/0.0.0 darwin-arm64 node-v23.11.0
$ analytodon-cli --help [COMMAND]
USAGE
  $ analytodon-cli COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`analytodon-cli aggregate dailyaccountstats`](#analytodon-cli-aggregate-dailyaccountstats)
* [`analytodon-cli aggregate dailytootstats`](#analytodon-cli-aggregate-dailytootstats)
* [`analytodon-cli cleanup accountdata`](#analytodon-cli-cleanup-accountdata)
* [`analytodon-cli cleanup accounts`](#analytodon-cli-cleanup-accounts)
* [`analytodon-cli cleanup oldaccounts`](#analytodon-cli-cleanup-oldaccounts)
* [`analytodon-cli cleanup tootstats`](#analytodon-cli-cleanup-tootstats)
* [`analytodon-cli cleanup usercredentials`](#analytodon-cli-cleanup-usercredentials)
* [`analytodon-cli cleanup users`](#analytodon-cli-cleanup-users)
* [`analytodon-cli fetch accountstats`](#analytodon-cli-fetch-accountstats)
* [`analytodon-cli fetch initialstats`](#analytodon-cli-fetch-initialstats)
* [`analytodon-cli fetch tootstats`](#analytodon-cli-fetch-tootstats)
* [`analytodon-cli hello PERSON`](#analytodon-cli-hello-person)
* [`analytodon-cli hello world`](#analytodon-cli-hello-world)
* [`analytodon-cli help [COMMAND]`](#analytodon-cli-help-command)
* [`analytodon-cli mail oldaccounts`](#analytodon-cli-mail-oldaccounts)
* [`analytodon-cli mail weeklystats`](#analytodon-cli-mail-weeklystats)
* [`analytodon-cli plugins`](#analytodon-cli-plugins)
* [`analytodon-cli plugins add PLUGIN`](#analytodon-cli-plugins-add-plugin)
* [`analytodon-cli plugins:inspect PLUGIN...`](#analytodon-cli-pluginsinspect-plugin)
* [`analytodon-cli plugins install PLUGIN`](#analytodon-cli-plugins-install-plugin)
* [`analytodon-cli plugins link PATH`](#analytodon-cli-plugins-link-path)
* [`analytodon-cli plugins remove [PLUGIN]`](#analytodon-cli-plugins-remove-plugin)
* [`analytodon-cli plugins reset`](#analytodon-cli-plugins-reset)
* [`analytodon-cli plugins uninstall [PLUGIN]`](#analytodon-cli-plugins-uninstall-plugin)
* [`analytodon-cli plugins unlink [PLUGIN]`](#analytodon-cli-plugins-unlink-plugin)
* [`analytodon-cli plugins update`](#analytodon-cli-plugins-update)
* [`analytodon-cli tools encryptaccountcredentials`](#analytodon-cli-tools-encryptaccountcredentials)
* [`analytodon-cli tools rebuilddailytootstats`](#analytodon-cli-tools-rebuilddailytootstats)

## `analytodon-cli aggregate dailyaccountstats`

Aggregate daily account stats for all accounts

```
USAGE
  $ analytodon-cli aggregate dailyaccountstats [-c <value>] [-d <value>] [-z <value>]

FLAGS
  -c, --connectionString=<value>  [default: mongodb://localhost:27017] MongoDB connection string
  -d, --database=<value>          [default: analytodon] Source database name
  -z, --timezone=<value>          Process accounts with this timezone

DESCRIPTION
  Aggregate daily account stats for all accounts

EXAMPLES
  $ analytodon-cli aggregate dailyaccountstats
```

_See code: [src/commands/aggregate/dailyaccountstats.ts](https://github.com/blazer82/analytodon/blob/v0.0.0/src/commands/aggregate/dailyaccountstats.ts)_

## `analytodon-cli aggregate dailytootstats`

Aggregate daily toot stats for all accounts

```
USAGE
  $ analytodon-cli aggregate dailytootstats [-c <value>] [-d <value>] [-z <value>]

FLAGS
  -c, --connectionString=<value>  [default: mongodb://localhost:27017] MongoDB connection string
  -d, --database=<value>          [default: analytodon] Source database name
  -z, --timezone=<value>          Process accounts with this timezone

DESCRIPTION
  Aggregate daily toot stats for all accounts

EXAMPLES
  $ analytodon-cli aggregate dailytootstats
```

_See code: [src/commands/aggregate/dailytootstats.ts](https://github.com/blazer82/analytodon/blob/v0.0.0/src/commands/aggregate/dailytootstats.ts)_

## `analytodon-cli cleanup accountdata`

Clean up orphaned account data.

```
USAGE
  $ analytodon-cli cleanup accountdata [-c <value>] [-d <value>] [-x]

FLAGS
  -c, --connectionString=<value>  [default: mongodb://localhost:27017] MongoDB connection string
  -d, --database=<value>          [default: analytodon] Source database name
  -x, --dryRun                    Dry run, no actual changes made

DESCRIPTION
  Clean up orphaned account data.

EXAMPLES
  $ analytodon-cli cleanup accountdata
```

_See code: [src/commands/cleanup/accountdata.ts](https://github.com/blazer82/analytodon/blob/v0.0.0/src/commands/cleanup/accountdata.ts)_

## `analytodon-cli cleanup accounts`

Clean up accounts.

```
USAGE
  $ analytodon-cli cleanup accounts [-c <value>] [-d <value>] [-x]

FLAGS
  -c, --connectionString=<value>  [default: mongodb://localhost:27017] MongoDB connection string
  -d, --database=<value>          [default: analytodon] Source database name
  -x, --dryRun                    Dry run, no actual changes made

DESCRIPTION
  Clean up accounts.

EXAMPLES
  $ analytodon-cli cleanup accounts
```

_See code: [src/commands/cleanup/accounts.ts](https://github.com/blazer82/analytodon/blob/v0.0.0/src/commands/cleanup/accounts.ts)_

## `analytodon-cli cleanup oldaccounts`

Delete users with old accounts

```
USAGE
  $ analytodon-cli cleanup oldaccounts [-c <value>] [-d <value>] [-h <value>] [-x]

FLAGS
  -c, --connectionString=<value>  [default: mongodb://localhost:27017] MongoDB connection string
  -d, --database=<value>          [default: analytodon] Source database name
  -h, --host=<value>              [default: https://app.analytodon.com] App host URL
  -x, --dryRun                    Dry run, no actual changes made

DESCRIPTION
  Delete users with old accounts

EXAMPLES
  $ analytodon-cli cleanup oldaccounts
```

_See code: [src/commands/cleanup/oldaccounts.ts](https://github.com/blazer82/analytodon/blob/v0.0.0/src/commands/cleanup/oldaccounts.ts)_

## `analytodon-cli cleanup tootstats`

Clean up old tootstats.

```
USAGE
  $ analytodon-cli cleanup tootstats [-c <value>] [-d <value>] [-r <value>] [-x]

FLAGS
  -c, --connectionString=<value>  [default: mongodb://localhost:27017] MongoDB connection string
  -d, --database=<value>          [default: analytodon] Source database name
  -r, --days=<value>              [default: 30] Retain tootstats for this number of days back
  -x, --dryRun                    Dry run, no actual changes made

DESCRIPTION
  Clean up old tootstats.

EXAMPLES
  $ analytodon-cli cleanup tootstats
```

_See code: [src/commands/cleanup/tootstats.ts](https://github.com/blazer82/analytodon/blob/v0.0.0/src/commands/cleanup/tootstats.ts)_

## `analytodon-cli cleanup usercredentials`

Clean up user credentials.

```
USAGE
  $ analytodon-cli cleanup usercredentials [-c <value>] [-d <value>] [-x]

FLAGS
  -c, --connectionString=<value>  [default: mongodb://localhost:27017] MongoDB connection string
  -d, --database=<value>          [default: analytodon] Source database name
  -x, --dryRun                    Dry run, no actual changes made

DESCRIPTION
  Clean up user credentials.

EXAMPLES
  $ analytodon-cli cleanup usercredentials
```

_See code: [src/commands/cleanup/usercredentials.ts](https://github.com/blazer82/analytodon/blob/v0.0.0/src/commands/cleanup/usercredentials.ts)_

## `analytodon-cli cleanup users`

Clean up users that haven't completed setup.

```
USAGE
  $ analytodon-cli cleanup users [-c <value>] [-d <value>] [-x]

FLAGS
  -c, --connectionString=<value>  [default: mongodb://localhost:27017] MongoDB connection string
  -d, --database=<value>          [default: analytodon] Source database name
  -x, --dryRun                    Dry run, no actual changes made

DESCRIPTION
  Clean up users that haven't completed setup.

EXAMPLES
  $ analytodon-cli cleanup users
```

_See code: [src/commands/cleanup/users.ts](https://github.com/blazer82/analytodon/blob/v0.0.0/src/commands/cleanup/users.ts)_

## `analytodon-cli fetch accountstats`

Gather account stats for all accounts

```
USAGE
  $ analytodon-cli fetch accountstats [-c <value>] [-d <value>] [-z <value>]

FLAGS
  -c, --connectionString=<value>  [default: mongodb://localhost:27017] MongoDB connection string
  -d, --database=<value>          [default: analytodon] Source database name
  -z, --timezone=<value>          Process accounts with this timezone

DESCRIPTION
  Gather account stats for all accounts

EXAMPLES
  $ analytodon-cli fetch accountstats
```

_See code: [src/commands/fetch/accountstats.ts](https://github.com/blazer82/analytodon/blob/v0.0.0/src/commands/fetch/accountstats.ts)_

## `analytodon-cli fetch initialstats`

Gather initial stats for all accounts (only 1 per call)

```
USAGE
  $ analytodon-cli fetch initialstats [-c <value>] [-d <value>] [-a <value>] [-h <value>] [-t <value>]

FLAGS
  -a, --account=<value>           Only process specific account
  -c, --connectionString=<value>  [default: mongodb://localhost:27017] MongoDB connection string
  -d, --database=<value>          [default: analytodon] Source database name
  -h, --host=<value>              [default: https://app.analytodon.com] App host URL
  -t, --authorization=<value>     [default: no-key] Authorization header

DESCRIPTION
  Gather initial stats for all accounts (only 1 per call)

EXAMPLES
  $ analytodon-cli fetch initialstats
```

_See code: [src/commands/fetch/initialstats.ts](https://github.com/blazer82/analytodon/blob/v0.0.0/src/commands/fetch/initialstats.ts)_

## `analytodon-cli fetch tootstats`

Gather toot stats for all accounts

```
USAGE
  $ analytodon-cli fetch tootstats [-c <value>] [-d <value>] [-a] [-z <value>] [-m <value>]

FLAGS
  -a, --all                       Fetch all (legacy, always on)
  -c, --connectionString=<value>  [default: mongodb://localhost:27017] MongoDB connection string
  -d, --database=<value>          [default: analytodon] Source database name
  -m, --account=<value>           Only process this account (disables timezone filter!)
  -z, --timezone=<value>          Process accounts with this timezone

DESCRIPTION
  Gather toot stats for all accounts

EXAMPLES
  $ analytodon-cli fetch tootstats
```

_See code: [src/commands/fetch/tootstats.ts](https://github.com/blazer82/analytodon/blob/v0.0.0/src/commands/fetch/tootstats.ts)_

## `analytodon-cli hello PERSON`

Say hello

```
USAGE
  $ analytodon-cli hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ analytodon-cli hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/blazer82/analytodon/blob/v0.0.0/src/commands/hello/index.ts)_

## `analytodon-cli hello world`

Say hello world

```
USAGE
  $ analytodon-cli hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ analytodon-cli hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/blazer82/analytodon/blob/v0.0.0/src/commands/hello/world.ts)_

## `analytodon-cli help [COMMAND]`

Display help for analytodon-cli.

```
USAGE
  $ analytodon-cli help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for analytodon-cli.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.28/src/commands/help.ts)_

## `analytodon-cli mail oldaccounts`

Send deletion reminder email to users with old accounts

```
USAGE
  $ analytodon-cli mail oldaccounts [-c <value>] [-d <value>] [-h <value>] [-t <value>] [-u <value>] [-x]

FLAGS
  -c, --connectionString=<value>  [default: mongodb://localhost:27017] MongoDB connection string
  -d, --database=<value>          [default: analytodon] Source database name
  -h, --host=<value>              [default: https://app.analytodon.com] App host URL
  -t, --authorization=<value>     [default: no-key] Authorization header
  -u, --user=<value>              Only process specific user
  -x, --dryRun                    Dry run, no actual changes made

DESCRIPTION
  Send deletion reminder email to users with old accounts

EXAMPLES
  $ analytodon-cli mail oldaccounts
```

_See code: [src/commands/mail/oldaccounts.ts](https://github.com/blazer82/analytodon/blob/v0.0.0/src/commands/mail/oldaccounts.ts)_

## `analytodon-cli mail weeklystats`

Send weekly stats email to users

```
USAGE
  $ analytodon-cli mail weeklystats [-c <value>] [-d <value>] [-h <value>] [-t <value>] [-u <value>] [-z <value>]

FLAGS
  -c, --connectionString=<value>  [default: mongodb://localhost:27017] MongoDB connection string
  -d, --database=<value>          [default: analytodon] Source database name
  -h, --host=<value>              [default: https://app.analytodon.com] App host URL
  -t, --authorization=<value>     [default: no-key] Authorization header
  -u, --user=<value>              Only process specific user
  -z, --timezone=<value>          Process accounts with this timezone

DESCRIPTION
  Send weekly stats email to users

EXAMPLES
  $ analytodon-cli mail weeklystats
```

_See code: [src/commands/mail/weeklystats.ts](https://github.com/blazer82/analytodon/blob/v0.0.0/src/commands/mail/weeklystats.ts)_

## `analytodon-cli plugins`

List installed plugins.

```
USAGE
  $ analytodon-cli plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ analytodon-cli plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/index.ts)_

## `analytodon-cli plugins add PLUGIN`

Installs a plugin into analytodon-cli.

```
USAGE
  $ analytodon-cli plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into analytodon-cli.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the ANALYTODON_CLI_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the ANALYTODON_CLI_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ analytodon-cli plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ analytodon-cli plugins add myplugin

  Install a plugin from a github url.

    $ analytodon-cli plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ analytodon-cli plugins add someuser/someplugin
```

## `analytodon-cli plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ analytodon-cli plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ analytodon-cli plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/inspect.ts)_

## `analytodon-cli plugins install PLUGIN`

Installs a plugin into analytodon-cli.

```
USAGE
  $ analytodon-cli plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into analytodon-cli.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the ANALYTODON_CLI_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the ANALYTODON_CLI_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ analytodon-cli plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ analytodon-cli plugins install myplugin

  Install a plugin from a github url.

    $ analytodon-cli plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ analytodon-cli plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/install.ts)_

## `analytodon-cli plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ analytodon-cli plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ analytodon-cli plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/link.ts)_

## `analytodon-cli plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ analytodon-cli plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ analytodon-cli plugins unlink
  $ analytodon-cli plugins remove

EXAMPLES
  $ analytodon-cli plugins remove myplugin
```

## `analytodon-cli plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ analytodon-cli plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/reset.ts)_

## `analytodon-cli plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ analytodon-cli plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ analytodon-cli plugins unlink
  $ analytodon-cli plugins remove

EXAMPLES
  $ analytodon-cli plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/uninstall.ts)_

## `analytodon-cli plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ analytodon-cli plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ analytodon-cli plugins unlink
  $ analytodon-cli plugins remove

EXAMPLES
  $ analytodon-cli plugins unlink myplugin
```

## `analytodon-cli plugins update`

Update installed plugins.

```
USAGE
  $ analytodon-cli plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/update.ts)_

## `analytodon-cli tools encryptaccountcredentials`

Encrypts unencrypted accessTokens and legacyClientSecrets in the accountcredentials collection.

```
USAGE
  $ analytodon-cli tools encryptaccountcredentials [-c <value>] [-d <value>] [-n]

FLAGS
  -c, --connectionString=<value>  [default: mongodb://localhost:27017] MongoDB connection string
  -d, --database=<value>          [default: analytodon] Source database name
  -n, --dryRun                    Perform a dry run without making changes to the database.

DESCRIPTION
  Encrypts unencrypted accessTokens and legacyClientSecrets in the accountcredentials collection.

EXAMPLES
  $ analytodon-cli tools encryptaccountcredentials

  $ analytodon-cli tools encryptaccountcredentials --dryRun
```

_See code: [src/commands/tools/encryptaccountcredentials.ts](https://github.com/blazer82/analytodon/blob/v0.0.0/src/commands/tools/encryptaccountcredentials.ts)_

## `analytodon-cli tools rebuilddailytootstats`

Aggregate daily toot stats for all accounts

```
USAGE
  $ analytodon-cli tools rebuilddailytootstats [-c <value>] [-d <value>] [-m <value>] [-e <value>] [-a]

FLAGS
  -a, --all                       Rebuild daily toot stats for all accounts
  -c, --connectionString=<value>  [default: mongodb://localhost:27017] MongoDB connection string
  -d, --database=<value>          [default: analytodon] Source database name
  -e, --entry=<value>             Rebuild a specific entry only
  -m, --account=<value>           Rebuild daily toot stats for this account

DESCRIPTION
  Aggregate daily toot stats for all accounts

EXAMPLES
  $ analytodon-cli tools rebuilddailytootstats
```

_See code: [src/commands/tools/rebuilddailytootstats.ts](https://github.com/blazer82/analytodon/blob/v0.0.0/src/commands/tools/rebuilddailytootstats.ts)_
<!-- commandsstop -->
