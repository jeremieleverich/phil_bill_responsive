$(function () {
    openCourse();
    $("#continue-training").click(openCourse)
    $("#close-training").click(closeCourse)
    function openCourse() {
        document.body.className = ""
        window.open("framework/launch.html", "_blank", "toolbar=no, scrollbars=yes, resizable=yes");
    }
    function closeCourse() {
        window.close()
    }
});

