(function main(thisObj) {
    var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "My Script", undefined, {resizeable:true});
    win.orientation = "column";
    win.alignChildren = ["center", "center"];
    win.spacing = 0;
    win.margins = 0;

    var controlGroup = win.add("group");
    controlGroup.orientation = "column";
    controlGroup.alignChildren = ["center", "center"];
    controlGroup.spacing = 10;
    controlGroup.margins = 75;

    var buttonPrecomps = controlGroup.add("button", undefined, "Pre-comps");
    var checkboxCrop = controlGroup.add("checkbox", undefined, "Crop");
    checkboxCrop.value = false;

    buttonPrecomps.onClick = function() {
        if(checkboxCrop.value){
            createPrecompsWithCrop();
        } else {
            createPrecompsWithoutCrop();
        }
    };

    win.layout.layout(true);
    if (!(thisObj instanceof Panel)) {
        win.center();
        win.show();
    } else {
        win.layout.resize();
    }

    function createPrecompsWithCrop() {
    app.beginUndoGroup("Create Precomps for All Text Layers");

    var project = app.project;
    if (!project) {
        alert("No active project");
        return;
    }

    // Add main "Text" folder
    var textFolder = project.items.addFolder("Text");
    
    var textLayers = [];
    for (var j = 1; j <= project.numItems; j++) {
        if (project.item(j) instanceof CompItem && project.item(j).name.indexOf("Title Animation") !== -1) {
            var folderName = "Title " + project.item(j).name.split("Title Animation ")[1];
            // Create folder inside "Text" folder
            var parentFolder = textFolder.items.addFolder(folderName);

            for (var k = 1; k <= project.item(j).numLayers; k++) {
                if (project.item(j).layer(k) instanceof TextLayer) {
                    textLayers.push({
                        layer: project.item(j).layer(k),
                        comp: project.item(j),
                        parentFolder: parentFolder
                    });
                }
            }
        }
    }

    for (var i = 0; i < textLayers.length; i++) {
        var layer = textLayers[i].layer;
        var comp = textLayers[i].comp;
        var parentFolder = textLayers[i].parentFolder;

        var minX = Infinity;
        var minY = Infinity;
        var maxX = -Infinity;
        var maxY = -Infinity;

        // Crop to current frame
        var rect = layer.sourceRectAtTime(layer.outPoint, false);
        var pos = layer.position.valueAtTime(layer.outPoint, false);
        minX = Math.round(pos[0] - rect.width / 2);
        minY = Math.round(pos[1] - rect.height / 2);
        maxX = Math.round(pos[0] + rect.width / 2);
        maxY = Math.round(pos[1] + rect.height / 2);

        var precompWidth = Math.round(maxX - minX);
        var precompHeight = Math.round(maxY - minY);
        var newComp = project.items.addComp(layer.name + "", precompWidth, precompHeight, comp.pixelAspect, comp.duration, comp.frameRate);
        newComp.parentFolder = parentFolder;

        layer.copyToComp(newComp);

        var newLayerInComp = newComp.layer(1);
        var anchorOffset = [newLayerInComp.anchorPoint.value[0] - rect.width / 2, newLayerInComp.anchorPoint.value[1] - rect.height / 2];

        for (var t = newLayerInComp.inPoint; t <= newLayerInComp.outPoint; t += comp.frameDuration) {
            var originalPosAtTime = layer.position.valueAtTime(t, false);
            newLayerInComp.position.setValueAtTime(t, [originalPosAtTime[0] - minX + anchorOffset[0], originalPosAtTime[1] - minY + anchorOffset[1] + precompHeight]);
        }

        var newLayer = comp.layers.add(newComp);
        newLayer.moveBefore(layer);

        // Adjust the position considering the offset
        var layerPosition = layer.position.value;
        newLayer.position.setValue([layerPosition[0], layerPosition[1] - precompHeight]);

        // Preserve the original anchor point
        newLayer.anchorPoint.setValue(layer.anchorPoint.value);

        var trackMatteType = layer.trackMatteType;

        if (trackMatteType !== TrackMatteType.NO_TRACK_MATTE) {
            newLayer.trackMatteType = trackMatteType;
        }

        layer.remove();
    }

    app.endUndoGroup();
}

function createPrecompsWithoutCrop() {
    app.beginUndoGroup("Create Precomps for All Text Layers");

    var project = app.project;
    if (!project) {
        alert("No active project");
        return;
    }

    // Add main "Text" folder
    var textFolder = project.items.addFolder("Text");
    
    var textLayers = [];
    for (var j = 1; j <= project.numItems; j++) {
        if (project.item(j) instanceof CompItem && project.item(j).name.indexOf("Title Animation") !== -1) {
            var folderName = "Title " + project.item(j).name.split("Title Animation ")[1];
            // Create folder inside "Text" folder
            var parentFolder = textFolder.items.addFolder(folderName);

            for (var k = 1; k <= project.item(j).numLayers; k++) {
                if (project.item(j).layer(k) instanceof TextLayer) {
                    textLayers.push({
                        layer: project.item(j).layer(k),
                        comp: project.item(j),
                        parentFolder: parentFolder
                    });
                }
            }
        }
    }

for (var i = 0; i < textLayers.length; i++) {
    var layer = textLayers[i].layer;
    var comp = textLayers[i].comp;
    var parentFolder = textLayers[i].parentFolder;

    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;

    // Crop to full duration
    for (var t = layer.inPoint; t <= layer.outPoint; t += comp.frameDuration) {
        var rect = layer.sourceRectAtTime(t, false);
        var pos = layer.position.valueAtTime(t, false);
        minX = Math.min(minX, pos[0] - rect.width / 2);
        minY = Math.min(minY, pos[1] - rect.height / 2);
        maxX = Math.max(maxX, pos[0] + rect.width / 2);
        maxY = Math.max(maxY, pos[1] + rect.height / 2);
    }

    var precompWidth = Math.round(maxX - minX);
    var precompHeight = Math.round(maxY - minY);
    var precompCenter = [Math.round((minX + maxX) / 2), Math.round((minY + maxY) / 2)];
    var newComp = project.items.addComp(layer.name + "", precompWidth, precompHeight, comp.pixelAspect, comp.duration, comp.frameRate);
    newComp.parentFolder = parentFolder;

    var originalAnchor = layer.property("Anchor Point").value;
    layer.copyToComp(newComp);
    var newLayerInComp = newComp.layer(1);

    // Сохраняем оригинальные размеры слоя
    var originalSize = [rect.width, rect.height];

    var anchorOffset = [originalAnchor[0] - originalSize[0] / 2, originalAnchor[1] - originalSize[1] / 2];

    for (var t = newLayerInComp.inPoint; t <= newLayerInComp.outPoint; t += comp.frameDuration) {
        var originalPosAtTime = layer.position.valueAtTime(t, false);
        newLayerInComp.position.setValueAtTime(t, [originalPosAtTime[0] - minX + anchorOffset[0], originalPosAtTime[1] - minY + anchorOffset[1]]);
    }


    var newLayer = comp.layers.add(newComp);
    newLayer.moveBefore(layer);

    // Устанавливаем тот же анкор-поинт, что был на слое, учитывая размеры новой прекомпозиции
    newLayer.property("Anchor Point").setValue([newComp.width / 2 + anchorOffset[0], newComp.height / 2 + anchorOffset[1]]);

    newLayer.position.setValue(precompCenter);

    var trackMatteType = layer.trackMatteType;

    if (trackMatteType !== TrackMatteType.NO_TRACK_MATTE) {
        newLayer.trackMatteType = trackMatteType;
    }

    layer.remove();
}

    app.endUndoGroup();
}



})(this);
