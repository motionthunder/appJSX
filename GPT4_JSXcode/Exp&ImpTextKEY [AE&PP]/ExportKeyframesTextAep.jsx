var comp = app.project.activeItem;

function exportLayerData(textLayer) {
    var animationData = {};

    function getKeyframesData(property) {
        var keyframes = [];
        if (property.numKeys > 0) {
            for (var i = 1; i <= property.numKeys; i++) {
                var value = property.keyValue(i);
                if (property.name === "Position") {
                    value = [value[0] / comp.width, value[1] / comp.height];
                } else if (property.name === "Scale") {
                    value = value[0];
                }
                keyframes.push({
                    time: property.keyTime(i),
                    value: value,
                });
            }
        } else {
            var value = property.value;
            if (property.name === "Position") {
                value = [value[0] / comp.width, value[1] / comp.height];
            } else if (property.name === "Scale") {
                value = value[0];
            }
            keyframes.push({
                time: 0,
                value: value,
            });
        }
        return keyframes;
    }

    var textTransform = textLayer.property("Transform");
    animationData.position = getKeyframesData(textTransform.property("Position"));
    animationData.scale = getKeyframesData(textTransform.property("Scale"));
    animationData.rotation = getKeyframesData(textTransform.property("Rotation"));
    animationData.opacity = getKeyframesData(textTransform.property("Opacity"));

    var anchorPointValue = textLayer.property("Transform").property("Anchor Point").value;
    var rect = textLayer.sourceRectAtTime(comp.time, false)
    animationData.anchorPoint = [
        anchorPointValue[0] / comp.width,
        anchorPointValue[1] / comp.height,
    ];

    return animationData;
}

var allAnimationData = [];
for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer instanceof TextLayer) {
        allAnimationData.push(exportLayerData(layer));
    }
}

var exportFile = new File("~/Desktop/animationData.json"); // замените на путь к вашему файлу
exportFile.open("w");
exportFile.write("eval(" + JSON.stringify(allAnimationData) + ")");
exportFile.close();
