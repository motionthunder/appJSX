var mainWindow = new Window("palette", "ScriptUI Panel", undefined);
mainWindow.orientation = "column";

var groupOne = mainWindow.add("group", undefined, "groupOne");
groupOne.orientation = "row";
var compsButton = groupOne.add("button", undefined, "Comps");
var cropButton = groupOne.add("button", undefined, "Crop");
var renderButton = groupOne.add("button", undefined, "Render");
var replaceButton = groupOne.add("button", undefined, "Replace Media");

var project = app.project; // Объявляем project на верхнем уровне
var processedLayers = []; // Array to store processed layers
var totalProcessedLayers = 0; // Total count of processed layers

mainWindow.center();
mainWindow.show();

compsButton.onClick = function() {
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
                    } catch(err) {
                        // Catch the error when the layer has no source or other errors
                        alert("Error: " + err.message + "\nLayer: " + layer.name + "\nPre-compse: " + comp.name);
                    }
                }
            }
        }
    }
    app.endUndoGroup();
}

cropButton.onClick = function() {
    app.beginUndoGroup("Crop Compositions");

    for (var i = 1; i <= project.numItems; i++) {
        var item = project.item(i);

        if (item instanceof CompItem && item.name.indexOf("LabElements_") === 0) {
            var comp = item;

            var rightMost = 0;
            var leftMost = comp.width;
            var topMost = comp.height;
            var bottomMost = 0;
            for (var j = 1; j <= comp.numLayers; j++) {
                var layer = comp.layer(j);
                var sourceRect = layer.sourceRectAtTime(0, false);
                var position = layer.property("Position").value;
                var left = sourceRect.left + position[0];
                var top = sourceRect.top + position[1];
                rightMost = Math.max(left + sourceRect.width, rightMost);
                leftMost = Math.min(left, leftMost);
                topMost = Math.min(top, topMost);
                bottomMost = Math.max(top + sourceRect.height, bottomMost);
            }

            // Set new comp width and height.
            comp.width = Math.floor(Math.abs(rightMost - leftMost));
            comp.height = Math.floor(Math.abs(bottomMost - topMost));

            // Shift position of layer
            for (var j = 1; j <= comp.numLayers; j++) {
                var layer = comp.layer(j);
                var position = layer.property("Position").value;
                layer.property("Position").setValue([position[0] - leftMost, position[1] - topMost]);
            }
        }
    }

    app.endUndoGroup();
}

renderButton.onClick = function() {
    // Render code here, as in your example
    // ...
}

replaceButton.onClick = function() {
    // Replace media code here, as in your example
    // ...
}

function isLayerProcessed(layerId) {
    for (var i = 0; i < processedLayers.length; i++) {
        if (processedLayers[i] === layerId) {
            return true;
        }
    }
    return false;
}
