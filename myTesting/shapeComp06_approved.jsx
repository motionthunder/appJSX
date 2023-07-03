// Создаем Undo Group для возможности отмены действий скрипта
app.beginUndoGroup("Create Precomps for All Layers");

// Получаем активный проект
var project = app.project;

// Проверяем, есть ли активный проект
if (!project) {
    alert("No active project");
} else {
    // Создаем массив для слоев с красной меткой
    var redLabelLayers = [];

    // Проходим по всем композициям в проекте и собираем все слои с красной меткой
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

    // Обрабатываем каждый слой с красной меткой
    for (var i = 0; i < redLabelLayers.length; i++) {
        var layer = redLabelLayers[i].layer;
        var comp = redLabelLayers[i].comp;

        // Сохраняем исходное положение слоя
        var originalPos = layer.position.value;

        // Проверяем, есть ли связанный слой-маска
        var trackMatteType = layer.trackMatteType;

        // Вычисляем максимальные и минимальные координаты слоя на протяжении всего времени анимации
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

        // Округляем координаты до ближайшего целого числа
        minX = Math.round(minX);
        minY = Math.round(minY);
        maxX = Math.round(maxX);
        maxY = Math.round(maxY);

        // Вычисляем виртуальные размеры и центр прекомпозиции
        var precompWidth = maxX - minX;
        var precompHeight = maxY - minY;
        var precompCenter = [(minX + maxX) / 2, (minY + maxY) / 2];

        // Создаем новую композицию с уникальным именем и вычисленными размерами
        var newComp = project.items.addComp(layer.name + "_precomp", precompWidth, precompHeight, comp.pixelAspect, comp.duration, comp.frameRate);

        // Копируем слой в новую композицию
        layer.copyToComp(newComp);

        // Вычисляем новое положение слоя в прекомпозиции, чтобы он был в центре
        var newLayerInComp = newComp.layer(1);
        for (var t = newLayerInComp.inPoint; t <= newLayerInComp.outPoint; t += comp.frameDuration) {
            var originalPosAtTime = layer.position.valueAtTime(t, false);
            newLayerInComp.position.setValueAtTime(t, [originalPosAtTime[0] - minX, originalPosAtTime[1] - minY]);
        }

        // Заменяем исходный слой на новую композицию
        var newLayer = comp.layers.add(newComp);
        newLayer.moveBefore(layer);
        newLayer.position.setValue(precompCenter);

        // Если исходный слой имел связанный слой-маску, устанавливаем ее для нового слоя
        if (trackMatteType !== TrackMatteType.NO_TRACK_MATTE) {
            newLayer.trackMatteType = trackMatteType;
        }

        layer.remove();
    }
}

// Закрываем Undo Group
app.endUndoGroup();
