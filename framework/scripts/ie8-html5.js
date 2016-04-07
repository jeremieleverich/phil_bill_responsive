(function () {
    var elementsToCreate = ['section', 'article', 'video', 'audio'];

    for (var i = 0, length = elementsToCreate.length; i < length; i++) {
        if (elementsToCreate[i]) {
            document.createElement(elementsToCreate[i]);
        }
    }
}());