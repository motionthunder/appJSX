function interpolateBezier(p0, p1, p2, p3, t) {
    var mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

function interpolateQuinticBezier(p0, p1, p2, p3, p4, p5, t) {
    var mt = 1 - t;
    var mt2 = mt * mt;
    var t2 = t * t;
    var a = mt2 * mt;
    var b = 3 * mt2 * t;
    var c = 3 * mt * t2;
    var d = t2 * t;

    return [
        a * p0[0] + b * p1[0] + c * p4[0] + d * p5[0],
        a * p0[1] + b * p1[1] + c * p4[1] + d * p5[1]
    ];
}

function distributeVertices(path, maxVertices, method) {
    var newVertices = [];
    var newInTangents = [];
    var newOutTangents = [];
    var segmentLength = (path.vertices.length - 1) / (maxVertices - 1);

    for (var i = 0; i < maxVertices; i++) {
        var position = i * segmentLength;
        var index = Math.floor(position);
        var progress = position - index;

        if (index === path.vertices.length - 1) {
            newVertices.push(path.vertices[index]);
            newInTangents.push(path.inTangents[index]);
            newOutTangents.push(path.outTangents[index]);
        } else {
            if (method === "Bezier") {
                var p0 = path.vertices[index];
                var p1 = [p0[0] + path.outTangents[index][0], p0[1] + path.outTangents[index][1]];
                var p3 = path.vertices[index + 1];
                var p2 = [p3[0] + path.inTangents[index + 1][0], p3[1] + path.inTangents[index + 1][1]];

                var x = interpolateBezier(p0[0], p1[0], p2[0], p3[0], progress);
                var y = interpolateBezier(p0[1], p1[1], p2[1], p3[1], progress);
                newVertices.push([x, y]);

                if (progress > 0 && progress < 1) {
                    var tan1 = [interpolateBezier(p0[0], p1[0], p2[0], p3[0], progress - 0.01), interpolateBezier(p0[1], p1[1], p2[1], p3[1], progress - 0.01)];
					                    var tan2 = [interpolateBezier(p0[0], p1[0], p2[0], p3[0], progress + 0.01), interpolateBezier(p0[1], p1[1], p2[1], p3[1], progress + 0.01)];

                    newInTangents.push([tan1[0] - x, tan1[1] - y]);
                    newOutTangents.push([tan2[0] - x, tan2[1] - y]);
                } else {
                    newInTangents.push(path.inTangents[index]);
                    newOutTangents.push(path.outTangents[index]);
                }
            } else if (method === "Quintic") {
                var p0 = path.vertices[index];
                var p1 = [p0[0] + path.outTangents[index][0], p0[1] + path.outTangents[index][1]];
                var p4 = path.vertices[index + 1];
                var p3 = [p4[0] + path.inTangents[index + 1][0], p4[1] + path.inTangents[index + 1][1]];
                var p2 = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
                var p5 = [(p3[0] + p4[0]) / 2, (p3[1] + p4[1]) / 2];

                var newPoint = interpolateQuinticBezier(p0, p1, p2, p3, p4, p5, progress);
                newVertices.push(newPoint);

                if (progress > 0) {
                    newInTangents.push([newPoint[0] - p2[0], newPoint[1] - p2[1]]);
                } else {
                    newInTangents.push(path.inTangents[index]);
                }

                if (progress < 1) {
                    newOutTangents.push([p3[0] - newPoint[0], p3[1] - newPoint[1]]);
                } else {
                    newOutTangents.push(path.outTangents[index]);
                }
            } else {
                var p0 = path.vertices[index];
                var p1 = path.vertices[index + 1];

                var x = p0[0] + progress * (p1[0] - p0[0]);
                var y = p0[1] + progress * (p1[1] - p0[1]);
                newVertices.push([x, y]);

                newInTangents.push([0, 0]);
                newOutTangents.push([0, 0]);
            }
        }
    }

    path.vertices = newVertices;
    path.inTangents = newInTangents;
    path.outTangents = newOutTangents;

    return path;
}
function fixMaskVertices(additionalPercentage, method) {
    app.beginUndoGroup("Одинаковое количество вершин для масок");

    var comp = app.project.activeItem;
    var layer = comp.selectedLayers[0];
    var masks = layer.property("ADBE Mask Parade");

    for (var i = 1; i <= masks.numProperties; i++) {
        var currentMask = masks.property(i);
        var currentMaskPath = currentMask.property("ADBE Mask Shape");

        var maxVertices = 0;
        for (var j = 1; j <= currentMaskPath.numKeys; j++) {
            var currentVertices = currentMaskPath.keyValue(j).vertices.length;
            if (currentVertices > maxVertices) {
                maxVertices = currentVertices;
            }
        }

        maxVertices += Math.floor(maxVertices * additionalPercentage); // Добавляем заданный процент дополнительных вершин

        var previousTime = comp.time;
        for (var j = 1; j <= currentMaskPath.numKeys; j++) {
            var keyTime = currentMaskPath.keyTime(j);
            comp.time = keyTime;
            var currentPath = currentMaskPath.valueAtTime(keyTime, true);

            if (currentPath.vertices.length !== maxVertices) {
                var newPath = distributeVertices(currentPath, maxVertices, method);

                var updatedPath = new Shape();
                updatedPath.vertices = newPath.vertices;
                updatedPath.inTangents = newPath.inTangents;
                updatedPath.outTangents = newPath.outTangents;
                updatedPath.closed = newPath.closed;

                currentMaskPath.setValueAtTime(keyTime, updatedPath);
            }
        }
        comp.time = previousTime;
    }

    app.endUndoGroup();
}

function createUI() {
    var win = new Window("palette", "Mask Vertex Fixer", undefined);
    win.orientation = "column";
    win.alignChildren = ["left", "top"];
    win.spacing = 10;
    win.margins = 16;

    var percentageGroup = win.add("group", undefined, "Percentage Group");
    percentageGroup.orientation = "row";
    percentageGroup.alignChildren = ["left", "center"];
    percentageGroup.spacing = 10;
    percentageGroup.margins = 0;

    var percentageText = percentageGroup.add("statictext", undefined, "Additional Percentage:");
    var percentageInput = percentageGroup.add("edittext", undefined, "50");
    percentageInput.characters = 4;
    percentageInput.active = true;

    var methodGroup = win.add("group", undefined, "Method Group");
    methodGroup.orientation = "row";
    methodGroup.alignChildren = ["left", "center"];
    methodGroup.spacing = 10;
    methodGroup.margins = 0;

    var methodText = methodGroup.add("statictext", undefined, "Method:");
    var methodDropdown = methodGroup.add("dropdownlist", undefined, ["Standard", "Bezier", "Quintic"]);
    methodDropdown.selection = 0;

    var fixButton = win.add("button", undefined, "Fix Vertex Masks");
    fixButton.onClick = function () {
        var additionalPercentage = parseFloat(percentageInput.text) / 100;
        var method = methodDropdown.selection.text;
        fixMaskVertices(additionalPercentage, method);
    };

    win.center();
    win.show();
}

if (parseFloat(app.version) < 13.0) {
alert("This script requires Adobe After Effects CC 2015 or later.", "Version Error");
} else {
createUI();
}
