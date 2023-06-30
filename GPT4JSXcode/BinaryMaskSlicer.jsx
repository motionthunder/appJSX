(function () {
    var mainWindow = new Window("palette", "Random Masks", undefined);
    mainWindow.spacing = 10;

    var numMasksGroup = mainWindow.add("group");
    numMasksGroup.add("statictext", undefined, "Плотность масок (1-100):");
    var numMasksInput = numMasksGroup.add("edittext", undefined, "50");
    numMasksInput.characters = 4;

    var maskSizeGroup = mainWindow.add("group");
    maskSizeGroup.add("statictext", undefined, "Максимальный размер маски (ШxВ):");
    var maskWidthInput = maskSizeGroup.add("edittext", undefined, "100");
    maskWidthInput.characters = 4;
    var maskHeightInput = maskSizeGroup.add("edittext", undefined, "100");
    maskHeightInput.characters = 4;

    var maskTypeGroup = mainWindow.add("group");
    maskTypeGroup.add("statictext", undefined, "Тип маски:");
    var maskTypeDropdown = maskTypeGroup.add("dropdownlist", undefined, ["Прямоугольная", "Треугольная", "Квадрат"]);
    maskTypeDropdown.selection = 0;

    var applyButton = mainWindow.add("button", undefined, "Применить");

    applyButton.onClick = function () {
        var activeItem = app.project.activeItem;
        var density = parseInt(numMasksInput.text);
        var maxMaskWidth = parseFloat(maskWidthInput.text);
        var maxMaskHeight = parseFloat(maskHeightInput.text);
        var maskType = maskTypeDropdown.selection.index;

        if (activeItem && activeItem instanceof CompItem) {
            app.beginUndoGroup("Random Masks");
            createRandomMasks(activeItem, density, maxMaskWidth, maxMaskHeight, maskType);
            app.endUndoGroup();
        } else {
            alert("Пожалуйста, выберите композицию и слой.");
        }
    };

    mainWindow.center();
    mainWindow.show();

    function createRandomMasks(comp, density, maxMaskWidth, maxMaskHeight, maskType) {
        var layer = comp.selectedLayers[0];
        if (!layer) {
            alert("Пожалуйста, выберите слой.");
            return;
        }

        var layerWidth = layer.width;
        var layerHeight = layer.height;
        var layerArea = layerWidth * layerHeight;
        var maxMaskArea = maxMaskWidth * maxMaskHeight;
        var numMasks = Math.round((layerArea * density) / (maxMaskArea * 100));

        var bspTree = new BSPTree(layerWidth, layerHeight, numMasks, maxMaskWidth, maxMaskHeight);
        var leafs = bspTree.getLeafs();

        for (var i = 0; i < leafs.length; i++) {
            var leaf = leafs[i];

            if (maskType == 0) { // Прямоугольная маска
                var maskShape = new Shape();
                maskShape.vertices = [
                    [leaf.x, leaf.y],
                    [leaf.x + leaf.width, leaf.y],
                    [leaf.x + leaf.width, leaf.y + leaf.height],
                    [leaf.x, leaf.y + leaf.height],
                ];
                maskShape.closed = true;

                var mask = layer.Masks.addProperty("Mask");
                mask.maskShape.setValue(maskShape);
            } else if (maskType == 1) { // Треугольная маска
                var triangle1 = new Shape();
                triangle1.vertices = [
                    [leaf.x, leaf.y],
                    [leaf.x + leaf.width, leaf.y],
                    [leaf.x, leaf.y + leaf.height]
                ];
                triangle1.closed = true;

                var triangle2 = new Shape();
                triangle2.vertices = [
                    [leaf.x + leaf.width, leaf.y],
                    [leaf.x + leaf.width, leaf.y + leaf.height],
                    [leaf.x, leaf.y + leaf.height]
                ];
                triangle2.closed = true;

                var mask1 = layer.Masks.addProperty("Mask");
                mask1.maskShape.setValue(triangle1);

                var mask2 = layer.Masks.addProperty("Mask");
                mask2.maskShape.setValue(triangle2);
            } else if (maskType == 2) { // Квадратная маска
                var squareSize = Math.min(leaf.width, leaf.height);
                var horizontalSquares = Math.floor(leaf.width / squareSize);
                var verticalSquares = Math.floor(leaf.height / squareSize);

                var adjustedWidth = leaf.width / horizontalSquares;
                var adjustedHeight = leaf.height / verticalSquares;

                for (var h = 0; h < horizontalSquares; h++) {
                    for (var v = 0; v < verticalSquares; v++) {
                        var maskShape = new Shape();
                        maskShape.vertices = [
                            [leaf.x + h * adjustedWidth, leaf.y + v * adjustedHeight],
                            [leaf.x + (h + 1) * adjustedWidth, leaf.y + v * adjustedHeight],
                            [leaf.x + (h + 1) * adjustedWidth, leaf.y + (v + 1) * adjustedHeight],
                            [leaf.x + h * adjustedWidth, leaf.y + (v + 1) * adjustedHeight]
                        ];
                        maskShape.closed = true;

                        var mask = layer.Masks.addProperty("Mask");
                        mask.maskShape.setValue(maskShape);
                    }
                }
            }
        }
    }

    function BSPTree(width, height, numMasks, maxMaskWidth, maxMaskHeight) {
        this.root = new BSPNode(0, 0, width, height, maxMaskWidth, maxMaskHeight);
        this.splitNode(this.root, numMasks);
    }
BSPTree.prototype.splitNode = function (node, numMasks) {
    if (numMasks <= 1) {
        return;
    }

    var splitHorizontally = Math.random() < 0.5;
    var splitSize = splitHorizontally ? node.width / 2 : node.height / 2;

    if (splitSize >= (splitHorizontally ? node.maxWidth : node.maxHeight)) {
        var childA = new BSPNode(node.x, node.y, splitHorizontally ? splitSize : node.width, splitHorizontally ? node.height : splitSize, node.maxWidth, node.maxHeight);
        var childB = new BSPNode(splitHorizontally ? node.x + splitSize : node.x, splitHorizontally ? node.y : node.y + splitSize, splitHorizontally ? splitSize : node.width, splitHorizontally ? node.height : splitSize, node.maxWidth, node.maxHeight);

        node.children = [childA, childB];

this.splitNode(childA, Math.round(numMasks / 2));
this.splitNode(childB, Math.floor(numMasks / 2));
    }
};

BSPTree.prototype.getLeafs = function () {
    var leafs = [];

    function getLeafsRecursively(node) {
        if (node.children) {
            getLeafsRecursively(node.children[0]);
            getLeafsRecursively(node.children[1]);
        } else {
            leafs.push(node);
        }
    }

    getLeafsRecursively(this.root);
    return leafs;
};

function BSPNode(x, y, width, height, maxWidth, maxHeight) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.maxWidth = maxWidth;
    this.maxHeight = maxHeight;
}
}());
