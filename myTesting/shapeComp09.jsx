// Создаем окно интерфейса
var win = new Window("dialog", "My Script");
win.orientation = "column";

// Добавляем кнопки
var buttonCheckShapes = win.add("button", undefined, "Check Shapes");
var buttonPrecomps = win.add("button", undefined, "Pre-comps");
var buttonRender = win.add("button", undefined, "Render");

// Добавляем чекбокс
var checkboxCrop = win.add("checkbox", undefined, "Crop");
checkboxCrop.value = false;

// Добавляем поле для ввода имени прекомпозиции
var precompNameInput = win.add("edittext", undefined, "Enter precomp name");
precompNameInput.characters = 30;

// Добавляем обработчики событий для кнопок
buttonCheckShapes.onClick = checkShapes;
    
var createdPrecomps = [];
buttonPrecomps.onClick = function() {
    createdPrecomps = createPrecomps01(checkboxCrop.value, precompNameInput.text);
    alert('Created ' + createdPrecomps.length + ' precompositions');
};
buttonRender.onClick = function() {
    renderPrecomps(createdPrecomps);
};

// Отображаем окно
win.center();
win.show();


function checkShapes() {
    // Получаем активный проект
    var project = app.project;

    // Проверяем, есть ли активный проект
    if (!project) {
        alert("No active project");
        return;
    }

    // Проходим по всем композициям в проекте и присваиваем красный лейбл всем шейповым слоям
    for (var j = 1; j <= project.numItems; j++) {
        if (project.item(j) instanceof CompItem) {
            for (var k = 1; k <= project.item(j).numLayers; k++) {
                if (project.item(j).layer(k).matchName === "ADBE Vector Layer") {
                    project.item(j).layer(k).label = 1;
                }
            }
        }
    }
}

function createPrecomps() {
    app.beginUndoGroup("Create Precomps for All Layers");

    var project = app.project;
    if (!project) {
        alert("No active project");
        return;
    }

    var redLabelLayers = [];

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

    for (var i = 0; i < redLabelLayers.length; i++) {
        var layer = redLabelLayers[i].layer;
        var comp = redLabelLayers[i].comp;
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

        var newComp = project.items.addComp(layer.name + "_precomp", precompWidth, precompHeight, comp.pixelAspect, comp.duration, comp.frameRate);

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
            newLayer.trackMatteType = trackMatteType;
        }

        layer.remove();
    }

    var createdPrecomps = [];
    for (var i = 0; i < redLabelLayers.length; i++) {
        // Остальной код

        createdPrecomps.push(newComp);
    }

    app.endUndoGroup();

    return createdPrecomps;
}

function createPrecomps01(cropToCurrentFrame) {
    app.beginUndoGroup("Create Precomps for All Layers");

        var project = app.project;
    if (!project) {
        alert("No active project");
        return;
    }

    var redLabelLayers = [];

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

        for (var i = 0; i < redLabelLayers.length; i++) {
        var layer = redLabelLayers[i].layer;
        var comp = redLabelLayers[i].comp;
        var originalPos = layer.position.value;

        var minX = Infinity;
        var minY = Infinity;
        var maxX = -Infinity;
        var maxY = -Infinity;

    // Если стоит галочка "Crop", вычисляем прямоугольник только для последнего кадра слоя
    var tStart = cropToCurrentFrame ? layer.outPoint : layer.inPoint;
    var tEnd = cropToCurrentFrame ? layer.outPoint : layer.outPoint;

    for (var t = tStart; t <= tEnd; t += comp.frameDuration) {
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

        var newComp = project.items.addComp(layer.name + "_precomp", precompWidth, precompHeight, comp.pixelAspect, comp.duration, comp.frameRate);

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
            newLayer.trackMatteType = trackMatteType;
        }

        layer.remove();
    }

    app.endUndoGroup();
}

function renderPrecomps(precomps) {
    var project = app.project;
    var renderQueue = project.renderQueue;
    var outputModuleSettings = {
        "Quality": "Best",
        "Use": "On",
        "Format": "QuickTime",
        "Channels": "RGB + Alpha",
        "Depth": "Millions of Colors+",
        "Output Audio": false
    };

    var outputFolder = new Folder(project.file.path + "/Footages");
    if (!outputFolder.exists) {
        if (!outputFolder.create()) {
            alert("Не удалось создать папку " + outputFolder.fullName);
            return;
        }
    }

    for (var i = 0; i < precomps.length; i++) {
        // Skip if the composition does not end with '_precomp'
        if (!precomps[i].name.endsWith("_precomp")) {
            continue;
        }

        var renderQueueItem = renderQueue.items.add(precomps[i]);
        var outputModule = renderQueueItem.outputModule(1);
        outputModule.setSettings(outputModuleSettings);

        var outputCompFolder = new Folder(outputFolder.fullName + "/" + precomps[i].name);
        if (!outputCompFolder.exists) {
            if (!outputCompFolder.create()) {
                alert("Не удалось создать папку " + outputCompFolder.fullName);
                continue;
            }
        }

        var outputFileName = outputCompFolder.fullName + "/" + precomps[i].name + ".mov";
        outputModule.file = new File(outputFileName);
    }

    try {
        renderQueue.render();
    } catch(err) {
        alert("Ошибка при рендеринге: " + err.message);
    }
}


// Запускаем скрипт
main();
