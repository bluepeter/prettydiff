#!/usr/bin/env node

import { Stats } from "fs";
import * as http from "http";
import { Stream, Writable } from "stream";
import { Hash } from "crypto";
import { Http2Stream, Http2Session } from "http2";
type directoryItem = [string, "file" | "directory" | "link" | "screen", number, number, Stats];
interface directoryList extends Array<directoryItem> {
    [key:number]: directoryItem;
}
interface readFile {
    callback: Function;
    index: number;
    path: string;
    stat: Stats;
}
/*jslint node:true */
/*eslint-env node*/
/*eslint no-console: 0*/
/*global global */
(function node():void {
    "use strict";
    const startTime:[number, number]      = process.hrtime(),
        node = {
            child : require("child_process").exec,
            crypto: require("crypto"),
            fs    : require("fs"),
            http  : require("http"),
            https : require("https"),
            os    : require("os"),
            path  : require("path")
        },
        //stats = {
         //   source: "",
         //   diff: ""
        //},
        sep:string = node.path.sep,
        projectPath:string = (function node_project() {
            const dirs:string[] = __dirname.split(sep);
            return dirs.slice(0, dirs.length - 1).join(sep) + sep;
        }()),
        js:string = `${projectPath}js${sep}`,
        api:string = `${js}api${sep}`,
        libFiles:string[] = [api, `${js}beautify`, `${js}minify`],
        // node option default start
        options:any = {},
        version:any = {},
        // node option default end
        text:any     = {
            angry    : "\u001b[1m\u001b[31m",
            blue     : "\u001b[34m",
            bold     : "\u001b[1m",
            cyan     : "\u001b[36m",
            green    : "\u001b[32m",
            nocolor  : "\u001b[39m",
            none     : "\u001b[0m",
            purple   : "\u001b[35m",
            red      : "\u001b[31m",
            underline: "\u001b[4m",
            yellow   : "\u001b[33m"
        },
        prettydiff:any = {},
        commands:commandList = {
            //analysis: {
            //    description: "Perform Pretty Diff's code analysis operation.",
            //    example: [{
            //        code: "",
            //        defined: "Performs Pretty Diff's code analysis operation."
            //    }]
            //},
            base64: {
                description: "Convert a file or string into a base64 encoding.",
                example: [
                    {
                        code: "prettydiff base64 encode string:\"my string to encode\"",
                        defined: "Converts the provided string into a base64 encoding."
                    },
                    {
                        code: "prettydiff base64 encode path/to/file",
                        defined: "Converts the provided file into a base64 encoding."
                    },
                    {
                        code: "prettydiff base64 encode http://file.from.internet.com",
                        defined: "Reads a file from a URI and outputs a base64 encoding."
                    },
                    {
                        code: "prettydiff base64 decode string:\"a big base64 string\"",
                        defined: "Decodes base64 strings into decoded output."
                    }
                ]
            },
            beautify: {
                description: "Perform Pretty Diff's code beautification.",
                example: [
                    {
                        code: "prettydiff beautify my/path/toFile.xml",
                        defined: "Performs Pretty Diff's beautify operation."
                    },
                    {
                        code: "prettydiff beautify http://example.com/webThing.xml",
                        defined: "Performs a HTTP get operation for URI values and then beautifies the specified resource."
                    }
                ]
            },
            build: {
                description: "Rebuilds the application.",
                example: [
                    {
                        code: "prettydiff build",
                        defined: "Compiles from TypeScript into JavaScript, compiles libraries, and lints the code."
                    },
                    {
                        code: "prettydiff build nocheck",
                        defined: "Runs the build without running any of the sanity checks."
                    }
                ]
            },
            commands: {
                description: "List all supported commands to the console or examples of a specific command.",
                example: [
                    {
                        code: "prettydiff commands",
                        defined: "Lists all commands and their definitions to the shell."
                    },
                    {
                        code: "prettydiff commands commands",
                        defined: "Details the mentioned command with code examples."
                    }
                ]
            },
            copy: {
                description: "Copy files or directories from one location to another on the local file system.",
                example: [
                    {
                        code: "prettydiff copy source/file/or/directory destination/path",
                        defined: "Copies the file system artifact at the first address to the second address."
                    },
                    {
                        code: "prettydiff copy \"C:\\Program Files\" destination\\path",
                        defined: "Quote values that contain non-alphanumeric characters."
                    },
                    {
                        code: "prettydiff copy source destination ignore [build, .git, node_modules]",
                        defined: "Exclusions are permitted as a comma separated list in square brackets following the ignore keyword."
                    },
                    {
                        code: "prettydiff copy source destination ignore[build, .git, node_modules]",
                        defined: "A space between the 'ignore' keyword and the opening square brace is optional."
                    },
                    {
                        code: "prettydiff copy ../prettydiff3 ../prettydiffXX ignore [build, .git, node_modules]",
                        defined: "Exclusions are relative to the source directory."
                    }
                ]
            },
            diff: {
                description: "Compare code samples the Pretty Diff way.",
                example: [
                    {
                        code: "prettydiff diff firstFile.xml secondFile.xml",
                        defined: "Performs Pretty Diff's diff operation against the specified locations."
                    },
                    {
                        code: "prettydiff diff firstDirectory secondDirectory",
                        defined: "Performs Pretty Diff's diff operation against the files in the specified directories. The two locations must be of the same file system type or Pretty Diff will give you an error."
                    }
                ]
            },
            directory: {
                description: "Traverses a directory in the local file system and generates a list.",
                example: [
                    {
                        code: "prettydiff directory source:\"my/directory/path\"",
                        defined: "Returns an array where each index is an array of [absolute path, type, stat]. Type can refer to 'file', 'directory', or 'link' for symbolic links."
                    },
                    {
                        code: "prettydiff directory source:\"my/directory/path\" shallow",
                        defined: "Does not traverse child directories."
                    },
                    {
                        code: "prettydiff directory source:\"my/directory/path\" listonly",
                        defined: "Returns an array of strings where each index is an absolute path"
                    },
                    {
                        code: "prettydiff directory source:\"my/directory/path\" symbolic",
                        defined: "Identifies symbolic links instead of the object the links point to"
                    },
                    {
                        code: "prettydiff directory source:\"my/directory/path\" ignore [.git, node_modules, \"program files\"]",
                        defined: "Sets an exclusion list of things to ignore"
                    },
                    {
                        code: "prettydiff directory source:\"my/path\" typeof",
                        defined: "returns a string describing the artifact type"
                    }
                ]
            },
            get: {
                description: "Retrieve a resource via an absolute URI.",
                example: [
                    {
                        code: "prettydiff get http://example.com/file.txt",
                        defined: "Gets a resource from the web and prints the output to the shell."
                    },
                    {
                        code: "prettydiff get http://example.com/file.txt path/to/file",
                        defined: "Get a resource from the web and writes the resource as UTF8 to a file at the specified path."
                    }
                ]
            },
            hash: {
                description: "Generate a SHA512 hash of a file or a string.",
                example: [
                    {
                        code: "prettydiff hash path/to/file",
                        defined: "Prints a SHA512 hash to the shell for the specified file's contents in the local file system."
                    },
                    {
                        code: "prettydiff hash verbose path/to/file",
                        defined: "Prints the hash with file path and version data."
                    },
                    {
                        code: "prettydiff hash string \"I love kittens.\"",
                        defined: "Hash an arbitrary string directly from shell input."
                    },
                    {
                        code: "prettydiff hash http://prettydiff.com/",
                        defined: "Hash a resource from the web."
                    },
                    {
                        code: "prettydiff hash path/to/directory",
                        defined: "Directory hash recursively gathers all descendant artifacts and hashes the contents of each of those items that are files, hashes the paths of directories, sorts this list, and then hashes the list of hashes."
                    }
                ]
            },
            help: {
                description: "Introductory information to Pretty Diff on the command line.",
                example: [{
                    code: "prettydiff help",
                    defined: "Writes help text to shell."
                }]
            },
            lint: {
                description: "Use ESLint against all JavaScript files in a specified directory tree.",
                example: [
                    {
                        code: "prettydiff lint ../tools",
                        defined: "Lints all the JavaScript files in that location and in its subdirectories."
                    },
                    {
                        code: "prettydiff lint",
                        defined: "Specifying no location defaults to the Pretty Diff application directory."
                    },
                    {
                        code: "prettydiff lint ../tools ignore [node_modules, .git, test, units]",
                        defined: "An ignore list is also accepted if there is a list wrapped in square braces following the word 'ignore'."
                    }
                ]
            },
            minify: {
                description: "Remove all unnecessary white space and comments from code.",
                example: [
                    {
                        code: "prettydiff minify my/file/path/file.js",
                        defined: "Performs Pretty Diff's minify operation."
                    },
                    {
                        code: "prettydiff minify my/file/path/directory",
                        defined: "Performs Pretty Diff's minify operation against all files in the directory."
                    },
                    {
                        code: "prettydiff minify http://example.com/webThing.xml",
                        defined: "Performs a HTTP get operation for URI values and then minifies the specified resource."
                    }
                ]
            },
            options: {
                description: "List all Pretty Diff's options to the console or gather instructions on a specific option.",
                example: [
                    {
                        code: "prettydiff options",
                        defined: "List all options and their definitions to the shell."
                    },
                    {
                        code: "prettydiff options mode",
                        defined: "Writes details about the specified option to the shell."
                    },
                    {
                        code: "prettydiff options api:any lexer:script values",
                        defined: "The option list can be queried against key and value (if present) names. This example will return only options that work with the script lexer, takes specific values, and aren't limited to a certain API environment."
                    }
                ]
            },
            parse: {
                description: "Generate a parse table of a code sample.",
                example: [
                    {
                        code: "prettydiff parse my/file/path.js",
                        defined: "Returns the parse table for the specified resource."
                    },
                    {
                        code: "prettydiff parse http://example.com/webThing.xml",
                        defined: "Performs a HTTP get operation for URI values and then returns the parse table for the specified resource."
                    }
                ]
            },
            remove: {
                description: "Remove a file or directory tree from the local file system.",
                example: [
                    {
                        code: "prettydiff remove path/to/resource",
                        defined: "Removes the specified resource."
                    },
                    {
                        code: "prettydiff remove \"C:\\Program Files\"",
                        defined: "Quote the path if it contains non-alphanumeric characters."
                    }
                ]
            },
            server: {
                description: "Launches a HTTP service and web sockets so that the web tool is automatically refreshed once code changes in the local file system.",
                example: [
                    {
                        code: "prettydiff server",
                        defined: "Launches the server on default port 9001 and web sockets on port 9002."
                    },
                    {
                        code: "prettydiff server 8080",
                        defined: "If a numeric argument is supplied the web server starts on the port specified and web sockets on the following port."
                    }
                ]
            },
            simulation: {
                description: "Launches a test runner to execute the various commands of the services file.",
                example: [{
                    code: "prettydiff simulation",
                    defined: "Runs tests against the commands offered by the services file."
                }]
            },
            validation: {
                description: "Runs Pretty Diff against various code samples and compares the generated output against known good output looking for regression errors.",
                example: [{
                    code: "prettydiff validation",
                    defined: "Runs the unit test runner against Pretty Diff"
                }]
            },
            version: {
                description: "Prints the current version number and date of prior modification to the console.",
                example: [{
                    code: "prettydiff version",
                    defined: "Prints the current version number and date to the shell."
                }]
            }
        },
        command:string = (function node_command():string {
            let comkeys:string[] = Object.keys(commands),
                filtered:string[] = [],
                a:number = 0,
                b:number = 0,
                mode:string = "";
            if (process.argv[2] === undefined) {
                console.log("");
                console.log("Pretty Diff requires a command. Try:");
                console.log(`global install - ${text.cyan}prettydiff help${text.none}`);
                console.log(`local install  - ${text.cyan}node js/services help${text.none}`);
                console.log("");
                console.log("To see a list of commands try:");
                console.log(`global install - ${text.cyan}prettydiff commands${text.none}`);
                console.log(`local install  - ${text.cyan}node js/services commands${text.none}`);
                console.log("");
                process.exit(1);
                return;
            }
            const arg:string = process.argv[2],
                boldarg:string = text.angry + arg + text.none,
                len:number = arg.length + 1,
                commandFilter = function node_command_commandFilter(item:string):boolean {
                    if (item.indexOf(arg.slice(0, a)) === 0) {
                        return true;
                    }
                    return false;
                },
                modeval = function node_command_modeval():boolean {
                    let a:number = 0;
                    const len:number = process.argv.length;
                    if (len > 0) {
                        do {
                            if (process.argv[a].indexOf("mode") === 0) {
                                if (process.argv[a].indexOf("beautify") > 0) {
                                    mode = "beautify";
                                } else if (process.argv[a].indexOf("diff") > 0) {
                                    mode = "diff";
                                } else if (process.argv[a].indexOf("minify") > 0) {
                                    mode = "minify";
                                } else if (process.argv[a].indexOf("parse") > 0) {
                                    mode = "parse";
                                } else {
                                    return false;
                                }
                                console.log("");
                                console.log(`${boldarg} is not a supported command. Pretty Diff is assuming command ${text.bold + text.cyan + mode + text.none}.`);
                                console.log("");
                                return true;
                            }
                            a = a + 1;
                        } while (a < len);
                    }
                    return false;
                };
            process.argv = process.argv.slice(3);

            // trim empty values
            b = process.argv.length;
            do {
                if (process.argv[a] === "") {
                    process.argv.splice(a, 1);
                    b = b - 1;
                }
                a = a + 1;
            } while (a < b);

            // filter available commands against incomplete input
            a = 1;
            do {
                filtered = comkeys.filter(commandFilter);
                a = a + 1;
            } while (filtered.length > 1 && a < len);

            if (filtered.length < 1) {
                if (modeval() === true) {
                    return mode;
                }
                console.log(`Command ${boldarg} is not a supported command.`);
                console.log(`Please try: ${text.cyan}prettydiff commands${text.none}`);
                process.exit(1);
                return "";
            }
            if (filtered.length > 1) {
                if (modeval() === true) {
                    return mode;
                }
                console.log(`Command '${boldarg}' is ambiguous as it could refer to any of: [${text.cyan + filtered.join(", ") + text.none}]`);
                process.exit(1);
                return "";
            }
            if (arg !== filtered[0]) {
                console.log("");
                console.log(`${boldarg} is not a supported command. Pretty Diff is assuming command ${text.bold + text.cyan + filtered[0] + text.none}.`);
                console.log("");
            }
            return filtered[0];
        }()),
        exclusions = (function node_exclusions():string[] {
            const args = process.argv.join(" "),
                match = args.match(/\signore\s*\[/);
            if (match !== null) {
                const start:number = args.indexOf(match[0]);
                let a:number = start,
                    len:number = args.length;
                do {
                    if (args.charAt(a) === "]" && (a === len - 1 || (/\s/).test(args.charAt(a + 1)) === true)) {
                        break;
                    }
                    a = a + 1;
                } while (a < len);
                if (a < len) {
                    const exs:string = args.slice(start, a + 1),
                        arglist:string[] = [],
                        list:string[] = exs.replace(/\signore\s*\[/, "").replace(/\]$/, "").replace(/\s*,\s*/g, ",").split(","),
                        esctest = function node_exclusions_esctest():boolean {
                            let b:number = a - 1;
                            if (args.charAt(b) !== "\\") {
                                return false;
                            }
                            do {
                                b = b - 1;
                            } while (b > 0 && args.charAt(b) === "\\");
                            if (a - b % 2 === 0) {
                                return true;
                            }
                            return false;
                        };
                    let quote:string = "",
                        startIndex:number = -1;
                    a = 0;
                    len = args.length;
                    do {
                        if (a === 0 || ((/\s/).test(args.charAt(a)) === false && quote === "" && startIndex < 0)) {
                            startIndex = a;
                            if (args.charAt(a) === "\"" || args.charAt(a) === "'") {
                                quote = args.charAt(a);
                            } else if (args.slice(a, a + 6) === "ignore" && (args.charAt(a + 7) === "[" || (/\s/).test(args.charAt(a + 7)) === true)) {
                                quote = "]";
                            }
                        } else if (esctest() === false) {
                            if (args.charAt(a) === quote) {
                                if (quote !== "]") {
                                    arglist.push(args.slice(startIndex, a + 1));
                                }
                                quote = "";
                                startIndex = -1;
                            } else if (startIndex > -1 && quote === "" && (/\s/).test(args.charAt(a)) === true) {
                                arglist.push(args.slice(startIndex, a));
                                startIndex = -1;
                            }
                        }
                        a = a + 1;
                    } while (a < len);
                    if (startIndex > -1) {
                        arglist.push(args.slice(startIndex));
                    }
                    process.argv = arglist;
                    a = 0;
                    len = list.length;
                    do {
                        list[a] = list[a].replace(/\/|\\/g, sep);
                        a = a + 1;
                    } while (a < len);
                    return list;
                }
            }
            return [];
        }()),
        apps:any = {};
    let verbose:boolean = false,
        errorflag:boolean = false,
        writeflag:string = ""; // location of written assets in case of an error and they need to be deleted
    
    (function node_args():void {
        const requireDir = function node_args_requireDir(dirName:string):void {
                let counts = {
                    items: 0,
                    total: 0
                };
                const dirlist:string[] = dirName.split(sep),
                    dirname:string = (dirlist[dirlist.length - 1] === "")
                        ? dirlist[dirlist.length - 2]
                        : dirlist[dirlist.length - 1],
                    completeTest = function node_args_requireDir_completeTest(filesLength:number):boolean {
                        counts.total = counts.total + filesLength;
                        if (counts.total === counts.items) {
                            dirs = dirs + 1;
                            if (dirs === dirstotal) {
                                if (process.argv.length > 0) {
                                    readOptions();
                                }
                                apps[command]();
                            }
                            return true;
                        }
                        return false;
                    },
                    readdir = function node_args_requireDir_dirwrapper(start:string):void {
                        node.fs.readdir(start, function node_args_requireDir_dirwrapper_readdir(err:Error, files:string[]) {
                            if (err !== null) {
                                apps.errout([err.toString()]);
                                return;
                            }
                            if (completeTest(files.length) === true) {
                                return;
                            }
                            files.forEach(function node_args_requireDir_dirwrapper_readdir_each(value:string) {
                                const valpath:string = start + sep + value;
                                node.fs.stat(valpath, function node_args_requireDir_dirwrapper_readdir_each_stat(errs:Error, stats:Stats):void {
                                    if (errs !== null) {
                                        apps.errout([errs.toString()]);
                                        return;
                                    }
                                    if (stats.isFile() === true) {
                                        require(valpath);
                                        counts.items = counts.items + 1;
                                    } else if (stats.isDirectory() === true) {
                                        node_args_requireDir_dirwrapper(valpath);
                                    } else {
                                        counts.items = counts.items + 1;
                                    }
                                    if (completeTest(0) === true) {
                                        return;
                                    }
                                });
                            });
                        });
                    };
                prettydiff[dirname] = {};
                dirstotal = dirstotal + 1;
                readdir(dirName);
            },
            readOptions = function node_args_readOptions():void {
                const list:string[] = process.argv,
                    def = prettydiff.api.optionDef,
                    keys:string[] = (command === "options")
                        ? Object.keys(def.mode)
                        : [],
                    obj = (command === "options")
                        ? def.mode
                        : options,
                    optionName = function node_args_optionName(bindArgument:boolean):void {
                        if (a === 0 || options[list[a]] === undefined) {
                            if (keys.indexOf(list[a]) < 0 && options[list[a]] === undefined) {
                                list.splice(a, 1);
                                len = len - 1;
                                a = a - 1;
                            }
                            return;
                        }
                        if (bindArgument === true) {
                            if (list[a + 1] !== undefined && list[a + 1].length > 0) {
                                list[a] = `${list[a]}:${list[a + 1]}`;
                                list.splice(a + 1, 1);
                                len = len - 1;
                            } else {
                                list[a] = list[a];
                            }
                        }
                        list.splice(0, 0, list[a]);
                        list.splice(a + 1, 1);
                    };
                let split:string = "",
                    value:string = "",
                    name:string = "",
                    a:number = 0,
                    si:number = 0,
                    len:number = list.length;
                do {
                    list[a] = list[a].replace(/^(-+)/, "");
                    if (list[a] === "verbose") {
                        verbose = true;
                        list.splice(a, 1);
                        len = len - 1;
                        a = a - 1;
                    } else {
                        si = list[a].indexOf("=");
                        if (
                            si > 0 &&
                            (list[a].indexOf("\"") < 0 || si < list[a].indexOf("\"")) &&
                            (list[a].indexOf("'") < 0 || si < list[a].indexOf("'")) &&
                            (si < list[a].indexOf(":") || list[a].indexOf(":") < 0)
                        ) {
                            split = "=";
                        } else {
                            split = ":";
                        }
                        if (list[a + 1] === undefined) {
                            si = 99;
                        } else {
                            si = list[a + 1].indexOf(split);
                        }
                        if (
                            obj[list[a]] !== undefined &&
                            list[a + 1] !== undefined &&
                            obj[list[a + 1]] === undefined &&
                            (
                                si < 0 || 
                                (si > list[a + 1].indexOf("\"") && list[a + 1].indexOf("\"") > -1) ||
                                (si > list[a + 1].indexOf("'") && list[a + 1].indexOf("'") > -1)
                            )
                        ) {
                            if (command === "options") {
                                optionName(true);
                            } else {
                                options[list[a]] = list[a + 1];
                                a = a + 1;
                            }
                        } else if (list[a].indexOf(split) > 0 || (list[a].indexOf(split) < 0 && list[a + 1] !== undefined && (list[a + 1].charAt(0) === ":" || list[a + 1].charAt(0) === "="))) {
                            if (list[a].indexOf(split) > 0) {
                                name = list[a].slice(0, list[a].indexOf(split)).toLowerCase();
                                value = list[a].slice(list[a].indexOf(split) + 1);
                            } else {
                                name = list[a].toLowerCase();
                                value = list[a + 1].slice(1);
                                list.splice(a + 1, 1);
                                len = len - 1;
                            }
                            if (command === "options") {
                                if (keys.indexOf(name) > -1) {
                                    if (value !== undefined && value.length > 0) {
                                        list[a] = `${name}:${value}`;
                                    } else {
                                        list[a] = name;
                                    }
                                } else {
                                    list.splice(a, 1);
                                    len = len - 1;
                                }
                            } else if (options[name] !== undefined) {
                                if (value === "true" && def[name].type === "boolean") {
                                    options[name] = true;
                                } else if (value === "false" && def[name].type === "boolean") {
                                    options[name] = false;
                                } else if (isNaN(Number(value)) === false && def[name].type === "number") {
                                    options[name] = Number(value);
                                } else if (def[name].values !== undefined && def[name].values[value] !== undefined) {
                                    options[name] = value;
                                } else if (def[name].values === undefined) {
                                    options[name] = value;
                                }
                            }
                        } else if (command === "options") {
                            optionName(false);
                        }
                    }
                    a = a + 1;
                } while (a < len);
                if (options.source === "" && process.argv.length > 0 && process.argv[0].indexOf("=") < 0 && process.argv[0].replace(/^[a-zA-Z]:\\/, "").indexOf(":") < 0) {
                    options.source = process.argv[0];
                }
            };
        let dirs:number = 0,
            dirstotal:number = 0;
        options.binary_check = (
            // eslint-disable-next-line
            /\u0000|\u0001|\u0002|\u0003|\u0004|\u0005|\u0006|\u0007|\u000b|\u000e|\u000f|\u0010|\u0011|\u0012|\u0013|\u0014|\u0015|\u0016|\u0017|\u0018|\u0019|\u001a|\u001c|\u001d|\u001e|\u001f|\u007f|\u0080|\u0081|\u0082|\u0083|\u0084|\u0085|\u0086|\u0087|\u0088|\u0089|\u008a|\u008b|\u008c|\u008d|\u008e|\u008f|\u0090|\u0091|\u0092|\u0093|\u0094|\u0095|\u0096|\u0097|\u0098|\u0099|\u009a|\u009b|\u009c|\u009d|\u009e|\u009f/g
        );
        global.prettydiff = prettydiff;
        libFiles.forEach(function node_args_each(value:string) {
            requireDir(value);
        });
    }());
    apps.base64 = function node_apps_base64():void {
        let direction:string = (process.argv[0] === "encode" || process.argv[0] === "decode")
                ? process.argv[0]
                : "encode",
            http:boolean = false,
            path:string = (process.argv[0] === "encode" || process.argv[0] === "decode")
                ? process.argv[1]
                : process.argv[0];
        const screen = function node_apps_base64_screen(string:string) {
                const output = (direction === "decode")
                    ? Buffer.from(string, "base64").toString("utf8")
                    : Buffer.from(string).toString("base64");
                if (verbose === true) {
                    apps.log([output]);
                } else {
                    console.log(output);
                }
            },
            fileWrapper = function node_apps_base64_fileWrapper(filepath):void {
                node
                .fs
                .stat(filepath, function node_apps_base64_fileWrapper_stat(er:Error, stat:Stats):void {
                    const angrypath:string = `filepath ${text.angry + filepath + text.none} is not a file or directory.`,
                        file = function node_apps_base64_fileWrapper_stat_file():void {
                            node
                            .fs
                            .open(filepath, "r", function node_apps_base64_fileWrapper_stat_file_open(ero:Error, fd:number):void {
                                let buff  = Buffer.alloc(stat.size);
                                if (ero !== null) {
                                    if (http === true) {
                                        apps.remove(filepath);
                                    }
                                    apps.errout([ero.toString()]);
                                    return;
                                }
                                node
                                    .fs
                                    .read(
                                        fd,
                                        buff,
                                        0,
                                        stat.size,
                                        0,
                                        function node_apps_base64_fileWrapper_stat_file_open_read(erra:Error, bytesa:number, buffera:Buffer):number {
                                            if (http === true) {
                                                apps.remove(filepath);
                                            }
                                            if (erra !== null) {
                                                apps.errout([erra.toString()]);
                                                return;
                                            }
                                            const output = (direction === "decode")
                                                ? Buffer.from(buffera.toString("utf8"), "base64").toString("utf8")
                                                : buffera.toString("base64");
                                            if (verbose === true) {
                                                apps.log([output]);
                                            } else {
                                                console.log(output);
                                            }
                                        }
                                    );
                            });
                        };
                    if (er !== null) {
                        if (http === true) {
                            apps.remove(filepath);
                        }
                        if (er.toString().indexOf("no such file or directory") > 0) {
                            apps.errout([angrypath]);
                            return;
                        }
                        apps.errout([er.toString()]);
                        return;
                    }
                    if (stat === undefined) {
                        if (http === true) {
                            apps.remove(filepath);
                        }
                        apps.errout([angrypath]);
                        return;
                    }
                    if (stat.isFile() === true) {
                        file();
                    }
                });
            };
            if (path === undefined) {
                apps.errout([`No path to encode.  Please see ${text.cyan}prettydiff commands base64${text.none} for examples.`]);
                return;
            }
            if (path.indexOf("string:") === 0) {
                path = path.replace("string:", "");
                if (path.charAt(0) === "\"" && path.charAt(path.length - 1) === "\"") {
                    path.slice(1, path.length - 1);
                } else if (path.charAt(0) === "'" && path.charAt(path.length - 1) === "'") {
                    path.slice(1, path.length - 1);
                }
                screen(path);
                return;
            }
            if ((/https?:\/\//).test(path) === true) {
                http = true;
                apps.get(path, "source", screen);
            } else {
                fileWrapper(path);
            }
        };
    // mode beautify
    apps.beautify = function node_apps_beautify():void {
        apps.readMethod(false, function node_apps_beautify_callback() {
            return;
        });
    };
    // build system
    apps.build = function node_apps_build():void {
        let firstOrder:boolean = true;
        const order = [
                "npminstall",
                "language",
                "typescript",
                "libraries",
                "lint",
                "parseFramework",
                "simulation"
            ],
            orderlen:number = order.length,
            heading = function node_apps_build_heading(message:string):void {
                if (firstOrder === true) {
                    console.log("");
                    firstOrder = false;
                } else if (order.length < orderlen) {
                    console.log("________________________________________________________________________");
                    console.log("");
                }
                console.log(text.cyan + message + text.none);
                console.log("");
            },
            next = function node_apps_build_next():void {
                let phase = order[0];
                if (order.length < 1) {
                    verbose = true;
                    heading("All tasks complete... Exiting clean!\u0007");
                    apps.log([""]);
                    process.exit(0);
                    return;
                }
                order.splice(0, 1);
                phases[phase]();
            },
            phases = {
                language: function node_apps_build_language():void {
                    heading("Sourcing Language File");
                    node.fs.readFile(`${projectPath}node_modules${sep}parse-framework${sep}language.ts`, "utf8", function node_args_language(err:Error, fileData:string) {
                        if (err !== null) {
                            console.log(err.toString());
                            return;
                        }
                        fileData = fileData.replace("global.parseFramework.language", "global.prettydiff.api.language");
                        node.fs.writeFile(`api${sep}language.ts`, fileData, function node_args_language_write(errw:Error) {
                            if (errw !== null) {
                                console.log(errw.toString());
                                return;
                            }
                            console.log(`${apps.humantime(false) + text.green}Language dependency file sourced from parse-framework.${text.none}`);
                            next();
                        });
                    });
                },
                libraries: function node_apps_build_libraries():void {
                    let domlibs:string = "";
                    const flag = {
                            documentation: false,
                            dom: false,
                            html: false,
                            node: false
                        },
                        optkeys:string[] = Object.keys(prettydiff.api.optionDef),
                        keyslen:number = optkeys.length,
                        versionData = {
                            date: "",
                            number: "",
                            parse: ""
                        },
                        modifyFile = function node_apps_build_libraries_modifyFile(file:string, fileFlag:string):void {
                            node.fs.readFile(file, "utf8", function node_apps_build_libraries_modifyFile(err:Error, data:string):void {
                                const modify = function node_apps_build_libraries_modifyFile_modify(ops:modifyOps):void {
                                        const start:number = (function node_apps_build_libraries_modifyFile_modify_startBuild():number {
                                                const len = (ops.start.indexOf("//") === 0)
                                                    ? (function node_apps_build_libraries_modifyFile_modify_startBuild_lineStart():number {
                                                        data = data.replace(new RegExp(ops.start + "\\s+"), ops.start + "\n");
                                                        return ops.start.length + 1;
                                                    }())
                                                    : ops.start.length;
                                                return data.indexOf(ops.start) + len;
                                            }()),
                                            end:number = data.indexOf(ops.end);
                                        if (ops.end.indexOf("//") === 0) {
                                            data = data.replace(new RegExp(ops.end + "\\s+"), ops.end + "\n");
                                        }
                                        data = [data.slice(0, start), ops.injectFlag + "\n", data.slice(end)].join("");
                                    },
                                    buildDefaults = function node_apps_build_libraries_modifyFile_buildDefault(api:"dom"|"node"):string {
                                        const obj:any = {},
                                            verse:string = (api === "node")
                                                ? `version=${JSON.stringify(versionData)},`
                                                : "";
                                        let a:number = 0,
                                            apikey = "";
                                        do {
                                            apikey = prettydiff.api.optionDef[optkeys[a]].api;
                                            if (apikey === "any" || apikey === api) {
                                                obj[optkeys[a]] = prettydiff.api.optionDef[optkeys[a]].default;
                                            }
                                            a = a + 1;
                                        } while (a < keyslen);
                                        obj.lexerOptions = {};
                                        return `options=${JSON.stringify(obj)},${verse}`;
                                    },
                                    buildDocumentation = function node_apps_build_libraries_modifyFile_buildDocumentation():string {
                                        const allOptions:string[] = [];
                                        let a:number = 0,
                                            b:number = 0,
                                            vals:string[],
                                            vallen:number,
                                            item:string[],
                                            optName:string,
                                            opt:option;
                                        do {
                                            optName = optkeys[a];
                                            opt = prettydiff.api.optionDef[optName];
                                            item = [`<li id="${optName}">`];
                                            item.push(`<h4>${optName}</h4>`);
                                            item.push(`<ul><li><h5>Description</h5>`);
                                            item.push(opt.definition);
                                            item.push(`</li><li><h5>Environment</h5>`);
                                            item.push(opt.api);
                                            item.push(`</li><li><h5>Type</h5>`);
                                            item.push(opt.type);
                                            item.push(`</li><li><h5>Mode</h5>`);
                                            item.push(opt.mode);
                                            item.push(`</li><li><h5>Lexer</h5>`);
                                            item.push(opt.lexer);
                                            if (opt.values !== undefined) {
                                                b = 0;
                                                vals = Object.keys(opt.values);
                                                vallen = vals.length;
                                                item.push(`</li><li><h5>Accepted Values</h5><dl>`);
                                                do {
                                                    item.push(`<dt>${vals[b]}</dt><dd>${opt.values[vals[b]]}</dd>`);
                                                    b = b + 1;
                                                } while (b < vallen);
                                                item.push(`</dl>`);
                                            }
                                            item.push(`</li><li><h5>Default</h5>`);
                                            item.push(String(opt.default));
                                            item.push(`</li><li><h5>As labeled in the HTML tool</h5>`);
                                            item.push(opt.label);
                                            item.push(`</li></ul></li>`);
                                            allOptions.push(item.join(""));
                                            a = a + 1;
                                        } while (a < keyslen);
                                        return allOptions.join("");
                                    },
                                    buildDomInterface = function node_apps_build_libraries_modifyFile_buildDomInterface():string {
                                        const allItems:string[] = [],
                                            exclusions = {
                                                "diff": "",
                                                "difflabel": "",
                                                "mode": "",
                                                "source": "",
                                                "sourcelabel": ""
                                            };
                                        let a:number = 0,
                                            b:number = 0,
                                            item:string[],
                                            optName:string,
                                            opt:option,
                                            vals:string[],
                                            vallen:number,
                                            select:boolean = false;
                                        do {
                                            optName = optkeys[a];
                                            opt = prettydiff.api.optionDef[optName];
                                            if (exclusions[optName] !== "" && (opt.api === "any" || opt.api === "dom")) {
                                                item = [`<li data-mode="${opt.mode}">`];
                                                if (opt.type === "boolean") {
                                                    item.push(`<p class="label">${opt.label} <a class="apiname" href="documentation.xhtml#${optName}">(${optName})</a></p>`);
                                                    if (opt.default === true) {
                                                        item.push(`<span><input type="radio" id="option-false-${optName}" name="option-${optName}" value="false"/> <label for="option-false-${optName}">false</label></span>`);
                                                        item.push(`<span><input type="radio" checked="checked" id="option-true-${optName}" name="option-${optName}" value="true"/> <label for="option-true-${optName}">true</label></span>`);
                                                    } else {
                                                        item.push(`<span><input type="radio" checked="checked" id="option-false-${optName}" name="option-${optName}" value="false"/> <label for="option-false-${optName}">false</label></span>`);
                                                        item.push(`<span><input type="radio" id="option-true-${optName}" name="option-${optName}" value="true"/> <label for="option-true-${optName}">true</label></span>`);
                                                    }
                                                    select = false;
                                                } else {
                                                    item.push(`<label for="option-${optName}" class="label">${opt.label}`);
                                                    item.push(` <a class="apiname" href="documentation.xhtml#${optName}">(${optName})</a>`);
                                                    item.push(`</label>`);
                                                    if (opt.type === "number" || (opt.type === "string" && opt.values === undefined)) {
                                                        item.push(`<input type="text" id="option-${optName}" value="${opt.default}" data-type="${opt.type}"/>`);
                                                        select = false;
                                                    } else {
                                                        item.push(`<select id="option-${optName}">`);
                                                        vals = Object.keys(opt.values);
                                                        vallen = vals.length;
                                                        b = 0;
                                                        do {
                                                            item.push(`<option data-description="${opt.values[vals[b]].replace(/"/g, "&quot;")}" ${
                                                                (opt.default === vals[b])
                                                                    ? "selected=\"selected\""
                                                                    : ""
                                                            }>${vals[b]}</option>`);
                                                            b = b + 1;
                                                        } while (b < vallen);
                                                        item.push(`</select>`);
                                                        select = true;
                                                    }
                                                }
                                                item.push(`<p class="option-description">${opt.definition.replace(/"/g, "&quot;")}`);
                                                if (select === true) {
                                                    item.push(` <span><strong>${opt.default}</strong> &mdash; ${opt.values[String(opt.default)]}</span>`);
                                                }
                                                item.push("</p>");
                                                item.push(`<div class="disabled" style="display:none"></div>`);
                                                item.push(`</li>`);
                                                allItems.push(item.join(""));
                                            }
                                            a = a + 1;
                                        } while (a < keyslen);
                                        return allItems.join("");
                                    };
                                if (err !== null && err.toString() !== "") {
                                    apps.errout([err.toString()]);
                                    return;
                                }
                                if (fileFlag === "documentation") {
                                    modify({
                                        end: "<!-- option list end -->",
                                        injectFlag: buildDocumentation(),
                                        start: "<!-- option list start -->"
                                    });
                                } else if (fileFlag === "html") {
                                    modify({
                                        end: "<!-- documented options end -->",
                                        injectFlag: buildDomInterface(),
                                        start: "<!-- documented options start -->"
                                    });
                                    modify({
                                        end: "<!-- end version data -->",
                                        injectFlag: `<strong>${versionData.date}</strong> <span>Version: <strong>${versionData.number}</strong></span>`,
                                        start: "<!-- start version data -->"
                                    });
                                } else if (fileFlag === "dom") {
                                    modify({
                                        end: "// end option defaults",
                                        injectFlag: buildDefaults("dom"),
                                        start:"// start option defaults"
                                    });
                                    modify({
                                        end: "// prettydiff insertion end",
                                        injectFlag: domlibs
                                            .replace(/\/\*global prettydiff\*\//g, "")
                                            .replace(/("|')use strict("|');/g, ""),
                                        start: "// prettydiff insertion start"
                                    });
                                } else if (fileFlag === "node") {
                                    modify({
                                        end: "// node option default end",
                                        injectFlag: buildDefaults("node"),
                                        start:"// node option default start"
                                    });
                                }
                                node.fs.writeFile(file, data, function node_apps_build_libraries_documentation_write(errw:Error) {
                                    if (errw !== null && errw.toString() !== "") {
                                        apps.errout([errw.toString()]);
                                        return;
                                    }
                                    flag[fileFlag] = true;
                                    if (flag.documentation === true && flag.dom === true && flag.html === true && flag.node === true) {
                                        console.log(`${apps.humantime(false) + text.green}Option details written to files.${text.none}`);
                                        next();
                                    }
                                });
                            });
                        },
                        version = function node_apps_build_libraries_version(file:string, fileFlag:string):void {
                            if (versionData.number !== "") {
                                modifyFile(file, fileFlag);
                                return;
                            }
                            node.child(`git log -1 --branches`, function node_apps_build_libraries_version_child(err:Error, stderr:string):void {
                                if (err !== null) {
                                    apps.errout([err.toString()]);
                                    return;
                                }
                                const date:string[] = stderr.slice(stderr.indexOf("Date:") + 12).split(" ");
                                versionData.date = `${date[1]} ${date[0]} ${date[3]}`;
                                node.fs.readFile(`${projectPath}package.json`, "utf8", function node_apps_build_libraries_version_child_readPackage(errp:Error, data:string):void {
                                    if (errp !== null) {
                                        apps.errout([errp.toString()]);
                                        return;
                                    }
                                    versionData.number = JSON.parse(data).version;
                                    node.fs.readFile(`${projectPath}node_modules${sep}parse-framework${sep}package.json`, "utf8", function node_apps_build_libraries_version_child_readPackage_readFramework(errf:Error, frameData:string):void {
                                        if (errf !== null) {
                                            apps.errout([errf.toString()]);
                                            return;
                                        }
                                        versionData.parse = JSON.parse(frameData).version;
                                    });
                                    modifyFile(file, fileFlag);
                                });
                            })
                        },
                        libraryFiles = function node_apps_build_libraries_libraryFiles(callback:Function) {
                            libFiles.push(`${projectPath}node_modules${sep}file-saver${sep}FileSaver.min.js`);
                            const appendFile = function node_apps_build_libraries_libraryFiles_appendFile(filePath:string):void {
                                    node.fs.readFile(filePath, "utf8", function node_apps_build_libraries_libraryFiles_appendFile_read(errr:Error, filedata:string):void {
                                        if (errr !== null) {
                                            apps.errout([errr.toString()]);
                                            return;
                                        }
                                        if (filePath.indexOf("FileSaver") > 0) {
                                            filedata = filedata
                                                .replace(/var\s+saveAs\s*=\s*saveAs\s*\|\|\s*function\(/, `// eslint-disable-next-line${node.os.EOL}prettydiff.saveAs=function prettydiff_saveAs(`)
                                                .replace(/[{|}|;|(*/)]\s*var\s/g, function node_apps_build_libraries_libraryFiles_appendFile_read_saveAsFix(str:string):string {
                                                return str.replace("var", "let");
                                            });
                                        } else {
                                            filedata = filedata
                                                .replace(/\/\*global\s+global(,\s*options)?(,\s*prettydiff)?\s*\*\//, "")
                                                .replace(/global\.prettydiff\./g, "prettydiff.");
                                        }
                                        domlibs = domlibs + filedata;
                                        a = a + 1;
                                        if (a === filelen) {
                                            callback();
                                        }
                                    });
                                },
                                stat = function node_apps_build_libraries_libraryFiles_stat(pathitem:string) {
                                    node.fs.stat(pathitem, function node_apps_build_libraries_libraryFiles_stat_callback(errs:Error, stats:Stats):void {
                                        if (errs !== null) {
                                            apps.errout([errs.toString()]);
                                            return;
                                        }
                                        if (stats.isDirectory() === true) {
                                            node.fs.readdir(pathitem, "utf8", function node_apps_build_libraries_libraryFiles_stat_callback_readdir(errd:Error, filelist:string[]):void {
                                                if (errd !== null) {
                                                    apps.errout([errd.toString()]);
                                                    return;
                                                }
                                                const dirnames:string[] = pathitem.split(sep).filter(dirs => dirs !== ""),
                                                    groupname:string = dirnames[dirnames.length - 1];
                                                domlibs = domlibs + `prettydiff.${groupname}={};`;
                                                filelen = filelen + (filelist.length - 1);
                                                filelist.forEach(function node_apps_build_libraries_libraryFiles_stat_callback_readdir_each(value:string):void {
                                                    node_apps_build_libraries_libraryFiles_stat(pathitem + sep + value);
                                                });
                                            });
                                        } else if (stats.isFile() === true) {
                                            appendFile(pathitem);
                                        }
                                    });
                                };
                            let a:number = 0,
                                filelen: number = libFiles.length;
                            libFiles.forEach(function node_apps_build_libraries_libraryFiles_each(value:string) {
                                stat(value);
                            });
                        };
                    heading("Building Options");
                    libraryFiles(function node_apps_build_libraries_libraryCallback() {
                        modifyFile(`${js}dom.js`, "dom");
                        version(`${js}services.js`, "node");
                    });
                    version(`${projectPath}index.xhtml`, "html");
                    modifyFile(`${projectPath}documentation.xhtml`, "documentation");
                },
                lint     : function node_apps_build_lint():void {
                    heading("Linting");
                    apps.lint(next);
                },
                npminstall: function node_apps_build_npminstall():void {
                    heading("First Time Developer Dependency Installation");
                    node.fs.stat(`${projectPath}node_modules${sep}ace-builds`, function node_apps_build_npminstall_stat(errs:Error):void {
                        if (errs !== null) {
                            if (errs.toString().indexOf("no such file or directory") > 0) {
                                node.child("npm install", {
                                    cwd: projectPath
                                }, function node_apps_build_npminstall_stat_child(err:Error, stdout:string, stderr:string) {
                                    if (err !== null) {
                                        apps.errout([err.toString()]);
                                        return;
                                    }
                                    if (stderr !== "") {
                                        apps.errout([stderr]);
                                        return;
                                    }
                                    console.log(`${apps.humantime(false) + text.green}Installed dependencies.${text.none}`);
                                    next();
                                });
                            } else {
                                apps.errout([errs.toString()]);
                                return;
                            }
                        } else {
                            console.log(`${apps.humantime(false) + text.green}Dependencies appear to be already installed...${text.none}`);
                            next();
                        }
                    });
                },
                parseFramework: function node_apps_build_parseFramework():void {
                    heading("Checking for built parse-framework");
                    const frame:string = `node_modules${sep}parse-framework`;
                    node.fs.stat(`${frame + sep}js${sep}parse.js`, function node_apps_build_parseFramework(ers:nodeError):void {
                        if (ers !== null) {
                            if (ers.code === "ENOENT") {
                                console.log(`${apps.humantime(false)}Parse Framework does not appear to be built... building now.`);
                                node.child(`tsc --pretty`, {
                                    cwd: frame
                                }, function node_apps_build_parseFramework_tsc(err:Error, stdout:string, stderr:string):void {
                                    if (err !== null) {
                                        apps.errout([err.toString()]);
                                        return;
                                    }
                                    if (stderr !== "") {
                                        apps.errout([stderr]);
                                        return;
                                    }
                                    node.child(`node js${sep}services build`, {
                                        cwd: frame
                                    }, function node_apps_build_parseFramework_tsc_build(erb:Error, stbout:string, stberr:string):void {
                                        if (erb !== null) {
                                            apps.errout([erb.toString()]);
                                            return;
                                        }
                                        if (stberr !== "") {
                                            apps.errout([stberr]);
                                            return;
                                        }
                                        console.log(`${apps.humantime(false) + text.green}The parse-framework dependency built.${text.none}`);
                                        next();
                                    });
                                });
                            } else {
                                apps.errout([ers]);
                                return;
                            }
                        } else {
                            console.log(`${apps.humantime(false) + text.green}The parse-framework dependency appears to already be built.${text.none}`);
                            next();
                        }
                    });
                },
                simulation: function node_apps_build_simulation():void {
                    heading("Node.js task simulations");
                    apps.simulation(next);
                },
                typescript: function node_apps_build_typescript():void {
                    const flag = {
                            services: false,
                            typescript: false
                        },
                        ts = function node_apps_build_typescript_ts() {
                            node.child("tsc --pretty", {
                                cwd: projectPath
                            }, function node_apps_build_typescript_callback(err:Error, stdout:string, stderr:string):void {
                                if (stdout !== "" && stdout.indexOf(` \u001b[91merror${text.none} `) > -1) {
                                    console.log(`${text.red}TypeScript reported warnings.${text.none}`);
                                    apps.errout([stdout]);
                                    return;
                                }
                                if (err !== null) {
                                    apps.errout([err.toString()]);
                                    return;
                                }
                                if (stderr !== "") {
                                    apps.errout([stderr]);
                                    return;
                                }
                                console.log(`${apps.humantime(false) + text.green}TypeScript build completed without warnings.${text.none}`);
                                next();
                            });
                        };
                    heading("TypeScript Compilation");
                    node.fs.stat(`${projectPath}services.ts`, function node_apps_build_typescript_services(err:Error) {
                        if (err !== null) {
                            if (err.toString().indexOf("no such file or directory") > 0) {
                                console.log(`${apps.humantime(false) + text.angry}TypeScript code files not present.${text.none}`);
                                flag.services = true;
                                if (flag.typescript === true) {
                                    next();
                                }
                            } else {
                                apps.errout([err]);
                                return;
                            }
                        } else {
                            flag.services = true;
                            if (flag.typescript === true) {
                                ts();
                            }
                        }
                    });
                    node.child("tsc --version", function node_apps_build_typescript_tsc(err:Error, stdout:string, stderr:string) {
                        if (err !== null) {
                            const str = err.toString();
                            if (str.indexOf("command not found") > 0 || str.indexOf("is not recognized") > 0) {
                                console.log(`${apps.humantime(false) + text.angry}TypeScript does not appear to be installed.`);
                                console.log(`Install TypeScript with this command: ${text.green}npm install typescript -g${text.none}`);
                                flag.typescript = true;
                                if (flag.services === true) {
                                    next();
                                }
                            } else {
                                apps.errout([err.toString(), stdout]);
                            }
                        } else {
                            if (stderr !== "") {
                                apps.errout([stderr]);
                                return;
                            }
                            flag.typescript = true;
                            if (flag.services === true) {
                                ts();
                            }
                        }
                    });
                }
            };
        if (process.argv.indexOf("nocheck") > -1) {
            order.splice(order.indexOf("lint"), 1);
            order.splice(order.indexOf("simulation"), 1);
        }
        next();
    };
    // CLI commands documentation generator
    apps.commands = function node_apps_commands():void {
        const output:string[] = [];
        verbose = true;
        if (commands[process.argv[0]] === undefined) {
            // all commands in a list
            apps.lists({
                emptyline: true,
                heading: "Commands",
                obj: commands,
                property: "description"
            });
        } else {
            // specificly mentioned option
            const comm:any = commands[process.argv[0]],
                len:number = comm.example.length,
                plural:string = (len > 1)
                    ? "s"
                    : "";
            let a:number = 0;
            output.push(`${text.bold + text.underline}Pretty Diff - Command: ${text.green + process.argv[0] + text.none}`);
            output.push("");
            output.push(comm.description);
            output.push("");
            output.push(`${text.underline}Example${plural + text.none}`);
            do {
                apps.wrapit(output, comm.example[a].defined);
                output.push(`   ${text.cyan + comm.example[a].code + text.none}`);
                output.push("");
                a = a + 1;
            } while (a < len);
            apps.log(output);
        }
    };
    // converts numbers into a string of comma separated triplets
    apps.commas = function node_apps_commas(number:number):string {
        const str:string = String(number);
        let arr:string[] = [],
            a:number   = str.length;
        if (a < 4) {
            return str;
        }
        arr = String(number).split("");
        a   = arr.length;
        do {
            a      = a - 3;
            arr[a] = "," + arr[a];
        } while (a > 3);
        return arr.join("");
    };
    // bit-by-bit copy stream for the file system
    apps.copy = function node_apps_copy(params:nodeCopyParams):void {
        const numb:any  = {
                dirs : 0,
                files: 0,
                link : 0,
                size : 0
            },
            util:any  = {};
        let start:string = "",
            dest:string  = "",
            dirs:any  = {},
            target:string        = "",
            destination:string   = "",
            exlen:number = 0;
        util.complete = function node_apps_copy_complete(item:string):void {
            delete dirs[item];
            if (Object.keys(dirs).length < 1) {
                params.callback();
            }
        };
        util.eout     = function node_apps_copy_eout(er:Error):void {
            const filename:string[] = target.split(sep);
            apps.remove(
                destination + sep + filename[filename.length - 1],
                function node_apps_copy_eout_remove() {
                    apps.errout([er.toString()]);
                }
            );
        };
        util.dir      = function node_apps_copy_dir(item:string):void {
            node
                .fs
                .readdir(item, function node_apps_copy_dir_makedir_readdir(er:Error, files:string[]):void {
                    const place:string = (item === start)
                        ? dest
                        : dest + item.replace(start + sep, "");
                    if (er !== null) {
                        util.eout(er);
                        return;
                    }
                    apps.makedir(place, function node_apps_copy_dir_makedir():void {
                        const a = files.length;
                        let b = 0;
                        if (a > 0) {
                            delete dirs[item];
                            do {
                                dirs[item + sep + files[b]] = true;
                                b                                     = b + 1;
                            } while (b < a);
                            b = 0;
                            do {
                                util.stat(item + sep + files[b], item);
                                b = b + 1;
                            } while (b < a);
                        } else {
                            util.complete(item);
                        }
                    });
                });
        };
        util.file     = function node_apps_copy_file(item:string, dir:string, prop:nodeFileProps):void {
            const place:string       = (item === dir)
                    ? dest + item
                        .split(sep)
                        .pop()
                    : dest + item.replace(start + sep, ""),
                readStream:Stream  = node
                    .fs
                    .createReadStream(item),
                writeStream:Writable = node
                    .fs
                    .createWriteStream(place, {mode: prop.mode});
            let errorflag:boolean   = false;
            readStream.on("error", function node_apps_copy_file_readError(error:Error):void {
                errorflag = true;
                util.eout(error);
                return;
            });
            writeStream.on("error", function node_apps_copy_file_writeError(error:Error):void {
                errorflag = true;
                util.eout(error);
                return;
            });
            if (errorflag === false) {
                writeStream.on("open", function node_apps_copy_file_write():void {
                    readStream.pipe(writeStream);
                });
                writeStream.once("finish", function node_apps_copy_file_finish():void {
                    const filename:string[] = item.split(sep);
                    node
                        .fs
                        .utimes(
                            dest + sep + filename[filename.length - 1],
                            prop.atime,
                            prop.mtime,
                            function node_apps_copy_file_finish_utimes():void {
                                util.complete(item);
                            }
                        );
                });
            }
        };
        util.link     = function node_apps_copy_link(item:string, dir:string):void {
            node
                .fs
                .readlink(item, function node_apps_copy_link_readlink(err:Error, resolvedlink:string):void {
                    if (err !== null) {
                        util.eout(err);
                        return;
                    }
                    resolvedlink = node.path.resolve(resolvedlink);
                    node
                        .fs
                        .stat(resolvedlink, function node_apps_copy_link_readlink_stat(ers:Error, stats:Stats):void {
                            let type  = "file",
                                place = dest + item;
                            if (ers !== null) {
                                util.eout(ers);
                                return;
                            }
                            if (stats === undefined || stats.isFile === undefined) {
                                util.eout(`Error in performing stat against ${item}`);
                                return;
                            }
                            if (item === dir) {
                                place = dest + item
                                    .split(sep)
                                    .pop();
                            }
                            if (stats.isDirectory() === true) {
                                type = "junction";
                            }
                            node
                                .fs
                                .symlink(
                                    resolvedlink,
                                    place,
                                    type,
                                    function node_apps_copy_link_readlink_stat_makelink(erl:Error):void {
                                        if (erl !== null) {
                                            util.eout(erl);
                                            return;
                                        }
                                        util.complete(item);
                                    }
                                );
                        });
                });
        };
        util.stat     = function node_apps_copy_stat(item:string, dir:string):void {
            let a    = 0;
            if (exlen > 0) {
                do {
                    if (item.replace(start + sep, "") === params.exclusions[a]) {
                        params.exclusions.splice(a, 1);
                        exlen = exlen - 1;
                        util.complete(item);
                        return;
                    }
                    a = a + 1;
                } while (a < exlen);
            }
            node.fs.stat(item, function node_apps_copy_stat_callback(er:Error, stats:Stats):void {
                if (er !== null) {
                    util.eout(er);
                    return;
                }
                if (stats === undefined || stats.isFile === undefined) {
                    util.eout("stats object is undefined");
                    return;
                }
                if (stats.isFile() === true) {
                    numb.files = numb.files + 1;
                    numb.size  = numb.size + stats.size;
                    if (item === dir) {
                        apps.makedir(dest, function node_apps_copy_stat_callback_file():void {
                            util.file(item, dir, {
                                atime: (Date.parse(stats.atime.toString()) / 1000),
                                mode : stats.mode,
                                mtime: (Date.parse(stats.mtime.toString()) / 1000)
                            });
                        });
                    } else {
                        util.file(item, dir, {
                            atime: (Date.parse(stats.atime.toString()) / 1000),
                            mode : stats.mode,
                            mtime: (Date.parse(stats.mtime.toString()) / 1000)
                        });
                    }
                } else if (stats.isDirectory() === true) {
                    numb.dirs = numb.dirs + 1;
                    util.dir(item);
                } else if (stats.isSymbolicLink() === true) {
                    numb.link = numb.link + 1;
                    if (item === dir) {
                        apps.makedir(dest, function node_apps_copy_stat_callback_symb() {
                            util.link(item, dir);
                        });
                    } else {
                        util.link(item, dir);
                    }
                } else {
                    util.complete(item);
                }
            });
        };
        if (command === "copy") {
            if (process.argv[0] === undefined || process.argv[1] === undefined) {
                apps.errout([
                    "The copy command requires a source path and a destination path.",
                    `Please execute ${text.cyan}prettydiff commands copy${text.none} for examples.`
                ]);
                return;
            }
            params = {
                callback: function node_copy_callback() {
                    const out:string[] = ["Pretty Diff copied "];
                    console.log("");
                    out.push(text.green);
                    out.push(text.bold);
                    out.push(numb.dirs);
                    out.push(text.none);
                    out.push(" director");
                    if (numb.dirs === 1) {
                        out.push("y, ");
                    } else {
                        out.push("ies, ");
                    }
                    out.push(text.green);
                    out.push(text.bold);
                    out.push(numb.files);
                    out.push(text.none);
                    out.push(" file");
                    if (numb.files !== 1) {
                        out.push("s");
                    }
                    out.push(", and ");
                    out.push(text.green);
                    out.push(text.bold);
                    out.push(numb.link);
                    out.push(text.none);
                    out.push(" symbolic link");
                    if (numb.link !== 1) {
                        out.push("s");
                    }
                    out.push(" at ");
                    out.push(text.green);
                    out.push(text.bold);
                    out.push(apps.commas(numb.size));
                    out.push(text.none);
                    out.push(" bytes.");
                    verbose = true;
                    apps.log([out.join(""), `Copied ${text.cyan + target + text.none} to ${text.green + destination + text.none}`]);
                },
                exclusions: exclusions,
                destination: process.argv[1].replace(/(\\|\/)/g, sep),
                target: process.argv[0].replace(/(\\|\/)/g, sep)
            };
        }
        writeflag = target;
        target =  params.target.replace(/(\\|\/)/g, sep);
        destination = params.destination.replace(/(\\|\/)/g, sep);
        exlen = params.exclusions.length;
        dest          = node.path.resolve(destination) + sep;
        start         = node.path.resolve(target);
        util.stat(start, start);
    };
    // mode diff
    apps.diff = function node_apps_diff():void {
        if (options.diff === "" || options.source === "") {
            apps.errout([
                `Pretty Diff requires option ${text.angry}diff${text.none} and option ${text.angry}source${text.none} when using command diff. Example:`,
                `${text.cyan}prettydiff diff source:"myFile.js" diff:"myFile1.js"${text.none}`
            ]);
            return;
        }
        options.mode = "beautify";
        if (options.language !== "text") {
            const all = require(`${projectPath}node_modules${sep}parse-framework${sep}js${sep}lexers${sep}all`);
            all(options, function node_apps_diff_allLexers() {
                apps.readMethod(false, function node_apps_beautify_callback() {
                    
                });
            });
        }
    };
    // similar to node's fs.readdir, but recursive
    apps.directory = function node_apps_directory(args:readDirectory):void {
        // arguments:
        // * callback - function - the output is passed into the callback as an argument
        // * exclusions - string array - a list of items to exclude
        // * path - string - where to start in the local file system
        // * recursive - boolean - if child directories should be scanned
        // * symbolic - boolean - if symbolic links should be identified
        let dirtest:boolean = false,
            size:number = 0,
            dirs:number = 0;
        const dircount:number[] = [],
            dirnames:string[] = [],
            listonly:boolean = (command === "directory" && process.argv.indexOf("listonly") > -1),
            type:boolean = (function node_apps_directory_typeof():boolean {
                const typeindex:number = process.argv.indexOf("typeof");
                if (command === "directory" && typeindex > -1) {
                    process.argv.splice(typeindex, 1);
                    return true;
                }
                return false;
            }()),
            startPath:string = (function node_apps_directory_startPath():string {
                if (command === "directory") {
                    const len:number = process.argv.length;
                    let a:number = 0;
                    args = {
                        callback: function node_apps_directory_startPath_callback(result:string[]|directoryList) {
                            console.log(JSON.stringify(result));
                            if (verbose === true) {
                                let output:string[] = [];
                                console.log("");
                                apps.wrapit(output, `Pretty Diff found ${text.green + apps.commas(result.length) + text.none} matching items from address ${text.cyan + startPath + text.none} with a total file size of ${text.green + apps.commas(size) + text.none} bytes.`);
                                apps.log(output);
                            }
                        },
                        exclusions: exclusions,
                        path: "",
                        recursive: (process.argv.indexOf("shallow") > -1)
                            ? (function node_apps_directory_startPath_recursive():boolean {
                                process.argv.splice(process.argv.indexOf("shallow"), 1);
                                return false;
                            }())
                            : true,
                        symbolic: (process.argv.indexOf("symbolic") > -1)
                            ? (function node_apps_directory_startPath_symbolic():boolean {
                                process.argv.splice(process.argv.indexOf("symbolic"), 1);
                                return true;
                            }())
                            : false
                    };
                    if (process.argv.length < 1) {
                        apps.errout([
                            "No path supplied for the directory command. For an example please see:",
                            `    ${text.cyan}prettydiff commands directory${text.none}`
                        ]);
                        return "";
                    }
                    do {
                        if (process.argv[a].indexOf("source:") === 0) {
                            return node.path.resolve(process.argv[a].replace(/source:("|')?/, "").replace(/("|')$/, ""));
                        }
                        a = a + 1;
                    } while (a < len);
                    return node.path.resolve(process.argv[0]);
                }
                return node.path.resolve(args.path);
            }()),
            list:directoryList = [],
            filelist:string[] = [],
            method:string = (args.symbolic === true)
                ? "lstat"
                : "stat",
            dirCounter = function node_apps_directory_dirCounter(item:string):void {
                let dirlist:string[] = item.split(sep),
                    dirpath:string = "",
                    index:number = 0;
                dirlist.pop();
                dirpath = dirlist.join(sep);
                index = dirnames.indexOf(dirpath);
                dircount[index] = dircount[index] - 1;
                if (dircount[index] < 1) {
                    // dircount and dirnames are parallel arrays
                    dircount.splice(index, 1);
                    dirnames.splice(index, 1);
                    dirs = dirs - 1;
                    if (dirs < 1) {
                        if (listonly === true) {
                            args.callback(filelist.sort());
                        } else {
                            args.callback(list);
                        }
                    } else {
                        node_apps_directory_dirCounter(dirpath);
                    }
                }
            },
            statWrapper = function node_apps_directory_wrapper(filepath:string, parent:number):void {
                node.fs[method](filepath, function node_apps_directory_wrapper_stat(er:Error, stat:Stats):void {
                    const angrypath:string = `Filepath ${text.angry + filepath + text.none} is not a file or directory.`,
                        dir = function node_apps_directory_wrapper_stat_dir(item:string):void {
                            node.fs.readdir(item, {encoding: "utf8"}, function node_apps_directory_wrapper_stat_dir_readdirs(erd:Error, files:string[]):void {
                                if (erd !== null) {
                                    apps.errout([erd.toString()]);
                                    return;
                                }
                                const index:number = list.length;
                                if (listonly === true) {
                                    filelist.push(item);
                                } else {
                                    list.push([item, "directory", parent, files.length, stat]);
                                }
                                if (files.length < 1) {
                                    dirCounter(item);
                                } else {
                                    // dircount and dirnames are parallel arrays
                                    dircount.push(files.length);
                                    dirnames.push(item);
                                    dirs = dirs + 1;
                                }
                                files.forEach(function node_apps_directory_wrapper_stat_dir_readdirs_each(value:string):void {
                                    node_apps_directory_wrapper(item + sep + value, index);
                                });
                            });
                        },
                        populate = function node_apps_directory_wrapper_stat_populate(type:"link"|"file"|"directory"):void {
                            if (exclusions.indexOf(filepath.replace(startPath + sep, "")) < 0) {
                                if (listonly === true) {
                                    filelist.push(filepath);
                                } else {
                                    list.push([filepath, type, parent, 0, stat]);
                                }
                            }
                            if (dirs > 0) {
                                dirCounter(filepath);
                            } else {
                                if (listonly === true) {
                                    args.callback(filelist.sort());
                                } else {
                                    args.callback(list);
                                }
                            }
                        };
                    if (er !== null) {
                        if (er.toString().indexOf("no such file or directory") > 0) {
                            if (errorflag === true) {
                                args.callback([]);
                                return;
                            }
                            if (type === true) {
                                apps.log([`Requested artifact, ${text.cyan + startPath + text.none}, ${text.angry}is missing${text.none}.`]);
                                return;
                            }
                            apps.errout([angrypath]);
                            return;
                        }
                        apps.errout([er.toString()]);
                        return;
                    }
                    if (stat === undefined) {
                        if (type === true) {
                            apps.log([`Requested artifact, ${text.cyan + startPath + text.none}, ${text.angry}is missing${text.none}.`]);
                            return;
                        }
                        apps.errout([angrypath]);
                        return;
                    }
                    if (stat.isDirectory() === true) {
                        if (type === true) {
                            apps.log(["directory"]);
                            return;
                        }
                        if ((args.recursive === true || dirtest === false) && exclusions.indexOf(filepath.replace(startPath + sep, "")) < 0) {
                            dirtest = true;
                            dir(filepath);
                        } else {
                            populate("directory");
                        }
                    } else if (stat.isSymbolicLink() === true) {
                        if (type === true) {
                            apps.log(["symbolicLink"]);
                            return;
                        }
                        populate("link");
                    } else if (stat.isFile() === true || stat.isBlockDevice() === true || stat.isCharacterDevice() === true) {
                        if (type === true) {
                            if (stat.isBlockDevice() === true) {
                                apps.log(["blockDevice"]);
                            } else if (stat.isCharacterDevice() === true) {
                                apps.log(["characterDevice"]);
                            } else {
                                apps.log(["file"]);
                            }
                            return;
                        }
                        size = size + stat.size;
                        populate("file");
                    } else {
                        if (type === true) {
                            if (stat.isFIFO() === true) {
                                apps.log(["FIFO"]);
                            } else if (stat.isSocket() === true) {
                                apps.log(["socket"]);
                            } else {
                                apps.log(["unknown"]);
                            }
                            return;
                        }
                        list[parent][3] = list[parent][3] - 1;
                    }
                });
            };
        statWrapper(startPath, 0);
    };
    // uniform error formatting
    apps.errout = function node_apps_errout(errtext:string[]):void {
        const error = function node_apps_errout_error():void {
            const stack:string = new Error().stack.replace("Error", `${text.cyan}Stack trace${text.none + node.os.EOL}-----------`);
            console.log("");
            console.log(stack);
            console.log("");
            console.log(`${text.angry}Error Message${text.none}`);
            console.log("------------");
            if (errtext[0] === "" && errtext.length < 2) {
                console.log(`${text.yellow}No error message supplied${text.none}`);
            } else {
                errtext.forEach(function node_apps_errout_each(value:string):void {
                    console.log(value);
                });
            }
            console.log("");
            apps.humantime(true);
            if (command === "build" || command === "simulation") {
                console.log("\u0007");
            } else {
                console.log("");
            }
            process.exit(1);
        };
        errorflag = true;
        if (writeflag !== "") {
            apps.remove(writeflag, error);
            writeflag = "";
        } else {
            error();
        }
    };
    // http(s) get function
    apps.get = function node_apps_get(address:string, flag:"source"|"diff", callback:Function|null):void {
        if (command === "get") {
            address = process.argv[0];
        }
        if (address === undefined) {
            apps.errout([
                "The get command requires an address in http/https scheme.",
                `Please execute ${text.cyan}prettydiff commands get${text.none} for examples.`
            ]);
            return;
        }
        let file:string = "";
        const scheme:string = (address.indexOf("https") === 0)
                ? "https"
                : "http",
            getcall = function node_apps_getFile_callback(file:string|Blob) {
                const addy:string = (command === "hash")
                    ? process.argv[0]
                    : process.argv[1];
                if (addy !== undefined) {
                    const dirs:string[] = addy.split("/"),
                        statWrapper = function node_apps_getFile_callback_fileName_statWrapper() {
                            node.fs.stat(process.cwd() + name, function node_apps_getFile_callback_fileName_statWrapper_stat(ers:Error) {
                                if (ers !== null) {
                                    if (ers.toString().indexOf("no such file or directory")) {
                                        node.fs.writeFile(name, file, "utf8", function node_apps_getFile_callback_write(err:Error) {
                                            writeflag = name;
                                            if (err !== null) {
                                                apps.errout([err.toString()]);
                                                return;
                                            }
                                            if (command === "hash" || command === "base64") {
                                                callback(process.cwd() + sep + name);
                                            } else {
                                                apps.log([`File ${text.cyan + name + text.none} written with ${apps.commas(file.toString().length)} characters.`]);
                                            }
                                        });
                                    } else {
                                        apps.errout([ers.toString()]);
                                    }
                                } else {
                                    if (name.indexOf(".") < 0) {
                                        name = `${name}0.txt`;
                                    } else {
                                        const names:string[] = name.split(".");
                                        names[names.length - 2] = names[names.length - 2].replace(/\d+$/, inc.toString());
                                        inc = inc + 1;
                                        node_apps_getFile_callback_fileName_statWrapper();
                                    }
                                }
                            });
                        };
                    let name:string = (dirs.length < 4 || dirs[dirs.length - 1] === "")
                            ? "get.txt"
                            : dirs[dirs.length - 1],
                        inc:number = 0;
                    statWrapper();
                } else {
                    apps.log([file.toString()]);
                }
            };
        if ((/^(https?:\/\/)/).test(address) === false) {
            apps.errout([
                `Address: ${text.angry + address + text.none}`,
                "The get command requires an address in http/https scheme.",
                `Please execute ${text.cyan}prettydiff commands get${text.none} for examples.`
            ]);
            return;
        }
        node[scheme].get(address, function node_apps_get_callback(res:http.IncomingMessage) {
            res.on("data", function node_apps_get_callback_data(chunk:string):void {
                file = file + chunk;
            });
            res.on("end", function node_apps_get_callback_end() {
                if (res.statusCode !== 200) {
                    if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303 || res.statusCode === 307 || res.statusCode === 308) {
                        if (verbose === true) {
                            console.log(`${res.statusCode} ${node.http.STATUS_CODES[res.statusCode]} - ${address}`);
                        }
                        process.argv[0] = res.headers.location;
                        address = process.argv[0];
                        apps.get(address, flag, callback);
                        return;
                    }
                    apps.errout([`${scheme}.get failed with status code ${res.statusCode}`]);
                    return;
                }
                if (command === "get" || command === "hash") {
                    getcall(file);
                } else if (callback !== null) {
                    callback(file);
                }
            });
        });
    };
    // hash utility for strings or files
    apps.hash = function node_apps_hash(filepath:string):void {
        let limit:number = 0,
            shortlimit:number = 0;
        const http:RegExp = (/^https?:\/\//),
            dirComplete = function node_apps_hash_dirComplete(list:directoryList):void {
                let a:number = 0,
                    c:number = 0;
                const listlen:number = list.length,
                    hashes:string[] = [],
                    hashComplete = function node_apps_hash_dirComplete_hashComplete():void {
                        const hash:Hash = node.crypto.createHash("sha512");
                        let hashstring:string = "";
                        if (verbose === true) {
                            console.log(`${apps.humantime(false)}File hashing complete. Working on a final hash to represent the directory structure.`);
                        }
                        hash.update(hashes.join(""));
                        hashstring = hash.digest("hex").replace(/\s+$/, "");
                        if (verbose === true) {
                            apps.log([
                                `Pretty Diff hashed ${text.cyan + filepath + text.none}`,
                                hashstring
                            ]);
                        } else {
                            apps.log([hashstring]);
                        }
                    },
                    hashback = function node_apps_hash_dirComplete_hashback(data:readFile, item:string|Buffer, callback:Function):void {
                        const hash:Hash = node.crypto.createHash("sha512");
                        hash.on("readable", function node_apps_hash_dirComplete_hashback_hash():void {
                            let hashstring:string = "";
                            const hashdata:Buffer = <Buffer>hash.read();
                            if (hashdata !== null) {
                                hashstring = hashdata.toString("hex").replace(/\s+/g, "");
                                callback(hashstring, data.index);
                            }
                        });
                        hash.write(item);
                        hash.end();
                        if (http.test(filepath) === true) {
                            apps.remove(data.path, function node_apps_hash_dirComplete_hashback_hash_remove():boolean {
                                return true;
                            });
                        }
                    },
                    typeHash = function node_apps_hash_dirComplete_typeHash(index:number, end:number) {
                        const terminate = function node_apps_hash_dirComplete_typeHash_terminate():void {
                            c = c + 1;
                            if (c === end) {
                                if (a === listlen) {
                                    hashComplete();
                                } else {
                                    if (verbose === true) {
                                        console.log(`${apps.humantime(false)}${text.green + apps.commas(a) + text.none} files hashed so far...`);
                                    }
                                    c = 0;
                                    recurse();
                                }
                            }
                        };
                        if (list[index][1] === "directory" || list[index][1] === "link") {
                            const hash:Hash = node.crypto.createHash("sha512");
                            hash.update(list[index][0]);
                            hashes[index] = hash.digest("hex");
                            terminate();
                        } else {
                            apps.readFile({
                                path: list[index][0],
                                stat: list[index][4],
                                index: index,
                                callback: function node_apps_hash_dirComplete_typehash_callback(data:readFile, item:string|Buffer):void {
                                    hashback(data, item, function node_apps_hash_dirComplete_typeHash_callback(hashstring:string, item:number) {
                                        hashes[item[0]] = hashstring;
                                        terminate();
                                    });
                                }
                            });
                        }
                    },
                    recurse = function node_apps_hash_dirComplete_recurse():void {
                        let b = 0,
                            end = (listlen - a < shortlimit)
                                ? listlen - a
                                : shortlimit;
                        do {
                            typeHash(a, end);
                            a = a + 1;
                            b = b + 1;
                        } while (b < shortlimit && a < listlen);
                    },
                    sorty = function node_apps_hash_dirComplete_sorty(a:directoryItem, b:directoryItem) {
                        if (a[0] < b[0]) {
                            return -1;
                        }
                        return 1;
                    };
                list.sort(sorty);
                if (verbose === true) {
                    console.log(`${apps.humantime(false)}Completed analyzing the directory tree in the file system and found ${text.green + apps.commas(listlen) + text.none} file system objects.`);
                }
                if (limit < 1 || listlen < limit) {
                    do {
                        if (list[a][1] === "directory" || list[a][1] === "link") {
                            const hash:Hash = node.crypto.createHash("sha512");
                            hash.update(list[a][0]);
                            hashes[a] = hash.digest("hex");
                            c = c + 1;
                            if (c === listlen) {
                                hashComplete();
                            }
                        } else {
                            apps.readFile({
                                path: list[a][0],
                                stat: list[a][4],
                                index: a,
                                callback: function node_apps_hash_dirComplete_file(data:readFile, item:string|Buffer):void {
                                    hashback(data, item, function node_apps_hash_dirComplete_file_hashback(hashstring:string, item:number):void {
                                        hashes[item[0]] = hashstring;
                                        c = c + 1;
                                        if (c === listlen) {
                                            hashComplete();
                                        }
                                    });
                                }
                            });
                        }
                        a = a + 1;
                    } while (a < listlen);
                } else {
                    if (verbose === true) {
                        console.log(`Due to a ulimit setting of ${text.angry + apps.commas(limit) + text.none} Pretty Diff will read only ${text.cyan + apps.commas(shortlimit) + text.none} files at a time.`);
                        console.log("");
                    }
                    recurse();
                }
            };
        if (command === "hash") {
            if (process.argv[0] === undefined) {
                apps.errout([`Command ${text.cyan}hash${text.none} requires some form of address of something to analyze, ${text.angry}but no address is provided${text.none}.`]);
                return;
            }
            filepath = process.argv[0];
            if (http.test(filepath) === false) {
                filepath = node.path.resolve(process.argv[0]);
            }
            if (process.argv.indexOf("string") > -1) {
                const hash:Hash = node.crypto.createHash("sha512");
                process.argv.splice(process.argv.indexOf("string"), 1);
                hash.update(process.argv[0]);
                apps.log([hash.digest("hex")]);
                return;
            }
        }
        if (http.test(filepath) === true) {
            apps.get(filepath, "source", function node_apps_hash_get(path:string) {
                apps.directory({
                    callback: function node_apps_hash_get_localCallback(list:directoryList) {
                        dirComplete(list);
                    },
                    exclusions: [],
                    path: path,
                    recursive: true,
                    symbolic: true
                });
            });
        } else {
            node.child("ulimit -n", function node_apps_hash_ulimit(uerr:Error, uout:string) {
                if (uerr === null && uout !== "unlimited" && isNaN(Number(uout)) === false) {
                    limit = Number(uout);
                    shortlimit = Math.ceil(limit / 5);
                }
                apps.directory({
                    callback: function node_apps_hash_localCallback(list:directoryList) {
                        dirComplete(list);
                    },
                    exclusions: [],
                    path: filepath,
                    recursive: true,
                    symbolic: true
                });
            });
        }
    };
    // general static messaging
    apps.help = function node_apps_help():void {
        const output:string[] = [];
        output.push(`${text.bold + text.underline}Pretty Diff${text.none}`);
        output.push("");
        output.push("Pretty Diff is a language aware diff tool.");
        output.push(`To get started try the ${text.green}commands${text.none} command.`);
        output.push("");
        output.push(`${text.cyan}prettydiff commands${text.none}`);
        output.push("");
        output.push("or if not globally installed");
        output.push(`${text.cyan}node js/services commands${text.none}`);
        verbose = true;
        apps.log(output);
    };
    // converting time durations into something people read
    apps.humantime = function node_apps_humantime(finished:boolean):string {
        let minuteString:string = "",
            hourString:string   = "",
            secondString:string = "",
            finalTime:string    = "",
            finalMem:string     = "",
            minutes:number      = 0,
            hours:number        = 0,
            memory,
            elapsed:number      = (function node_apps_humantime_elapsed():number {
                const big:number = 1e9,
                    dtime:[number, number] = process.hrtime(startTime);
                if (dtime[1] === 0) {
                    return dtime[0];
                }
                return dtime[0] + (dtime[1] / big);
            }());
        const numberString = function node_apps_humantime_numberString(numb:number):string {
                const strSplit:string[] = String(numb).split(".");
                if (strSplit.length > 1) {
                    if (strSplit[1].length < 9) {
                        do {
                            strSplit[1]  = strSplit[1] + 0;
                        } while (strSplit[1].length < 9);
                        return `${strSplit[0]}.${strSplit[1]}`;
                    }
                    if (strSplit[1].length > 9) {
                        return `${strSplit[0]}.${strSplit[1].slice(0, 9)}`;
                    }
                    return `${strSplit[0]}.${strSplit[1]}`;
                }
                return `${strSplit[0]}`;
            },
            prettybytes  = function node_apps_humantime_prettybytes(an_integer:number):string {
                //find the string length of input and divide into triplets
                let output:string = "",
                    length:number  = an_integer
                        .toString()
                        .length;
                const triples:number = (function node_apps_humantime_prettybytes_triples():number {
                        if (length < 22) {
                            return Math.floor((length - 1) / 3);
                        }
                        //it seems the maximum supported length of integer is 22
                        return 8;
                    }()),
                    //each triplet is worth an exponent of 1024 (2 ^ 10)
                    power:number   = (function node_apps_humantime_prettybytes_power():number {
                        let a = triples - 1,
                            b = 1024;
                        if (triples === 0) {
                            return 0;
                        }
                        if (triples === 1) {
                            return 1024;
                        }
                        do {
                            b = b * 1024;
                            a = a - 1;
                        } while (a > 0);
                        return b;
                    }()),
                    //kilobytes, megabytes, and so forth...
                    unit    = [
                        "",
                        "KB",
                        "MB",
                        "GB",
                        "TB",
                        "PB",
                        "EB",
                        "ZB",
                        "YB"
                    ];

                if (typeof an_integer !== "number" || Number.isNaN(an_integer) === true || an_integer < 0 || an_integer % 1 > 0) {
                    //input not a positive integer
                    output = "0.00B";
                } else if (triples === 0) {
                    //input less than 1000
                    output = `${an_integer}B`;
                } else {
                    //for input greater than 999
                    length = Math.floor((an_integer / power) * 100) / 100;
                    output = length.toFixed(2) + unit[triples];
                }
                return output;
            },
            plural       = function node_proctime_plural(x:number, y:string):string {
                if (x !== 1) {
                    return `${numberString(x) + y}s `;
                }
                return `${numberString(x) + y} `;
            },
            minute       = function node_proctime_minute():void {
                minutes      = parseInt((elapsed / 60).toString(), 10);
                minuteString = (finished === true)
                    ? plural(minutes, " minute")
                    : (minutes < 10)
                        ? `0${minutes}`
                        : String(minutes);
                minutes      = elapsed - (minutes * 60);
                secondString = (finished === true)
                    ? (minutes === 1)
                        ? " 1 second "
                        : `${minutes.toFixed(3)} seconds `
                    : minutes.toFixed(3);
            };
        memory       = process.memoryUsage();
        finalMem     = prettybytes(memory.rss);

        //last line for additional instructions without bias to the timer
        secondString = numberString(elapsed);
        if (elapsed >= 60 && elapsed < 3600) {
            minute();
        } else if (elapsed >= 3600) {
            hours      = parseInt((elapsed / 3600).toString(), 10);
            elapsed    = elapsed - (hours * 3600);
            hourString = (finished === true)
                ? plural(hours, " hour")
                : (hours < 10)
                    ? `0${hours}`
                    : String(hours);
            minute();
        } else {
            secondString = (finished === true)
                ? plural(elapsed, " second")
                : secondString;
        }
        if (finished === true) {
            finalTime = hourString + minuteString + secondString;
            console.log("");
            console.log(`${finalMem} of memory consumed`);
            console.log(`${finalTime}total time`);
            console.log("");
        } else {
            if (hourString === "") {
                hourString = "00";
            }
            if (minuteString === "") {
                minuteString = "00";
            }
            if ((/^([0-9]\.)/).test(secondString) === true) {
                secondString = `0${secondString}`;
            }
        }
        return `${text.cyan}[${hourString}:${minuteString}:${secondString}]${text.none} `;
    };
    // wrapper for ESLint usage
    apps.lint = function node_apps_lint(callback:Function):void {
        node.child("eslint", function node_apps_build_lint_eslintCheck(eserr:Error) {
            if (eserr !== null) {
                console.log("ESLint is not globally installed or is corrupt.");
                console.log(`Install ESLint using the command: ${text.green}npm install eslint -g${text.none}`);
                console.log("");
                console.log("Skipping code validation...");
                if (callback !== undefined) {
                    callback();
                }
                return;
            }
            if (command === "lint") {
                callback = function node_apps_lint_callback():void {
                    if (verbose === true) {
                        apps.log([""]);
                    }
                };
            }
            (function node_apps_build_lint_getFiles():void {
                const lintrun         = function node_apps_build_lint_lintrun(list:directoryList) {
                    let filesRead:number = 0,
                        filesLinted:number = 0,
                        a:number = 0;
                    const len = list.length,
                        lintit = function node_apps_build_lint_lintrun_lintit(val:string):void {
                            filesRead = filesRead + 1;
                            node.child(`eslint ${val}`, {
                                cwd: projectPath
                            }, function node_apps_build_lint_lintrun_lintit_eslint(err:Error, stdout:string, stderr:string) {
                                if (stdout === "" || stdout.indexOf("0:0  warning  File ignored because of a matching ignore pattern.") > -1) {
                                    if (err !== null) {
                                        apps.errout([err.toString()]);
                                        return;
                                    }
                                    if (stderr !== null && stderr !== "") {
                                        apps.errout([stderr]);
                                        return;
                                    }
                                    filesLinted = filesLinted + 1;
                                    console.log(`${apps.humantime(false) + text.green}Lint ${filesLinted} passed:${text.none} ${val}`);
                                    if (filesRead === filesLinted) {
                                        console.log(`${text.green}Lint complete for ${filesLinted} files!${text.none}`);
                                        if (callback !== undefined) {
                                            callback();
                                        }
                                        return;
                                    }
                                } else {
                                    console.log(stdout);
                                    apps.errout(["Lint failure."]);
                                    return;
                                }
                            })
                        };
                    do {
                        if (list[a][1] === "file" && (/\.js$/).test(list[a][0]) === true) {
                            lintit(list[a][0]);
                        }
                        a = a + 1;
                    } while (a < len);
                };
                apps.directory({
                    callback: lintrun,
                    exclusions: (command === "lint" && process.argv[0] !== undefined)
                        ? exclusions
                        : [],
                    path      : (command === "lint" && process.argv[0] !== undefined)
                        ? process.argv[0]
                        : js,
                    recursive: true,
                    symbolic: false
                });
            }());
        });
    };
    // CLI string output formatting for lists of items
    apps.lists = function node_apps_lists(lists:nodeLists):void {
        // * lists.emptyline - boolean - if each key should be separated by an empty line
        // * lists.heading   - string  - a text heading to precede the list
        // * lists.obj       - object  - an object to traverse
        // * lists.property  - string  - The child property to read from or "eachkey" to
        // access a directly assigned primitive
        const keys:string[] = Object.keys(lists.obj).sort(),
            output:string[] = [],
            lenn:number = keys.length,
            plural = (lenn === 1)
                ? ""
                : "s",
            displayKeys = function node_apps_lists_displayKeys(item:string, keylist:string[]):void {
                const len:number = keylist.length;
                let a:number = 0,
                    b:number = 0,
                    c:number = 0,
                    lens:number = 0,
                    comm:string = "";
                if (len < 1) {
                    apps.errout([`Please run the build: ${text.cyan}prettydiff build${text.none}`]);
                    return;
                }
                do {
                    if (keylist[a].length > lens) {
                        lens = keylist[a].length;
                    }
                    a = a + 1;
                } while (a < len);
                do {
                    comm = keylist[b];
                    c    = comm.length;
                    if (c < lens) {
                        do {
                            comm = comm + " ";
                            c    = c + 1;
                        } while (c < lens);
                    }
                    if (item !== "") {
                        // each of the "values" keys
                        apps.wrapit(output, `   ${text.angry}- ${text.none + text.cyan + comm + text.none}: ${lists.obj.values[keylist[b]]}`);
                    } else {
                        // list all items
                        if (lists.property === "eachkey") {
                            if (command === "options" && keylist[b] === "values") {
                                // "values" keyname of options
                                output.push(`${text.angry}* ${text.none + text.cyan + comm + text.none}:`);
                                node_apps_lists_displayKeys(command, Object.keys(lists.obj.values).sort());
                            } else {
                                // all items keys and their primitive value
                                apps.wrapit(output, `${text.angry}* ${text.none + text.cyan + comm + text.none}: ${lists.obj[keylist[b]]}`);
                            }
                        } else {
                            // a list by key and specified property
                            apps.wrapit(output, `${text.angry}* ${text.none + text.cyan + comm + text.none}: ${lists.obj[keylist[b]][lists.property]}`);
                        }
                        if (lists.emptyline === true) {
                            output.push("");
                        }
                    }
                    b = b + 1;
                } while (b < len);
            };
        output.push(`${text.underline + text.bold}Pretty Diff - ${lists.heading + text.none}`);
        output.push("");
        displayKeys("", keys);
        if (command === "commands") {
            output.push("");
            output.push("For examples and usage instructions specify a command name, for example:");
            output.push(`globally installed - ${text.green}prettydiff commands hash${text.none}`);
            output.push(`locally installed - ${text.green}node js/services commands hash${text.none}`);
            output.push("");
            output.push(`Commands are tested using the ${text.green}simulation${text.none} command.`);
        } else if (command === "options") {
            output.push(`${text.green + lenn + text.none} matching option${plural}.`);
        }
        apps.log(output);
    };
    // verbose metadata printed to the shell about Pretty Diff
    apps.log = function node_apps_output(output:string[]):void {
        if (verbose === true && (output.length > 1 || output[0] !== "")) {
            console.log("");
        }
        if (output[output.length - 1] === "") {
            output.pop();
        }
        output.forEach(function node_apps_output_each(value:string) {
            console.log(value);
        });
        if (verbose === true) {
            console.log("");
            console.log(`parse-framework version ${text.angry + version.parse + text.none}`);
            console.log(`Pretty Diff version ${text.angry + version.number + text.none} dated ${text.cyan + version.date + text.none}`);
            apps.humantime(true);
        }
    };
    // makes specified directory structures in the local file system
    apps.makedir = function node_apps_makedir(dirToMake:string, callback:Function):void {
        node
            .fs
            .stat(dirToMake, function node_apps_makedir_stat(err:nodeError, stats:Stats):void {
                let dirs   = [],
                    ind    = 0,
                    len    = 0,
                    ers    = "";
                const restat = function node_apps_makedir_stat_restat():void {
                        node
                            .fs
                            .stat(
                                dirs.slice(0, ind + 1).join(sep),
                                function node_apps_makedir_stat_restat_callback(erra:nodeError, stata:Stats):void {
                                    let erras:string = "";
                                    ind = ind + 1;
                                    if (erra !== null) {
                                        erras = erra.toString();
                                        if (erras.indexOf("no such file or directory") > 0 || erra.code === "ENOENT") {
                                            node
                                                .fs
                                                .mkdir(
                                                    dirs.slice(0, ind).join(sep),
                                                    function node_apps_makedir_stat_restat_callback_mkdir(errb:Error):void {
                                                        if (errb !== null && errb.toString().indexOf("file already exists") < 0) {
                                                            apps.errout([errb.toString()]);
                                                            return;
                                                        }
                                                        if (ind < len) {
                                                            node_apps_makedir_stat_restat();
                                                        } else {
                                                            callback();
                                                        }
                                                    }
                                                );
                                            return;
                                        }
                                        if (erras.indexOf("file already exists") < 0) {
                                            apps.errout([erra.toString()]);
                                            return;
                                        }
                                    }
                                    if (stata.isFile() === true) {
                                        apps.errout([`Destination directory, '${text.cyan + dirToMake + text.none}', is a file.`]);
                                        return;
                                    }
                                    if (ind < len) {
                                        node_apps_makedir_stat_restat();
                                    } else {
                                        callback();
                                    }
                                }
                            );
                    };
                if (err !== null) {
                    ers = err.toString();
                    if (ers.indexOf("no such file or directory") > 0 || err.code === "ENOENT") {
                        dirs = dirToMake.split(sep);
                        if (dirs[0] === "") {
                            ind = ind + 1;
                        }
                        len = dirs.length;
                        restat();
                        return;
                    }
                    if (ers.indexOf("file already exists") < 0) {
                        apps.errout([err.toString()]);
                        return;
                    }
                }
                if (stats.isFile() === true) {
                    apps.errout([`Destination directory, '${text.cyan + dirToMake + text.none}', is a file.`]);
                    return;
                }
                callback();
            });
    };
    // mode minify
    apps.minify = function node_apps_minify():void {
        apps.readMethod(false, function node_apps_minify_callback() {
            return;
        });
    };
    // CLI documentation for supported Pretty Diff options
    apps.options = function node_apps_options():void {
        const def:any = prettydiff.api.optionDef;
        if (def[process.argv[0]] === undefined) {
            if (process.argv.length < 1) {
                // all options in a list
                apps.lists({
                    emptyline: true,
                    heading: "Options",
                    obj: def,
                    property: "definition"
                });
            } else {
                // queried list of options
                const keys:string[] = Object.keys(def),
                    arglen:number = process.argv.length,
                    output:any = {},
                    namevalue = function node_apps_options_namevalue(item:string):void {
                        const si:number = item.indexOf(":");
                        if (si < 1) {
                            name = item;
                            value = "";
                            return;
                        }
                        if (
                            (si < item.indexOf("\"") && item.indexOf("\"") > -1) ||
                            (si < item.indexOf("'") && item.indexOf("'") > -1) ||
                            (item.indexOf("\"") < 0 && item.indexOf("'") < 0)
                        ) {
                            name = item.slice(0, si);
                            value = item.slice(si + 1);
                            return;
                        }
                        name = item;
                        value = "";
                    };
                let keylen:number = keys.length,
                    a:number = 0,
                    b:number = 0,
                    name:string = "",
                    value:string = "";
                do {
                    namevalue(process.argv[a]);
                    b = 0;
                    do {
                        if (def[keys[b]][name] === undefined || (value !== "" && def[keys[b]][name] !== value)) {
                            keys.splice(b, 1);
                            b = b - 1;
                            keylen = keylen - 1;
                        }
                        b = b + 1;
                    } while (b < keylen);
                    if (keylen < 1) {
                        break;
                    }
                    a = a + 1;
                } while (a < arglen);
                a = 0;
                do {
                    output[keys[a]] = def[keys[a]];
                    a = a + 1;
                } while (a < keylen);
                if (keylen < 1) {
                    apps.log([`${text.angry}Pretty Diff has no options matching the query criteria.${text.none}`]);
                } else {
                    apps.lists({
                        emptyline: true,
                        heading: "Options",
                        obj: output,
                        property: "definition"
                    });
                }
            }
        } else {
            // specificly mentioned option
            apps.lists({
                emptyLine: false,
                heading: `Option: ${text.green + process.argv[0] + text.none}`,
                obj: def[process.argv[0]],
                property: "eachkey"
            });
        }
    };
    // outputs Pretty Diff generated code from: beautify, minify, parse commands
    apps.output = function node_apps_readMethodOutput(path:string, code:string|Buffer) {
        const tense:string = (function node_apps_output_tense():string {
                if (options.mode === "beautify") {
                    return "Beautified";
                }
                if (options.mode === "minify") {
                    return "Minified";
                }
                if (options.mode === "parse") {
                    return "Parsed";
                }
            }()),
            output:string[] = [];
        if (options.read_method === "filescreen" || options.read_method === "screen") {
            if (verbose === true) {
                if (options.read_method === "filescreen") {
                    output.push(`${tense} input from file ${text.cyan + path + text.none}`);
                } else {
                    output.push(`${tense} input from terminal.`);
                }
            }
            if (typeof code === "string") {
                output.push(code);
            } else {
                output.push(code.toString("utf8"));
            }
            apps.log(output);
        } else if (options.read_method === "file") {
            const outPath:string = node.path.resolve(options.output);
            node.fs.writeFile(outPath, code, function node_apps_output_writeFile(err:Error):void {
                if (err !== null) {
                    apps.errout([err.toString()]);
                    return;
                }
                output.push(`${tense} input from file ${text.cyan + path + text.none}.`);
                output.push(`Wrote output to ${text.green + outPath + text.none} at ${text.green + apps.commas(code.length) + text.none} characters.`);
                apps.log(output);
            });
        }
    };
    // mode parse
    apps.parse = function node_apps_parse():void {
        if (options.parse_format === "clitable") {
            verbose = true;
        }
        apps.readMethod(false, function node_apps_parse_callback() {
            return;
        });
    };
    // where parsing actually occurs.  The apps.parse is a vanity function to map to the parse command
    apps.parser = function node_apps_parser(path:string, code:string):void {
        options.source = code;
        if (options.language === "auto") {
            const lang:language = prettydiff.api.language.auto(options.source, "javascript");
            options.language = lang[0];
            options.lexer = lang[1];
        }
        if (options.parse_format === "clitable") {
            options.read_method = "screen";
        }
        // necessary, because I have not updated the Parse Framework api to use the same property name
        options.lang = options.language;

        if (command === "parse" && options.parse_format === "sequential") {
            options.parsed = global.parseFramework.parserObjects(options);
        } else {
            options.parsed = global.parseFramework.parserArrays(options);
        }
        if (command === "parse") {
            if (options.parse_format === "clitable") {
                let a:number   = 0,
                    str:string[] = [];
                const outputArrays:parsedArray = options.parsed,
                    output:string[] = [],
                    b:number = outputArrays.token.length,
                    pad = function node_apps_parser_parsePad(x:string, y:number):void {
                        const cc:string = x
                                .toString()
                                .replace(/\s/g, " ");
                        let dd:number = y - cc.length;
                        str.push(cc);
                        if (dd > 0) {
                            do {
                                str.push(" ");
                                dd = dd - 1;
                            } while (dd > 0);
                        }
                        str.push(" | ");
                    },
                    heading:string = "index | begin | lexer  | lines | presv | stack       | types       | token",
                    bar:string     = "------|-------|--------|-------|-------|-------------|-------------|------";
                output.push("");
                output.push(heading);
                output.push(bar);
                do {
                    if (a % 100 === 0 && a > 0) {
                        output.push("");
                        output.push(heading);
                        output.push(bar);
                    }
                    str = [];
                    if (outputArrays.lexer[a] === "markup") {
                        str.push(text.red);
                    } else if (outputArrays.lexer[a] === "script") {
                        str.push(text.green);
                    } else if (outputArrays.lexer[a] === "style") {
                        str.push(text.yellow);
                    }
                    pad(a.toString(), 5);
                    pad(outputArrays.begin[a].toString(), 5);
                    pad(outputArrays.lexer[a].toString(), 5);
                    pad(outputArrays.lines[a].toString(), 5);
                    pad(outputArrays.presv[a].toString(), 5);
                    pad(outputArrays.stack[a].toString(), 11);
                    pad(outputArrays.types[a].toString(), 11);
                    str.push(outputArrays.token[a].replace(/\s/g, " "));
                    str.push(text.none);
                    output.push(str.join(""));
                    a = a + 1;
                } while (a < b);
                console.log(output.join(node.os.EOL));
            } else {
                apps.output(path, JSON.stringify(options.parsed));
            }
        } else {
            // call the next operation (other mode)
        }
    };
    // similar to node's fs.readFile, but determines if the file is binary or text so that it can create either a buffer or text dump
    apps.readFile = function node_apps_readFile(args:readFile):void {
        // arguments
        // * callback - function - What to do next, the file data is passed into the callback as an argument
        // * index - number - if the file is opened as a part of a directory operation then the index represents the index out of the entire directory list
        // * path - string - the file to open
        // * stat - Stats - the Stats object for the given file
        node
            .fs
            .open(args.path, "r", function node_apps_readFile_file_open(ero:Error, fd:number):void {
                const failure = function node_apps_readFile_file_open_failure(message:string) {
                        if (args.index > 0) {
                            apps.errout([
                                `Failed after ${args.index} files.`,
                                message
                            ]);
                        } else {
                            apps.errout([message]);
                        }
                    },
                    msize = (args.stat.size < 100)
                        ? args.stat.size
                        : 100;
                let buff  = Buffer.alloc(msize);
                if (ero !== null) {
                    failure(ero.toString());
                    return;
                }
                node
                    .fs
                    .read(
                        fd,
                        buff,
                        0,
                        msize,
                        1,
                        function node_apps_readFile_file_open_read(erra:Error, bytesa:number, buffera:Buffer):number {
                            let bstring:string = "";
                            if (erra !== null) {
                                failure(erra.toString());
                                return;
                            }
                            bstring = buffera.toString("utf8", 0, buffera.length);
                            bstring = bstring.slice(2, bstring.length - 2);
                            if (options.binary_check.test(bstring) === true) {
                                buff = Buffer.alloc(args.stat.size);
                                node
                                    .fs
                                    .read(
                                        fd,
                                        buff,
                                        0,
                                        args.stat.size,
                                        0,
                                        function node_apps_readFile_file_open_read_readBinary(errb:Error, bytesb:number, bufferb:Buffer):void {
                                            if (errb !== null) {
                                                failure(errb.toString());
                                                return;
                                            }
                                            if (bytesb > 0) {
                                                node.fs.close(fd, function node_apps_readFile_file_open_read_readBinary_close():void {
                                                    args.callback(args, bufferb);
                                                });
                                            }
                                        }
                                    );
                            } else {
                                node
                                    .fs
                                    .readFile(args.path, {
                                        encoding: "utf8"
                                    }, function node_apps_readFile_wrapper_stat_file_open_read_readFile(errc:Error, dump:string):void {
                                        if (errc !== null && errc !== undefined) {
                                            failure(errc.toString());
                                            return;
                                        }
                                        node.fs.close(fd, function node_apps_readFile_wrapper_stat_file_open_read_readFile_close() {
                                            args.callback(args, dump);
                                        });
                                    });
                            }
                            return bytesa;
                        }
                    );
            });
    };
    // processes Pretty Diff mode commands
    apps.readMethod = function node_apps_readMethod(diff:boolean, modeCallback:Function):void {
        if (options.source === "") {
            apps.errout([
                `Pretty Diff requires option ${text.cyan}source${text.none} when using command ${text.green + command + text.none}. Example:`,
                `${text.cyan}prettydiff ${command} source:"myFile.js"${text.none}`
            ]);
            return;
        }
        if (options.language === "text") {
            apps.errout([`Language value ${text.angry}text${text.none} is not compatible with command ${text.green + command + text.none}.`]);
            return;
        }
        const readmethod:string = options.read_method,
            //auto:boolean = (readmethod === "auto"),
            all = require(`${projectPath}node_modules${sep}parse-framework${sep}js${sep}lexers${sep}all`),
            item:string = (diff === true)
                ? "diff"
                : "source",
            resolve = function node_apps_readmethod_resolve() {
                node.fs.stat(options[item], function node_apps_readmethod_resolve_stat(err:Error, stat:Stats):void {
                    const resolveItem = function node_apps_readmethod_resolve_stat_resolveItem() {
                        /*const final = function node_apps_readmethod_application_final():void {
                                const output:string[] = [];
                                if (verbose === true) {
                                    if (auto === true) {
                                        output.push("");
                                    }
                                    if (auto === true) {
                                        apps.wrapit(output, `${text.angry}*${text.none} Option ${text.cyan}read_method${text.none} set to ${text.angry}auto${text.none} and interpreted as ${text.green + options.read_method + text.none}.`);
                                    }
                                }
                                apps.log(output);
                            };*/
                        if (options.read_method === "directory" || options.read_method === "subdirectory") {
                            apps.directory({
                                callback: function node_apps_readmethod_resolve_stat_resolveItem_directoryCallback(list:directoryList):void {
                                    modeCallback(list);
                                },
                                exclusions: exclusions,
                                path: options.source,
                                recursive: (options.read_method === "auto" || options.read_method === "subdirectory"),
                                symbolic: true
                            });
                        } else {
                            apps.readFile({
                                callback: function node_apps_readmethod_resolve_stat_resolveItem_fileCallback(args:readFile, dump:string|Buffer):void {
                                    if (typeof dump === "string") {
                                        // 1 parse code
                                        // 2 execute mode
                                        // 3 output result
                                        apps.parser(args.path, dump);
                                        //final();
                                    } else {
                                        apps.errout([`The file at ${options[item]} contains a binary buffer.  Pretty Diff does not analyze binary at this time.`]);
                                    }
                                },
                                index: 0,
                                path: options.source,
                                stat: stat
                            });
                        }
                    };
                    if (readmethod === "auto") {
                        if (err !== null) {
                            const index:any = {
                                "sep": options[item].indexOf(node.path.sep),
                                "<": options[item].indexOf("<"),
                                "=": options[item].indexOf("="),
                                ";": options[item].indexOf(";"),
                                "{": options[item].indexOf("}")
                            };
                            if (err.toString().indexOf("ENOENT") > -1 && (
                                index["sep"] < 0 ||
                                index["<"] > -1 ||
                                index["="] > -1 ||
                                index[";"] > -1 ||
                                index["{"] > -1
                            )) {
                                // read_method:auto evaluated as "screen"
                                options.read_method = "screen";
                                apps.parser("", options[item]);
                            } else {
                                // read_method:auto evaluated as filesystem path pointing to missing resource
                                apps.errout([err.toString()]);
                            }
                            return;
                        }
                        if (stat.isDirectory() === true) {
                            options.read_method = "subdirectory";
                        } else if (stat.isDirectory() === false && stat.isSymbolicLink() === false && stat.isFIFO() === false) {
                            if (options.output === "") {
                                const wrapped:string[] = [];
                                options.read_method = "filescreen";
                                if (command !== "parse" || options.parse_format !== "clitable") {
                                    apps.wrapit(wrapped, `Option ${text.angry}output${text.none} was not specified and the value provided for option ${text.cyan}source${text.none} appears to be a file. Output will be printed to the terminal. Please specify a value to option ${text.cyan}output${text.none} for file output to be written to a file.`);
                                    console.log(wrapped.join(node.os.EOL));
                                    console.log("");
                                }
                            } else {
                                options.read_method = "file";
                            }
                        }
                    }
                    if (err !== null) {
                        apps.errout([err.toString()]);
                        return;
                    }
                    options[item] = node.path.resolve(options[item]);
                    if (stat.isDirectory() === false && (options.read_method === "directory" || options.read_method === "subdirectory")) {
                        apps.errout([`Option ${text.cyan}read_method${text.none} has value ${text.green + options.read_method + text.none} but ${text.angry}option ${item} does not point to a directory${text.none}.`]);
                        return;
                    }
                    if ((stat.isDirectory() === true || stat.isSymbolicLink() === true || stat.isFIFO() === true) && (options.read_method === "file" || options.read_method === "filescreen")) {
                        apps.errout([`Option ${text.cyan}read_method${text.none} has value ${text.green + options.read_method + text.none} but ${text.angry}option ${item} does not point to a file${text.none}.`]);
                        return;
                    }
                    // resolving options.output path...
                    if (options.read_method !== "screen" && options.read_method !== "filescreen" && diff === false) {
                        if (options.output === "") {
                            apps.errout([`If option read_method evaluates to value ${text.cyan + options.read_method + text.none} option ${text.angry}output${text.none} is required.`]);
                            return;
                        }
                        options.output = node.path.resolve(options.output);
                        node.fs.stat(options.output, function node_apps_readmethod_resolve_stat_statOutput(ers:Error, ostat:Stats):void {
                            if (ers !== null && ers.toString().indexOf("ENOENT") < 0) {
                                apps.errout([ers.toString()]);
                                return;
                            }
                            if (ers === null) {
                                if (ostat.isDirectory() === false && ostat.isSymbolicLink() === false && ostat.isFIFO() === false) {
                                    if (options.read_method === "directory" || options.read_method === "subdirectory") {
                                        apps.errout([`Option ${text.cyan}output${text.none} received value ${options.output} which is a file, but when option ${text.cyan}read_method${text.none} has value ${text.green}directory${text.none} or ${text.green}subdirectory${text.none} the output option must point to a directory or new location.`]);
                                        return;
                                    }
                                    if (options.read_method === "file") {
                                        console.log(`Overwriting file ${text.green + options.output + text.none}.`);
                                    }
                                } else if (ostat.isDirectory() === true && options.read_method === "file") {
                                    options.output = options.output.replace(/(\/|\\)$/, "") + sep + options.source.replace(/\/|\\/g, "/").split("/").pop();
                                    if (options.mode === "diff" && options.diff_cli === false) {
                                        options.output = `${options.output}-diff.txt`;
                                    }
                                }
                            }
                            writeflag = options.output;
                            resolveItem();
                        });
                    } else if (options.read_method === "screen") {
                        apps.parser("", options[item]);
                    } else {
                        resolveItem();
                    }
                });
            };
        options.mode = (command === "diff")
            ? "beautify"
            : command;
        if (global.parseFramework === undefined) {
            require(`${projectPath}node_modules${sep}parse-framework${sep}js${sep}parse`);
        }
        all(options, function node_apps_readmethod_allLexers() {
            resolve();
        });
        /*const all = require(`${projectPath}node_modules${sep}parse-framework${sep}js${sep}lexers${sep}all`),
            application = function node_apps_readmethod_application(path:string):void {
                let lang:[string, string, string] = ["javascript", "script", "JavaScript"];
                const langAuto:boolean = (function node_apps_readmethod_application_lang():boolean {
                        if (options.language === "auto") {
                            lang = prettydiff.api.language.auto(options.source, "javascript");
                            options.language = lang[0];
                            options.lexer = lang[1];
                            return true;
                        }
                        return false;
                    }()),
                    output:string[] = [],
                    final = function node_apps_readmethod_application_final(inject:string) {
                        if (verbose === true) {
                            if (langAuto === true || options.read_method === true) {
                                output.push("");
                            }
                            if (options.read_method === "auto") {
                                apps.wrapit(output, `${text.angry}*${text.none} Option ${text.cyan}read_method${text.none} set to ${text.angry}auto${text.none}. Option ${text.cyan}source${text.none} was not provided a valid file system path so Pretty Diff processed the source value literally.`);
                            }
                            if (langAuto === true) {
                                apps.wrapit(output, `${text.angry}*${text.none} Option ${text.cyan}lang${text.none} set to ${text.angry}auto${text.none} and evaluated by Pretty Diff as ${text.green + text.bold + lang[2] + text.none} by lexer ${text.green + text.bold + lang[1] + text.none}.`);
                            }
                        }
                        if (inject !== "") {
                            output.push(inject);
                        }
                        apps.log(output);
                    };
                if (options.mode === "diff") {
                    if (options.diff_cli === true) {
                        verbose = true;
                        options.read_method = "screen";
                    }
                    if (options.language !== "text") {
                        const source:string = options.source;
                        options.source = options.diff;
                        options.parsed = global.parseFramework.parserArrays(options);
                        options.diff   = prettydiff.beautify[options.lexer](options);
                        options.source = source;
                        options.parsed = global.parseFramework.parserArrays(options);
                        options.source = prettydiff.beautify[options.lexer](options);
                    }
                    const diff:[string, number, number] = prettydiff.api.diffview(options),
                        plural:string = (diff[2] > 0)
                            ? "s"
                            : "";
                    if (options.read_method === "screen" || options.read_method === "filescreen" || options.diff_cli === true) {
                        output.push(diff[0]);
                        output.push("");
                        output.push(`Number of differences: ${text.cyan + (diff[1] + diff[2]) + text.none} from ${text.cyan + (diff[2] + 1) + text.none} line${plural} of code.`);
                    }
                } else {
                }
                if (options.read_method === "screen" || options.read_method === "filescreen") {
                    final("");
                } else if (sourcelist[0][1] === "file") {
                    if (options.output === "") {
                        apps.errout([
                            `Pretty Diff requires use of option ${text.angry}output${text.none} to indicate where to write output.`,
                            `To print output to the console try using option ${text.cyan}read_method:${text.green}screen${text.none} or ${text.cyan}read_method:${text.green}filescreen${text.none}`,
                            "Example:",
                            `${text.cyan}prettydiff ${options.mode} source:"myfile1.txt"${(options.mode === "diff") ? " diff:\"myfile2.txt\"" : ""} read_method:filescreen${text.none}`
                        ]);
                        return;
                    }
                    node.fs.writeFile(options.output, options.source, "utf8", function node_apps_readmethod_application_writeFile(err:Error) {
                        if (err !== null) {
                            apps.errout([err.toString()]);
                            return;
                        }
                        final(`${text.angry}*${text.none} Output written to ${text.cyan + node.path.resolve(options.output) + text.none} at ${text.green + apps.commas(options.source.length) + text.none} characters.`);
                    });
                }
                // priorities
                // 1 parse output - line 1904 - determine parse options and tabular output from the parse tool
                // 2 minify output
                // 3 analysis output
                // 4 validation
                // 5 readmethod dir and subdir
                // 6 prettydiff.js file for embedding
                // 7 global installation
                // 8 open defects
            },
            file = function node_apps_readmethod_diff_file(item:directoryList):void {
                const status:[boolean, boolean] = [false, false],
                    callback = function node_apps_readmethod_diff_file_callback(itemdata:readFile, data:string|Buffer) {
                        status[itemdata.index] = true;
                        if (itemdata.index === 0) {
                            options.source = data;
                        } else {
                            options.diff = data;
                        }
                        if (item.length < 2 || (status[0] === true && status[1] === true)) {
                            application(itemdata.path);
                        }
                    };
                apps.readFile({
                    callback: callback,
                    index: 0,
                    path: item[0][0],
                    stat: item[0][2]
                });
                if (item.length > 1) {
                    apps.readFile({
                        callback: callback,
                        index: 1,
                        path: item[1][0],
                        stat: item[1][2]
                    });
                }
            },
            directory = function node_apps_readmethod_diff_directory():void {},
            // the screenTest function makes a guess if input input is readmethod "screen" opposed to a filesystem object
            screenTest = function node_apps_readmethod_screenTest(item:"source"|"diff") {
                node.fs.stat(options[item], function node_apps_readmethod_screenTest_stat(err:Error):void {
                    if (options.read_method === "auto") {
                        if (err !== null) {
                            const index:any = {
                                "sep": options[item].indexOf(node.path.sep),
                                "<": options[item].indexOf("<"),
                                "=": options[item].indexOf("="),
                                ";": options[item].indexOf(";"),
                                "{": options[item].indexOf("}")
                            };
                            if (err.toString().indexOf("ENOENT") > -1 && (
                                index["sep"] < 0 ||
                                index["<"] > -1 ||
                                index["="] > -1 ||
                                index[";"] > -1 ||
                                index["{"] > -1
                            )) {
                                // readmethod:auto evaluated as "screen"
                                application("");
                            } else {
                                // readmethod:auto evaluated as filesystem path pointing to missing resource
                                apps.errout([err.toString()]);
                            }
                            return;
                        }
                    }
                    options.output = node.path.resolve(options.output);
                    node.fs.stat(options.output, function node_apps_readmethod_screenTest_stat_statOutput(ers:Error, stat:Stats):void {
                        if (ers !== null) {
                            apps.errout([ers.toString()]);
                            return;
                        }
                        if (item === "source") {
                            if (stat.isFile() === true) {
                                if (options.read_method === "directory" || options.read_method === "subdirectory") {
                                    apps.errout([`Option ${text.cyan}output${text.none} received value ${options.output} which is a file, but when option ${text.cyan}readmethod${text.none} has value ${text.green}directory${text.none} or ${text.green}subdirectory${text.none} the output option must point to a directory or new location.`]);
                                    return;
                                }
                                if (options.read_method === "file") {
                                    console.log(`Overwriting file ${text.green + options.output + text.none}.`);
                                }
                            } else if (stat.isDirectory() === true && options.read_method === "file") {
                                options.output = options.output.replace(/(\/|\\)$/, "") + sep + options.source.replace(/\/|\\/g, "/").split("/").pop();
                                if (options.mode === "diff" && options.diff_cli === false) {
                                    options.output = `${options.output}-diff.txt`;
                                }
                            }
                        }
                        apps.directory({
                            callback: function node_apps_readmethod_screenTest_callback(list:directoryList):void {
                                if (list[0][1] !== "file" && (options.read_method === "file" || options.read_method === "filescreen")) {
                                    apps.errout([`The value for the source option is ${text.angry}not an address to a file${text.none} but option readmethod is ${text.angry + options.read_method + text.none}.`]);
                                    return;
                                }
                                if (list[0][1] !== "directory" && (options.read_method === "subdirectory" || options.read_method === "directory")) {
                                    apps.errout([`The value for the source option is ${text.angry}not an address to a directory${text.none} but option readmethod is ${text.angry + options.read_method + text.none}.`]);
                                    return;
                                }
                                if (item === "source") {
                                    sourcelist = list;
                                } else {
                                    difflist = list;
                                }
                                if (options.mode !== "diff" || (difflist.length > 0 && sourcelist.length > 0)) {
                                    if (sourcelist[0][1] === "file") {
                                        if (options.mode === "diff") {
                                            file([sourcelist[0], difflist[0]]);
                                        } else {
                                            file([sourcelist[0]]);
                                        }
                                    } else if (list[0][1] === "directory") {
                                        directory();
                                    }
                                }
                            },
                            exclusions: exclusions,
                            path: options.source,
                            recursive: (options.read_method === "auto" || options.read_method === "subdirectory"),
                            symbolic: true
                        });
                    });
                })
            };
        prettydiff.api.pdcomment(options);
        all(options, function node_apps_readmethod_allLexers() {
            if (options.read_method === "screen") {
                application("");
            } else {
                screenTest("source");
                if (options.mode === "diff") {
                    screenTest("diff");
                }
            }
        });
        return;*/
    };
    // similar to posix "rm -rf" command
    apps.remove = function node_apps_remove(filepath:string, callback:Function):void {
        const numb:any = {
                dirs: 0,
                file: 0,
                link: 0,
                size: 0
            },
            removeItems = function node_apps_remove_removeItems(filelist:directoryList):void {
                let a:number = 0;
                const len:number = filelist.length,
                    destroy = function node_apps_remove_removeItems_destroy(item:directoryItem) {
                        const type:"rmdir"|"unlink" = (item[1] === "directory")
                            ? "rmdir"
                            : "unlink";
                        node.fs[type](item[0], function node_apps_remove_removeItems_destroy_callback(er:nodeError):void {
                            if (verbose === true && er !== null && er.toString().indexOf("no such file or directory") < 0) {
                                if (er.code === "ENOTEMPTY") {
                                    node_apps_remove_removeItems_destroy(item);
                                    return;
                                }
                                apps.errout([er.toString()]);
                                return;
                            }
                            if (item[0] === filelist[0][0]) {
                                callback();
                            } else {
                                filelist[item[2]][3] = filelist[item[2]][3] - 1;
                                if (filelist[item[2]][3] < 1) {
                                    node_apps_remove_removeItems_destroy(filelist[item[2]]);
                                }
                            }
                        });
                    };
                if (filelist.length < 1) {
                    callback();
                    return;
                }
                do {
                    if (command === "remove") {
                        if (filelist[a][1] === "file") {
                            numb.file = numb.file + 1;
                            numb.size = numb.size + filelist[a][4].size;
                        } else if (filelist[a][1] === "directory") {
                            numb.dirs = numb.dirs + 1;
                        } else if (filelist[a][1] === "link") {
                            numb.link = numb.link + 1;
                        }
                    }
                    if ((filelist[a][1] === "directory" && filelist[a][3] === 0) || filelist[a][1] !== "directory") {
                        destroy(filelist[a]);
                    }
                    a = a + 1;
                } while (a < len);
            };
        if (command === "remove") {
            if (process.argv.length < 1) {
                apps.errout([
                    "Command remove requires a filepath",
                    `${text.cyan}prettydiff remove ../jsFiles${text.none}`
                ]);
                return;
            }
            filepath = node.path.resolve(process.argv[0]);
            callback = function node_apps_remove_callback() {
                const out = ["Pretty Diff removed "];
                verbose = true;
                console.log("");
                out.push(text.angry);
                out.push(String(numb.dirs));
                out.push(text.none);
                out.push(" director");
                if (numb.dirs === 1) {
                    out.push("y, ");
                } else {
                    out.push("ies, ");
                }
                out.push(text.angry);
                out.push(String(numb.file));
                out.push(text.none);
                out.push(" file");
                if (numb.dirs !== 1) {
                    out.push("s");
                }
                out.push(", ");
                out.push(text.angry);
                out.push(String(numb.link));
                out.push(text.none);
                out.push(" symbolic link");
                if (numb.symb !== 1) {
                    out.push("s");
                }
                out.push(" at ");
                out.push(text.angry);
                out.push(apps.commas(numb.size));
                out.push(text.none);
                out.push(" bytes.");
                apps.log([out.join(""), `Removed ${text.cyan + filepath + text.none}`]);
            };
        }
        apps.directory({
            callback: removeItems,
            exclusions: [],
            path: filepath,
            recursive: true,
            symbolic: true
        });
    };
    // runs services: http, web sockets, and file system watch.  Allows rapid testing with automated rebuilds
    apps.server = function node_apps_server():void {
        if (process.argv[0] !== undefined && isNaN(Number(process.argv[0])) === true) {
            apps.errout([`Specified port, ${text.angry + process.argv[0] + text.none}, is not a number.`]);
            return;
        }
        let timeStore:number = 0;
        const port:number = (isNaN(Number(process.argv[0])))
                ? 9001
                : Number(process.argv[0]),
            server = node.http.createServer(function node_apps_server_create(request, response):void {
                let quest:number = request.url.indexOf("?"),
                    uri:string = (quest > 0)
                        ? request.url.slice(0, quest)
                        : request.url,
                    file:string = projectPath + uri.slice(1);
                if (uri === "/") {
                    file = `${projectPath + node.path.sep}index.xhtml`;
                }
                if (request.url.indexOf("favicon.ico") < 0 && request.url.indexOf("images/apple") < 0) {
                    node.fs.readFile(file, "utf8", function node_apps_server_create_readFile(err:Error, data:string):void {
                        if (err !== undefined && err !== null) {
                            if (err.toString().indexOf("no such file or directory") > 0) {
                                response.writeHead(404, {"Content-Type": "text/plain"});
                                if (file.indexOf("apple-touch") < 0 && file.indexOf("favicon") < 0) {
                                    console.log(`${text.angry}404${text.none} for ${file}`);
                                }
                                return;
                            }
                            response.write(JSON.stringify(err));
                            console.log(err);
                            return;
                        }
                        if (file.indexOf(".js") === file.length - 3) {
                            response.writeHead(200, {"Content-Type": "application/javascript"});
                        } else if (file.indexOf(".css") === file.length - 4) {
                            response.writeHead(200, {"Content-Type": "text/css"});
                        } else if (file.indexOf(".xhtml") === file.length - 6) {
                            response.writeHead(200, {"Content-Type": "application/xhtml+xml"});
                        }
                        response.write(data);
                        response.end();
                    });
                } else {
                    response.end();
                }
            }),
            serverError = function node_apps_server_serverError(error):void {
                if (error.code === "EADDRINUSE") {
                    if (error.port === port + 1) {
                        apps.errout([`Web socket channel port, ${text.cyan + port + text.none}, is in use!  The web socket channel is 1 higher than the port designated for the HTTP server.`]);
                    } else {
                        apps.errout([`Specified port, ${text.cyan + port + text.none}, is in use!`]);
                    }
                } else {
                    apps.errout([`${error.Error}`]);
                }
                return
            },
            ignore   = function node_apps_server_ignore(input:string|null):boolean {
                if (input.indexOf(".git") === 0) {
                    return true;
                }
                if (input.indexOf("node_modules") === 0) {
                    return true;
                }
                if (input.indexOf("js") === 0) {
                    return true;
                }
                return false;
            },
            socket = require("ws"),
            ws = new socket.Server({port: port + 1});
        if (process.cwd() !== projectPath) {
            process.chdir(projectPath);
        }
        ws.broadcast = function node_apps_server_broadcast(data:string):void {
            ws.clients.forEach(function node_apps_server_broadcast_clients(client):void {
                if (client.readyState === socket.OPEN) {
                    client.send(data);
                }
            });
        };
        console.log(`HTTP server is up at: ${text.bold + text.green}http://localhost:${port + text.none}`);
        console.log(`${text.green}Starting web server and file system watcher!${text.none}`);
        node.fs.watch(projectPath, {
            recursive: true
        }, function node_apps_server_watch(type:"rename"|"change", filename:string|null):void {
            if (filename === null || ignore(filename) === true) {
                return;
            }
            const extension:string = (function node_apps_server_watch_extension():string {
                    const list = filename.split(".");
                    return list[list.length - 1];
                }()),
                time = function node_apps_server_watch_time(message:string):number {
                    const date:Date = new Date(),
                        datearr:string[] = [];
                    let hours:string = String(date.getHours()),
                        minutes:string = String(date.getMinutes()),
                        seconds:string = String(date.getSeconds()),
                        mseconds:string = String(date.getMilliseconds());
                    if (hours.length === 1) {
                        hours = `0${hours}`;
                    }
                    if (minutes.length === 1) {
                        minutes = `0${minutes}`;
                    }
                    if (seconds.length === 1) {
                        seconds = `0${seconds}`;
                    }
                    if (mseconds.length < 3) {
                        do {
                            mseconds = `0${mseconds}`;
                        } while (mseconds.length < 3);
                    }
                    datearr.push(hours);
                    datearr.push(minutes);
                    datearr.push(seconds);
                    datearr.push(mseconds);
                    console.log(`[${text.cyan + datearr.join(":") + text.none}] ${message}`);
                    timeStore = date.valueOf();
                    return timeStore;
                };
            if (extension === "ts" && timeStore < Date.now() - 1000) {
                let start:number,
                    compile:number,
                    duration = function node_apps_server_watch_duration(length:number):void {
                        let hours:number = 0,
                            minutes:number = 0,
                            seconds:number = 0,
                            list:string[] = [];
                        if (length > 3600000) {
                            hours = Math.floor(length / 3600000);
                            length = length - (hours * 3600000);
                        }
                        list.push(hours.toString());
                        if (list[0].length < 2) {
                            list[0] = `0${list[0]}`;
                        }
                        if (length > 60000) {
                            minutes = Math.floor(length / 60000);
                            length = length - (minutes * 60000);
                        }
                        list.push(minutes.toString());
                        if (list[1].length < 2) {
                            list[1] = `0${list[1]}`;
                        }
                        if (length > 1000) {
                            seconds = Math.floor(length / 1000);
                            length = length - (seconds * 1000);
                        }
                        list.push(seconds.toString());
                        if (list[2].length < 2) {
                            list[2] = `0${list[2]}`;
                        }
                        list.push(length.toString());
                        if (list[3].length < 3) {
                            do {
                                list[3] = `0${list[3]}`;
                            } while (list[3].length < 3);
                        }
                        console.log(`[${text.bold + text.purple + list.join(":") + text.none}] Total compile time.`);
                    };
                console.log("");
                start = time(`Compiling TypeScript for ${text.green + filename + text.none}`);
                node.child(`node js/services build nocheck`, {
                    cwd: projectPath
                }, function node_apps_server_watch_child(err:Error, stdout:string, stderr:string):void {
                    if (err !== null) {
                        apps.errout([err.toString()]);
                        return;
                    }
                    if (stderr !== "") {
                        apps.errout([stderr]);
                        return;
                    }
                    compile = time("TypeScript Compiled") - start;
                    duration(compile);
                    ws.broadcast("reload");
                    return;
                });
            }
        });
        server.on("error", serverError);
        server.listen(port);
    };
    // tests the commands of the services file
    apps.simulation = function node_apps_simulation(callback:Function):void {
        // tests structure
        // * artifact - the address of anything written to disk, so that it can be removed
        // * command - the command to execute minus the `node js/services` part
        // * qualifier - how to test, see simulationItem in index.d.ts for appropriate values
        // * test - the value to compare against
        const supersep:string = (sep === "\\")
            ? "\\\\"
            : sep,
            tests:simulationItem[] = [
                {
                    command: "b",
                    qualifier: "is",
                    test: `Command '${text.angry}b${text.none}' is ambiguous as it could refer to any of: [${text.cyan}base64, beautify, build${text.none}]`
                },
                {
                    command: `base64 ${projectPath}tsconfig.json`,
                    qualifier: "is",
                    test: "ewogICAgImNvbXBpbGVyT3B0aW9ucyI6IHsKICAgICAgICAidGFyZ2V0IjogIkVTNiIsCiAgICAgICAgIm91dERpciI6ICJqcyIKICAgIH0sCiAgICAiaW5jbHVkZSI6IFsKICAgICAgICAiKi50cyIsCiAgICAgICAgIioqLyoudHMiCiAgICBdLAogICAgImV4Y2x1ZGUiOiBbCiAgICAgICAgImpzIiwKICAgICAgICAibm9kZV9tb2R1bGVzIiwKICAgICAgICAidGVzdCIKICAgIF0KfQ=="
                },
                {
                    command: "base64 decode string:\"ewogICAgImNvbXBpbGVyT3B0aW9ucyI6IHsKICAgICAgICAidGFyZ2V0IjogIkVTNiIsCiAgICAgICAgIm91dERpciI6ICJqcyIKICAgIH0sCiAgICAiaW5jbHVkZSI6IFsKICAgICAgICAiKi50cyIsCiAgICAgICAgIioqLyoudHMiCiAgICBdLAogICAgImV4Y2x1ZGUiOiBbCiAgICAgICAgImpzIiwKICAgICAgICAibm9kZV9tb2R1bGVzIiwKICAgICAgICAidGVzdCIKICAgIF0KfQ==\"",
                    qualifier: "ends",
                    test: `{\n    "compilerOptions": {\n        "target": "ES6",\n        "outDir": "js"\n    },\n    "include": [\n        "*.ts",\n        "*\u002a/\u002a.ts"\n    ],\n    "exclude": [\n        "js",\n        "node_modules",\n        "test"\n    ]\n}`
                },
                {
                    command: "base64 string:\"my big string sample\"",
                    qualifier: "is",
                    test: "bXkgYmlnIHN0cmluZyBzYW1wbGU="
                },
                {
                    command: "base64 decode string:\"bXkgYmlnIHN0cmluZyBzYW1wbGU=\"",
                    qualifier: "is",
                    test: "my big string sample"
                },
                {
                    command: "base64",
                    qualifier: "contains",
                    test: "No path to encode."
                },
                {
                    command: "base64 https://duckduckgo.com/assets/logo_homepage.normal.v107.svg",
                    qualifier: "is",
                    test: "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNi4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB3aWR0aD0iMjUwcHgiIGhlaWdodD0iMjAwcHgiIHZpZXdCb3g9IjAgMCAyNTAgMjAwIiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAyNTAgMjAwIiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxnPg0KCTxjaXJjbGUgZmlsbD0iI0RFNTgzMyIgY3g9IjEyNy4zMzIiIGN5PSI3OC45NjYiIHI9IjUxLjE1Ii8+DQoJPGc+DQoJCTxnPg0KCQkJPHBhdGggZmlsbD0iIzRDNEM0QyIgZD0iTTIyLjU2NCwxODAuNTc0di0yNC41OThoOC45MTRjOC40ODcsMCwxMi4zNTIsNi4yMzQsMTIuMzUyLDEyLjAzMWMwLDYuMjU2LTMuODE5LDEyLjU2Mi0xMi4zNTIsMTIuNTYyDQoJCQkJTDIyLjU2NCwxODAuNTc0TDIyLjU2NCwxODAuNTc0eiBNMjUuMzk4LDE3Ny43NGg2LjA4YzYuNTc1LDAsOS41MTgtNC45MDQsOS41MTgtOS43NjZjMC00LjQ2Ny0yLjk3OS05LjI3MS05LjUxOC05LjI3MWgtNi4wOA0KCQkJCVYxNzcuNzRMMjUuMzk4LDE3Ny43NHoiLz4NCgkJPC9nPg0KCQk8Zz4NCgkJCTxwYXRoIGZpbGw9IiM0QzRDNEMiIGQ9Ik01NS4wNTUsMTgwLjg1N2MtNC41NTQsMC03LjQ5Ny0zLjEzNy03LjQ5Ny03Ljk5MnYtOS41NTFoMi42NTd2OS41MTZjMCwzLjQ5NiwyLjAzNCw1LjU4NCw1LjQ0Miw1LjU4NA0KCQkJCWMzLjE5NS0wLjAzNSw1LjUxMy0yLjQ4OCw1LjUxMy01LjgzMnYtOS4yNjhoMi42NTd2MTcuMjZoLTIuNDE0bC0wLjE1Mi0zLjAwMmwtMC40MTIsMC41MTgNCgkJCQlDNTkuNDE3LDE3OS44OTEsNTcuNDY4LDE4MC44MjIsNTUuMDU1LDE4MC44NTd6Ii8+DQoJCTwvZz4NCgkJPGc+DQoJCQk8cGF0aCBmaWxsPSIjNEM0QzRDIiBkPSJNNzYuNzg2LDE4MC44OTNjLTQuNDksMC05LjAyLTIuNzcxLTkuMDItOC45NDljMC01LjM1NCwzLjYyNS04Ljk0Nyw5LjAyLTguOTQ3DQoJCQkJYzIuMzYxLDAsNC40MzYsMC44NDIsNi4xNjgsMi41MDJsLTEuNjcsMS43MzJjLTEuMTc1LTEuMDk2LTIuNzgxLTEuNzIxLTQuNDI3LTEuNzIxYy0zLjc2OCwwLTYuMzk5LDIuNjQ2LTYuMzk5LDYuNDM0DQoJCQkJYzAsNC40NDUsMy4xOTYsNi40MzgsNi4zNjQsNi40MzhjMS43ODIsMCwzLjQtMC42MzYsNC41NzMtMS43OTFsMS43MzYsMS43MzZDODEuMzg0LDE4MC4wMjksNzkuMjUsMTgwLjg5Myw3Ni43ODYsMTgwLjg5M3oiLz4NCgkJPC9nPg0KCQk8Zz4NCgkJCTxwb2x5Z29uIGZpbGw9IiM0QzRDNEMiIHBvaW50cz0iOTcuNjgzLDE4MC41NzQgODkuMjQ4LDE3Mi4xMzkgODkuMjQ4LDE4MC41NzQgODYuNjI2LDE4MC41NzQgODYuNjI2LDE1Ni4wMTIgODkuMjQ4LDE1Ni4wMTIgDQoJCQkJODkuMjQ4LDE3MC44NjkgOTYuNjIxLDE2My4zMTQgMTAwLjA1OCwxNjMuMzE0IDkxLjkyNCwxNzEuNDQ4IDEwMS4wNTEsMTgwLjUzOSAxMDEuMDUxLDE4MC41NzQgCQkJIi8+DQoJCTwvZz4NCgkJPGc+DQoJCQk8cGF0aCBmaWxsPSIjNEM0QzRDIiBkPSJNMTA0LjMxNywxODAuNTc0di0yNC41OThoOC45MTNjOC40ODcsMCwxMi4zNTQsNi4yMzQsMTIuMzU0LDEyLjAzMWMwLDYuMjU2LTMuODE1LDEyLjU2Mi0xMi4zNTQsMTIuNTYyDQoJCQkJTDEwNC4zMTcsMTgwLjU3NEwxMDQuMzE3LDE4MC41NzR6IE0xMDcuMTUsMTc3Ljc0aDYuMDhjNi41NzUsMCw5LjUxOS00LjkwNCw5LjUxOS05Ljc2NmMwLTQuNDY3LTIuOTc5LTkuMjcxLTkuNTE5LTkuMjcxaC02LjA4DQoJCQkJVjE3Ny43NHoiLz4NCgkJPC9nPg0KCQk8Zz4NCgkJCTxwYXRoIGZpbGw9IiM0QzRDNEMiIGQ9Ik0xMzYuODA3LDE4MC44NTdjLTQuNTU2LDAtNy40OTYtMy4xMzctNy40OTYtNy45OTJ2LTkuNTUxaDIuNjU2djkuNTE2YzAsMy40OTYsMi4wMzQsNS41ODQsNS40NDEsNS41ODQNCgkJCQljMy4xODktMC4wMzUsNS41MTQtMi40ODgsNS41MTQtNS44MzJ2LTkuMjY4aDIuNjU2djE3LjI2aC0yLjQxNmwtMC4xNS0zLjAwMmwtMC40MTIsMC41MTgNCgkJCQlDMTQxLjE2OCwxNzkuODkxLDEzOS4yMTksMTgwLjgyMiwxMzYuODA3LDE4MC44NTd6Ii8+DQoJCTwvZz4NCgkJPGc+DQoJCQk8cGF0aCBmaWxsPSIjNEM0QzRDIiBkPSJNMTU4LjUzOSwxODAuODkzYy00LjQ5LDAtOS4wMjEtMi43NzEtOS4wMjEtOC45NDljMC01LjM1NCwzLjYyNS04Ljk0Nyw5LjAyMS04Ljk0Nw0KCQkJCWMyLjM1OSwwLDQuNDM4LDAuODQyLDYuMTY4LDIuNTAybC0xLjY3LDEuNzMyYy0xLjE3Ni0xLjA5Ni0yLjc4MS0xLjcyMS00LjQyOC0xLjcyMWMtMy43NywwLTYuMzk4LDIuNjQ2LTYuMzk4LDYuNDM0DQoJCQkJYzAsNC40NDUsMy4xOTcsNi40MzgsNi4zNjMsNi40MzhjMS43ODEsMCwzLjQtMC42MzYsNC41NzItMS43OTFsMS42ODYsMS42ODhsLTAuMDg4LDAuMDkxbDAuMDQ5LDAuMDQ5DQoJCQkJQzE2My4wNjIsMTgwLjA1OSwxNjAuOTYxLDE4MC44OTMsMTU4LjUzOSwxODAuODkzeiIvPg0KCQk8L2c+DQoJCTxnPg0KCQkJPHBvbHlnb24gZmlsbD0iIzRDNEM0QyIgcG9pbnRzPSIxNzkuNDM2LDE4MC41NzQgMTcxLDE3Mi4xMzkgMTcxLDE4MC41NzQgMTY4LjM3OSwxODAuNTc0IDE2OC4zNzksMTU2LjAxMiAxNzEsMTU2LjAxMiANCgkJCQkxNzEsMTcwLjg2OSAxNzguMzczLDE2My4zMTQgMTgxLjgxMSwxNjMuMzE0IDE3My42NzgsMTcxLjQ0OCAxODIuODAzLDE4MC41MzkgMTgyLjgwMywxODAuNTc0IAkJCSIvPg0KCQk8L2c+DQoJCTxnPg0KCQkJPHBhdGggZmlsbD0iIzRDNEM0QyIgZD0iTTE5Ni43MTksMTgxLjAzNWMtOS40NTcsMC0xMi44MTItNi43NS0xMi44MTItMTIuNTI5Yy0wLjAyMS0zLjc2NSwxLjI1Ni03LjEyNSwzLjU4NC05LjQ2Nw0KCQkJCWMyLjI5My0yLjMwNSw1LjQ3My0zLjUyMyw5LjE5Mi0zLjUyM2MzLjM2NiwwLDYuNTM3LDEuMjc5LDguOTM4LDMuNjA0bC0xLjYwNCwxLjg2OWMtMS44OS0xLjc2My00LjY4NS0yLjg1My03LjMzLTIuODUzDQoJCQkJYy02Ljg1NCwwLTkuOTc5LDUuMzc1LTkuOTc5LDEwLjM2N2MwLDQuOTA4LDMuMTA0LDkuODczLDEwLjA1MSw5Ljg3M2MyLjUyNywwLDQuODg2LTAuODY1LDYuODEyLTIuNTE4bDAuMDkxLTAuMDcydi02LjA2Mg0KCQkJCWgtNy43Mjl2LTIuNDc5aDEwLjI3NnY5LjY0NkMyMDMuNTU1LDE3OS42OTEsMjAwLjQ2MywxODEuMDM1LDE5Ni43MTksMTgxLjAzNXoiLz4NCgkJPC9nPg0KCQk8Zz4NCgkJCTxwYXRoIGZpbGw9IiM0QzRDNEMiIGQ9Ik0yMTguNDUzLDE4MC44OTNjLTUuMTg4LDAtOC45NDktMy43NDgtOC45NDktOC45MTRjMC01LjI0NiwzLjc3LTkuMDU1LDguOTQ5LTkuMDU1DQoJCQkJYzUuMjg5LDAsOC45ODIsMy43MjMsOC45ODIsOS4wNTVDMjI3LjQzNiwxNzcuMTQ1LDIyMy42NTgsMTgwLjg5MywyMTguNDUzLDE4MC44OTN6IE0yMTguNDg2LDE2NS4zMzINCgkJCQljLTMuNzI3LDAtNi4zMjYsMi43MzQtNi4zMjYsNi42NDZjMCwzLjcyOSwyLjY0Niw2LjQzNiw2LjI5Myw2LjQzNmMzLjcwOSwwLDYuMzI2LTIuNjQ2LDYuMzYxLTYuNDM0DQoJCQkJQzIyNC44MTQsMTY4LjEyNywyMjIuMTU0LDE2NS4zMzIsMjE4LjQ4NiwxNjUuMzMyeiIvPg0KCQk8L2c+DQoJPC9nPg0KCTxnPg0KCQk8Zz4NCgkJCTxnPg0KCQkJCTxnPg0KCQkJCQk8Zz4NCgkJCQkJCTxnPg0KCQkJCQkJCTxnPg0KCQkJCQkJCQk8Zz4NCgkJCQkJCQkJCTxnPg0KCQkJCQkJCQkJCTxnPg0KCQkJCQkJCQkJCQk8Zz4NCgkJCQkJCQkJCQkJCTxnPg0KCQkJCQkJCQkJCQkJCTxkZWZzPg0KCQkJCQkJCQkJCQkJCQk8cGF0aCBpZD0iU1ZHSURfMV8iIGQ9Ik0xNzguNjg0LDc4LjgyNGMwLDI4LjMxNi0yMy4wMzUsNTEuMzU0LTUxLjM1NCw1MS4zNTRjLTI4LjMxMywwLTUxLjM0OC0yMy4wMzktNTEuMzQ4LTUxLjM1NA0KCQkJCQkJCQkJCQkJCQkJYzAtMjguMzEzLDIzLjAzNi01MS4zNDksNTEuMzQ4LTUxLjM0OUMxNTUuNjQ4LDI3LjQ3NSwxNzguNjg0LDUwLjUxMSwxNzguNjg0LDc4LjgyNHoiLz4NCgkJCQkJCQkJCQkJCQk8L2RlZnM+DQoJCQkJCQkJCQkJCQkJPGNsaXBQYXRoIGlkPSJTVkdJRF8yXyI+DQoJCQkJCQkJCQkJCQkJCTx1c2UgeGxpbms6aHJlZj0iI1NWR0lEXzFfIiAgb3ZlcmZsb3c9InZpc2libGUiLz4NCgkJCQkJCQkJCQkJCQk8L2NsaXBQYXRoPg0KCQkJCQkJCQkJCQkJCTxnIGNsaXAtcGF0aD0idXJsKCNTVkdJRF8yXykiPg0KCQkJCQkJCQkJCQkJCQk8cGF0aCBmaWxsPSIjRDVEN0Q4IiBkPSJNMTQ4LjI5MywxNTUuMTU4Yy0xLjgwMS04LjI4NS0xMi4yNjItMjcuMDM5LTE2LjIzLTM0Ljk2OQ0KCQkJCQkJCQkJCQkJCQkJYy0zLjk2NS03LjkzMi03LjkzOC0xOS4xMS02LjEyOS0yNi4zMjJjMC4zMjgtMS4zMTItMy40MzYtMTEuMzA4LTIuMzU0LTEyLjAxNQ0KCQkJCQkJCQkJCQkJCQkJYzguNDE2LTUuNDg5LDEwLjYzMiwwLjU5OSwxNC4wMDItMS44NjJjMS43MzQtMS4yNzMsNC4wOSwxLjA0Nyw0LjY4OS0xLjA2YzIuMTU4LTcuNTY3LTMuMDA2LTIwLjc2LTguNzcxLTI2LjUyNg0KCQkJCQkJCQkJCQkJCQkJYy0xLjg4NS0xLjg3OS00Ljc3MS0zLjA2LTguMDMtMy42ODdjLTEuMjU0LTEuNzEzLTMuMjc1LTMuMzYtNi4xMzgtNC44NzljLTMuMTg4LTEuNjk3LTEwLjEyMS0zLjkzOC0xMy43MTctNC41MzUNCgkJCQkJCQkJCQkJCQkJCWMtMi40OTItMC40MS0zLjA1NSwwLjI4Ny00LjExOSwwLjQ2MWMwLjk5MiwwLjA4OCw1LjY5OSwyLjQxNCw2LjYxNSwyLjU0OWMtMC45MTYsMC42MTktMy42MDctMC4wMjgtNS4zMjQsMC43NDINCgkJCQkJCQkJCQkJCQkJCWMtMC44NjUsMC4zOTItMS41MTIsMS44NzctMS41MDYsMi41OGM0LjkxLTAuNDk2LDEyLjU3NC0wLjAxNiwxNy4xLDJjLTMuNjAyLDAuNDEtOS4wOCwwLjg2Ny0xMS40MzYsMi4xMDUNCgkJCQkJCQkJCQkJCQkJCWMtNi44NDgsMy42MDgtOS44NzMsMTIuMDM1LTguMDcsMjIuMTMzYzEuODA0LDEwLjA3NSw5LjczOCw0Ni44NSwxMi4yNjIsNTkuMTI5DQoJCQkJCQkJCQkJCQkJCQljMi41MjUsMTIuMjY0LTUuNDA4LDIwLjE4OS0xMC40NTUsMjIuMzU0bDUuNDA4LDAuMzYzbC0xLjgwMSwzLjk2N2M2LjQ4NCwwLjcxOSwxMy42OTUtMS40MzksMTMuNjk1LTEuNDM5DQoJCQkJCQkJCQkJCQkJCQljLTEuNDM4LDMuOTY1LTExLjE3Niw1LjQxMi0xMS4xNzYsNS40MTJzNC42OTEsMS40MzgsMTIuMjU4LTEuNDQ3YzcuNTc4LTIuODgzLDEyLjI2My00LjY4OCwxMi4yNjMtNC42ODgNCgkJCQkJCQkJCQkJCQkJCWwzLjYwNCw5LjM3M2w2Ljg1NC02Ljg0N2wyLjg4NSw3LjIxMUMxNDQuNjg2LDE2NS4yNiwxNTAuMDk2LDE2My40NTMsMTQ4LjI5MywxNTUuMTU4eiIvPg0KCQkJCQkJCQkJCQkJCQk8cGF0aCBmaWxsPSIjRkZGRkZGIiBkPSJNMTUwLjQ3MSwxNTMuNDc3Yy0xLjc5NS04LjI4OS0xMi4yNTYtMjcuMDQzLTE2LjIyOC0zNC45NzkNCgkJCQkJCQkJCQkJCQkJCWMtMy45Ny03LjkzNi03LjkzNS0xOS4xMTItNi4xMy0yNi4zMjFjMC4zMzUtMS4zMDksMC4zNDEtNi42NjgsMS40MjktNy4zNzljOC40MTEtNS40OTQsNy44MTItMC4xODQsMTEuMTg3LTIuNjQ1DQoJCQkJCQkJCQkJCQkJCQljMS43NC0xLjI3MSwzLjEzMy0yLjgwNiwzLjczOC00LjkxMmMyLjE2NC03LjU3Mi0zLjAwNi0yMC43Ni04Ljc3My0yNi41MjljLTEuODc5LTEuODc5LTQuNzY4LTMuMDYyLTguMDIzLTMuNjg2DQoJCQkJCQkJCQkJCQkJCQljLTEuMjUyLTEuNzE4LTMuMjcxLTMuMzYxLTYuMTMtNC44ODJjLTUuMzkxLTIuODYyLTEyLjA3NC00LjAwNi0xOC4yNjYtMi44ODNjMC45OSwwLjA5LDMuMjU2LDIuMTM4LDQuMTY4LDIuMjczDQoJCQkJCQkJCQkJCQkJCQljLTEuMzgxLDAuOTM2LTUuMDUzLDAuODE1LTUuMDI5LDIuODk2YzQuOTE2LTAuNDkyLDEwLjMwMywwLjI4NSwxNC44MzQsMi4yOTdjLTMuNjAyLDAuNDEtNi45NTUsMS4zLTkuMzExLDIuNTQzDQoJCQkJCQkJCQkJCQkJCQljLTYuODU0LDMuNjAzLTguNjU2LDEwLjgxMi02Ljg1NCwyMC45MTRjMS44MDcsMTAuMDk3LDkuNzQyLDQ2Ljg3MywxMi4yNTYsNTkuMTI2DQoJCQkJCQkJCQkJCQkJCQljMi41MjcsMTIuMjYtNS40MDIsMjAuMTg4LTEwLjQ0OSwyMi4zNTRsNS40MDgsMC4zNTlsLTEuODAxLDMuOTczYzYuNDg0LDAuNzIxLDEzLjY5NS0xLjQzOSwxMy42OTUtMS40MzkNCgkJCQkJCQkJCQkJCQkJCWMtMS40MzgsMy45NzQtMTEuMTc2LDUuNDA2LTExLjE3Niw1LjQwNnM0LjY4NiwxLjQzOSwxMi4yNTgtMS40NDVjNy41ODEtMi44ODMsMTIuMjY5LTQuNjg4LDEyLjI2OS00LjY4OA0KCQkJCQkJCQkJCQkJCQkJbDMuNjA0LDkuMzczTDE0NCwxNTYuMzVsMi44OTEsNy4yMTVDMTQ2Ljg3NSwxNjMuNTcyLDE1Mi4yNzksMTYxLjc2OCwxNTAuNDcxLDE1My40Nzd6Ii8+DQoJCQkJCQkJCQkJCQkJCTxwYXRoIGZpbGw9IiMyRDRGOEUiIGQ9Ik0xMDkuMDIxLDcwLjY5MWMwLTIuMDkzLDEuNjkzLTMuNzg3LDMuNzg5LTMuNzg3YzIuMDksMCwzLjc4NSwxLjY5NCwzLjc4NSwzLjc4Nw0KCQkJCQkJCQkJCQkJCQkJYzAsMi4wOTQtMS42OTUsMy43ODYtMy43ODUsMy43ODZDMTEwLjcxNCw3NC40NzgsMTA5LjAyMSw3Mi43ODUsMTA5LjAyMSw3MC42OTF6Ii8+DQoJCQkJCQkJCQkJCQkJCTxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik0xMTMuNTA3LDY5LjQyOWMwLTAuNTQ1LDAuNDQxLTAuOTgzLDAuOTgtMC45ODNjMC41NDMsMCwwLjk4NCwwLjQzOCwwLjk4NCwwLjk4Mw0KCQkJCQkJCQkJCQkJCQkJYzAsMC41NDMtMC40NDEsMC45ODQtMC45ODQsMC45ODRDMTEzLjk0OSw3MC40MTQsMTEzLjUwNyw2OS45NzIsMTEzLjUwNyw2OS40Mjl6Ii8+DQoJCQkJCQkJCQkJCQkJCTxwYXRoIGZpbGw9IiMyRDRGOEUiIGQ9Ik0xMzQuODY3LDY4LjQ0NWMwLTEuNzkzLDEuNDYxLTMuMjUsMy4yNTItMy4yNWMxLjgwMSwwLDMuMjU2LDEuNDU3LDMuMjU2LDMuMjUNCgkJCQkJCQkJCQkJCQkJCWMwLDEuODAxLTEuNDU1LDMuMjU4LTMuMjU2LDMuMjU4QzEzNi4zMjgsNzEuNzAzLDEzNC44NjcsNzAuMjQ2LDEzNC44NjcsNjguNDQ1eiIvPg0KCQkJCQkJCQkJCQkJCQk8cGF0aCBmaWxsPSIjRkZGRkZGIiBkPSJNMTM4LjcyNSw2Ny4zNjNjMC0wLjQ2MywwLjM3OS0wLjg0MywwLjgzOC0wLjg0M2MwLjQ3OSwwLDAuODQ2LDAuMzgsMC44NDYsMC44NDMNCgkJCQkJCQkJCQkJCQkJCWMwLDAuNDY5LTAuMzY3LDAuODQyLTAuODQ2LDAuODQyQzEzOS4xMDQsNjguMjA1LDEzOC43MjUsNjcuODMyLDEzOC43MjUsNjcuMzYzeiIvPg0KCQkJCQkJCQkJCQkJCQkNCgkJCQkJCQkJCQkJCQkJCTxsaW5lYXJHcmFkaWVudCBpZD0iU1ZHSURfM18iIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iMTg5My4zMTg0IiB5MT0iLTIzODEuOTc5NSIgeDI9IjE5MDEuODg2NyIgeTI9Ii0yMzgxLjk3OTUiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMSAwIDAgLTEgLTE3ODggLTIzMjEpIj4NCgkJCQkJCQkJCQkJCQkJCTxzdG9wICBvZmZzZXQ9IjAuMDA1NiIgc3R5bGU9InN0b3AtY29sb3I6IzYxNzZCOSIvPg0KCQkJCQkJCQkJCQkJCQkJPHN0b3AgIG9mZnNldD0iMC42OTEiIHN0eWxlPSJzdG9wLWNvbG9yOiMzOTRBOUYiLz4NCgkJCQkJCQkJCQkJCQkJPC9saW5lYXJHcmFkaWVudD4NCgkJCQkJCQkJCQkJCQkJPHBhdGggZmlsbD0idXJsKCNTVkdJRF8zXykiIGQ9Ik0xMTMuODg2LDU5LjcxOGMwLDAtMi44NTQtMS4yOTEtNS42MjksMC40NTNjLTIuNzcsMS43NDItMi42NjgsMy41MjMtMi42NjgsMy41MjMNCgkJCQkJCQkJCQkJCQkJCXMtMS40NzMtMy4yODMsMi40NTMtNC44OTJDMTExLjk3Miw1Ny4xOTMsMTEzLjg4Niw1OS43MTgsMTEzLjg4Niw1OS43MTh6Ii8+DQoJCQkJCQkJCQkJCQkJCQ0KCQkJCQkJCQkJCQkJCQkJPGxpbmVhckdyYWRpZW50IGlkPSJTVkdJRF80XyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSIxOTIwLjI3MzQiIHkxPSItMjM3OS4zNzExIiB4Mj0iMTkyOC4wNzgxIiB5Mj0iLTIzNzkuMzcxMSIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAtMSAtMTc4OCAtMjMyMSkiPg0KCQkJCQkJCQkJCQkJCQkJPHN0b3AgIG9mZnNldD0iMC4wMDU2IiBzdHlsZT0ic3RvcC1jb2xvcjojNjE3NkI5Ii8+DQoJCQkJCQkJCQkJCQkJCQk8c3RvcCAgb2Zmc2V0PSIwLjY5MSIgc3R5bGU9InN0b3AtY29sb3I6IzM5NEE5RiIvPg0KCQkJCQkJCQkJCQkJCQk8L2xpbmVhckdyYWRpZW50Pg0KCQkJCQkJCQkJCQkJCQk8cGF0aCBmaWxsPSJ1cmwoI1NWR0lEXzRfKSIgZD0iTTE0MC4wNzgsNTkuNDU4YzAsMC0yLjA1MS0xLjE3Mi0zLjY0My0xLjE1MmMtMy4yNzEsMC4wNDMtNC4xNjIsMS40ODgtNC4xNjIsMS40ODgNCgkJCQkJCQkJCQkJCQkJCXMwLjU0OS0zLjQ0NSw0LjczMi0yLjc1NEMxMzkuMjczLDU3LjQxNywxNDAuMDc4LDU5LjQ1OCwxNDAuMDc4LDU5LjQ1OHoiLz4NCgkJCQkJCQkJCQkJCQk8L2c+DQoJCQkJCQkJCQkJCQk8L2c+DQoJCQkJCQkJCQkJCTwvZz4NCgkJCQkJCQkJCQk8L2c+DQoJCQkJCQkJCQk8L2c+DQoJCQkJCQkJCTwvZz4NCgkJCQkJCQk8L2c+DQoJCQkJCQk8L2c+DQoJCQkJCTwvZz4NCgkJCQk8L2c+DQoJCQk8L2c+DQoJCQk8cGF0aCBmaWxsPSIjRkREMjBBIiBkPSJNMTI0LjQsODUuMjk1YzAuMzc5LTIuMjkxLDYuMjk5LTYuNjI1LDEwLjQ5MS02Ljg4N2M0LjIwMS0wLjI2NSw1LjUxLTAuMjA1LDkuMDEtMS4wNDMNCgkJCQljMy41MS0wLjgzOCwxMi41MzUtMy4wODgsMTUuMDMzLTQuMjQyYzIuNTA0LTEuMTU2LDEzLjEwNCwwLjU3Miw1LjYzMSw0LjczOGMtMy4yMzIsMS44MDktMTEuOTQzLDUuMTMxLTE4LjE3Miw2Ljk4Nw0KCQkJCWMtNi4yMTksMS44NjEtOS45OS0xLjc3Ni0xMi4wNiwxLjI4MWMtMS42NDYsMi40MzItMC4zMzQsNS43NjIsNy4wOTksNi40NTNjMTAuMDM3LDAuOTMsMTkuNjYtNC41MjEsMjAuNzE5LTEuNjI1DQoJCQkJYzEuMDY0LDIuODk1LTguNjI1LDYuNTA4LTE0LjUyNSw2LjYyM2MtNS44OTMsMC4xMTEtMTcuNzcxLTMuODk2LTE5LjU1NS01LjEzN0MxMjYuMjg1LDkxLjIwNSwxMjMuOTA2LDg4LjMxMywxMjQuNCw4NS4yOTV6Ii8+DQoJCTwvZz4NCgkJPGc+DQoJCQk8cGF0aCBmaWxsPSIjNjVCQzQ2IiBkPSJNMTI4Ljk0MywxMTUuNTkyYzAsMC0xNC4xMDItNy41MjEtMTQuMzMyLTQuNDdjLTAuMjM4LDMuMDU2LDAsMTUuNTA5LDEuNjQzLDE2LjQ1MQ0KCQkJCWMxLjY0NiwwLjkzOCwxMy4zOTYtNi4xMDgsMTMuMzk2LTYuMTA4TDEyOC45NDMsMTE1LjU5MnoiLz4NCgkJCTxwYXRoIGZpbGw9IiM2NUJDNDYiIGQ9Ik0xMzQuMzQ2LDExNS4xMThjMCwwLDkuNjM1LTcuMjg1LDExLjc1NC02LjgxNWMyLjExMSwwLjQ3OSwyLjU4MiwxNS41MSwwLjcwMSwxNi4yMjkNCgkJCQljLTEuODgxLDAuNjktMTIuOTA4LTMuODEzLTEyLjkwOC0zLjgxM0wxMzQuMzQ2LDExNS4xMTh6Ii8+DQoJCQk8cGF0aCBmaWxsPSIjNDNBMjQ0IiBkPSJNMTI1LjUyOSwxMTYuMzg5YzAsNC45MzItMC43MDksNy4wNDksMS40MSw3LjUxOWMyLjEwOSwwLjQ3Myw2LjEwNCwwLDcuNTE4LTAuOTM4DQoJCQkJYzEuNDEtMC45MzgsMC4yMzItNy4yNzktMC4yMzItOC40NjVDMTMzLjc0OCwxMTMuMzMxLDEyNS41MjksMTE0LjI3MywxMjUuNTI5LDExNi4zODl6Ii8+DQoJCQk8cGF0aCBmaWxsPSIjNjVCQzQ2IiBkPSJNMTI2LjQyNiwxMTUuMjkyYzAsNC45MzMtMC43MDcsNy4wNSwxLjQwOSw3LjUxOWMyLjEwNiwwLjQ3OSw2LjEwNCwwLDcuNTE5LTAuOTM4DQoJCQkJYzEuNDEtMC45NDEsMC4yMzEtNy4yNzktMC4yMzYtOC40NjZDMTM0LjY0NSwxMTIuMjM0LDEyNi40MjYsMTEzLjE4LDEyNi40MjYsMTE1LjI5MnoiLz4NCgkJPC9nPg0KCTwvZz4NCgk8Y2lyY2xlIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0RFNTgzMyIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIGN4PSIxMjcuMzMxIiBjeT0iNzguOTY1IiByPSI1Ny41Ii8+DQo8L2c+DQo8L3N2Zz4NCg=="
                },
                {
                    command: "commands",
                    qualifier: "contains",
                    test: `Commands are tested using the ${text.green}simulation${text.none} command.`
                },
                {
                    command: "commands base64",
                    qualifier: "contains",
                    test: `   ${text.cyan}prettydiff base64 encode string:"my string to encode"${text.none}`
                },
                {
                    command: "commands version",
                    qualifier: "contains",
                    test: "Prints the current version number and date to the shell."
                },
                {
                    command: "comm version",
                    qualifier: "contains",
                    test: "Prints the current version number and date to the shell."
                },
                {
                    command: "copy",
                    qualifier: "contains",
                    test: "The copy command requires a source path and a destination path."
                },
                {
                    command: "copy js",
                    qualifier: "contains",
                    test: "The copy command requires a source path and a destination path."
                },
                {
                    artifact: `${projectPath}temp`,
                    command: `copy ${projectPath}js ${projectPath}temp`,
                    qualifier: "filesystem contains",
                    test: `temp${supersep}minify${supersep}style.js`
                },
                {
                    artifact: `${projectPath}temp`,
                    command: `copy ${projectPath}js ${projectPath}temp 2`,
                    file: `${projectPath}temp${supersep}minify${supersep}style.js`,
                    qualifier: "file begins",
                    test: "/*global global*/"
                },
                {
                    command: "directory",
                    qualifier: "contains",
                    test: "No path supplied for the directory command."
                },
                {
                    command: `directory ${projectPath}js listonly`,
                    qualifier: "not contains",
                    test: `"ctimeMs":`
                },
                {
                    command: `directory ${projectPath}js`,
                    qualifier: "contains",
                    test: `js${supersep}minify${supersep}style.js","file"`
                },
                {
                    command: `directory ${projectPath}js 2`,
                    qualifier: "contains",
                    test: `"ctimeMs":`
                },
                {
                    command: `directory ${projectPath}js ignore ["minify"]`,
                    qualifier: "not contains",
                    test: `js${supersep}minify${supersep}style.js"`
                },
                {
                    command: `directory ".${supersep}" ignore ["node_modules", ".git", ".DS_Store"] --verbose`,
                    qualifier: "contains",
                    test: ` matching items from address `
                },
                {
                    command: `directory ${projectPath}js typeof`,
                    qualifier: "is",
                    test: "directory"
                },
                {
                    command: `directory typeof ${projectPath}js`,
                    qualifier: "is",
                    test: "directory"
                },
                {
                    command: `directory typeof ${projectPath}js${supersep}beautify${supersep}style.js`,
                    qualifier: "is",
                    test: "file"
                },
                {
                    command: "get https://duckduckgo.com/",
                    qualifier: "contains",
                    test: `DDG.page = new DDG.Pages.Home();`
                },
                {
                    command: "hash",
                    qualifier: "contains",
                    test: `Command ${text.cyan}hash${text.none} requires some form of address of something to analyze, ${text.angry}but no address is provided${text.none}.`
                },
                {
                    command: "hash asdf",
                    qualifier: "contains",
                    test: `${sep}asdf${text.none} is not a file or directory.`
                },
                {
                    command: `hash ${projectPath}tsconfig.json`,
                    qualifier: "is",
                    test: "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e"
                },
                {
                    command: `hash ${projectPath}tsconfig.json --verbose`,
                    qualifier: "contains",
                    test: "parse-framework version "
                },
                {
                    command: "hash https://duckduckgo.com/assets/logo_homepage.normal.v107.svg",
                    qualifier: "is",
                    test: "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e"
                },
                {
                    command: "help",
                    qualifier: "contains",
                    test: `To get started try the ${text.green}commands${text.none} command.`
                },
                {
                    command: "help 2",
                    qualifier: "ends",
                    test: "XXXX seconds total time"
                },
                {
                    command: "lint",
                    qualifier: "ends",
                    test: `${text.green}Lint complete for XXXX files!${text.none}`
                },
                {
                    command: "lint --verbose",
                    qualifier: "ends",
                    test: "XXXX seconds total time"
                },
                {
                    command: `lint ${projectPath}js${supersep}beautify`,
                    qualifier: "ends",
                    test: `${text.green}Lint complete for XXXX files!${text.none}`
                },
                {
                    command: "opts",
                    qualifier: "contains",
                    test: `${text.angry}* ${text.none + text.cyan}space_close      ${text.none}: Markup self-closing tags end will end with ' />' instead of '/>'.`
                },
                {
                    command: "opts 2",
                    qualifier: "ends",
                    test: `${text.green}76${text.none} matching options.`
                },
                {
                    command: "opts mode",
                    qualifier: "contains",
                    test: `${text.angry}* ${text.none + text.cyan}api       ${text.none}: any`
                },
                {
                    command: "opts top_comments",
                    qualifier: "contains",
                    test: `${text.angry}* ${text.none + text.cyan}api       ${text.none}: any`
                },
                {
                    command: "opts mode 2",
                    qualifier: "contains",
                    test: `   ${text.angry}- ${text.none + text.cyan}beautify${text.none}: beautifies code and returns a string`
                },
                {
                    command: "opts api:node",
                    qualifier: "not contains",
                    test: "ternaryline"
                },
                {
                    command: "opts lexer:script",
                    qualifier: "not contains",
                    test: "version"
                },
                {
                    command: "options lexer:script api:node",
                    qualifier: "is",
                    test: `${text.angry}Pretty Diff has no options matching the query criteria.${text.none}`
                },
                {
                    command: "options mode:diff api:node",
                    qualifier: "contains",
                    test: `${text.angry}* ${text.none + text.cyan}summary_only${text.none}: Node only option to output only number of differences.`
                },
                {
                    command: "parse",
                    qualifier: "contains",
                    test: `Pretty Diff requires option ${text.cyan}source${text.none} when using command ${text.green}parse${text.none}. Example:`
                },
                {
                    command: "parse tsconfig verbose",
                    qualifier: "begins",
                    test: "Parsed input from terminal."
                },
                {
                    command: "parse tsconfig",
                    qualifier: "is",
                    test: `{"begin":[-1,-1],"lexer":["script","script"],"lines":[0,1],"presv":[false,false],"stack":["global","global"],"token":["tsconfig","\\n"],"types":["word","string"]}`
                },
                {
                    command: `parse ${projectPath}tsconfig.json`,
                    qualifier: "begins",
                    test:`Option ${text.angry}output${text.none} was not specified and the value provided for option ${text.cyan}source${text.none} appears to be a file.`
                },
                {
                    command: `parse ${projectPath}tsconfig.json 2`,
                    qualifier: "contains",
                    test: `{"begin":[-1,0,0,0,3,3,3,3,3,3,3,3,0,0,0,0,15,15,15,15,0,0,0,0,23,23,23,23,23,23,0],"lexer":["script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script"],"lines":[0,2,0,1,2,0,1,0,2,0,1,2,0,2,0,1,2,0,2,2,0,2,0,1,2,0,2,0,2,2,2],"presv":[false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false],"stack":["global","object","object","object","object","object","object","object","object","object","object","object","object","object","object","object","array","array","array","array","object","object","object","object","array","array","array","array","array","array","object"],"token":["{","\\"compilerOptions\\"",":","{","\\"target\\"",":","\\"ES6\\"",",","\\"outDir\\"",":","\\"js\\"","}",",","\\"include\\"",":","[","\\"*.ts\\"",",","\\"**/*.ts\\"","]",",","\\"exclude\\"",":","[","\\"js\\"",",","\\"node_modules\\"",",","\\"test\\"","]","}"],"types":["start","string","operator","start","string","operator","string","separator","string","operator","string","end","separator","string","operator","start","string","separator","string","end","separator","string","operator","start","string","separator","string","separator","string","end","end"]}`
                },
                {
                    command: "parse tsconfig read_method:filescreen",
                    qualifier: "contains",
                    test: "ENOENT: no such file or directory"
                },
                {
                    command: `parse ${projectPath}tsconfig.json read_method:filescreen`,
                    qualifier: "is",
                    test: `{"begin":[-1,0,0,0,3,3,3,3,3,3,3,3,0,0,0,0,15,15,15,15,0,0,0,0,23,23,23,23,23,23,0],"lexer":["script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script"],"lines":[0,2,0,1,2,0,1,0,2,0,1,2,0,2,0,1,2,0,2,2,0,2,0,1,2,0,2,0,2,2,2],"presv":[false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false],"stack":["global","object","object","object","object","object","object","object","object","object","object","object","object","object","object","object","array","array","array","array","object","object","object","object","array","array","array","array","array","array","object"],"token":["{","\\"compilerOptions\\"",":","{","\\"target\\"",":","\\"ES6\\"",",","\\"outDir\\"",":","\\"js\\"","}",",","\\"include\\"",":","[","\\"*.ts\\"",",","\\"**/*.ts\\"","]",",","\\"exclude\\"",":","[","\\"js\\"",",","\\"node_modules\\"",",","\\"test\\"","]","}"],"types":["start","string","operator","start","string","operator","string","separator","string","operator","string","end","separator","string","operator","start","string","separator","string","end","separator","string","operator","start","string","separator","string","separator","string","end","end"]}`
                },
                {
                    command: `parse ${projectPath}tsconfig.json parse_format:clitable`,
                    qualifier: "begins",
                    test: `index | begin | lexer  | lines | presv | stack       | types       | token${node.os.EOL}------|-------|--------|-------|-------|-------------|-------------|------${node.os.EOL + text.green}0     | -1    | script | XXXX     | false | global      | start       | {${text.none}`
                },
                {
                    command: `parse ${projectPath}tsconfig.json read_method:file`,
                    qualifier: "contains",
                    test: `If option read_method evaluates to value ${text.cyan}file${text.none} option ${text.angry}output${text.none} is required.`
                },
                {
                    artifact: `${projectPath}parsetest.txt`,
                    command: `parse ${projectPath}tsconfig.json read_method:file output:"${projectPath}parsetest.txt"`,
                    qualifier: "begins",
                    test: `Parsed input from file ${text.cyan + projectPath}tsconfig.json${text.none}.`
                },
                {
                    artifact: `${projectPath}parsetest.txt`,
                    command: `parse ${projectPath}tsconfig.json read_method:file output:"parsetest.txt"`,
                    file: `${projectPath}parsetest.txt`,
                    qualifier: "file is",
                    test:  `{"begin":[-1,0,0,0,3,3,3,3,3,3,3,3,0,0,0,0,15,15,15,15,0,0,0,0,23,23,23,23,23,23,0],"lexer":["script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script","script"],"lines":[0,2,0,1,2,0,1,0,2,0,1,2,0,2,0,1,2,0,2,2,0,2,0,1,2,0,2,0,2,2,2],"presv":[false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false],"stack":["global","object","object","object","object","object","object","object","object","object","object","object","object","object","object","object","array","array","array","array","object","object","object","object","array","array","array","array","array","array","object"],"token":["{","\\"compilerOptions\\"",":","{","\\"target\\"",":","\\"ES6\\"",",","\\"outDir\\"",":","\\"js\\"","}",",","\\"include\\"",":","[","\\"*.ts\\"",",","\\"**/*.ts\\"","]",",","\\"exclude\\"",":","[","\\"js\\"",",","\\"node_modules\\"",",","\\"test\\"","]","}"],"types":["start","string","operator","start","string","operator","string","separator","string","operator","string","end","separator","string","operator","start","string","separator","string","end","separator","string","operator","start","string","separator","string","separator","string","end","end"]}`
                },
                {
                    command: "version",
                    qualifier: "ends",
                    test: " seconds total time"
                },
                {
                    command: "version 2",
                    qualifier: "begins",
                    test: `parse-framework version ${text.angry}`
                }
            ],
            len:number = tests.length,
            cwd:string = __dirname.replace(/(\/|\\)js$/, ""),
            increment = function node_apps_simulation_increment(irr:string):void {
                const interval = function node_apps_simulation_increment_interval():void {
                    a = a + 1;
                    if (a < len) {
                        wrapper();
                    } else {
                        const complete:string = `${text.green}Successfully completed all ${text.cyan + len + text.green} simulation tests.${text.none}`;
                        console.log("");
                        console.log(complete);
                        callback();
                    }
                };
                if (irr !== "") {
                    console.log(`${apps.humantime(false) + text.yellow}Test ignored (${irr}) ${a + 1}: ${text.none + tests[a].command}`);
                } else {
                    console.log(`${apps.humantime(false) + text.green}Passed simulation ${a + 1}: ${text.none + tests[a].command}`);
                }
                if (tests[a].artifact === "" || tests[a].artifact === undefined) {
                    interval();
                } else {
                    apps.remove(tests[a].artifact, function node_apps_simulation_wrapper_remove():void {
                        interval();
                    });
                }
            },
            errout = function node_apps_simulation_errout(message:string, stdout:string|Buffer) {
                apps.errout([
                    `Simulation test string ${text.angry + tests[a].command + text.none} ${message}:`,
                    tests[a].test,
                    "",
                    "",
                    `${text.green}Actual output:${text.none}`,
                    stdout
                ]);
            },
            wrapper = function node_apps_simulation_wrapper():void {
                node.child(`node js/services ${tests[a].command}`, {cwd: cwd}, function node_apps_simulation_wrapper_child(err:nodeError, stdout:string|Buffer, stderror:string|Buffer) {
                    if (tests[a].artifact === "" || tests[a].artifact === undefined) {
                        writeflag = "";
                    } else {
                        tests[a].artifact = node.path.resolve(tests[a].artifact);
                        writeflag = tests[a].artifact;
                    }
                    if (err !== null) {
                        if (err.toString().indexOf("getaddrinfo ENOTFOUND") > -1) {
                            increment("no internet connection");
                            return;
                        }
                        if (stdout === "") {
                            apps.errout([err.toString()]);
                            return;
                        }
                    }
                    if (stderror !== "") {
                        apps.errout([stderror]);
                        return;
                    }
                    if (typeof stdout === "string") {
                        stdout = stdout.replace(/\s+$/, "").replace(/^\s+/, "").replace(/\s\d+(\.\d+)*\s/g, " XXXX ");
                    }
                    if (tests[a].qualifier.indexOf("file") === 0) {
                        if (tests[a].artifact === "" || tests[a].artifact === undefined) {
                            apps.errout([`Tests ${text.cyan + tests[a].command + text.none} uses ${text.angry + tests[a].qualifier + text.none} as a qualifier but does not mention an artifact to remove.`]);
                            return;
                        }
                        if (tests[a].qualifier.indexOf("file ") === 0) {
                            tests[a].file = node.path.resolve(tests[a].file);
                            node.fs.readFile(tests[a].file, "utf8", function node_apps_simulation_wrapper_file(err:Error, dump:string) {
                                if (err !== null) {
                                    apps.errout([err.toString()]);
                                    return;
                                }
                                if (tests[a].qualifier === "file begins" && dump.indexOf(tests[a].test) !== 0) {
                                    errout(`is not starting in file: ${text.green + tests[a].file + text.none}`, dump);
                                    return;
                                }
                                if (tests[a].qualifier === "file contains" && dump.indexOf(tests[a].test) < 0) {
                                    errout(`is not anywhere in file: ${text.green + tests[a].file + text.none}`, dump);
                                    return;
                                }
                                if (tests[a].qualifier === "file ends" && dump.indexOf(tests[a].test) === dump.length - tests[a].test.length) {
                                    errout(`is not at end of file: ${text.green + tests[a].file + text.none}`, dump);
                                    return;
                                }
                                if (tests[a].qualifier === "file is" && dump !== tests[a].test) {
                                    errout(`does not match the file: ${text.green + tests[a].file + text.none}`, dump);
                                    return;
                                }
                                if (tests[a].qualifier === "file not" && dump === tests[a].test) {
                                    errout(`matches this file, but shouldn't: ${text.green + tests[a].file + text.none}`, dump);
                                    return;
                                }
                                if (tests[a].qualifier === "file not contains" && dump.indexOf(tests[a].test) > -1) {
                                    errout(`is contained in this file, but shouldn't be: ${text.green + tests[a].file + text.none}`, dump);
                                    return;
                                }
                                increment("");
                            });
                        } else if (tests[a].qualifier.indexOf("filesystem ") === 0) {
                            tests[a].test = node.path.resolve(tests[a].test);
                            node.fs.stat(tests[a].test, function node_apps_simulation_wrapper_filesystem(ers:Error) {
                                if (ers !== null) {
                                    if (tests[a].qualifier === "filesystem contains" && ers.toString().indexOf("ENOENT") > -1) {
                                        apps.errout([
                                            `Simulation test string ${text.angry + tests[a].command + text.none} does not see this address in the local file system:`,
                                            text.cyan + tests[a].test + text.none
                                        ]);
                                        return;
                                    }
                                    apps.errout([ers.toString()]);
                                    return;
                                }
                                if (tests[a].qualifier === "filesystem not contains") {
                                    apps.errout([
                                        `Simulation test string ${text.angry + tests[a].command + text.none} sees the following address in the local file system, but shouldn't:`,
                                        text.cyan + tests[a].test + text.none
                                    ]);
                                    return;
                                }
                                increment("");
                            });
                        }
                    } else {
                        if (tests[a].qualifier === "begins" && (typeof stdout !== "string" || stdout.indexOf(tests[a].test) !== 0)) {
                            errout("does not begin with the expected output", stdout);
                            return;
                        }
                        if (tests[a].qualifier === "contains" && (typeof stdout !== "string" || stdout.indexOf(tests[a].test) < 0)) {
                            errout("does not contain the expected output", stdout);
                            return;
                        }
                        if (tests[a].qualifier === "ends" && (typeof stdout !== "string" || stdout.indexOf(tests[a].test) !== stdout.length - tests[a].test.length)) {
                            errout("does not end with the expected output", stdout);
                            return;
                        }
                        if (tests[a].qualifier === "is" && stdout !== tests[a].test) {
                            errout("does not match the expected output", stdout);
                            return;
                        }
                        if (tests[a].qualifier === "not" && stdout === tests[a].test) {
                            errout("must not be this output", stdout);
                            return;
                        }
                        if (tests[a].qualifier === "not contains" && (typeof stdout !== "string" || stdout.indexOf(tests[a].test) > -1)) {
                            errout("must not contain this output", stdout)
                            return;
                        }
                        increment("");
                    }
                });
            };

        let a:number = 0;
        if (command === "simulation") {
            callback = function node_apps_lint_callback():void {
                apps.log(["\u0007"]);
            };
            verbose = true;
            console.log("");
            console.log(`${text.underline + text.bold}Pretty Diff - services.ts simulation tests${text.none}`);
            console.log("");
        }
        wrapper();
    };
    // unit test validation runner for Pretty Diff mode commands
    apps.validation = function node_apps_validation():void {
        require(`${projectPath}node_modules${sep}parse-framework${sep}js${sep}parse`);
        let count_raw = 0,
            count_formatted = 0;
        const all = require(`${projectPath}node_modules${sep}parse-framework${sep}js${sep}lexers${sep}all`),
            flag = {
                raw: false,
                formatted: false
            },
            raw:[string, string][] = [],
            formatted:[string, string][] = [],
            compare = function node_apps_validation_compare():void {
                const len:number = (raw.length > formatted.length)
                        ? raw.length
                        : formatted.length,
                    sort = function node_apps_validation_compare_sort(a:[string, string], b:[string, string]):number {
                        if (a[0] > b[0]) {
                            return 1;
                        }
                        return -1;
                    };
                let a:number = 0,
                    filecount:number = 0,
                    output:string = "";
                raw.sort(sort);
                formatted.sort(sort);
                options.context    = 4;
                options.mode       = "diff";
                options.object_sort    = true;
                options.preserve   = 2;
                options.read_method = "screen";
                options.vertical   = true;
                options.wrap       = 80;
                console.log("");
                do {
                    if (raw[a] === undefined || formatted[a] === undefined) {
                        if (raw[a] === undefined) {
                            console.log(`${text.yellow}raw directory is missing file:${text.none} ${formatted[a][0]}`);
                            formatted.splice(a, 1);
                        } else {
                            console.log(`${text.yellow}formatted directory is missing file:${text.none} ${raw[a][0]}`);
                            raw.splice(a, 1);
                        }
                        if (a === len - 1) {
                            console.log("");
                            console.log(`${text.green}Core Unit Testing Complete${text.none}`);
                            return;
                        }
                    } else if (raw[a][0] === formatted[a][0]) {
                        const notes:string[] = raw[a][0].split("_");
                        options.language   = notes[2];
                        options.lexer      = notes[1];
                        options.mode       = notes[0];
                        options.source     = raw[a][1];
                        options.lexerOptions = {};
                        options.lexerOptions[options.lexer] = {};
                        options.lexerOptions[options.lexer].objectSort = true;
                        prettydiff.api.pdcomment(options);
                        options.lang       = options.language;
                        options.parsed     = global.parseFramework.parserArrays(options);
                        output = prettydiff[options.mode][options.lexer](options);
                        if (output === formatted[a][1]) {
                            filecount = filecount + 1;
                            console.log(`${apps.humantime(false) + text.green}Pass ${filecount}:${text.none} ${formatted[a][0]}`);
                        } else {
                            console.log(`${apps.humantime(false) + text.angry}Fail: ${text.cyan + raw[a][0] + text.none}`);
                            console.log("");
                            console.log(`Diff output colors: ${text.angry + text.underline}red = beautified${text.none} and ${text.green + text.underline}green = control${text.none}`);
                            options.diff   = formatted[a][1];
                            options.language   = "text";
                            options.mode   = "diff";
                            options.source = output;
                            options.source_label = raw[a][1];
                            apps.diff();
                            break;
                        }
                    } else {
                        if (raw[a][0] < formatted[a][0]) {
                            console.log(`${text.yellow}formatted directory is missing file:${text.none} ${raw[a][0]}`);
                            raw.splice(a, 1);
                        } else {
                            console.log(`${text.yellow}raw directory is missing file:${text.none} ${formatted[a][0]}`);
                            formatted.splice(a, 1);
                        }
                    }
                    a = a + 1;
                } while (a < len);
                if (a === len) {
                    console.log(`${text.green}All ${len} files passed.${text.none}`);
                    if (command === "validation") {
                        apps.version();
                    }
                }
            },
            readDir = function node_apps_validation_readDir(type:string):void {
                const dir:string = `${projectPath}tests${sep + type}`;
                node.fs.readdir(dir, function node_apps_validation_readDir_reading(err:Error, list:string[]) {
                    if (err !== null) {
                        apps.errout([err.toString()]);
                        return;
                    }
                    const pusher = function node_apps_validation_readDir_reading_pusher(value:string, index:number, arr:string[]) {
                        node.fs.readFile(dir + sep + value, "utf8", function node_apps_validation_readDir_reading_pusher_readFile(er:Error, fileData:string) {
                            if (er !== null) {
                                apps.errout([er.toString()]);
                                return;
                            }
                            if (type === "raw") {
                                raw.push([value, fileData]);
                                count_raw = count_raw + 1;
                                if (count_raw === arr.length) {
                                    flag.raw = true;
                                    if (flag.formatted === true) {
                                        compare();
                                    }
                                }
                            } else if (type === "formatted") {
                                formatted.push([value, fileData]);
                                count_formatted = count_formatted + 1;
                                if (count_formatted === arr.length) {
                                    flag.formatted = true;
                                    if (flag.raw === true) {
                                        compare();
                                    }
                                }
                            }
                        });
                    };
                    list.forEach(pusher);
                });
            };
        
        all(options, function node_apps_validation_allLexers() {
            readDir("raw");
            readDir("formatted");
        });
    };
    // runs apps.log
    apps.version = function ():void {
        verbose = true;
        apps.log([""]);
    };
    // performs word wrap when printing text to the shell
    apps.wrapit = function node_apps_lists_wrapit(outputArray:string[], string:string):void {
        const wrap:number = 100;
        if (string.length > wrap) {
            const indent:string = (function node_apps_options_wrapit_indent():string {
                    const len:number = string.length;
                    let inc:number = 0,
                        num:number = 2,
                        str:string = "";
                    // eslint-disable-next-line
                    if ((/^(\s*((\*|-)\s*)?\w+\s*:)/).test(string.replace(/\u001b\[\d+m/g, "")) === false) {
                        return "";
                    }
                    do {
                        if (string.charAt(inc) === ":") {
                            break;
                        }
                        if (string.charAt(inc) === "\u001b") {
                            if (string.charAt(inc + 4) === "m") {
                                inc = inc + 4;
                            } else {
                                inc = inc + 3;
                            }
                        } else {
                            num = num + 1;
                        }
                        inc = inc + 1;
                    } while (inc < len);
                    inc = 0;
                    do {
                        str = str + " ";
                        inc = inc + 1;
                    } while (inc < num);
                    return str;
                }()),
                formLine = function node_apps_options_wrapit_formLine():void {
                    let inc:number = 0,
                        wrapper:number = wrap;
                    do {
                        if (string.charAt(inc) === "\u001b") {
                            if (string.charAt(inc + 4) === "m") {
                                wrapper = wrapper + 4;
                            } else {
                                wrapper = wrapper + 3;
                            }
                        }
                        inc = inc + 1;
                    } while (inc < wrapper);
                    if (string.charAt(wrapper) !== " " && string.length > wrapper) {
                        do {
                            wrapper = wrapper - 1;
                        } while (wrapper > 0 && string.charAt(wrapper) !== " ");
                        if (wrapper === 0) {
                            outputArray.push(string);
                            return;
                        }
                    }
                    outputArray.push(string.slice(0, wrapper).replace(/ $/, ""));
                    string = string.slice(wrapper + 1);
                    if (string.length + indent.length > wrap) {
                        string = indent + string;
                        node_apps_options_wrapit_formLine();
                    } else if (string !== "") {
                        outputArray.push(indent + string);
                    }
                };
            formLine();
        } else {
            outputArray.push(string);
        }
    };
}());