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

                // Создаем новую прекомпозицию с уникальным именем и размерами исходного слоя
                var precomp = comp.layers.precompose([layer.index], layer.name + "_precomp", true);

                // Вычисляем новое положение слоя в прекомпозиции, чтобы он был в центре
                var newPosX = precomp.width / 2;
                var newPosY = precomp.height / 2;

                // Устанавливаем новое положение слоя
                precomp.layer(1).position.setValue([newPosX, newPosY]);
                // Устанавливаем прекомпозицию на исходное место слоя
                precomp.position.setValue(originalPos);
            }
        }
    }
}

// Закрываем Undo Group
app.endUndoGroup();