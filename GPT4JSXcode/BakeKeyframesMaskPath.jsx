(function() { 
  function bakeMaskKeyframes() {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) {
      alert('Выберите композицию.');
      return;
    }

    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) {
      alert('Выберите слои, содержащие анимированные маски.');
      return;
    }

    app.beginUndoGroup('Bake Mask Keyframes');

    for (var i = 0; i < selectedLayers.length; i++) {
      var layer = selectedLayers[i];
      var masks = layer.mask;

      for (var j = 1; j <= masks.numProperties; j++) {
        var mask = masks.property(j);
        var maskPath = mask.property("Mask Path");

        if (maskPath.numKeys > 0) {
          maskPath.expression = 'value';
          maskPath.selected = true;
        }
      }
    }

    app.executeCommand(app.findMenuCommandId('Convert Expression to Keyframes'));

    app.endUndoGroup();
  }

  var mainWindow = new Window("palette", "Bake Mask Keyframes", undefined);
  mainWindow.orientation = "column";
  mainWindow.alignChildren = ["center", "center"];

  var bakeButton = mainWindow.add("button", undefined, "Bake Keyframes");
  bakeButton.onClick = bakeMaskKeyframes;

  mainWindow.center();
  mainWindow.show();
})();
