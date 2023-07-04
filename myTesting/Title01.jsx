function createPrecomps() {
    app.beginUndoGroup("Create Precomps for All Text Layers");

    var project = app.project;
    if (!project) {
        alert("No active project");
        return;
    }

    var textLayers = [];

    for (var j = 1; j <= project.numItems; j++) {
        if (project.item(j) instanceof CompItem && project.item(j).name.indexOf("Title Animation") !== -1) {
            for (var k = 1; k <= project.item(j).numLayers; k++) {
                if (project.item(j).layer(k) instanceof TextLayer) {
                    textLayers.push({
                        layer: project.item(j).layer(k),
                        comp: project.item(j)
                    });
                }
            }
        }
    }

    for (var i = 0; i < textLayers.length; i++) {
        var layer = textLayers[i].layer;
        var comp = textLayers[i].comp;
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

        var newComp = project.items.addComp(layer.name + " ", precompWidth, precompHeight, comp.pixelAspect, comp.duration, comp.frameRate);

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
            newLayer.trackMatteType =trackMatteType;
        }

        layer.remove();
    }

    app.endUndoGroup();
}

createPrecomps();
