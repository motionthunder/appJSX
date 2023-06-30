{
    function createUI(thisObj) {
        var myPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Маски Opacity Анимация", undefined);
        myPanel.orientation = "column";

        var groupOne = myPanel.add("group", undefined, "GroupOne");
        groupOne.orientation = "row";
        var frameDistanceLabel = groupOne.add("statictext", undefined, "Расстояние между кадрами:");
        var frameDistanceInput = groupOne.add("edittext", undefined, "1");
        frameDistanceInput.characters = 4;

        var groupTwo = myPanel.add("group", undefined, "GroupTwo");
        groupTwo.orientation = "row";
        var keyframeOffsetLabel = groupTwo.add("statictext", undefined, "Смещение ключевых кадров:");
        var keyframeOffsetInput = groupTwo.add("edittext", undefined, "0");
        keyframeOffsetInput.characters = 4;

        var opacityGroup = myPanel.add("group", undefined, "OpacityGroup");
        opacityGroup.orientation = "row";
        var opacityLabel1 = opacityGroup.add("statictext", undefined, "Opacity 1:");
        var opacityInput1 = opacityGroup.add("edittext", undefined, "0");
        opacityInput1.characters = 4;
        var opacityLabel2 = opacityGroup.add("statictext", undefined, "Opacity 2:");
        var opacityInput2 = opacityGroup.add("edittext", undefined, "100");
        opacityInput2.characters = 4;
        var opacityLabel3 = opacityGroup.add("statictext", undefined, "Opacity 3:");
        var opacityInput3 = opacityGroup.add("edittext", undefined, "0");
        opacityInput3.characters = 4;

        var toggleHoldCheckbox = myPanel.add("checkbox", undefined, "Использовать Toggle Hold Keyframes");

        var applyButton = myPanel.add("button", undefined, "Применить");

        applyButton.onClick = function() {
            var frameDistance = parseInt(frameDistanceInput.text, 10);
            if (isNaN(frameDistance) || frameDistance <= 0) {
                alert("Введите корректное расстояние между кадрами (целое число > 0)");
                return;
            }

            var keyframeOffset = parseInt(keyframeOffsetInput.text, 10);
            if (isNaN(keyframeOffset)) {
                alert("Введите корректное значение для смещения ключевых кадров (целое число)");
                return;
            }

            var opacityValues = [
                parseInt(opacityInput1.text, 10),
                parseInt(opacityInput2.text, 10),
                parseInt(opacityInput3.text, 10)
            ];

            for (var i = 0; i < 3; i++) {
                if (isNaN(opacityValues[i]) || opacityValues[i] < 0 || opacityValues[i] > 100) {
                    alert("Введите корректные значения прозрачности (целые числа от 0 до 100)");
                    return;
                }
            }

            setMaskOpacityKeyframes(frameDistance, keyframeOffset, toggleHoldCheckbox.value, opacityValues);
        };

        myPanel.layout.layout(true);
        return myPanel;
    }

    function setMaskOpacityKeyframes(frameDistance, keyframeOffset, toggleHold, opacityValues) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Нет активной композиции");
            return;
        }

        var layer = comp.selectedLayers[0];
        if (!layer) {
            alert("Нет выбранного слоя");
            return;
        }

        var numMasks = layer("Masks").numProperties;
        if (numMasks == 0) {
            alert("На слое нет масок");
            return;
        }

        app.beginUndoGroup("Маски Opacity Анимация");

        var currentFrame = comp.displayStartTime;
        var frameDuration = comp.frameDuration;

        for (var i = 1; i <= numMasks; i++) {
            var maskOpacity = layer.property("Masks").property(i).property("Mask Opacity");

            var keyOffset = keyframeOffset * (i - 1) * frameDuration;

            // Установка ключевых кадров для текущей маски с учетом смещения и пользовательских значений прозрачности
            maskOpacity.setValueAtTime(currentFrame + keyOffset, opacityValues[0]);
            maskOpacity.setValueAtTime(currentFrame + frameDistance * frameDuration + keyOffset, opacityValues[1]);
            maskOpacity.setValueAtTime(currentFrame + 2 * frameDistance * frameDuration + keyOffset, opacityValues[2]);

            // Установка Toggle Hold Keyframes, если чек-бокс активирован
            if (toggleHold) {
                var numKeys = maskOpacity.numKeys;
                for (var j = 1; j <= numKeys; j++) {
                    maskOpacity.setInterpolationTypeAtKey(j, KeyframeInterpolationType.HOLD);
                }
            }

            // Смещение времени для следующей маски
            currentFrame += 2 * frameDistance * frameDuration;
        }

        app.endUndoGroup();
    }

    var myScriptPal = createUI(this);
    if (myScriptPal != null && myScriptPal instanceof Window) {
        myScriptPal.center();
        myScriptPal.show();
    }
}
