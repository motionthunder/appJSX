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
                // Дублируем слой и перемещаем его в новую композицию
                var newLayer = layer.duplicate();
                newLayer.moveToComp(newComp);

                // Вычисляем новое положение слоя в прекомпозиции, чтобы он был в центре
                var newPosX = (maxX - minX) / 2;
                var newPosY = (maxY - minY) / 2;

                // Устанавливаем новое положение слоя
                for (var t = newLayer.inPoint; t <= newLayer.outPoint; t += comp.frameDuration) {
                    newLayer.position.setValueAtTime(t, [newPosX, newPosY]);
                }

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