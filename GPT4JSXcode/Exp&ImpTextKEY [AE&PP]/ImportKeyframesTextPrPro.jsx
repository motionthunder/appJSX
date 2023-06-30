alert("Reading JSON file");
var importFile = new File("~/Desktop/animationData.json"); // замените на путь к вашему файлу
importFile.open("r");
var fileContents = importFile.read();
var allAnimationData = eval(fileContents);
importFile.close();

var project = app.project;
var sequence = project.activeSequence;

function importAnimationData(textLayer, animationData) {
    function applyKeyframesData(propertyName, property, keyframesData, clip) {
        if (!property || !property.isTimeVarying) {
            alert("Property '" + propertyName + "' is not valid or not time-varying");
            return;
        }
        property.setTimeVarying(true);
        for (var i = 0; i < keyframesData.length; i++) {
            var keyframe = keyframesData[i];
            var timeInSeconds = keyframe.time + clip.inPoint.seconds;
            property.addKey(timeInSeconds);
            property.setValueAtKey(timeInSeconds, keyframe.value, true);
        }
    }

    var animationDataIndex = 0;
    for (var textComponentIndex = 3; textComponentIndex < textLayer.components.numItems; textComponentIndex++) {
        var textComponent = textLayer.components[textComponentIndex];
        if (textComponent && textComponent.displayName === "Text") {
            if (animationDataIndex < animationData.length) {
                var currentAnimationData = animationData[animationDataIndex];
                applyKeyframesData("Position", textComponent.properties[2], currentAnimationData.position, textLayer);
                applyKeyframesData("Scale", textComponent.properties[3], currentAnimationData.scale, textLayer);
                applyKeyframesData("Rotation", textComponent.properties[6], currentAnimationData.rotation, textLayer);
                applyKeyframesData("Opacity", textComponent.properties[7], currentAnimationData.opacity, textLayer);
                // Установка статичного Anchor Point
                var anchorPointProperty = textComponent.properties[8];
                var anchorPointValue = currentAnimationData.anchorPoint;
                anchorPointProperty.setValue([anchorPointValue[0], anchorPointValue[1]], true);
                animationDataIndex++;
            } else {
                break;
            }
        }
    }
}

var videoTrackIndex = 0;
var textLayer = sequence.videoTracks[videoTrackIndex].clips[0];
importAnimationData(textLayer, allAnimationData);

alert("Finished");
