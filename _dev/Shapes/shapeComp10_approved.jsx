(function main(thisObj) {
    // Create the UI window
    var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "My Script", undefined, {resizeable:true});
    win.orientation = "column";
    win.alignChildren = ["center", "center"];
    win.spacing = 0;
    win.margins = 0;

    // Create a group for the controls
    var controlGroup = win.add("group");
    controlGroup.orientation = "column";
    controlGroup.alignChildren = ["center", "center"];
    controlGroup.spacing = 10;
    controlGroup.margins = 75;

    // Add input fields
    var inputGroupName = controlGroup.add("edittext", undefined, "Name");
    inputGroupName.characters = 15;

    // Add buttons
    var buttonCheckShapes = controlGroup.add("button", undefined, "Check Shapes");
    var buttonPrecomps = controlGroup.add("button", undefined, "Pre-comps");
    var buttonRender = controlGroup.add("button", undefined, "Render");
    var buttonReplace = controlGroup.add("button", undefined, "Replace"); // New button

    // Add checkbox
    var checkboxCrop = controlGroup.add("checkbox", undefined, "Crop");
    checkboxCrop.value = false;

    // Add event handlers for buttons
    buttonCheckShapes.onClick = checkShapes;
    
    var createdPrecomps = [];
    buttonPrecomps.onClick = function() {
        createdPrecomps = createPrecomps01(inputGroupName.text, checkboxCrop.value);
    };

    buttonRender.onClick = function() {
        renderPrecomps(createdPrecomps);
    };

buttonReplace.onClick = function() {
    var outputFolder = new Folder(app.project.file.path + "/Footages");
    var folders = outputFolder.getFiles(function(file) {
        return file instanceof Folder;
    });
    for (var i = 0; i < folders.length; i++) {
        var footages = folders[i].getFiles(function(file) {
            return file instanceof File;
        });
        for (var j = 0; j < footages.length; j++) {
            var importOptions = new ImportOptions(footages[j]);
            var importedFile = importSafeWithError(importOptions);
            if (importedFile) {
                var parentFolderName = footages[j].parent.name; // Get the name of the parent folder
                replaceMediaInComps(importedFile, parentFolderName); // Use the parent folder name for replacement
            }
        }
    }
};

    // Display the window
    win.layout.layout(true);
    if (!(thisObj instanceof Panel)) {
        win.center();
        win.show();
    } else {
        win.layout.resize();
    }


function replaceMediaInComps(newMedia, newMediaName) {
    for (var i = 1; i <= app.project.numItems; i++) {
        if (app.project.item(i) instanceof CompItem) {
            var comp = app.project.item(i);
            if (comp.name == newMediaName) {
                replaceLayersInComp(comp, newMedia);
            }
        }
    }
}

function replaceLayersInComp(comp, newMedia) {
    var layersToDelete = [];
    
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



function checkShapes() {
    // Get the active project
    var project = app.project;

    // Check if there is an active project
    if (!project) {
        alert("No active project");
        return;
    }

    // Go through all the compositions in the project and assign a red label to all shape layers
    for (var j = 1; j <= project.numItems; j++) {
        if (project.item(j) instanceof CompItem) {
            for (var k = 1; k <= project.item(j).numLayers; k++) {
                if (project.item(j).layer(k).matchName === "ADBE Vector Layer") {
                    project.item(j).layer(k).label = 1;
                }
            }
        }
    }
}

function renderPrecomps(precomps) {
    var project = app.project;
    var renderQueue = project.renderQueue;
    var outputFolder = new Folder(project.file.path + "/Footages");

    // Create the Footages folder if it doesn't exist
    if (!outputFolder.exists) {
        outputFolder.create();
    }

    for (var i = 0; i < precomps.length; i++) {
        var precompFolder = new Folder(outputFolder.fullName + "/" + precomps[i].name);

        // Create a subfolder for each precomp if it doesn't exist
        if (!precompFolder.exists) {
            precompFolder.create();
        }

        var renderQueueItem = renderQueue.items.add(precomps[i]);
        var outputModule = renderQueueItem.outputModules[1];
        outputModule.applyTemplate("High Quality with Alpha");
        outputModule.file = new File(precompFolder.fullName + "/" + precomps[i].name);
    }

    renderQueue.render();

    // After rendering, replace the footages in the precompositions
    var footages = outputFolder.getFiles();
    for (var i = 0; i < footages.length; i++) {
        if (footages[i] instanceof File) {
            processFile(footages[i], precomps[i].name);
        }
    }
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

function findOrCreateFolder(name) {
    for (var i = 1; i <= app.project.rootFolder.numItems; i++) {
        if (app.project.rootFolder.item(i).name === name) {
            return app.project.rootFolder.item(i);
        }
    }
    return app.project.items.addFolder(name);
}

function importSafeWithError(importOptions) {
    try { 
        var importedFile = app.project.importFile(importOptions);
        var footagesFolder = findOrCreateFolder("Footages");
        importedFile.parentFolder = footagesFolder;
        return importedFile;
    } catch (error) {
        alert("Error while importing file: " + error.toString());
    }
    return null;
}


function createPrecomps() {
       app.beginUndoGroup("Create Precomps for All Layers");

    var project = app.project;
    if (!project) {
        alert("No active project");
        return;
    }

    var redLabelLayers = [];

    for (var j = 1; j <= project.numItems; j++) {
        if (project.item(j) instanceof CompItem) {
            for (var k = 1; k <= project.item(j).numLayers; k++) {
                if (project.item(j).layer(k).label === 1) {
                    redLabelLayers.push({
                        layer: project.item(j).layer(k),
                        comp: project.item(j)
                    });
                }
            }
        }
    }

    for (var i = 0; i < redLabelLayers.length; i++) {
        var layer = redLabelLayers[i].layer;
        var comp = redLabelLayers[i].comp;
        var originalPos = layer.position.value;

        var minX = Infinity;
        var minY = Infinity;
        var maxX = -Infinity;
        var maxY = -Infinity;
        for (var t = layer.inPoint; t <= layer.outPoint; t += comp.frameDuration) {
            var rect = layer.sourceRectAtTime(t, false);
            var pos = layer.position.valueAtTime(t, false);
            minX = Math.min(minX, pos[0] - rect.width / 2);
            minY = Math.min(minY, pos[1] - rect.height / 2);
            maxX = Math.max(maxX, pos[0] + rect.width / 2);
            maxY = Math.max(maxY, pos[1] + rect.height / 2);
        }

        minX = Math.round(minX);
        minY = Math.round(minY);
        maxX = Math.round(maxX);
        maxY = Math.round(maxY);

        var precompWidth = maxX - minX;
        var precompHeight = maxY - minY;
        var precompCenter = [(minX + maxX) / 2, (minY + maxY) / 2];

        var newComp = project.items.addComp(layer.name + "_precomp", precompWidth, precompHeight, comp.pixelAspect, comp.duration, comp.frameRate);

        layer.copyToComp(newComp);

        var newLayerInComp = newComp.layer(1);
        for (var t = newLayerInComp.inPoint; t <= newLayerInComp.outPoint; t += comp.frameDuration) {
            var originalPosAtTime = layer.position.valueAtTime(t, false);
            newLayerInComp.position.setValueAtTime(t, [originalPosAtTime[0] - minX, originalPosAtTime[1] - minY]);
        }

        var newLayer = comp.layers.add(newComp);
        newLayer.moveBefore(layer);
        newLayer.position.setValue(precompCenter);

        // сохраняем тип матового слоя
        var trackMatteType = layer.trackMatteType;
        
        // Если исходный слой имел связанный слой-маску, устанавливаем ее для нового слоя
        if (trackMatteType !== TrackMatteType.NO_TRACK_MATTE) {
            newLayer.trackMatteType = trackMatteType;
        }

        layer.remove();
    }

    var createdPrecomps = [];
    for (var i = 0; i < redLabelLayers.length; i++) {
        // Остальной код

        createdPrecomps.push(newComp);
    }

    app.endUndoGroup();

    return createdPrecomps;
}

function createPrecomps01(namePrefix, cropToCurrentFrame) {
app.beginUndoGroup("Create Precomps for All Layers");

    var project = app.project;
    if (!project) {
        alert("No active project");
        return;
    }

    var redLabelLayers = [];

    for (var j = 1; j <= project.numItems; j++) {
        if (project.item(j) instanceof CompItem) {
            for (var k = 1; k <= project.item(j).numLayers; k++) {
                if (project.item(j).layer(k).label === 1) {
                    redLabelLayers.push({
                        layer: project.item(j).layer(k),
                        comp: project.item(j)
                    });
                }
            }
        }
    }

    var createdPrecomps = [];

    for (var i = 0; i < redLabelLayers.length; i++) {
        var layer = redLabelLayers[i].layer;
        var comp = redLabelLayers[i].comp;
        var originalPos = layer.position.value;

        var minX = Infinity;
        var minY = Infinity;
        var maxX = -Infinity;
        var maxY = -Infinity;

    // Если стоит галочка "Crop", вычисляем прямоугольник только для последнего кадра слоя
    var tStart = cropToCurrentFrame ? layer.outPoint : layer.inPoint;
    var tEnd = cropToCurrentFrame ? layer.outPoint : layer.outPoint;

    for (var t = tStart; t <= tEnd; t += comp.frameDuration) {
        var rect = layer.sourceRectAtTime(t, false);
        var pos = layer.position.valueAtTime(t, false);
        minX = Math.min(minX, pos[0] - rect.width / 2);
        minY = Math.min(minY, pos[1] - rect.height / 2);
        maxX = Math.max(maxX, pos[0] + rect.width / 2);
        maxY = Math.max(maxY, pos[1] + rect.height / 2);
    }

 
        minX = Math.round(minX);
        minY = Math.round(minY);
        maxX = Math.round(maxX);
        maxY = Math.round(maxY);

        var precompWidth = maxX - minX;
        var precompHeight = maxY - minY;
        var precompCenter = [(minX + maxX) / 2, (minY + maxY) / 2];

        var precompName = namePrefix + "_" + (i + 1) + "_precomp";
        var newComp = project.items.addComp(precompName, precompWidth, precompHeight, comp.pixelAspect, comp.duration, comp.frameRate);

                layer.copyToComp(newComp);

        var newLayerInComp = newComp.layer(1);
        for (var t = newLayerInComp.inPoint; t <= newLayerInComp.outPoint; t += comp.frameDuration) {
            var originalPosAtTime = layer.position.valueAtTime(t, false);
            newLayerInComp.position.setValueAtTime(t, [originalPosAtTime[0] - minX, originalPosAtTime[1] - minY]);
        }

        var newLayer = comp.layers.add(newComp);
        newLayer.moveBefore(layer);
        newLayer.position.setValue(precompCenter);

        // сохраняем тип матового слоя
        var trackMatteType = layer.trackMatteType;
        
        // Если исходный слой имел связанный слой-маску, устанавливаем ее для нового слоя
        if (trackMatteType !== TrackMatteType.NO_TRACK_MATTE) {
            newLayer.trackMatteType = trackMatteType;
        }

        layer.remove();

        createdPrecomps.push(newComp);
    }

    app.endUndoGroup();

    return createdPrecomps;
}
// Start the script
})(this);
