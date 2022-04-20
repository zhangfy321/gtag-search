import { time } from 'console';
import * as vscode from 'vscode';
var exec = require('child-process-promise').exec;
var spawn = require('child-process-promise').spawn;

function execute(command: string): Promise<Buffer> {
    var configuration = vscode.workspace.getConfiguration('gtags-search');
    var timeOutInMs = configuration.get('timeOutInMs', 3000);
    console.log("timeout", timeOutInMs);
    return exec(command, {
        cwd: vscode.workspace.rootPath,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: timeOutInMs,
    }).then(function (result: { stdout: Buffer; }): Buffer {
        return result.stdout;
    }).fail(function (err: any) {
        return "timeout"
    }).progress(function (childProcess: any) {
        console.log("Command: " + command + " at ", vscode.workspace.rootPath);
    });
}

function executeNoTimeout(command: string): Promise<Buffer> {
    return exec(command, {
        cwd: vscode.workspace.rootPath,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
    }).then(function (result: { stdout: Buffer; }): Buffer {
        return result.stdout;
    }).fail(function (err: any) {
        return "timeout"
    }).progress(function (childProcess: any) {
        console.log("Command: " + command + " at ", vscode.workspace.rootPath);
    });
}
export class Global {
    updateInProgress: boolean = false; // 是否正在更新
    waitUpdate: boolean = false; // 是否有更新任务在等待执行

    run(params: string[]): Promise<Buffer> {
        return execute(params.join(' '));
    }

    runNoTimeout(params: string[]): Promise<Buffer> {
        return executeNoTimeout(params.join(' '));
    }

    updateTags() {
        var configuration = vscode.workspace.getConfiguration('gtags-search');
        var shouldupdate = configuration.get<boolean>('autoUpdate', true);

        if (shouldupdate) {
            if (this.updateInProgress) {
                console.log("wait update");

                this.waitUpdate = true;
            }
            else {
                console.log("update now...");

                this.updateInProgress = true;
                var self = this;
                this.run(['global -u']).then(() => {
                    self.updateTagsFinish();
                }).catch(() => {
                    self.updateTagsFinish();
                });
            }
        }
    
}
    update() : Promise<Buffer> {
        console.log("update now...");
        
        if (this.updateInProgress) {
            console.log("wait update");
            return new Promise(function(){
                return Buffer.from("another update task is running...")
            }); 
        }
        else
        {
            this.updateInProgress = true;
            var self = this;

            return this.runNoTimeout(['global -u']).then((data) => {
                self.updateTagsFinish();
                return data;
            }).catch(()=>{
                self.updateTagsFinish();
                return Buffer.from("error");
            })
        }
    }

    updateTagsFinish() {
        this.updateInProgress = false;
        if (this.waitUpdate) {
            this.waitUpdate = false;
            this.updateTags();
        }
        console.log("update down!");
    }

    parseLine(content: string): any {
        try {
            // tslint:disable-next-line: triple-equals
            if (content == null || content == "") { return null; }

            var values = content.split(/ +/);
            var tag = values[0];
            var line = parseInt(values[1]) - 1;
            var path = values[2].replace("%20", " ");
            values.shift();
            values.shift();
            values.shift();
            var info = values.join(" ");

            return { "tag": tag, "line": line, "path": path, "info": info, "kind": this.parseKind(info) };
        } catch (ex) {
            console.error("Error: " + ex);
        }
        return null;
    }

    private parseKind(info: string): vscode.SymbolKind {
        var kind = vscode.SymbolKind.Variable;

        if (info.startsWith('class ')) {
            kind = vscode.SymbolKind.Class;
        } else if (info.startsWith('struct ')) {
            kind = vscode.SymbolKind.Class;
        } else if (info.startsWith('enum ')) {
            kind = vscode.SymbolKind.Enum;
            // tslint:disable-next-line: triple-equals
        } else if (info.indexOf('(') != -1) {
            kind = vscode.SymbolKind.Function;
        }
        return kind;
    }
}
