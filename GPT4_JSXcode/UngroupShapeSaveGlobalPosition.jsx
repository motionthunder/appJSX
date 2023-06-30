function copyKeyframes(srcProp, dstProp) {
    if (srcProp.numKeys > 0) {
        for (var i = 1; i <= srcProp.numKeys; i++) {
            var keyTime = srcProp.keyTime(i);
            var keyValue = srcProp.keyValue(i);
            var keyInInterpolationType = srcProp.keyInInterpolationType(i);
            var keyOutInterpolationType = srcProp.keyOutInterpolationType(i);
            var keyInTemporalEase = srcProp.keyInTemporalEase(i);
            var keyOutTemporalEase = srcProp.keyOutTemporalEase(i);

            dstProp.setValueAtTime(keyTime, keyValue);
            dstProp.setInterpolationTypeAtKey(i, keyInInterpolationType, keyOutInterpolationType);
            dstProp.setTemporalEaseAtKey(i, keyInTemporalEase, keyOutTemporalEase);
        }
    } else {
        dstProp.setValue(srcProp.value);
    }
}


function ungroupShapeLayer() {
    var comp = app.project.activeItem;

    if (!(comp && comp instanceof CompItem)) {
        alert('Please select a composition!');
        return;
    }

    var layer = comp.selectedLayers[0];
    if (!(layer && layer instanceof ShapeLayer)) {
        alert('Please select a shape layer with groups!');
        return;
    }

    var props = comp.selectedProperties;
    var parentProp = props[0].propertyGroup();
    var idxList = [];

    // Build list of indices
    for (var ii = 0, il = props.length; ii < il; ii++) {
        idxList.push(props[ii].propertyIndex);
    }

    app.beginUndoGroup('Ungroup Selected Shape Groups');

    app.executeCommand(2004); // Deselect all

    // Ungroup them
    for (var ii = 0, il = idxList.length; ii < il; ii++) {
        var prop = parentProp.property(idxList[ii]);
        var outerGroup = prop;
        var innerGroup = outerGroup("Contents").property(1);

        var outerTransform = outerGroup("Transform");
        var innerTransform = innerGroup("Transform");

        // Copy keyframes from outer group's transform to inner group's transform
        for (var i = 1; i <= outerTransform.numProperties; i++) {
            var outerProp = outerTransform.property(i);
            var innerProp = innerTransform.property(i);

            if (outerProp.isTimeVarying) {
                copyKeyframes(outerProp, innerProp);
            }
        }

        var outerPosition = outerGroup.transform.position.value;
        var outerAnchor = outerGroup.transform.anchorPoint.value;
        var innerPosition = innerGroup.transform.position.value;
        var innerAnchor = innerGroup.transform.anchorPoint.value;

        prop.selected = true;
        app.executeCommand(3742);

        var ungroupedInnerGroup = parentProp.property(idxList[ii]);
        var newPosition = [
            outerPosition[0] - outerAnchor[0] + innerPosition[0],
            outerPosition[1] - outerAnchor[1] + innerPosition[1]
        ];
        ungroupedInnerGroup.transform.position.setValue(newPosition);
        ungroupedInnerGroup.selected = false;
    }

    app.endUndoGroup();
}

ungroupShapeLayer();
