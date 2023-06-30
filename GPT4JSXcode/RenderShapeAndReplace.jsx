var mainWindow = new Window("palette", "ScriptUI Panel", undefined);
mainWindow.orientation = "column";

var groupOne = mainWindow.add("group", undefined, "groupOne");
groupOne.orientation = "row";
var renderButton = groupOne.add("button", undefined, "Push Render");
var replaceButton = groupOne.add("button", undefined, "Replace Media");

var project = app.project; // Объявляем project на верхнем уровне

mainWindow.center();
mainWindow.show();

renderButton.onClick = function() {

if (!project || !project.file) {
    throw new Error("Нет открытых проектов или проект не сохранен");
}

var renderQueue = project.renderQueue;
var processedLayers = []; // Array to store processed layers
var totalProcessedLayers = 0; // Total count of processed layers

function setRenderSettings(renderQueueItem, comp, index, suffix) {
    var projectPath = project.file.path;

    var footagesPath = projectPath + "/Footages";
    var footagesFolder = new Folder(footagesPath);
    if (!footagesFolder.exists) {
        var created = footagesFolder.create();
        if (!created) {
            throw new Error("Не удалось создать папку Footages");
        }
    }

    var compFootagesPath = footagesPath + "/" + comp.name;
    var compFootagesFolder = new Folder(compFootagesPath);
    if (!compFootagesFolder.exists) {
        var created = compFootagesFolder.create();
        if (!created) {
            throw new Error("Не удалось создать папку для композиции: " + comp.name);
        }
    }

    var outputFileName = compFootagesPath + "/" + comp.name + "_shape" + index + suffix + ".mov";

    if (renderQueueItem.outputModules.length > 0) {
        renderQueueItem.outputModules[1].file = new File(outputFileName);
    } else {
        throw new Error("У элемента очереди рендеринга нет модулей вывода");
    }
}

function isLayerProcessed(layerId) {
    for (var i = 0; i < processedLayers.length; i++) {
        if (processedLayers[i] === layerId) {
            return true;
        }
    }
    return false;
}

app.beginUndoGroup("Precompose Red Layers");
for (var i = 1; i <= project.numItems; i++) {
    var item = project.item(i);

    if (item instanceof CompItem && item.name.indexOf("LabElements_") !== 0) {
        var comp = item;
        var redLayers = [];

        for (var j = 1; j <= comp.numLayers; j++) {
            var layer = comp.layer(j);

            if (layer.label === 1 && !isLayerProcessed(layer.id)) { // Check if the layer is not processed yet
                redLayers.push(layer.index);
                processedLayers.push(layer.id); // Add the layer to the processed list
            }
        }

        if (redLayers.length > 0) {
            for (var k = 0; k < redLayers.length; k++) {
                try {
                    var precompLayers = [redLayers[k]];

                    var redLayer = comp.layer(redLayers[k]);

                    var precomp = comp.layers.precompose(precompLayers, "LabElements_" + (++totalProcessedLayers), true);

                    var renderQueueItem = renderQueue.items.add(precomp);

                    setRenderSettings(renderQueueItem, precomp, i, "_precomp" + i + "_" + k);
                } catch(err) {
                    // Catch the error when the layer has no source or other errors
                    alert("Error: " + err.message + "\nLayer: " + layer.name + "\nPre-compse: " + comp.name);
                }
            }
        }
    }
}
app.endUndoGroup();

try {
    renderQueue.render();
} catch(err) {
    alert("Error during rendering: " + err.message);
}
}

var projectPath = app.project.file.path;
var originFolderPath = new Folder(projectPath + "/Footages");

replaceButton.onClick = function() {
    alert("Replace Media Button Clicked");
    processFolder(originFolderPath); // Import the files of the folder
}

function processFile(theFile, newMediaName) {
    try {
        var importOptions = new ImportOptions(theFile);
        var importedFile = importSafeWithError(importOptions);
        
        if (importedFile) {
            replaceMediaInComps(importedFile, newMediaName);
        }
    } catch (error) {
        alert("Error while importing file: " + error.toString());
    }
}

function importSafeWithError(importOptions) {
    try { 
        return app.project.importFile(importOptions);
    } catch (error) {
        alert("Error while importing file: " + error.toString());
    }
    return null;
}

// Updated function that processes subfolders
function processFolder(folder) {
    var filesAndFolders = folder.getFiles();
    for (var i = 0; i < filesAndFolders.length; i++) {
        if (filesAndFolders[i] instanceof File) {
            processFile(filesAndFolders[i], folder.name); 
        }
        else if (filesAndFolders[i] instanceof Folder) {
            processFolder(filesAndFolders[i]); // recursive call to process subfolders
        }
    }   
}

function replaceMediaInComps(newMedia, newMediaName) {
    for (var i = 1; i <= app.project.numItems; i++) {
        if (app.project.item(i) instanceof CompItem) {
            var comp = app.project.item(i);
            replaceLayersInComp(comp, newMedia, newMediaName);
        }
    }
}

function replaceLayersInComp(comp, newMedia, newMediaName) {
    var layersToDelete = [];
    
    // Check if the composition name matches the new media's parent folder name
    if (comp.name == newMediaName) {
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            layersToDelete.push(layer);
        }
        
        // If there are layers to replace, add new media layer and delete old layers
        if (layersToDelete.length > 0) {
            comp.layers.add(newMedia);
            
            for (var i = 0; i < layersToDelete.length; i++) {
                layersToDelete[i].remove();
            }
        }
    }
}





















