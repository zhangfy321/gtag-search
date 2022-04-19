import * as vscode from 'vscode';
import { Global } from './global';
import Window = vscode.window;
import QuickPickItem = vscode.QuickPickItem;
import QuickPickOptions = vscode.QuickPickOptions;

const global = new Global();
export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "fuzzy" is now active!');

    vscode.commands.registerCommand("extension.gtags-search", fuzzySearch);
    vscode.workspace.onDidSaveTextDocument(() => global.updateTags());
}


async function fuzzySearch() {

    var items: QuickPickItem[] = [];
    var opts: QuickPickOptions = {
        matchOnDescription: true,
        placeHolder: ''
    };

    var location = new Map<string, any>();
    let suggestions: any[][] = [];
    var sugg_cnt = 0;

    var full_name = vscode.workspace.workspaceFolders;
    if (full_name === undefined) { return; }
    var long_pre_path = full_name[0].uri.path + "/";
    var pre_path = long_pre_path.split(':')[1];
    // Window.showInformationMessage(pre_path);
    console.log(long_pre_path);
    console.log(pre_path);

    // 获取输入
    Window.showInputBox({
        ignoreFocusOut: true, // 默认false，设置为true时鼠标点击别的地方输入框不会消失
        placeHolder: 'typing to search (prefix "@" for symbol or search filename directly)', // 在输入框内的提示信息
    }).then(async function (msg) {

        if (msg) {
            const max = 50;
            if (!msg.startsWith("@"))
            {
                const output = await global.run(['global -iP "' + msg + '"']);
                try {
                    if (output != null && output.length > 0) {
                        output.toString().split(/\r?\n/).slice(0, max).forEach(async function (value) {
                            let tag = value.split("/").slice(-1)[0];
                            if (tag.length != 0)
                            {
                                items.push(({ label: tag, description: value }));
                                Window.showQuickPick(items, opts).then(async (selection) => {
                                    if (!selection) { return; }
        
                                    // 跳转到对应位置
                                    var uri = selection.label
                                    await Window.showTextDocument(vscode.Uri.file(long_pre_path + uri));
                                    return;
                                });
                            }
                        });
                    }
                    else {
                        items.push(({ label: "0 results", description: "" }));
                        Window.showQuickPick(items, opts);
                    }
                    
                } catch (error) {
                    console.error(error);
                }
            }
            else 
            {

                var pattern = msg.slice(1);
                // 从global获取结果
                const output = await global.run(['global -iax "' + pattern + '"']);
                try {
                    var idx = 0;
                    if (output != null && output.length > 0) {
                        output.toString().split(/\r?\n/).slice(0, max).forEach(async function (value) {
                            // 解析结果
                            var result = global.parseLine(value);
                            if (result === null) {
                                return;
                            }

                            var tag = result["tag"];
                            var line = result["line"];
                            var path = "";
                            if (pre_path !== undefined) // win 下
                            {
                                path = result["path"].split(pre_path)[1]; // 显示相对路径
                            }
                            else // mac下
                            {
                                path = result["path"].replace(long_pre_path, '');
                            }
                            suggestions[sugg_cnt] = [tag, path, line];
                            sugg_cnt++;
                        });

                        suggestions.forEach(function (i) {
                            var tag = i[0];
                            var path = i[1];
                            var line = i[2];
                            // info 和 path 组成唯一的key
                            var key: string = tag + "@" + path;

                            location.set(key, { "path": path, "line": line });
                            items.push(({ label: tag, description: path }));
                        });

                        // 显示下拉框
                        Window.showQuickPick(items, opts).then(async (selection) => {
                            if (!selection) { return; }

                            console.log("selected tag: " + selection.label);

                            // 跳转到对应位置
                            var key = selection.label + "@" + selection.description;
                            var value = location.get(key);
                            var options = {
                                selection: new vscode.Range(new vscode.Position(value["line"], 0),
                                    new vscode.Position(value["line"], 0)),
                                preview: false,
                            };
                            await Window.showTextDocument(vscode.Uri.file(long_pre_path + value["path"]), options);
                            return;
                        });
                }
                else {
                    items.push(({ label: "no results", description: "" }));
                    Window.showQuickPick(items, opts);
                }
                }
                catch (ex) {
                    console.error("Error: " + ex);
                }
            }
        }
    });
}
