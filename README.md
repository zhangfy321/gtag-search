
# COPYRIGHT STATEMENT
this extension is originated by the project below

https://github.com/JoeyLu93/vscode-fuzzy-tag
https://marketplace.visualstudio.com/items?itemName=joeylu-vscode.fuzzy-tag

# README

search any filename or symbol so fast.
## Features

-----------------------------------------------------------------------------------------------------------

KeyBinding: 

- search: alt + space  
- incremently-update: ctrl + u

Setting: 
- gtags-search.autoUpdate: Whether Gtags should update automatically or not when saving file. (default: false)

Tips:
if your gtags files are on HDD, case-ignore search may be slow,
so if you have enouth memory space, you can copy GPATH, GTAGS, GRTAGS to /dev/shm, then create soft link in the workspace.  

note that the default space of /dev/shm is half total phsical memory, if your tag file too big to copy, you can use command bellow to resolve.

```shell
mount -o size=1500M -o nr_innodes=1000000 -o noatime,nodiratime -o remount /dev/shm
```

------------------------------------------------------------------------------------------------------

## Requirements

1. please install GNU global and generate gtags files correctly.
2. please open files in workspace.
3. chinese characters CANNOT be included in the workspace path.

-----------------------------------------------------------------------------------------------------------
