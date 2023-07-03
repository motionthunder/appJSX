(function main(thisObj) {
    // Create the UI window
    var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "My Script", undefined, {resizeable:true});
    win.orientation = "column";

    // Add input fields
    var inputGroupName = win.add("edittext", undefined, "Name");
    inputGroupName.characters = 15;

    // Add buttons
    var buttonCheckShapes = win.add("button", undefined, "Check Shapes");
    var buttonPrecomps = win.add("button", undefined, "Pre-comps");
    var buttonRender = win.add("button", undefined, "Render");

    // Add checkbox
    var checkboxCrop = win.add("checkbox", undefined, "Crop");
    checkboxCrop.value = false;

    // Add event handlers for buttons
    buttonCheckShapes.onClick = checkShapes;
    
    var createdPrecomps = [];
    buttonPrecomps.onClick = function() {
        createdPrecomps = createPrecomps01(inputGroupName.text, checkboxCrop.value);
        alert('Created ' + createdPrecomps.length + ' precompositions');
    };

    buttonRender.onClick = function() {
        renderPrecomps(createdPrecomps);
    };

    // Display the window
    win.layout.layout(true);
    if (!(thisObj instanceof Panel)) {
        win.show();
    } else {
        win.layout.layout(true);
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