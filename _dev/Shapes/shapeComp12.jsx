var shapeLayers = [];

// Обходим все слои и ищем шейп-слои связанные через Track Matte
for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);

    if (layer.source && layer.source instanceof ShapeLayerSource) {
        var trackMatteType = layer.trackMatteType;

        // Определяем связанный слой, если он есть и также является шейп-слоем
        if (trackMatteType !== TrackMatteType.NO_TRACK_MATTE) {
            var relatedLayer = null;
            if (layer.hasTrackMatte) {
                relatedLayer = layer.trackMatte; // Слой-источник
            } else if (layer.isTrackMatte) {
                relatedLayer = comp.layer(layer.index + 1); // Слой-маска
            }

            if (relatedLayer && relatedLayer.source && relatedLayer.source instanceof ShapeLayerSource) {
                shapeLayers.push({ layer: layer, relatedLayer: relatedLayer });
            }
        }
    }
}

if (shapeLayers.length >= 2) {
    // Создаем новую прекомпозицию
    var newComp = project.items.addComp("shapeLayers_precomp", precompWidth, precompHeight, comp.pixelAspect, comp.duration, comp.frameRate);

    for (var j = 0; j < shapeLayers.length; j++) {
        // Копируем оба связанных слоя в новую прекомпозицию
        shapeLayers[j].layer.copyToComp(newComp);
        shapeLayers[j].relatedLayer.copyToComp(newComp);
    }

    // Заменяем исходные слои новым слоем прекомпозиции
    var newLayer = comp.layers.add(newComp);
    newLayer.position.setValue(precompCenter);

    // Удаляем исходные слои
    for (var k = 0; k < shapeLayers.length; k++) {
        shapeLayers[k].layer.remove();
        shapeLayers[k].relatedLayer.remove();
    }
}
