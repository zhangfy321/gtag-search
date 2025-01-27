import * as vscode from 'vscode';
import { Global } from './global';
import Window = vscode.window;
import QuickPickItem = vscode.QuickPickItem;
import QuickPickOptions = vscode.QuickPickOptions;

const global = new Global();
export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension is now active!');
    vscode.commands.registerCommand("extension.gtags-search", Search);
    vscode.commands.registerCommand("extension.gtags-search-update", ManualUpdate);
    vscode.workspace.onDidSaveTextDocument(() => global.updateTags());
}

async function ManualUpdate() {
    Window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'gtags-search is updating index, please wait...' },
        async (progress) => {
            return await global.update();
        }).then((data) => {
            Window.showInformationMessage("update done " + data.toString());
        });
};

function hasCapital(str: string) {
    var result = str.match(/^.*[A-Z]+.*$/);
    if (result == null) return false;
    return true;
}


async function Search() {
    var location = new Map<string, any>();
    var full_name = vscode.workspace.workspaceFolders;
    if (full_name === undefined) { return; }
    var long_pre_path = full_name[0].uri.path + "/";
    var pre_path = long_pre_path.split(':')[1];
    var configuration = vscode.workspace.getConfiguration('gtags-search');
    const max = configuration.get('MaxShowNum', 60);

    var box = Window.createQuickPick();
    box.placeholder = 'typing to search (prefix "@" for symbol or search filename directly)';
    box.ignoreFocusOut = true;
    box.show();
    console.log("show")

    box.onDidChangeValue((e) => {
        var msg = e;
        if (!msg) return;
        
        var symbol_search = msg.startsWith("@");
        console.log(msg);
        var command = ["global"]
        var ignore_case = !hasCapital(msg);
        if (symbol_search) {
            msg = msg.slice(1)
            if (ignore_case) command.push("-c") // 补全(前缀匹配)
            else command.push("-ax")
        }
        else {
            command.push("-P") //文件名
        }

        if (ignore_case) {
            command.push("-i") // 忽略大小写
        }

        command.push(msg);

        box.busy = true;
        return global.run(command).then((output_buf) => {

            var output = output_buf.toString();
            if (output == null || output.length == 0) Window.showErrorMessage('no result');
            var tmp_symbol:any = []
            var tmp_file:any = []
            location.clear()
            output.split(/\r?\n/).slice(0, max).forEach(async function (value) {
                if (symbol_search) {
                    if (value.length != 0) {
                        if (ignore_case) 
                        {
                            tmp_symbol.push({ label: "@" + value, description: ""});
                        }
                        else
                        {
                            var info = global.parseLine(value);
                            location.set( "@" + info.tag + info.path, info.line);
                            tmp_symbol.push({ label: "@" + info.tag, description: info.path});
                        }
                    }
                }
                else {
                    let tag = value.split("/").slice(-1)[0];
                    if (tag.length != 0) {
                        tmp_file.push({ label: tag, description: value });
                    }
                }
            })

            if (symbol_search) {
                box.items = tmp_symbol;
            }
            else {
                box.items = tmp_file;
            }
            box.busy = false;
        })
    })

    box.onDidAccept((e: any) => {
        if (box.selectedItems.length == 0) { return; }

        // 跳转到对应位置
        var item = box.selectedItems[0];

        if (item.description == undefined || item.description.length == 0) {
            box.value = item.label;
            return;
        }
        else 
        {
            var line = Number(location.get(item.label + item.description))
            if (line)
            {
                var options = {
                    selection: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 0)),
                    preview: false,
                };
                box.hide()
                return Window.showTextDocument(vscode.Uri.file(item.description), options);
                
            }
            else
            {
                box.hide()
                return  Window.showTextDocument(vscode.Uri.file(long_pre_path + item.description), {preview: false});
            }
            
        }
    });


    // function normalSearch() {
    //     Window.showInputBox({
    //         ignoreFocusOut: true, // 默认false，设置为true时鼠标点击别的地方输入框不会消失
    //         placeHolder: 'typing to search (prefix "@" for symbol or search filename directly)', // 在输入框内的提示信息
    //     }).then(async function (msg) {
    //         if (!msg) return;
    //         Window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'gtags-search is searching, please wait...' },
    //             async (progress) => {
    //                 if (!msg.startsWith("@")) {
    //                     return await global.run(["global", " -iP ", msg]);
    //                 }
    //                 else {
    //                     if (hasCapital(msg)) {
    //                         return await global.run(["global", " -ax ", msg.slice(1)]);
    //                     }
    //                     else {
    //                         return await global.run(["global", " -axi ", msg.slice(1)]);
    //                     }
    //                 }
    //             }).then(async function (output) {
    //                 if (!msg.startsWith("@")) {
    //                     try {
    //                         if (output != null && output.length > 0) {
    //                             output.toString().split(/\r?\n/).slice(0, max).forEach(async function (value) {
    //                                 let tag = value.split("/").slice(-1)[0];
    //                                 if (tag.length != 0) {
    //                                     items.push(({ label: tag, description: value }));
    //                                     Window.showQuickPick(items, opts).then(async (selection) => {
    //                                         if (!selection) { return; }

    //                                         // 跳转到对应位置
    //                                         var uri = selection.description
    //                                         await Window.showTextDocument(vscode.Uri.file(long_pre_path + uri));
    //                                         return;
    //                                     });
    //                                 }
    //                             });
    //                         }
    //                         else {
    //                             Window.showErrorMessage('no result');
    //                         }

    //                     } catch (error) {
    //                         console.error(error);
    //                     }
    //                 }
    //                 else {
    //                     try {
    //                         if (output != null && output.length > 0 && !output.toString().startsWith("timeout")) {
    //                             output.toString().split(/\r?\n/).slice(0, max).forEach(async function (value) {
    //                                 // 解析结果
    //                                 var result = global.parseLine(value);
    //                                 if (result === null) {
    //                                     return;
    //                                 }

    //                                 var tag = result["tag"];
    //                                 var line = result["line"];
    //                                 var path = "";
    //                                 if (pre_path !== undefined) // win 下
    //                                 {
    //                                     path = result["path"].split(pre_path)[1]; // 显示相对路径
    //                                 }
    //                                 else // mac下
    //                                 {
    //                                     path = result["path"].replace(long_pre_path, '');
    //                                 }
    //                                 suggestions[sugg_cnt] = [tag, path, line];
    //                                 sugg_cnt++;
    //                             });

    //                             suggestions.forEach(function (i) {
    //                                 var tag = i[0];
    //                                 var path = i[1];
    //                                 var line = i[2];
    //                                 // info 和 path 组成唯一的key
    //                                 var key: string = tag + "@" + path;

    //                                 location.set(key, { "path": path, "line": line });
    //                                 items.push(({ label: tag, description: path }));
    //                             });

    //                             // 显示下拉框
    //                             Window.showQuickPick(items, opts).then(async (selection) => {
    //                                 if (!selection) { return; }

    //                                 console.log("selected tag: " + selection.label);

    //                                 // 跳转到对应位置
    //                                 var key = selection.label + "@" + selection.description;
    //                                 var value = location.get(key);
    //                                 var options = {
    //                                     selection: new vscode.Range(new vscode.Position(value["line"], 0),
    //                                         new vscode.Position(value["line"], 0)),
    //                                     preview: false,
    //                                 };
    //                                 await Window.showTextDocument(vscode.Uri.file(long_pre_path + value["path"]), options);
    //                                 return;
    //                             });
    //                         }
    //                         else {
    //                             Window.showErrorMessage(output.toString());
    //                         }
    //                     }
    //                     catch (ex) {
    //                         console.error("Error: " + ex);
    //                     }
    //                 }
    //             });

    //     })
    // }

}
