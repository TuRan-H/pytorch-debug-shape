import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    console.log('PyTorch Debug Shape extension is now active!');

    let disposable = vscode.commands.registerCommand('pytorch-debug-shape.installPlugin', async () => {
        await installPlugin(context);
    });

    context.subscriptions.push(disposable);
    
    // Auto-install check on activation could be added here, 
    // but explicit command is safer to start.
}

async function installPlugin(context: vscode.ExtensionContext) {
    const pythonExt = vscode.extensions.getExtension('ms-python.python');
    const debugpyExt = vscode.extensions.getExtension('ms-python.debugpy');
    
    let targetExt = debugpyExt || pythonExt;

    if (!targetExt) {
        vscode.window.showErrorMessage('Python or Debugpy extension not found. Please install the Python extension.');
        return;
    }

    const extPath = targetExt.extensionPath;
    const pluginFileName = 'pydevd_plugin_pytorch_tensor_str.py';
    const sourcePath = path.join(context.extensionPath, 'src', pluginFileName);
    
    // We need to find the destination folder: .../pydevd_plugins/extensions/types/ 
    // It could be deep inside.
    
    try {
        const destDir = await findTargetDirectory(extPath, 'pydevd_plugins/extensions/types');
        
        if (!destDir) {
            vscode.window.showErrorMessage('Could not locate pydevd_plugins directory in the Python/Debugpy extension.');
            return;
        }

        const destPath = path.join(destDir, pluginFileName);

        // Read source
        // In a real built extension, src might not exist if we exclude it, 
        // so we should rely on __dirname or make sure it's included in the package.
        // For this prototype, we assume src is available or we read from where we put it.
        // Better: use context.asAbsolutePath.
        const realSourcePath = context.asAbsolutePath(path.join('src', pluginFileName));

        if (!fs.existsSync(realSourcePath)) {
             vscode.window.showErrorMessage(`Plugin source file not found at ${realSourcePath}`);
             return;
        }

        fs.copyFileSync(realSourcePath, destPath);
        
        vscode.window.showInformationMessage(`PyTorch debug plugin installed to ${destPath}. Please reload the window to apply changes.`);
        
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to install plugin: ${err}`);
        console.error(err);
    }
}

async function findTargetDirectory(basePath: string, subPathSuffix: string): Promise<string | null> {
    // BFS to find the directory ending with subPathSuffix
    // This is potentially slow, so we might want to optimize or limit depth.
    // Given the user's path: bundled/libs/debugpy/_vendored/pydevd/pydevd_plugins/extensions/types/
    // It is quite deep.
    
    const queue: string[] = [basePath];
    const visited = new Set<string>();
    
    // Limit iterations to avoid hanging
    let iterations = 0;
    const maxIterations = 5000;

    while (queue.length > 0 && iterations < maxIterations) {
        iterations++;
        const current = queue.shift()!;
        
        if (visited.has(current)) continue;
        visited.add(current);

        // Check if current path ends with our target suffix (normalized)
        // Note: Windows/Linux path separators
        if (current.split('\\').join('/').endsWith(subPathSuffix)) {
            return current;
        }

        try {
            const entries = fs.readdirSync(current, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const fullPath = path.join(current, entry.name);
                    // Heuristic: don't go into node_modules or .git
                    if (entry.name !== 'node_modules' && entry.name !== '.git') {
                        queue.push(fullPath);
                    }
                }
            }
        } catch (e) {
            // Ignore access errors
        }
    }
    
    return null;
}

export function deactivate() {}
