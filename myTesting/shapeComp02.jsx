// Функция для копирования всех свойств и ключевых кадров с исходного слоя на слой назначения
function copyProperties(source, destination) {
    for (var i = 1; i <= source.numProperties; i++) {
        var prop = source.property(i);
        var destProp = destination.property(i);

        if (prop.enabled && destProp.canSetEnabled) {
            if (prop.propertyType === PropertyType.PROPERTY) {
                if (prop.canVaryOverTime) {
                    for (var j = 1; j <= prop.numKeys; j++) {
                        destProp.setValueAtTime(prop.keyTime(j), prop.keyValue(j));
                        if (prop.isSpatial && prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) {
                            destProp.setSpatialTangentsAtKey(j, prop.keyInSpatialTangent(j), prop.keyOutSpatialTangent(j));
                        }
                        destProp.setInterpolationTypeAtKey(j, prop.keyInInterpolationType(j), prop.keyOutInterpolationType(j));
                        if (prop.propertyValueType == PropertyValueType.ThreeD || prop.propertyValueType == PropertyValueType.TwoD || prop.propertyValueType == PropertyValueType.OneD) {
                            destProp.setTemporalEaseAtKey(j, prop.keyInTemporalEase(j), prop.keyOutTemporalEase(j));
                        }
                    }
                } else if (prop.canSetValue && !(prop.name == "Position" || prop.name == "Anchor Point" || prop.name == "Scale" || prop.name == "Rotation" || prop.name == "Opacity")) {
                    destProp.setValue(prop.value);
                }
            } else if (prop.propertyType === PropertyType.INDEXED_GROUP || prop.propertyType === PropertyType.NAMED_GROUP) {
                copyProperties(prop, destProp);
            }
        }
    }
}



// Создаем Undo Group для возможности отмены действий скрипта
app.beginUndoGroup("Create Precomps for Shape Layers");

// Получаем активный проект
var project = app.project;

// Проверяем, есть ли активный проект
if (!project) {
    alert("No active project");
} else {
    // Получаем активную композицию
    var comp = project.activeItem;

    // Проверяем, есть ли активная композиция
    if (!comp || !(comp instanceof CompItem)) {
        alert("No active composition");
    } else {
        // Проходим по всем слоям в композиции
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);

            // Проверяем, является ли слой шейповым
            if (layer.matchName === "ADBE Vector Layer") {
                // Сохраняем исходное положение слоя
                var originalPos = layer.position.value;

                // Вычисляем максимальные размеры слоя на протяжении всего времени анимации
                var maxWidth = 0;
                var maxHeight = 0;
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
                    maxWidth = Math.max(maxWidth, rect.width);
                    maxHeight = Math.max(maxHeight, rect.height);
                }

                // Округляем размеры до ближайшего целого числа
                maxWidth = Math.round(maxWidth);
                maxHeight = Math.round(maxHeight);
                minX = Math.round(minX);
                minY = Math.round(minY);
                maxX = Math.round(maxX);
                maxY = Math.round(maxY);

                // Создаем новую композицию с уникальным именем и максимальными размерами слоя
                var newComp = project.items.addComp(layer.name + "_precomp", maxX - minX, maxY - minY, comp.pixelAspect, comp.duration, comp.frameRate);
                
                // Копируем слой в новую композицию
                layer.copyToComp(newComp);

                // Получаем копию слоя в новой композиции
                var newLayer = newComp.layer(1);

                // Вычисляем новое положение слоя в прекомпозиции, чтобы он был в центре
                var newPosX = (maxX - minX) / 2;
                var newPosY = (maxY - minY) / 2;

                // Устанавливаем новое положение слоя
                for (var t = layer.inPoint; t <= layer.outPoint; t += comp.frameDuration) {
                    newLayer.position.setValueAtTime(t, [newPosX, newPosY]);
                }

                // Копируем все свойства слоя
                copyProperties(layer, newLayer);
                
                // Заменяем исходный слой на новую композицию
                var newCompLayer = comp.layers.add(newComp);
                newCompLayer.moveBefore(layer);
                newCompLayer.position.setValue(originalPos);
                layer.remove();
            }
        }
    }
}

// Закрываем Undo Group
app.endUndoGroup();
